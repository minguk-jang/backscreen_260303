use tauri::{generate_handler, ipc::Invoke, AppHandle, Wry};
use crate::models::{default_state, AppState, DisplayMonitor, ScreenSize};
use crate::monitor::{get_screen_size, list_monitors};
use crate::persistence::{load_saved_state, save_state};
use crate::uninstall::launch_uninstaller;
use crate::uninstall_state;
use crate::wallpaper::{apply_wallpaper_image as apply_wallpaper_image_impl, restore_original_wallpaper_if_available};

#[tauri::command]
pub fn load_app_state(app: AppHandle) -> Result<AppState, String> {
    Ok(load_saved_state(&app)?.unwrap_or_else(default_state))
}

#[tauri::command]
pub fn save_app_state(app: AppHandle, state: AppState) -> Result<(), String> {
    save_state(&app, &state)
}

#[tauri::command]
pub fn list_display_monitors(app: AppHandle) -> Result<Vec<DisplayMonitor>, String> {
    list_monitors(&app)
}

#[tauri::command]
pub fn get_primary_screen_size(
    app: AppHandle,
    monitor_mode: Option<String>,
    monitor_id: Option<String>,
) -> Result<ScreenSize, String> {
    get_screen_size(&app, monitor_mode, monitor_id)
}

#[tauri::command]
pub fn apply_wallpaper_image(
    app: AppHandle,
    png_base64: String,
    monitor_mode: Option<String>,
    monitor_id: Option<String>,
) -> Result<(), String> {
    apply_wallpaper_image_impl(&app, png_base64, monitor_mode, monitor_id)
}

#[tauri::command]
pub fn uninstall_app(app: AppHandle, confirm_text: String) -> Result<(), String> {
    uninstall_state::validate_confirm_text(&confirm_text)?;

    // Wallpaper restore should not block uninstall completion.
    let _ = restore_original_wallpaper_if_available(&app);

    launch_uninstaller()?;
    app.exit(0);
    Ok(())
}

pub fn invoke_handler() -> impl Fn(Invoke<Wry>) -> bool {
    generate_handler![
        load_app_state,
        save_app_state,
        list_display_monitors,
        get_primary_screen_size,
        apply_wallpaper_image,
        uninstall_app
    ]
}
