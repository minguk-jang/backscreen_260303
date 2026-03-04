#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MonitorRef {
    pub id: String,
    pub is_primary: bool,
}

pub fn resolve_target_monitor_id(
    mode: &str,
    requested_monitor_id: Option<&str>,
    monitors: &[MonitorRef],
) -> Option<String> {
    let primary = monitors
        .iter()
        .find(|monitor| monitor.is_primary)
        .or_else(|| monitors.first())
        .map(|monitor| monitor.id.clone())?;

    match mode {
        "all" | "primary" => Some(primary),
        "single" => {
            let requested = requested_monitor_id?;
            if monitors.iter().any(|monitor| monitor.id == requested) {
                Some(requested.to_string())
            } else {
                Some(primary)
            }
        }
        _ => Some(primary),
    }
}

#[cfg(test)]
mod tests {
    use super::{resolve_target_monitor_id, MonitorRef};

    fn monitor(id: &str, is_primary: bool) -> MonitorRef {
        MonitorRef {
            id: id.to_string(),
            is_primary,
        }
    }

    #[test]
    fn falls_back_to_primary_when_single_monitor_id_missing() {
        let monitors = vec![monitor("primary", true), monitor("secondary", false)];
        let resolved = resolve_target_monitor_id("single", Some("missing"), &monitors);
        assert_eq!(resolved, Some("primary".to_string()));
    }

    #[test]
    fn selects_requested_monitor_when_single_mode_matches() {
        let monitors = vec![monitor("primary", true), monitor("secondary", false)];
        let resolved = resolve_target_monitor_id("single", Some("secondary"), &monitors);
        assert_eq!(resolved, Some("secondary".to_string()));
    }
}
