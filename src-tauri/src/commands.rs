use serde_json::Value;
use tauri::{AppHandle, State};

use crate::config::{AppConfig, AppDiagnostics};
use crate::gbfr_act::GbfrActServiceStatus;
use crate::storage::StorageState;

#[tauri::command]
pub async fn get_app_config(app: AppHandle) -> Result<AppConfig, String> {
    crate::config::load_config(&app)
}

#[tauri::command]
pub async fn save_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    crate::config::save_config(&app, &config)
}

#[tauri::command]
pub async fn get_app_diagnostics(app: AppHandle) -> Result<AppDiagnostics, String> {
    crate::config::diagnostics(&app)
}

#[tauri::command]
pub async fn check_gbfr_act_service(app: AppHandle) -> Result<GbfrActServiceStatus, String> {
    let config = crate::config::load_config(&app)?;
    Ok(crate::gbfr_act::check_service(&config))
}

#[tauri::command]
pub async fn start_gbfr_act_service(app: AppHandle) -> Result<GbfrActServiceStatus, String> {
    let config = crate::config::load_config(&app)?;
    crate::gbfr_act::start_service(&config)
}

#[tauri::command]
pub async fn load_gbfr_act_action_texts(app: AppHandle) -> Result<Option<String>, String> {
    let config = crate::config::load_config(&app)?;
    crate::gbfr_act::load_action_texts(&config)
}

#[tauri::command]
pub async fn load_gbfr_act_dump_texts(app: AppHandle) -> Result<Option<String>, String> {
    let config = crate::config::load_config(&app)?;
    crate::gbfr_act::load_dump_texts(&config)
}

#[tauri::command]
pub async fn save_raw_event(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    event: Value,
) -> Result<(), String> {
    crate::storage::save_raw_event(&app, &storage_state, event).await
}

#[tauri::command]
pub async fn load_raw_events(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<Value>, String> {
    crate::storage::load_raw_events(&app, &storage_state)
}

#[tauri::command]
pub async fn clear_raw_events(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    crate::storage::clear_raw_events(&app, &storage_state)
}

#[tauri::command]
pub async fn load_loadout_tests(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<Value>, String> {
    crate::storage::load_loadout_tests(&app, &storage_state)
}

#[tauri::command]
pub async fn save_loadout_tests(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    records: Vec<Value>,
) -> Result<(), String> {
    crate::storage::save_loadout_tests(&app, &storage_state, records)
}

#[tauri::command]
pub async fn load_combat_history(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<Value>, String> {
    crate::storage::load_combat_history(&app, &storage_state)
}

#[tauri::command]
pub async fn save_combat_history_entry(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    entry: Value,
) -> Result<(), String> {
    crate::storage::save_combat_history_entry(&app, &storage_state, entry)
}

#[tauri::command]
pub async fn delete_combat_history_entry(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    id: String,
) -> Result<(), String> {
    crate::storage::delete_combat_history_entry(&app, &storage_state, id)
}

#[tauri::command]
pub async fn export_combat_history(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    path: Option<String>,
) -> Result<String, String> {
    crate::storage::export_combat_history(&app, &storage_state, path)
}

#[tauri::command]
pub async fn import_combat_history(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    path: Option<String>,
) -> Result<Vec<Value>, String> {
    crate::storage::import_combat_history(&app, &storage_state, path)
}
