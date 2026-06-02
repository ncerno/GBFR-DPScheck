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
            "GBFR-ACT WebSocket 端口暂不可连接。请确认游戏和 GBFR-ACT 是否已以管理员权限启动。".to_string()
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

    let act_ws_path = Path::new(act_ws_path);
    if !act_ws_path.exists() {
        return Err(format!("act_ws.py 不存在：{}", act_ws_path.display()));
    }

    let Some(project_dir) = act_ws_path.parent() else {
        return Err(format!("无法获取 act_ws.py 所在目录：{}", act_ws_path.display()));
    };

    let uac_start_path = project_dir.join("uac_start.cmd");
    if uac_start_path.exists() {
        start_with_uac_script(&uac_start_path)?;
        return Ok(GbfrActServiceStatus {
            running: false,
            websocket_url: config.gbfr_act.websocket_url.clone(),
            act_ws_path: config.gbfr_act.act_ws_path.clone(),
            message: Some("已通过 uac_start.cmd 启动 GBFR-ACT。请在弹出的 UAC 窗口中同意管理员权限；脚本会自动寻找 Python 3.11 64-bit。".to_string()),
        });
    }

    start_python_directly(act_ws_path, project_dir)?;
    Ok(GbfrActServiceStatus {
        running: false,
        websocket_url: config.gbfr_act.websocket_url.clone(),
        act_ws_path: config.gbfr_act.act_ws_path.clone(),
        message: Some("未找到 uac_start.cmd，已直接启动 act_ws.py。若出现 WinError 5，请改用管理员权限或补充 uac_start.cmd。".to_string()),
    })
}

fn start_with_uac_script(uac_start_path: &Path) -> Result<(), String> {
    let Some(project_dir) = uac_start_path.parent() else {
        return Err(format!("无法获取 uac_start.cmd 所在目录：{}", uac_start_path.display()));
    };

    Command::new("cmd")
        .args(["/C", "start", "", &uac_start_path.display().to_string()])
        .current_dir(project_dir)
        .spawn()
        .map_err(|error| format!("启动 uac_start.cmd 失败：{error}"))?;

    Ok(())
}

fn start_python_directly(act_ws_path: &Path, project_dir: &Path) -> Result<(), String> {
    Command::new("python")
        .arg(act_ws_path)
        .current_dir(project_dir)
        .spawn()
        .map_err(|error| format!("启动 act_ws.py 失败：{error}"))?;

    Ok(())
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
