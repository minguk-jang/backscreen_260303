use base64::Engine;
use chrono::Local;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::ManagerExt;

mod uninstall_state;
mod display_target;
use display_target::{resolve_target_monitor_id, MonitorRef};
use uninstall_state::SystemState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ThemeSettings {
    background: String,
    panel: String,
    panel_alt: String,
    primary_text: String,
    accent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SchoolInfo {
    school_name: String,
    class_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TimetableSlot {
    id: String,
    period_label: String,
    subject: String,
    start: String,
    end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Timetable {
    mon: Vec<TimetableSlot>,
    tue: Vec<TimetableSlot>,
    wed: Vec<TimetableSlot>,
    thu: Vec<TimetableSlot>,
    fri: Vec<TimetableSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MealEntry {
    id: String,
    date: String,
    items: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventEntry {
    id: String,
    date: String,
    title: String,
    details: String,
    color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TodoEntry {
    id: String,
    text: String,
    done: bool,
    order: i64,
    created_at: String,
    done_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DisplaySettings {
    monitor_mode: String,
    monitor_id: Option<String>,
    content_scale_percent: u16,
    #[serde(default)]
    offset_x_percent: i16,
    #[serde(default)]
    offset_y_percent: i16,
}

impl Default for DisplaySettings {
    fn default() -> Self {
        Self {
            monitor_mode: "primary".to_string(),
            monitor_id: None,
            content_scale_percent: 100,
            offset_x_percent: 0,
            offset_y_percent: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MealImportSettings {
    last_imported_at: Option<String>,
    last_source_type: Option<String>,
    last_file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    school_info: SchoolInfo,
    timetable: Timetable,
    meals: Vec<MealEntry>,
    events: Vec<EventEntry>,
    #[serde(default)]
    todos: Vec<TodoEntry>,
    #[serde(default)]
    display: DisplaySettings,
    #[serde(default)]
    meal_import: MealImportSettings,
    theme: ThemeSettings,
    auto_apply_every_minute: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenSize {
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplayMonitor {
    id: String,
    name: String,
    is_primary: bool,
}

#[tauri::command]
fn load_app_state(app: AppHandle) -> Result<AppState, String> {
    let connection = open_connection(&app)?;

    let mut stmt = connection
        .prepare("SELECT data_json FROM app_state WHERE id = 1")
        .map_err(to_err)?;

    let mut rows = stmt.query([]).map_err(to_err)?;

    if let Some(row) = rows.next().map_err(to_err)? {
        let payload: String = row.get(0).map_err(to_err)?;
        serde_json::from_str::<AppState>(&payload).map_err(to_err)
    } else {
        Ok(default_state())
    }
}

#[tauri::command]
fn save_app_state(app: AppHandle, state: AppState) -> Result<(), String> {
    let connection = open_connection(&app)?;
    let payload = serde_json::to_string(&state).map_err(to_err)?;

    connection
        .execute(
            "INSERT INTO app_state (id, data_json, updated_at)
             VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at",
            params![payload, Local::now().to_rfc3339()],
        )
        .map_err(to_err)?;

    create_backup_snapshot(&app, &state)?;

    Ok(())
}

#[tauri::command]
fn list_display_monitors(app: AppHandle) -> Result<Vec<DisplayMonitor>, String> {
    list_monitors(&app)
}

#[tauri::command]
fn get_primary_screen_size(
    app: AppHandle,
    monitor_mode: Option<String>,
    monitor_id: Option<String>,
) -> Result<ScreenSize, String> {
    let monitors = list_monitors(&app)?;
    let monitor_refs: Vec<MonitorRef> = monitors
        .iter()
        .map(|monitor| MonitorRef {
            id: monitor.id.clone(),
            is_primary: monitor.is_primary,
        })
        .collect();

    let selected_id = resolve_target_monitor_id(
        monitor_mode.as_deref().unwrap_or("primary"),
        monitor_id.as_deref(),
        &monitor_refs,
    );

    let available = app.available_monitors().map_err(to_err)?;
    if available.is_empty() {
        return Err("모니터 정보를 찾을 수 없습니다.".to_string());
    }

    let selected_idx = selected_id
        .as_deref()
        .and_then(|id| parse_monitor_id(id))
        .filter(|idx| *idx < available.len())
        .unwrap_or(0);

    let target = &available[selected_idx];
    let size = target.size();

    Ok(ScreenSize {
        width: size.width,
        height: size.height,
    })
}

#[tauri::command]
fn apply_wallpaper_image(
    app: AppHandle,
    png_base64: String,
    monitor_mode: Option<String>,
    monitor_id: Option<String>,
) -> Result<(), String> {
    let _ = capture_original_wallpaper_once(&app);

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(png_base64)
        .map_err(to_err)?;

    let image = image::load_from_memory(&image_bytes).map_err(to_err)?;

    let wallpaper_dir = app_data_dir(&app)?.join("wallpaper");
    fs::create_dir_all(&wallpaper_dir).map_err(to_err)?;
    let wallpaper_path = wallpaper_dir.join("current_wallpaper.bmp");

    image
        .save_with_format(&wallpaper_path, image::ImageFormat::Bmp)
        .map_err(to_err)?;

    let mode = monitor_mode.as_deref().unwrap_or("primary");
    let target_monitor_index = resolve_target_monitor_index(&app, mode, monitor_id.as_deref())?;
    apply_wallpaper_os(&wallpaper_path, mode, target_monitor_index)
}

#[tauri::command]
fn uninstall_app(app: AppHandle, confirm_text: String) -> Result<(), String> {
    uninstall_state::validate_confirm_text(&confirm_text)?;

    // Wallpaper restore should not block uninstall completion.
    let _ = restore_original_wallpaper_if_available(&app);

    launch_uninstaller()?;
    app.exit(0);
    Ok(())
}

fn parse_monitor_id(id: &str) -> Option<usize> {
    id.strip_prefix("monitor-")
        .and_then(|value| value.parse::<usize>().ok())
        .and_then(|value| value.checked_sub(1))
}

fn resolve_target_monitor_index(
    app: &AppHandle,
    mode: &str,
    monitor_id: Option<&str>,
) -> Result<Option<usize>, String> {
    if mode == "all" {
        return Ok(None);
    }

    let monitors = list_monitors(app)?;
    if monitors.is_empty() {
        return Ok(None);
    }

    let monitor_refs: Vec<MonitorRef> = monitors
        .iter()
        .map(|monitor| MonitorRef {
            id: monitor.id.clone(),
            is_primary: monitor.is_primary,
        })
        .collect();

    let resolved_id = resolve_target_monitor_id(mode, monitor_id, &monitor_refs);
    let resolved_index = resolved_id
        .as_deref()
        .and_then(parse_monitor_id)
        .filter(|idx| *idx < monitors.len())
        .unwrap_or(0);

    Ok(Some(resolved_index))
}

fn list_monitors(app: &AppHandle) -> Result<Vec<DisplayMonitor>, String> {
    let primary = app.primary_monitor().map_err(to_err)?;
    let primary_signature = primary
        .as_ref()
        .map(monitor_signature);

    let available = app.available_monitors().map_err(to_err)?;
    let mut monitors = Vec::new();

    for (index, monitor) in available.iter().enumerate() {
        let id = format!("monitor-{}", index + 1);
        let name = monitor
            .name()
            .cloned()
            .unwrap_or_else(|| format!("모니터 {}", index + 1));
        let signature = monitor_signature(monitor);
        let is_primary = primary_signature
            .as_ref()
            .map(|primary_sig| *primary_sig == signature)
            .unwrap_or(index == 0);

        monitors.push(DisplayMonitor {
            id,
            name,
            is_primary,
        });
    }

    if !monitors.iter().any(|monitor| monitor.is_primary) && !monitors.is_empty() {
        monitors[0].is_primary = true;
    }

    Ok(monitors)
}

fn monitor_signature(monitor: &tauri::Monitor) -> String {
    let position = monitor.position();
    let size = monitor.size();
    format!("{}:{}:{}:{}", position.x, position.y, size.width, size.height)
}

fn open_connection(app: &AppHandle) -> Result<Connection, String> {
    let app_data = app_data_dir(app)?;
    fs::create_dir_all(&app_data).map_err(to_err)?;
    let db_path = app_data.join("app.db");

    let connection = Connection::open(db_path).map_err(to_err)?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
        )
        .map_err(to_err)?;

    Ok(connection)
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(to_err)
        .map(|path| path.join("backscreen"))
}

fn system_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("system_state.json"))
}

fn load_system_state(app: &AppHandle) -> Result<SystemState, String> {
    let state_path = system_state_path(app)?;
    if !state_path.exists() {
        return Ok(SystemState::default());
    }

    let payload = fs::read(&state_path).map_err(to_err)?;
    serde_json::from_slice::<SystemState>(&payload).map_err(to_err)
}

fn save_system_state(app: &AppHandle, state: &SystemState) -> Result<(), String> {
    let state_path = system_state_path(app)?;
    if let Some(parent) = state_path.parent() {
        fs::create_dir_all(parent).map_err(to_err)?;
    }

    let payload = serde_json::to_vec_pretty(state).map_err(to_err)?;
    fs::write(state_path, payload).map_err(to_err)
}

fn capture_original_wallpaper_once(app: &AppHandle) -> Result<(), String> {
    let mut state = load_system_state(app)?;
    if state.original_wallpaper_path.is_some() {
        return Ok(());
    }

    if let Some(path) = get_current_wallpaper_path_os()? {
        if !path.trim().is_empty() {
            state.original_wallpaper_path = Some(path);
            state.captured_at = Some(Local::now().to_rfc3339());
            save_system_state(app, &state)?;
        }
    }

    Ok(())
}

fn restore_original_wallpaper_if_available(app: &AppHandle) -> Result<(), String> {
    let state = load_system_state(app)?;
    let Some(path) = state.original_wallpaper_path else {
        return Ok(());
    };

    let original = PathBuf::from(path);
    if !original.exists() {
        return Ok(());
    }

    apply_wallpaper_os(&original, "all", None)
}

fn create_backup_snapshot(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let backup_dir = app_data_dir(app)?.join("backups");
    fs::create_dir_all(&backup_dir).map_err(to_err)?;

    let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_file = backup_dir.join(format!("state-{timestamp}.json"));
    let payload = serde_json::to_vec_pretty(state).map_err(to_err)?;
    fs::write(&backup_file, payload).map_err(to_err)?;

    let mut files: Vec<_> = fs::read_dir(&backup_dir)
        .map_err(to_err)?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("json"))
                .unwrap_or(false)
        })
        .collect();

    files.sort_by_key(|entry| entry.file_name());

    let remove_count = files.len().saturating_sub(7);
    if remove_count > 0 {
        for old in files.into_iter().take(remove_count) {
            let _ = fs::remove_file(old.path());
        }
    }

    Ok(())
}

#[cfg(any(target_os = "windows", test))]
fn uninstall_executable_path(current_exe: &Path) -> Result<PathBuf, String> {
    let install_dir = current_exe
        .parent()
        .ok_or_else(|| "앱 설치 경로를 찾을 수 없습니다.".to_string())?;
    Ok(install_dir.join("uninstall.exe"))
}

#[cfg(target_os = "windows")]
fn launch_uninstaller() -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(to_err)?;
    let uninstall_exe = uninstall_executable_path(&current_exe)?;

    if !uninstall_exe.exists() {
        return Err(
            "언인스톨러를 찾을 수 없습니다. Windows '설정 > 앱 > 설치된 앱'에서 BackScreen을 제거해 주세요."
                .to_string(),
        );
    }

    std::process::Command::new(&uninstall_exe)
        .spawn()
        .map_err(to_err)?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn launch_uninstaller() -> Result<(), String> {
    Err("Windows 설치 환경에서만 앱 제거를 지원합니다.".to_string())
}

#[cfg(target_os = "windows")]
fn apply_wallpaper_os(
    path: &Path,
    mode: &str,
    target_monitor_index: Option<usize>,
) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SystemParametersInfoW, SPI_SETDESKWALLPAPER, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE,
    };

    if mode != "all" {
        if let Some(monitor_index) = target_monitor_index {
            return apply_wallpaper_to_single_monitor(path, monitor_index);
        }
    }

    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
    wide.push(0);

    let ok = unsafe {
        SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            wide.as_mut_ptr() as *mut _,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
        )
    };

    if ok == 0 {
        return Err(format!(
            "바탕화면 적용 실패: {}",
            std::io::Error::last_os_error()
        ));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn apply_wallpaper_to_single_monitor(path: &Path, monitor_index: usize) -> Result<(), String> {
    let escaped_path = path
        .to_string_lossy()
        .replace('\\', "\\\\")
        .replace('\'', "''");
    let script = build_single_monitor_wallpaper_script(monitor_index, &escaped_path);

    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .status()
        .map_err(to_err)?;

    if !status.success() {
        return Err("선택한 모니터에 바탕화면을 적용하지 못했습니다.".to_string());
    }

    Ok(())
}

#[cfg(any(target_os = "windows", test))]
fn build_single_monitor_wallpaper_script(monitor_index: usize, escaped_path: &str) -> String {
    format!(
        "$wp = New-Object -ComObject Microsoft.Windows.DesktopWallpaper; \
         $id = $wp.GetMonitorDevicePathAt({monitor_index}); \
         $wp.SetWallpaper($id, '{escaped_path}')"
    )
}

#[cfg(target_os = "windows")]
fn get_current_wallpaper_path_os() -> Result<Option<String>, String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{SPI_GETDESKWALLPAPER, SystemParametersInfoW};

    let mut buffer = [0u16; 260];
    let ok = unsafe {
        SystemParametersInfoW(
            SPI_GETDESKWALLPAPER,
            buffer.len() as u32,
            buffer.as_mut_ptr() as *mut _,
            0,
        )
    };

    if ok == 0 {
        return Err(format!(
            "현재 배경 조회 실패: {}",
            std::io::Error::last_os_error()
        ));
    }

    let length = buffer.iter().position(|c| *c == 0).unwrap_or(buffer.len());
    if length == 0 {
        return Ok(None);
    }

    Ok(Some(String::from_utf16_lossy(&buffer[..length])))
}

#[cfg(not(target_os = "windows"))]
fn get_current_wallpaper_path_os() -> Result<Option<String>, String> {
    Ok(None)
}

#[cfg(not(target_os = "windows"))]
fn apply_wallpaper_os(
    _path: &Path,
    _mode: &str,
    _target_monitor_index: Option<usize>,
) -> Result<(), String> {
    Err("현재 OS에서는 실제 바탕화면 적용을 지원하지 않습니다. Windows에서 실행하세요.".to_string())
}

fn default_state() -> AppState {
    let today = Local::now().format("%Y-%m-%d").to_string();

    let day_slots = || {
        vec![
            TimetableSlot {
                id: format!("{}-1", uuid_seed()),
                period_label: "1교시".to_string(),
                subject: "국어".to_string(),
                start: "09:00".to_string(),
                end: "09:40".to_string(),
            },
            TimetableSlot {
                id: format!("{}-2", uuid_seed()),
                period_label: "2교시".to_string(),
                subject: "사회".to_string(),
                start: "09:45".to_string(),
                end: "10:25".to_string(),
            },
            TimetableSlot {
                id: format!("{}-3", uuid_seed()),
                period_label: "3교시".to_string(),
                subject: "수학".to_string(),
                start: "10:50".to_string(),
                end: "11:30".to_string(),
            },
            TimetableSlot {
                id: format!("{}-4", uuid_seed()),
                period_label: "4교시".to_string(),
                subject: "도덕".to_string(),
                start: "11:35".to_string(),
                end: "12:15".to_string(),
            },
        ]
    };

    AppState {
        school_info: SchoolInfo {
            school_name: "우리학교".to_string(),
            class_name: "5학년 1반".to_string(),
        },
        timetable: Timetable {
            mon: day_slots(),
            tue: day_slots(),
            wed: day_slots(),
            thu: day_slots(),
            fri: day_slots(),
        },
        meals: vec![MealEntry {
            id: uuid_seed(),
            date: today.clone(),
            items: vec![
                "기장밥".to_string(),
                "북어콩나물국".to_string(),
                "소불고기".to_string(),
                "깍두기".to_string(),
            ],
        }],
        events: vec![EventEntry {
            id: uuid_seed(),
            date: today,
            title: "학교행사".to_string(),
            details: "체육관 모임".to_string(),
            color: "#d67a4f".to_string(),
        }],
        todos: vec![],
        display: DisplaySettings::default(),
        meal_import: MealImportSettings::default(),
        theme: ThemeSettings {
            background: "#fff7ef".to_string(),
            panel: "#fff1f5".to_string(),
            panel_alt: "#ffffff".to_string(),
            primary_text: "#4f3131".to_string(),
            accent: "#d15b87".to_string(),
        },
        auto_apply_every_minute: true,
    }
}

fn uuid_seed() -> String {
    Local::now().timestamp_nanos_opt().unwrap_or_default().to_string()
}

fn to_err<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

fn widget_route_url() -> &'static str {
    "/?mode=widget"
}

#[cfg(test)]
mod tests {
    use super::{build_single_monitor_wallpaper_script, uninstall_executable_path, widget_route_url};
    use std::path::PathBuf;

    #[test]
    fn uninstall_path_is_resolved_in_same_directory() {
        let current = PathBuf::from("/opt/backscreen/backscreen");
        let resolved = uninstall_executable_path(&current).expect("path resolve failed");
        assert_eq!(resolved, PathBuf::from("/opt/backscreen/uninstall.exe"));
    }

    #[test]
    fn widget_url_contains_mode_widget() {
        assert_eq!(widget_route_url(), "/?mode=widget");
    }

    #[test]
    fn powershell_script_targets_selected_monitor_index() {
        let script = build_single_monitor_wallpaper_script(2, "C:\\\\wallpaper.bmp");
        assert!(script.contains("GetMonitorDevicePathAt(2)"));
        assert!(script.contains("C:\\\\wallpaper.bmp"));
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let auto = app.autolaunch();
            match auto.is_enabled() {
                Ok(false) => {
                    if let Err(err) = auto.enable() {
                        eprintln!("autostart enable failed: {err}");
                    }
                }
                Ok(true) => {}
                Err(err) => {
                    eprintln!("autostart state check failed: {err}");
                    if let Err(enable_err) = auto.enable() {
                        eprintln!("autostart enable retry failed: {enable_err}");
                    }
                }
            }

            let open = MenuItem::with_id(app, "open", "열기", true, None::<&str>)?;
            let apply = MenuItem::with_id(app, "apply", "지금 배경 적용", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &apply, &quit])?;

            let tray_build = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "apply" => {
                        let _ = app.emit("tray://apply-now", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app);

            if let Err(err) = tray_build {
                eprintln!("tray initialization failed: {err}");
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                return Ok(());
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            if app.get_webview_window("todo-widget").is_none() {
                let _ = tauri::WebviewWindowBuilder::new(
                    app,
                    "todo-widget",
                    tauri::WebviewUrl::App(widget_route_url().into()),
                )
                .title("BackScreen Todo")
                .inner_size(360.0, 680.0)
                .decorations(false)
                .always_on_top(true)
                .resizable(false)
                .skip_taskbar(true)
                .build();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_app_state,
            save_app_state,
            list_display_monitors,
            get_primary_screen_size,
            apply_wallpaper_image,
            uninstall_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
