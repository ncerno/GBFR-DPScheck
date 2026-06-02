use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use serde_json::Value;
use tauri::AppHandle;

pub fn raw_events_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::config::app_data_dir(app)?.join("records").join("raw-events.jsonl"))
}

pub fn summaries_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::config::app_data_dir(app)?.join("records").join("summaries.jsonl"))
}

pub async fn save_raw_event(app: &AppHandle, event: Value) -> Result<(), String> {
    append_json_line(raw_events_path(app)?, &event)
}

pub async fn save_summary(app: &AppHandle, summary: Value) -> Result<(), String> {
    append_json_line(summaries_path(app)?, &summary)
}

fn append_json_line(path: PathBuf, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| format!("创建数据目录失败：{error}"))?;
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|error| format!("打开数据文件失败 {}：{error}", path.display()))?;

    let line = serde_json::to_string(value).map_err(|error| format!("序列化事件失败：{error}"))?;
    writeln!(file, "{line}").map_err(|error| format!("写入数据文件失败 {}：{error}", path.display()))
}
