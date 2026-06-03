use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde_json::Value;
use tauri::AppHandle;

const MAX_HISTORY_IMPORT_BYTES: u64 = 20 * 1024 * 1024;
const MAX_HISTORY_IMPORT_ENTRIES: usize = 1000;
const MAX_HISTORY_RAW_EVENTS: usize = 250_000;

#[derive(Default)]
pub struct StorageState {
    write_lock: Mutex<()>,
}

pub fn raw_events_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::config::app_data_dir(app)?.join("records").join("raw-events.jsonl"))
}

pub fn loadout_tests_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::config::app_data_dir(app)?.join("records").join("loadout-tests.json"))
}

pub fn combat_history_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::config::app_data_dir(app)?.join("records").join("combat-history"))
}

pub fn combat_history_export_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::config::app_data_dir(app)?.join("records").join("combat-history-export.json"))
}

pub async fn save_raw_event(app: &AppHandle, state: &StorageState, event: Value) -> Result<(), String> {
    append_json_line(raw_events_path(app)?, state, &event)
}

pub fn load_raw_events(app: &AppHandle, state: &StorageState) -> Result<Vec<Value>, String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定日志文件失败：{error}"))?;
    let path = raw_events_path(app)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let text = std::fs::read_to_string(&path)
        .map_err(|error| format!("读取 raw events 失败 {}：{error}", path.display()))?;

    // 这里不用按行解析：旧版本曾出现多个 JSON 对象粘在同一行的情况。
    // serde_json 的流式反序列化可以兼容换行分隔和连续 JSON 对象。
    serde_json::Deserializer::from_str(&text)
        .into_iter::<Value>()
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("解析 raw events 失败 {}：{error}", path.display()))
}

pub fn clear_raw_events(app: &AppHandle, state: &StorageState) -> Result<(), String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定日志文件失败：{error}"))?;
    let path = raw_events_path(app)?;

    if path.exists() {
        std::fs::remove_file(&path).map_err(|error| format!("清空 raw events 失败 {}：{error}", path.display()))?;
    }

    Ok(())
}

pub fn load_loadout_tests(app: &AppHandle, state: &StorageState) -> Result<Vec<Value>, String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定配装测试文件失败：{error}"))?;
    let path = loadout_tests_path(app)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let text = std::fs::read_to_string(&path)
        .map_err(|error| format!("读取配装测试记录失败 {}：{error}", path.display()))?;
    if text.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str(&text)
        .map_err(|error| format!("解析配装测试记录失败 {}：{error}", path.display()))
}

pub fn save_loadout_tests(app: &AppHandle, state: &StorageState, records: Vec<Value>) -> Result<(), String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定配装测试文件失败：{error}"))?;
    let path = loadout_tests_path(app)?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| format!("创建数据目录失败：{error}"))?;
    }

    let text = serde_json::to_string_pretty(&records)
        .map_err(|error| format!("序列化配装测试记录失败：{error}"))?;
    std::fs::write(&path, text)
        .map_err(|error| format!("写入配装测试记录失败 {}：{error}", path.display()))
}

pub fn load_combat_history(app: &AppHandle, state: &StorageState) -> Result<Vec<Value>, String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定历史记录失败：{error}"))?;
    let dir = combat_history_dir(app)?;

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    for item in std::fs::read_dir(&dir)
        .map_err(|error| format!("读取历史记录目录失败 {}：{error}", dir.display()))?
    {
        let item = item.map_err(|error| format!("读取历史记录条目失败：{error}"))?;
        let record_path = item.path().join("record.json");
        if !record_path.exists() {
            continue;
        }

        let text = std::fs::read_to_string(&record_path)
            .map_err(|error| format!("读取历史记录文件失败 {}：{error}", record_path.display()))?;
        if text.trim().is_empty() {
            continue;
        }

        let value = serde_json::from_str::<Value>(&text)
            .map_err(|error| format!("解析历史记录文件失败 {}：{error}", record_path.display()))?;
        entries.push(value);
    }

    entries.sort_by(|a, b| {
        let a_saved_at = a.get("savedAt").and_then(Value::as_str).unwrap_or_default();
        let b_saved_at = b.get("savedAt").and_then(Value::as_str).unwrap_or_default();
        b_saved_at.cmp(a_saved_at)
    });

    Ok(entries)
}

