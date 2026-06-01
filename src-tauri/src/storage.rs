use serde_json::Value;

pub async fn save_raw_event(_event: Value) -> Result<(), String> {
    // 后续写入 raw-events.jsonl。
    Ok(())
}

pub async fn save_summary(_summary: Value) -> Result<(), String> {
    // 后续写入 summary.json。
    Ok(())
}
