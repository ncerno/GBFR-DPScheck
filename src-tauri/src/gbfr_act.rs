use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GbfrActServiceStatus {
    pub running: bool,
    pub websocket_url: String,
    pub message: Option<String>,
}

impl Default for GbfrActServiceStatus {
    fn default() -> Self {
        Self {
            running: false,
            websocket_url: "ws://127.0.0.1:24399".to_string(),
            message: Some("尚未检查 GBFR-ACT 服务".to_string()),
        }
    }
}
