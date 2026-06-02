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
pub async fn save_raw_event(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    event: Value,
) -> Result<(), String> {
    crate::storage::save_raw_event(&app, &storage_state, event).await
}

#[tauri::command]
pub async fn save_combat_summary(
    app: AppHandle,
    storage_state: State<'_, StorageState>,
    summary: Value,
) -> Result<(), String> {
    crate::storage::save_summary(&app, &storage_state, summary).await
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
