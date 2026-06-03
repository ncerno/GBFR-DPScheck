export type TauriCommandName =
  | 'get_app_config'
  | 'save_app_config'
  | 'check_gbfr_act_service'
  | 'start_gbfr_act_service'
  | 'load_gbfr_act_action_texts'
  | 'load_gbfr_act_dump_texts'
  | 'save_raw_event'
  | 'load_raw_events'
  | 'clear_raw_events'
  | 'get_app_diagnostics'
  | 'load_loadout_tests'
  | 'save_loadout_tests'
  | 'load_combat_history'
  | 'save_combat_history_entry'
  | 'delete_combat_history_entry'
  | 'export_combat_history'
  | 'import_combat_history';

export async function callTauriCommand<T>(command: TauriCommandName, args?: Record<string, unknown>): Promise<T> {
  if (!('__TAURI_INTERNALS__' in window)) {
    throw new Error('当前不在 Tauri 环境中');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export function isTauriRuntime() {
  return '__TAURI_INTERNALS__' in window;
}