pub fn save_combat_history_entry(app: &AppHandle, state: &StorageState, entry: Value) -> Result<(), String> {
    validate_combat_history_entry(&entry)?;

    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定历史记录失败：{error}"))?;
    write_combat_history_entry_unlocked(app, &entry)
}

pub fn export_combat_history(app: &AppHandle, state: &StorageState, path: Option<String>) -> Result<String, String> {
    let entries = load_combat_history(app, state)?;
    let export_path = resolve_optional_json_path(path, combat_history_export_path(app)?)?;

    if let Some(parent) = export_path.parent().filter(|parent| !parent.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("创建历史记录导出目录失败 {}：{error}", parent.display()))?;
    }

    let text = serde_json::to_string_pretty(&entries)
        .map_err(|error| format!("序列化历史记录导出失败：{error}"))?;
    std::fs::write(&export_path, text)
        .map_err(|error| format!("写入历史记录导出失败 {}：{error}", export_path.display()))?;

    Ok(export_path.display().to_string())
}

pub fn import_combat_history(app: &AppHandle, state: &StorageState, path: Option<String>) -> Result<Vec<Value>, String> {
    let import_path = resolve_optional_json_path(path, combat_history_export_path(app)?)?;
    let text = read_to_string_limited(&import_path, MAX_HISTORY_IMPORT_BYTES, "历史记录导入文件")?;
    let entries = serde_json::from_str::<Vec<Value>>(&text)
        .map_err(|error| format!("解析历史记录导入文件失败 {}：{error}", import_path.display()))?;

    if entries.len() > MAX_HISTORY_IMPORT_ENTRIES {
        return Err(format!(
            "历史记录导入数量过多：{} 条，最多允许 {} 条。",
            entries.len(),
            MAX_HISTORY_IMPORT_ENTRIES
        ));
    }

    for entry in &entries {
        validate_combat_history_entry(entry)?;
    }

    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定历史记录失败：{error}"))?;

    for entry in &entries {
        write_combat_history_entry_unlocked(app, entry)?;
    }

    Ok(entries)
}

fn write_combat_history_entry_unlocked(app: &AppHandle, entry: &Value) -> Result<(), String> {
    let id = entry
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| "历史记录缺少 id。".to_string())?;
    let dir = combat_history_dir(app)?.join(sanitize_storage_name(id)?);
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("创建历史记录目录失败 {}：{error}", dir.display()))?;

    let record_path = dir.join("record.json");
    let text = serde_json::to_string_pretty(&entry)
        .map_err(|error| format!("序列化历史记录失败：{error}"))?;
    std::fs::write(&record_path, text)
        .map_err(|error| format!("写入历史记录失败 {}：{error}", record_path.display()))?;

    let raw_path = dir.join("raw-events.jsonl");
    if let Some(raw_events) = entry
        .get("record")
        .and_then(|record| record.get("rawEvents"))
        .and_then(Value::as_array)
    {
        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&raw_path)
            .map_err(|error| format!("打开历史记录 raw events 失败 {}：{error}", raw_path.display()))?;

        for event in raw_events {
            let line = serde_json::to_string(event)
                .map_err(|error| format!("序列化历史记录 raw event 失败：{error}"))?;
            writeln!(file, "{line}")
                .map_err(|error| format!("写入历史记录 raw event 失败 {}：{error}", raw_path.display()))?;
        }
    } else if raw_path.exists() {
        std::fs::remove_file(&raw_path)
            .map_err(|error| format!("删除旧历史记录 raw events 失败 {}：{error}", raw_path.display()))?;
    }

    Ok(())
}

