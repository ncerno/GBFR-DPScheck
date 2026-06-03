export interface AppConfig {
  gbfr_act: {
    websocket_url: string;
    act_ws_path?: string | null;
    auto_start: boolean;
    auto_connect?: boolean;
  };
  overlay: {
    always_on_top: boolean;
    auto_open?: boolean;
    opacity: number;
    compact: boolean;
    click_through: boolean;
    window_x?: number | null;
    window_y?: number | null;
    window_width: number;
    window_height: number;
  };
  combat: {
    inactive_timeout_sec: number;
    training_inactive_timeout_sec: number;
    keep_raw_events: boolean;
    area_strategy: 'auto' | 'training' | 'quest' | 'generic' | string;
  };
  ui: {
    language: 'zh-CN' | string;
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
    auto_connect: true,
  },
  overlay: {
    always_on_top: true,
    auto_open: true,
    opacity: 0.86,
    compact: false,
    click_through: false,
    window_x: null,
    window_y: null,
    window_width: 420,
    window_height: 260,
  },
  combat: {
    inactive_timeout_sec: 30,
    training_inactive_timeout_sec: 10,
    keep_raw_events: false,
    area_strategy: 'auto',
  },
  ui: {
    language: 'zh-CN',
  },
};
