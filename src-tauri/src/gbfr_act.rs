use std::net::TcpStream;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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

    start_python_elevated_hidden(act_ws_path, project_dir)?;
    Ok(GbfrActServiceStatus {
        running: false,
        websocket_url: config.gbfr_act.websocket_url.clone(),
        act_ws_path: config.gbfr_act.act_ws_path.clone(),
        message: Some("已在后台请求管理员权限启动 GBFR-ACT。若弹出 UAC，请允许；启动成功后 WebSocket 会自动连接。".to_string()),
    })
}

pub fn normalize_act_ws_path(input: &str) -> Result<String, String> {
    let trimmed = input.trim().trim_matches('"').trim_matches('\'');
    if trimmed.is_empty() {
        return Err("请填写 GBFR-ACT 的 act_ws.py 路径，或填写 GBFR-ACT 文件夹路径。".to_string());
    }

    let path = Path::new(trimmed);
    if path.is_file() {
        return if path.file_name().and_then(|name| name.to_str()) == Some("act_ws.py") {
            Ok(path.to_string_lossy().to_string())
        } else {
            Err(format!("请选择 act_ws.py，而不是：{}", path.display()))
        };
    }

    if path.is_dir() {
        let act_ws_path = path.join("act_ws.py");
        return if act_ws_path.exists() {
            Ok(act_ws_path.to_string_lossy().to_string())
        } else {
            Err(format!("该文件夹下没有 act_ws.py：{}", path.display()))
        };
    }

    Err(format!("路径不存在：{}", path.display()))
}

pub fn open_download_page() -> Result<(), String> {
    background_command("explorer")
        .arg("https://github.com/nyaoouo/GBFR-ACT")
        .spawn()
        .map_err(|error| format!("打开 GBFR-ACT 下载页失败：{error}"))?;

    Ok(())
}

pub fn load_action_texts(config: &AppConfig) -> Result<Option<String>, String> {
    load_asset_text(config, "act_ws_texts.js")
}

pub fn load_dump_texts(config: &AppConfig) -> Result<Option<String>, String> {
    load_asset_text(config, "dump_texts.js")
}

fn load_asset_text(config: &AppConfig, file_name: &str) -> Result<Option<String>, String> {
    let Some(act_ws_path) = &config.gbfr_act.act_ws_path else {
        return Ok(None);
    };

    let act_ws_path = Path::new(act_ws_path);
    let Some(project_dir) = act_ws_path.parent() else {
        return Err(format!("无法获取 act_ws.py 所在目录：{}", act_ws_path.display()));
    };

    let asset_path = project_dir.join("assets").join(file_name);
    if !asset_path.exists() {
        return Ok(None);
    }

    std::fs::read_to_string(&asset_path)
        .map(Some)
        .map_err(|error| format!("读取 GBFR-ACT 文本资源失败 {}：{error}", asset_path.display()))
}

fn start_python_elevated_hidden(act_ws_path: &Path, project_dir: &Path) -> Result<(), String> {
    let Some(python) = find_python_311_64() else {
        return Err("未找到 Python 3.11 64-bit。请先安装 Python 3.11 64-bit，或按 GBFR-ACT 说明运行一次 uac_start.cmd 完成 Python 安装。".to_string());
    };

    let mut argument_items = python.args.clone();
    argument_items.push(act_ws_path.to_string_lossy().to_string());
    let argument_list = argument_items
        .iter()
        .map(|item| powershell_quote(item))
        .collect::<Vec<_>>()
        .join(", ");
    let script = format!(
        "Start-Process -FilePath {} -ArgumentList @({}) -WorkingDirectory {} -Verb RunAs -WindowStyle Hidden",
        powershell_quote(&python.program),
        argument_list,
        powershell_quote(&project_dir.to_string_lossy()),
    );

    background_command("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-Command", &script])
        .current_dir(project_dir)
        .spawn()
        .map_err(|error| format!("后台启动 act_ws.py 失败：{error}"))?;

    Ok(())
}

struct PythonLaunch {
    program: String,
    args: Vec<String>,
}

