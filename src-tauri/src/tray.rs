use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn widget_route_url() -> &'static str {
    "/?mode=widget"
}

pub fn setup_tray_and_windows(app: &mut App) -> tauri::Result<()> {
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
        let _ = WebviewWindowBuilder::new(app, "todo-widget", WebviewUrl::App(widget_route_url().into()))
            .title("BackScreen Todo")
            .inner_size(360.0, 680.0)
            .decorations(false)
            .always_on_top(true)
            .resizable(false)
            .skip_taskbar(true)
            .build();
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::widget_route_url;

    #[test]
    fn widget_url_contains_mode_widget() {
        assert_eq!(widget_route_url(), "/?mode=widget");
    }
}
