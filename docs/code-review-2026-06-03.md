# 代码审查报告

审查时间：2026-06-03

审查范围：拉取 `57b4fd3` 之后的全量新增和修改，共 45 个文件，+5944/-2015 行。

## 构建验证

已通过：

```bash
npm run build     # TypeScript + Vite：71 模块，通过
cargo check       # Rust 编译：通过
```

无编译错误。

## 问题 1（高风险/运行时）：lib.rs 缺少 .manage(StorageState)

位置：[src-tauri/src/lib.rs](D:/yzy/GBFR-DPScheck/src-tauri/src/lib.rs)

当前 `commands.rs` 里有 10 个命令使用了 `State<'_, StorageState>`：

```text
save_raw_event, load_raw_events, clear_raw_events,
load_loadout_tests, save_loadout_tests,
load_combat_history, save_combat_history_entry,
delete_combat_history_entry, export_combat_history,
import_combat_history
```

但在 `lib.rs` 没有调用：

```rust
.manage(StorageState::default())
```

Tauri v2 要求通过 `StorageState` 注入 `Mutex` 来保护并发写入。如果没有 `.manage()`，`app.state::<StorageState>()` 在运行时会返回错误。

影响：**所有涉及文件读写的后端命令都会在运行时失败**——raw events 保存不了、配装测试加载不了、历史记录完全不可用。

`cargo check` 不会报这个错，因为它是运行时问题。

修复：

```rust
tauri::Builder::default()
    .manage(StorageState::default())   // 加这一行
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(...)
```

加在 `.invoke_handler(...)` 之前或 `.plugin(...)` 之前均可。

## 问题 2（中风险）：normalizeDamageActionId 的 bonus 检测与原 GBFR-ACT 不同

位置：[src/combat/normalizer.ts:193-199](D:/yzy/GBFR-DPScheck/src/combat/normalizer.ts)

当前实现：

```ts
if (flags !== undefined && (flags & 0x10) !== 0) {
  return -0x100;
}
```

原 GBFR-ACT `act_ws.html`：

```js
if (flags & (1 << 15)) return -3
```

差异：

| 项 | 当前 | 原版 |
|---|------|------|
| 位检测 | `0x10`（bit 4） | `0x8000`（bit 15） |
| 返回 ID | `-0x100` | `-3` |

`actionNames.ts` 里的映射也是按原版的 `-3`、`-256` 等值：

```ts
'-3': '追击',
'-256': '持续伤害',
'-1': 'Link',
'-2': '奥义',
```

如果 `normalizeDamageActionId` 返回的 ID 和 `actionNames` 的键对不上，动作名映射会落到 fallback。

建议：确认游戏真实 flags 含义后统一；如果不确定，先按原版值对齐。

## 问题 3（低风险）：finalizeActors 中 damageEvents 每次事件都全量浅拷贝

位置：[src/combat/statistics.ts](D:/yzy/GBFR-DPScheck/src/combat/statistics.ts)

每次 `applyCombatEvent` 调用时 `createActorMap` 都会把已累积的 damageEvents 数组浅拷贝一遍。10000 条事件 → O(n²) 拷贝，长时间战斗可能引起性能下降。

建议：后续改为增量更新最近 60 秒 DPS，不再维护完整 damageEvents 数组。

## 问题 4（低风险）：动作名解析硬编码 zhs

位置：[src/combat/gbfrActActionTextParser.ts](D:/yzy/GBFR-DPScheck/src/combat/gbfrActActionTextParser.ts)

只解析 GBFR-ACT 的 `zhs` 语言块。如果用户使用 `ja`、`en` 等语言，动作名映射会失败。

## 问题 5（低风险）：websocket_url_to_address 不处理 IPv6

位置：[src-tauri/src/gbfr_act.rs](D:/yzy/GBFR-DPScheck/src-tauri/src/gbfr_act.rs)

对 `ws://[::1]:24399` 会错误解析。当前默认地址是 `ws://127.0.0.1:24399`，实际影响很小。

## 问题 6（低风险）：导入/导出手动输入路径

位置：[src/features/dashboard/DashboardPage.tsx](D:/yzy/GBFR-DPScheck/src/features/dashboard/DashboardPage.tsx)

历史导入/导出仍使用手动输入路径，建议后续改用 Tauri 文件选择器。

## 问题 7（低风险）：uac_start.cmd 启动可能弹两个 cmd 窗口

位置：[src-tauri/src/gbfr_act.rs](D:/yzy/GBFR-DPScheck/src-tauri/src/gbfr_act.rs)

`cmd /C start "" xxx.cmd` 本身弹一个窗口，然后 uac_start.cmd 内部 UAC 提升又弹一个。不算 bug，但用户体验可以优化。

## 整体评价

这轮推进把项目从 M4 推进到了实质性功能完备：

- 独立 Overlay 窗口（透明、置顶、鼠标穿透、拖动、自动保存位置）
- 动作名映射（GBFR-ACT act_ws_texts 解析）
- 配装文本解析（武器/因子/技能/加护中文名）
- 配装测试页面（保存/删除/筛选/排序/同角色汇总/多轮对比）
- 历史记录管理（保存/删除/重命名/筛选/排序/导入/导出）
- 战斗图表（DPS 时间线、角色伤害柱、技能伤害柱）
- auto_start 自动启动逻辑
- Tauri CSP 安全策略
- 导入大小限制、条数限制、schema 校验、安全 id 校验
- 统计源和展示缓冲拆分（2000 条展示缓冲 + 完整 combatEvents）
- 手动重置当前记录
- 木桩/任务/通用区域关键词识别
- 双 Mock 模式（基础 + 木桩多轮）

建议修完问题 1 后继续运行实机验收，特别是独立 Overlay 窗口在真实游戏中的表现。
