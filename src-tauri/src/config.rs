use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub gbfr_act: GbfrActConfig,
    pub overlay: OverlayConfig,
    pub combat: CombatConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GbfrActConfig {
    pub websocket_url: String,
    pub act_ws_path: Option<String>,
    pub auto_start: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayConfig {
    pub always_on_top: bool,
    pub opacity: f32,
    pub compact: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatConfig {
    pub inactive_timeout_sec: u64,
    pub keep_raw_events: bool,
    pub area_strategy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub language: String,
    pub show_rdps: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            gbfr_act: GbfrActConfig {
                websocket_url: "ws://127.0.0.1:24399".to_string(),
                act_ws_path: None,
                auto_start: true,
            },
            overlay: OverlayConfig {
                always_on_top: true,
                opacity: 0.86,
                compact: false,
            },
            combat: CombatConfig {
                inactive_timeout_sec: 30,
                keep_raw_events: true,
                area_strategy: "auto".to_string(),
            },
            ui: UiConfig {
                language: "zh-CN".to_string(),
                show_rdps: true,
            },
        }
    }
}
