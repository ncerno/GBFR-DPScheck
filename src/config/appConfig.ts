export interface AppConfig {
  gbfr_act: {
    websocket_url: string;
    act_ws_path?: string | null;
    auto_start: boolean;
  };
  overlay: {
    always_on_top: boolean;
    opacity: number;
    compact: boolean;
  };
  combat: {
    inactive_timeout_sec: number;
    keep_raw_events: boolean;
    area_strategy: 'auto' | 'training' | 'quest' | 'generic' | string;
  };
  ui: {
    language: 'zh-CN' | string;
    show_rdps: boolean;
  };
}

export interface GbfrActServiceStatus {
  running: boolean;
  websocket_url: string;
  act_ws_path?: string | null;
  message?: string | null;
}

export interface AppDiagnostics {
  app_data_dir: string;
  config_path: string;
  raw_events_path: string;
}

export const fallbackAppConfig: AppConfig = {
  gbfr_act: {
    websocket_url: 'ws://127.0.0.1:24399',
    act_ws_path: null,
    auto_start: true,
  },
  overlay: {
    always_on_top: true,
    opacity: 0.86,
    compact: false,
  },
  combat: {
    inactive_timeout_sec: 30,
    keep_raw_events: true,
    area_strategy: 'auto',
  },
  ui: {
    language: 'zh-CN',
    show_rdps: true,
  },
};
