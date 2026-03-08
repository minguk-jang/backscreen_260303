use base64::Engine;
use chrono::Local;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::error::to_err;
use crate::monitor::resolve_target_monitor_index;
use crate::persistence::{app_data_dir, load_system_state, save_system_state};

pub fn apply_wallpaper_image(
    app: &AppHandle,
    png_base64: String,
    monitor_mode: Option<String>,
    monitor_id: Option<String>,
) -> Result<(), String> {
    let _ = capture_original_wallpaper_once(app);

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(png_base64)
        .map_err(to_err)?;
    let image = image::load_from_memory(&image_bytes).map_err(to_err)?;

    let wallpaper_dir = app_data_dir(app)?.join("wallpaper");
    fs::create_dir_all(&wallpaper_dir).map_err(to_err)?;
    let wallpaper_path = wallpaper_dir.join("current_wallpaper.bmp");

    image
        .save_with_format(&wallpaper_path, image::ImageFormat::Bmp)
        .map_err(to_err)?;

    let mode = monitor_mode.as_deref().unwrap_or("primary");
    let target_monitor_index = resolve_target_monitor_index(app, mode, monitor_id.as_deref())?;
    apply_wallpaper_os(&wallpaper_path, mode, target_monitor_index)
}

pub fn capture_original_wallpaper_once(app: &AppHandle) -> Result<(), String> {
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

pub fn restore_original_wallpaper_if_available(app: &AppHandle) -> Result<(), String> {
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
pub fn build_single_monitor_wallpaper_script(monitor_index: usize, escaped_path: &str) -> String {
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

#[cfg(test)]
mod tests {
    use super::build_single_monitor_wallpaper_script;

    #[test]
    fn powershell_script_targets_selected_monitor_index() {
        let script = build_single_monitor_wallpaper_script(2, "C:\\\\wallpaper.bmp");
        assert!(script.contains("GetMonitorDevicePathAt(2)"));
        assert!(script.contains("C:\\\\wallpaper.bmp"));
    }
}
