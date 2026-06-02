use serde_json::Value;
use tauri::AppHandle;

use crate::config::{AppConfig, AppDiagnostics};
use crate::gbfr_act::GbfrActServiceStatus;

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
pub async fn save_raw_event(app: AppHandle, event: Value) -> Result<(), String> {
    crate::storage::save_raw_event(&app, event).await
}

#[tauri::command]
pub async fn save_combat_summary(app: AppHandle, summary: Value) -> Result<(), String> {
    crate::storage::save_summary(&app, summary).await
}
