use serde::{Deserialize, Serialize};

pub const REQUIRED_CONFIRM_TEXT: &str = "삭제";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemState {
    pub original_wallpaper_path: Option<String>,
    pub captured_at: Option<String>,
}

pub fn validate_confirm_text(confirm_text: &str) -> Result<(), String> {
    if confirm_text == REQUIRED_CONFIRM_TEXT {
        Ok(())
    } else {
        Err(format!(
            "앱 제거를 진행하려면 '{}'를 정확히 입력해 주세요.",
            REQUIRED_CONFIRM_TEXT
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_confirm_text_requires_exact_word() {
        assert!(validate_confirm_text("삭제").is_ok());
        assert!(validate_confirm_text("삭제 ").is_err());
        assert!(validate_confirm_text("delete").is_err());
    }

    #[test]
    fn system_state_roundtrip_json() {
        let state = SystemState {
            original_wallpaper_path: Some("C:\\wall\\a.jpg".to_string()),
            captured_at: Some("2026-03-03T12:00:00+09:00".to_string()),
        };

        let json = serde_json::to_string(&state).expect("serialize failed");
        let decoded: SystemState = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(
            decoded.original_wallpaper_path.as_deref(),
            Some("C:\\wall\\a.jpg")
        );
    }
}