fn find_python_311_64() -> Option<PythonLaunch> {
    for program in where_program("python") {
        if python_version_matches(&program, &[]) {
            return Some(PythonLaunch {
                program,
                args: Vec::new(),
            });
        }
    }

    if python_version_matches("py", &["-3.11-64"]) {
        return Some(PythonLaunch {
            program: "py".to_string(),
            args: vec!["-3.11-64".to_string()],
        });
    }

    None
}

fn where_program(program: &str) -> Vec<String> {
    let Ok(output) = hidden_command("where")
        .arg(program)
        .stderr(Stdio::null())
        .output()
    else {
        return Vec::new();
    };

    if !output.status.success() {
        return Vec::new();
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn python_version_matches(program: &str, args: &[&str]) -> bool {
    let Ok(output) = hidden_command(program)
        .args(args)
        .arg("-VV")
        .output()
    else {
        return false;
    };

    let version_text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );

    version_text.contains("Python 3.11") && version_text.contains("64 bit")
}

fn powershell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn background_command(program: &str) -> Command {
    let mut command = hidden_command(program);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    command
}

fn hidden_command(program: &str) -> Command {
    let mut command = Command::new(program);

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command
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

    if host_port.starts_with('[') {
        let bracket_end = host_port.find(']')?;
        let host = &host_port[..=bracket_end];
        let rest = &host_port[bracket_end + 1..];

        return if rest.is_empty() {
            Some(format!("{host}:80"))
        } else {
            rest.strip_prefix(':')
                .filter(|port| !port.is_empty())
                .map(|port| format!("{host}:{port}"))
        };
    }

    if let Some((host, port)) = host_port.rsplit_once(':') {
        if !host.is_empty() && !port.is_empty() && !host.contains(':') {
            return Some(format!("{host}:{port}"));
        }
    }

    if host_port.contains(':') {
        return Some(format!("[{host_port}]:80"));
    }

    Some(format!("{host_port}:80"))
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::{normalize_act_ws_path, websocket_url_to_address};

    #[test]
    fn websocket_url_to_address_keeps_explicit_port() {
        assert_eq!(
            websocket_url_to_address("ws://127.0.0.1:24399"),
            Some("127.0.0.1:24399".to_string())
        );
    }

    #[test]
    fn websocket_url_to_address_adds_default_port() {
        assert_eq!(
            websocket_url_to_address("ws://localhost/path"),
            Some("localhost:80".to_string())
        );
    }

    #[test]
    fn websocket_url_to_address_handles_bracketed_ipv6_with_port() {
        assert_eq!(
            websocket_url_to_address("ws://[::1]:24399"),
            Some("[::1]:24399".to_string())
        );
    }

    #[test]
    fn websocket_url_to_address_handles_bracketed_ipv6_without_port() {
        assert_eq!(
            websocket_url_to_address("ws://[::1]"),
            Some("[::1]:80".to_string())
        );
    }

    #[test]
    fn normalize_act_ws_path_accepts_act_ws_file() {
        let temp_dir = std::env::temp_dir().join(format!("gbfr-dpscheck-test-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let act_ws_path = temp_dir.join("act_ws.py");
        fs::write(&act_ws_path, "").unwrap();

        assert_eq!(
            normalize_act_ws_path(&act_ws_path.to_string_lossy()).unwrap(),
            act_ws_path.to_string_lossy().to_string()
        );

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn normalize_act_ws_path_accepts_project_directory() {
        let temp_dir = std::env::temp_dir().join(format!("gbfr-dpscheck-test-dir-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let act_ws_path = temp_dir.join("act_ws.py");
        fs::write(&act_ws_path, "").unwrap();

        assert_eq!(
            normalize_act_ws_path(&temp_dir.to_string_lossy()).unwrap(),
            act_ws_path.to_string_lossy().to_string()
        );

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn normalize_act_ws_path_rejects_other_files() {
        let temp_dir = std::env::temp_dir().join(format!("gbfr-dpscheck-test-bad-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let other_path = temp_dir.join("README.md");
        fs::write(&other_path, "").unwrap();

        assert!(normalize_act_ws_path(&other_path.to_string_lossy()).is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
