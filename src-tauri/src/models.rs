use chrono::Local;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeSettings {
    pub background: String,
    pub panel: String,
    pub panel_alt: String,
    pub primary_text: String,
    pub accent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchoolInfo {
    pub school_name: String,
    pub class_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimetableSlot {
    pub id: String,
    pub period_label: String,
    pub subject: String,
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timetable {
    pub mon: Vec<TimetableSlot>,
    pub tue: Vec<TimetableSlot>,
    pub wed: Vec<TimetableSlot>,
    pub thu: Vec<TimetableSlot>,
    pub fri: Vec<TimetableSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealEntry {
    pub id: String,
    pub date: String,
    pub items: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventEntry {
    pub id: String,
    pub date: String,
    pub title: String,
    pub details: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoEntry {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub order: i64,
    pub created_at: String,
    pub done_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplaySettings {
    pub monitor_mode: String,
    pub monitor_id: Option<String>,
    pub content_scale_percent: u16,
    #[serde(default)]
    pub offset_x_percent: i16,
    #[serde(default)]
    pub offset_y_percent: i16,
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
pub struct MealImportSettings {
    pub last_imported_at: Option<String>,
    pub last_source_type: Option<String>,
    pub last_file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub school_info: SchoolInfo,
    pub timetable: Timetable,
    pub meals: Vec<MealEntry>,
    pub events: Vec<EventEntry>,
    #[serde(default)]
    pub todos: Vec<TodoEntry>,
    #[serde(default)]
    pub display: DisplaySettings,
    #[serde(default)]
    pub meal_import: MealImportSettings,
    pub theme: ThemeSettings,
    pub auto_apply_every_minute: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayMonitor {
    pub id: String,
    pub name: String,
    pub is_primary: bool,
}

pub fn default_state() -> AppState {
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
