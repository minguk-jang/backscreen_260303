use tauri::{AppHandle, Monitor};

use crate::display_target::{resolve_target_monitor_id, MonitorRef};
use crate::error::to_err;
use crate::models::{DisplayMonitor, ScreenSize};

fn monitor_signature(monitor: &Monitor) -> String {
    let position = monitor.position();
    let size = monitor.size();
    format!("{}:{}:{}:{}", position.x, position.y, size.width, size.height)
}

fn parse_monitor_id(id: &str) -> Option<usize> {
    id.strip_prefix("monitor-")
        .and_then(|value| value.parse::<usize>().ok())
        .and_then(|value| value.checked_sub(1))
}

pub fn list_monitors(app: &AppHandle) -> Result<Vec<DisplayMonitor>, String> {
    let primary = app.primary_monitor().map_err(to_err)?;
    let primary_signature = primary.as_ref().map(monitor_signature);

    let available = app.available_monitors().map_err(to_err)?;
    let mut monitors = Vec::new();

    for (index, monitor) in available.iter().enumerate() {
        let id = format!("monitor-{}", index + 1);
        let name = monitor
            .name()
            .cloned()
            .unwrap_or_else(|| format!("모니터 {}", index + 1));
        let is_primary = primary_signature
            .as_ref()
            .map(|primary_sig| *primary_sig == monitor_signature(monitor))
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

pub fn resolve_target_monitor_index(
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

pub fn get_screen_size(
    app: &AppHandle,
    monitor_mode: Option<String>,
    monitor_id: Option<String>,
) -> Result<ScreenSize, String> {
    let monitors = list_monitors(app)?;
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
        .and_then(parse_monitor_id)
        .filter(|idx| *idx < available.len())
        .unwrap_or(0);

    let size = available[selected_idx].size();
    Ok(ScreenSize {
        width: size.width,
        height: size.height,
    })
}
