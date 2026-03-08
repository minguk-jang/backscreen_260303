use tauri::{generate_context, Builder, WindowEvent};
use tauri_plugin_autostart::ManagerExt;

use crate::commands;
use crate::tray::setup_tray_and_windows;

pub fn run() {
    Builder::default()
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

            setup_tray_and_windows(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(commands::invoke_handler())
        .run(generate_context!())
        .expect("error while running tauri application");
}
