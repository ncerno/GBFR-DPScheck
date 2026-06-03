use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub gbfr_act: GbfrActConfig,
    pub overlay: OverlayConfig,
    pub combat: CombatConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct GbfrActConfig {
    pub websocket_url: String,
    pub act_ws_path: Option<String>,
    pub auto_start: bool,
    pub auto_connect: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct OverlayConfig {
    pub always_on_top: bool,
    pub auto_open: bool,
    pub opacity: f32,
    pub compact: bool,
    pub click_through: bool,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: f64,
    pub window_height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct CombatConfig {
    pub inactive_timeout_sec: u64,
    pub training_inactive_timeout_sec: u64,
    pub keep_raw_events: bool,
    pub area_strategy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct UiConfig {
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDiagnostics {
    pub app_data_dir: String,
    pub config_path: String,
    pub raw_events_path: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            gbfr_act: GbfrActConfig::default(),
            overlay: OverlayConfig::default(),
            combat: CombatConfig::default(),
            ui: UiConfig::default(),
        }
    }
}

impl Default for GbfrActConfig {
    fn default() -> Self {
        Self {
            websocket_url: "ws://127.0.0.1:24399".to_string(),
            act_ws_path: Some("D:\\yzy\\GBFR-ACT\\act_ws.py".to_string()),
            auto_start: true,
            auto_connect: true,
        }
    }
}

impl Default for OverlayConfig {
    fn default() -> Self {
        Self {
            always_on_top: true,
            auto_open: true,
            opacity: 0.86,
            compact: false,
            click_through: false,
            window_x: None,
            window_y: None,
            window_width: 420.0,
            window_height: 260.0,
        }
    }
}

impl Default for CombatConfig {
    fn default() -> Self {
        Self {
            inactive_timeout_sec: 30,
            training_inactive_timeout_sec: 10,
            keep_raw_events: false,
            area_strategy: "auto".to_string(),
        }
    }
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            language: "zh-CN".to_string(),
        }
    }
}

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        let config = AppConfig::default();
        save_config(app, &config)?;
        return Ok(config);
    }

    let text = fs::read_to_string(&path).map_err(|error| format!("读取配置失败：{error}"))?;
    serde_json::from_str(&text).map_err(|error| format!("解析配置失败：{error}"))
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建配置目录失败：{error}"))?;
    }

    let text = serde_json::to_string_pretty(config).map_err(|error| format!("序列化配置失败：{error}"))?;
    fs::write(&path, text).map_err(|error| format!("写入配置失败：{error}"))
}

pub fn diagnostics(app: &AppHandle) -> Result<AppDiagnostics, String> {
    Ok(AppDiagnostics {
        app_data_dir: app_data_dir(app)?.display().to_string(),
        config_path: config_path(app)?.display().to_string(),
        raw_events_path: crate::storage::raw_events_path(app)?.display().to_string(),
    })
}

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("获取应用数据目录失败：{error}"))
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("config.json"))
}
