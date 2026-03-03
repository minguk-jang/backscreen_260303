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
struct AppState {
    school_info: SchoolInfo,
    timetable: Timetable,
    meals: Vec<MealEntry>,
    events: Vec<EventEntry>,
    theme: ThemeSettings,
    auto_apply_every_minute: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenSize {
    width: u32,
    height: u32,
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
fn get_primary_screen_size(app: AppHandle) -> Result<ScreenSize, String> {
    let monitor = app
        .primary_monitor()
        .map_err(to_err)?
        .ok_or_else(|| "기본 모니터를 찾을 수 없습니다".to_string())?;
    let size = monitor.size();

    Ok(ScreenSize {
        width: size.width,
        height: size.height,
    })
}

#[tauri::command]
fn apply_wallpaper_image(app: AppHandle, png_base64: String) -> Result<(), String> {
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

    apply_wallpaper_os(&wallpaper_path)
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

#[cfg(target_os = "windows")]
fn apply_wallpaper_os(path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SystemParametersInfoW, SPI_SETDESKWALLPAPER, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE,
    };

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

#[cfg(not(target_os = "windows"))]
fn apply_wallpaper_os(_path: &Path) -> Result<(), String> {
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
            color: "#f59e0b".to_string(),
        }],
        theme: ThemeSettings {
            background: "#f7bfd5".to_string(),
            panel: "#fff3f7".to_string(),
            panel_alt: "#ffffff".to_string(),
            primary_text: "#7f184c".to_string(),
            accent: "#cf1f72".to_string(),
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let auto = app.autolaunch();
            let _ = auto.enable();

            let open = MenuItem::with_id(app, "open", "열기", true, None::<&str>)?;
            let apply = MenuItem::with_id(app, "apply", "지금 배경 적용", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &apply, &quit])?;

            let _tray = TrayIconBuilder::new()
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
                .build(app)?;

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
            get_primary_screen_size,
            apply_wallpaper_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
