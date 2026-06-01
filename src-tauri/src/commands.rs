use serde_json::Value;

use crate::config::AppConfig;
use crate::gbfr_act::GbfrActServiceStatus;

#[tauri::command]
pub async fn get_app_config() -> Result<AppConfig, String> {
    Ok(AppConfig::default())
}

#[tauri::command]
pub async fn save_app_config(_config: AppConfig) -> Result<(), String> {
    // 框架阶段先不落盘。
    Ok(())
}

#[tauri::command]
pub async fn check_gbfr_act_service() -> Result<GbfrActServiceStatus, String> {
    Ok(GbfrActServiceStatus::default())
}

#[tauri::command]
pub async fn start_gbfr_act_service() -> Result<GbfrActServiceStatus, String> {
    // 后续在这里启动用户配置的 act_ws.py。
    Ok(GbfrActServiceStatus {
        running: false,
        websocket_url: "ws://127.0.0.1:24399".to_string(),
        message: Some("服务启动逻辑待实现".to_string()),
    })
}

#[tauri::command]
pub async fn save_raw_event(_event: Value) -> Result<(), String> {
    // 框架阶段先不落盘。
    Ok(())
}

#[tauri::command]
pub async fn save_combat_summary(_summary: Value) -> Result<(), String> {
    // 框架阶段先不落盘。
    Ok(())
}
