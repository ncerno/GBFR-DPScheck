mod commands;
mod config;
mod gbfr_act;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(storage::StorageState::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_config,
            commands::save_app_config,
            commands::check_gbfr_act_service,
            commands::start_gbfr_act_service,
            commands::save_raw_event,
            commands::save_combat_summary,
            commands::get_app_diagnostics,
            commands::clear_raw_events,
        ])
        .run(tauri::generate_context!())
        .expect("启动 GBFR-DPScheck 失败");
}
