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
            commands::normalize_gbfr_act_path,
            commands::open_gbfr_act_download_page,
            commands::load_gbfr_act_action_texts,
            commands::load_gbfr_act_dump_texts,
            commands::save_raw_event,
            commands::get_app_diagnostics,
            commands::load_raw_events,
            commands::clear_raw_events,
            commands::load_loadout_tests,
            commands::save_loadout_tests,
            commands::load_combat_history,
            commands::save_combat_history_entry,
            commands::delete_combat_history_entry,
            commands::export_combat_history,
            commands::import_combat_history,
        ])
        .run(tauri::generate_context!())
        .expect("启动 GBFR-DPScheck 失败");
}
