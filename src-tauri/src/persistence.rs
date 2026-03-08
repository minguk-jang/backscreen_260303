use chrono::Local;
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::error::to_err;
use crate::models::AppState;
use crate::uninstall_state::SystemState;

pub fn open_connection(app: &AppHandle) -> Result<Connection, String> {
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

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(to_err)
        .map(|path| path.join("backscreen"))
}

fn system_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("system_state.json"))
}

pub fn load_system_state(app: &AppHandle) -> Result<SystemState, String> {
    let state_path = system_state_path(app)?;
    if !state_path.exists() {
        return Ok(SystemState::default());
    }

    let payload = fs::read(&state_path).map_err(to_err)?;
    serde_json::from_slice::<SystemState>(&payload).map_err(to_err)
}

pub fn save_system_state(app: &AppHandle, state: &SystemState) -> Result<(), String> {
    let state_path = system_state_path(app)?;
    if let Some(parent) = state_path.parent() {
        fs::create_dir_all(parent).map_err(to_err)?;
    }

    let payload = serde_json::to_vec_pretty(state).map_err(to_err)?;
    fs::write(state_path, payload).map_err(to_err)
}

pub fn create_backup_snapshot(app: &AppHandle, state: &AppState) -> Result<(), String> {
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

pub fn load_saved_state(app: &AppHandle) -> Result<Option<AppState>, String> {
    let connection = open_connection(app)?;
    let mut stmt = connection
        .prepare("SELECT data_json FROM app_state WHERE id = 1")
        .map_err(to_err)?;
    let mut rows = stmt.query([]).map_err(to_err)?;

    if let Some(row) = rows.next().map_err(to_err)? {
        let payload: String = row.get(0).map_err(to_err)?;
        let state = serde_json::from_str::<AppState>(&payload).map_err(to_err)?;
        Ok(Some(state))
    } else {
        Ok(None)
    }
}

pub fn save_state(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let connection = open_connection(app)?;
    let payload = serde_json::to_string(state).map_err(to_err)?;

    connection
        .execute(
            "INSERT INTO app_state (id, data_json, updated_at)
             VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at",
            params![payload, Local::now().to_rfc3339()],
        )
        .map_err(to_err)?;

    create_backup_snapshot(app, state)?;
    Ok(())
}
