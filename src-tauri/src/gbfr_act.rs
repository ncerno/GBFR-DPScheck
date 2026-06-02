use std::net::TcpStream;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::config::AppConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GbfrActServiceStatus {
    pub running: bool,
    pub websocket_url: String,
    pub act_ws_path: Option<String>,
    pub message: Option<String>,
}

impl Default for GbfrActServiceStatus {
    fn default() -> Self {
        Self {
            running: false,
            websocket_url: "ws://127.0.0.1:24399".to_string(),
            act_ws_path: Some("D:\\yzy\\GBFR-ACT\\act_ws.py".to_string()),
            message: Some("尚未检查 GBFR-ACT 服务".to_string()),
        }
    }
}

pub fn check_service(config: &AppConfig) -> GbfrActServiceStatus {
    let running = can_connect_to_websocket_port(&config.gbfr_act.websocket_url);
    GbfrActServiceStatus {
        running,
        websocket_url: config.gbfr_act.websocket_url.clone(),
        act_ws_path: config.gbfr_act.act_ws_path.clone(),
        message: Some(if running {
            "GBFR-ACT WebSocket 端口可连接。".to_string()
        } else {
            "GBFR-ACT WebSocket 端口暂不可连接。请确认游戏和 act_ws.py 是否已启动。".to_string()
        }),
    }
}

pub fn start_service(config: &AppConfig) -> Result<GbfrActServiceStatus, String> {
    if can_connect_to_websocket_port(&config.gbfr_act.websocket_url) {
        return Ok(GbfrActServiceStatus {
            running: true,
            websocket_url: config.gbfr_act.websocket_url.clone(),
            act_ws_path: config.gbfr_act.act_ws_path.clone(),
            message: Some("GBFR-ACT 已在运行。".to_string()),
        });
    }

    let Some(act_ws_path) = &config.gbfr_act.act_ws_path else {
        return Err("未配置 act_ws.py 路径。".to_string());
    };

    if !Path::new(act_ws_path).exists() {
        return Err(format!("act_ws.py 不存在：{act_ws_path}"));
    }

    let mut command = Command::new("python");
    command.arg(act_ws_path);
    if let Some(parent) = Path::new(act_ws_path).parent() {
        command.current_dir(parent);
    }

    command
        .spawn()
        .map_err(|error| format!("启动 act_ws.py 失败：{error}"))?;

    Ok(GbfrActServiceStatus {
        running: false,
        websocket_url: config.gbfr_act.websocket_url.clone(),
        act_ws_path: config.gbfr_act.act_ws_path.clone(),
        message: Some("已尝试启动 act_ws.py。GBFR-ACT 会等待游戏进程出现，WebSocket 需要注入成功后才会可连接。".to_string()),
    })
}

fn can_connect_to_websocket_port(url: &str) -> bool {
    let Some(address) = websocket_url_to_address(url) else {
        return false;
    };

    match address.parse() {
        Ok(socket_addr) => TcpStream::connect_timeout(&socket_addr, Duration::from_millis(500)).is_ok(),
        Err(_) => TcpStream::connect(address).is_ok(),
    }
}

fn websocket_url_to_address(url: &str) -> Option<String> {
    let without_scheme = url
        .strip_prefix("ws://")
        .or_else(|| url.strip_prefix("wss://"))
        .unwrap_or(url);
    let host_port = without_scheme.split('/').next()?;

    if host_port.contains(':') {
        Some(host_port.to_string())
    } else {
        Some(format!("{host_port}:80"))
    }
}