pub fn delete_combat_history_entry(app: &AppHandle, state: &StorageState, id: String) -> Result<(), String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定历史记录失败：{error}"))?;
    let dir = combat_history_dir(app)?.join(sanitize_storage_name(&id)?);

    if dir.exists() {
        std::fs::remove_dir_all(&dir)
            .map_err(|error| format!("删除历史记录失败 {}：{error}", dir.display()))?;
    }

    Ok(())
}

fn sanitize_storage_name(value: &str) -> Result<String, String> {
    let sanitized: String = value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_'))
        .collect();

    if sanitized.is_empty() {
        return Err("存储 id 不包含安全字符。".to_string());
    }

    if sanitized != value {
        return Err("存储 id 只能包含英文字母、数字、短横线和下划线。".to_string());
    }

    Ok(sanitized)
}

fn resolve_optional_json_path(path: Option<String>, fallback: PathBuf) -> Result<PathBuf, String> {
    let resolved = match path.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()) {
        Some(value) => PathBuf::from(value),
        None => fallback,
    };

    ensure_json_path(&resolved)?;
    Ok(resolved)
}

fn ensure_json_path(path: &Path) -> Result<(), String> {
    let is_json = path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("json"));

    if !is_json {
        return Err(format!("历史记录导入/导出路径必须是 .json 文件：{}", path.display()));
    }

    Ok(())
}

fn read_to_string_limited(path: &Path, max_bytes: u64, label: &str) -> Result<String, String> {
    let metadata = std::fs::metadata(path)
        .map_err(|error| format!("读取{label}信息失败 {}：{error}", path.display()))?;
    if metadata.len() > max_bytes {
        return Err(format!(
            "{label}过大：{} 字节，最多允许 {} 字节。",
            metadata.len(),
            max_bytes
        ));
    }

    std::fs::read_to_string(path)
        .map_err(|error| format!("读取{label}失败 {}：{error}", path.display()))
}

fn validate_combat_history_entry(entry: &Value) -> Result<(), String> {
    let object = entry
        .as_object()
        .ok_or_else(|| "历史记录条目必须是对象。".to_string())?;
    let id = required_str(object, "id")?;
    sanitize_storage_name(id)?;
    required_str(object, "savedAt")?;
    required_str(object, "label")?;

    if let Some(source) = object.get("source").and_then(Value::as_str) {
        if !matches!(source, "live" | "replay" | "history") {
            return Err(format!("历史记录 source 不合法：{source}"));
        }
    }

    let record = object
        .get("record")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("历史记录 {id} 缺少 record 对象。"))?;
    required_str(record, "id")?;
    required_number(record, "durationMs")?;
    required_number(record, "totalDamage")?;
    required_number(record, "eventCount")?;
    required_number(record, "damageEventCount")?;
    required_array(record, "actors")?;
    required_array(record, "partyMembers")?;

    let raw_events = required_array(record, "rawEvents")?;
    if raw_events.len() > MAX_HISTORY_RAW_EVENTS {
        return Err(format!(
            "历史记录 {id} 的 rawEvents 过多：{} 条，最多允许 {} 条。",
            raw_events.len(),
            MAX_HISTORY_RAW_EVENTS
        ));
    }

    Ok(())
}

fn required_str<'a>(object: &'a serde_json::Map<String, Value>, field: &str) -> Result<&'a str, String> {
    object
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("历史记录缺少有效字段：{field}"))
}

fn required_number(object: &serde_json::Map<String, Value>, field: &str) -> Result<(), String> {
    object
        .get(field)
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
        .map(|_| ())
        .ok_or_else(|| format!("历史记录缺少有效数字字段：{field}"))
}

fn required_array<'a>(object: &'a serde_json::Map<String, Value>, field: &str) -> Result<&'a Vec<Value>, String> {
    object
        .get(field)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("历史记录缺少数组字段：{field}"))
}

fn append_json_line(path: PathBuf, state: &StorageState, value: &Value) -> Result<(), String> {
    let _guard = state
        .write_lock
        .lock()
        .map_err(|error| format!("锁定日志文件失败：{error}"))?;

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
