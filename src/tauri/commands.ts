export type TauriCommandName =
  | 'get_app_config'
  | 'save_app_config'
  | 'check_gbfr_act_service'
  | 'start_gbfr_act_service'
  | 'save_raw_event'
  | 'save_combat_summary'
  | 'clear_raw_events'
  | 'get_app_diagnostics';

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
