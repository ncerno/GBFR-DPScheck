# GBFR-DPScheck 问题审查记录

日期：2026-06-03

范围：项目结构、文档、前端 React/TypeScript、Tauri/Rust 后端、GBFR-ACT WebSocket 数据流、战斗分段、统计、Overlay、历史记录导入导出。

验证结果：

- `npm run build`：通过。
- `C:/Users/great/.cargo/bin/cargo.exe check --manifest-path "D:/yzy/GBFR-DPScheck/src-tauri/Cargo.toml" --offline`：通过。
- 未做真实游戏环境验证。
- 未做 `npm run tauri:dev` UI 人工验证。

本轮处理结果：

- 问题 1 已修复：`useGbfrActStream` 拆分 `events` 展示缓冲和 `combatEvents` 完整统计源；Overlay、Dashboard、历史保存和设置页统计预览改用完整统计源。
- 问题 2 已修复：Tauri 环境加载配置后会按 `gbfr_act.auto_start` 检查服务，端口不可连接时尝试启动 GBFR-ACT，并通过 `operationMessage` 写入结果。
- 问题 3 已修复：独立 Overlay 开启鼠标穿透后，小窗不再展示不可点击的“取消穿透”按钮，改为提示回主窗口关闭穿透。
- 问题 4 已部分修复：历史导入/导出增加 `.json` 限制、导入文件大小限制、导入条数限制、schema 校验和安全 id 校验；Tauri 文件选择器与导入覆盖确认仍作为后续增强。
- 问题 5 已修复：`tauri.conf.json` 已补充最小 CSP，允许本地资源、内联样式和本地 WebSocket 连接。

## 总结

项目主流程结构清楚，文档和实现大体一致，基础构建可通过。审查时发现的核心数据正确性问题是“统计只基于最近 2000 条事件”；本轮已通过完整统计源修复。

## 问题清单

### 1. 高优先级：长时间战斗统计会被截断

相关位置：

- `src/app/useAppRuntime.ts:40-46`
- `src/gbfr-act/useGbfrActStream.ts:52-71`
- `src/gbfr-act/useGbfrActStream.ts:121-143`

现象：

`useAppRuntime` 把 `maxEvents` 固定为 `2000`，而 `combatReplay` 直接使用 `stream.events` 做全量回放统计。`useGbfrActStream` 每次写入事件时都会执行 `.slice(0, maxEvents)`，超过 2000 条后，早期事件会从内存统计源中消失。

影响：

- Overlay / Dashboard 的总伤害、DPS、技能统计可能只基于最近 2000 条事件。
- 保存历史记录时，保存的也可能是不完整战斗记录。
- 长时间实时 WebSocket 即使没有断线，统计结果也可能静默错误。
- 文档强调 raw events 是核心调试资产，但实时统计链路实际会丢历史事件。

建议修复方向：

把“统计事件源”和“Raw Event Viewer 展示缓冲”拆开：

- 统计层维护完整当前 `CombatRecord`，不要依赖截断后的 `stream.events`。
- Raw Event Viewer 可以继续只保留最近 N 条用于展示。
- 历史保存应保存完整记录或对应完整 raw events。
- 如果担心内存增长，需要按战斗分段归档，而不是简单截断事件数组。

### 2. 中优先级：`auto_start` 配置存在，但没有实际自动启动逻辑

相关位置：

- `src/config/appConfig.ts:42-46`
- `src-tauri/src/config.rs:70-77`
- `src/features/settings/SettingsPage.tsx:69-76`
- `src/app/useAppRuntime.ts:104-121`

现象：

配置里有 `gbfr_act.auto_start`，设置页也有“自动启动 GBFR-ACT”开关，但 `loadConfig()` 加载配置后没有根据该字段自动检查或启动 GBFR-ACT。

影响：

用户勾选“自动启动 GBFR-ACT”后，下次启动应用不会自动启动服务，容易误判为功能失效。

建议修复方向：

- 在 Tauri 环境加载配置后，如果 `auto_start === true`，触发一次服务检查。
- 若端口不可连接，再调用启动逻辑。
- 需要避免开发热重载或组件重复挂载时反复弹 UAC。
- 自动启动结果应写入 `operationMessage` 或专门的启动状态。

### 3. 中优先级：Overlay 窗口开启鼠标穿透后，窗口自身按钮无法再关闭穿透

相关位置：

- `src/features/overlay/OverlayView.tsx:61-67`
- `src/features/overlay/OverlayWindowPage.tsx:64-85`
- `src/app/overlayWindow.ts:64-77`

现象：

Overlay 独立窗口内有“鼠标穿透 / 取消穿透”按钮，但开启穿透后会调用 `setIgnoreCursorEvents(true)`。这会让整个 Overlay 窗口忽略鼠标事件，因此用户无法再点击 Overlay 窗口里的“取消穿透”。

影响：

用户只能回到主窗口关闭穿透。如果主窗口被游戏遮挡或不在前台，体验会像 Overlay 进入了不可操作状态。

建议修复方向：

可选方案：

1. 保留主窗口关闭穿透入口，并在 Overlay 小窗内明确提示“开启后需回主窗口关闭”。
2. 增加快捷键或托盘菜单关闭穿透。
3. 如果后续引入局部穿透，需要确保工具栏仍可接收鼠标事件；否则不要在 Overlay 自身提供“取消穿透”按钮。

### 4. 低到中优先级：历史导入/导出路径完全信任用户输入，缺少文件选择和 schema 校验

相关位置：

- `src/features/dashboard/DashboardPage.tsx:416-428`
- `src-tauri/src/storage.rs:156-190`
- `src-tauri/src/storage.rs:249-266`

现象：

Dashboard 里由用户手动输入导入 / 导出路径，后端通过 `PathBuf::from` 直接接受。导入时只要求 JSON 是数组，然后逐条写入历史记录。历史记录 `id` 会经过字符过滤后变成目录名。

影响：

- 用户可能误覆盖任意 JSON 文件。
- 导入超大文件可能导致卡顿或内存压力。
- 导入结构异常但形式合法的记录，可能造成历史列表异常。
- 不同非法 id 清洗后可能碰撞，导致覆盖非预期记录。

建议修复方向：

- 使用 Tauri 文件选择器代替手写路径。
- 限制导入文件扩展名和文件大小。
- 导入前校验 schema：`id`、`savedAt`、`label`、`record`、`rawEvents` 等字段。
- `id` 不符合安全格式时直接拒绝，不要清洗后继续写。
- 导入前展示将导入条数和覆盖条数。

### 5. 低优先级：Tauri CSP 当前为 null

相关位置：

- `src-tauri/tauri.conf.json:24-26`

现象：

Tauri 配置中 `csp` 为 `null`。

影响：

当前代码没有明显 XSS 点，且主要是本地桌面应用。但后续如果引入外部内容、富文本、第三方页面或更复杂的 raw event 展示，缺少 CSP 会降低防护边界。

建议修复方向：

发布前补充最小可用 CSP。先保持只允许本地资源和必要的 WebSocket 连接，避免过宽配置。

## 暂未确认的问题

以下内容不是当前代码层面的确定 bug，需要实机或环境验证：

- 独立 Overlay 在真实游戏无边框窗口、全屏独占下的置顶、透明和鼠标穿透表现。
- 长时间真实 WebSocket 事件流下的稳定性。
- 真实任务区域名下 `auto` 分段关键词覆盖率。
- 干净 Windows 环境安装包启动、WebView2、管理员权限、端口占用等问题。

## 建议处理顺序

1. 先修复“统计事件源被 2000 条上限截断”。这是影响数据正确性的核心问题。
2. 再补齐 `auto_start` 实际逻辑，避免配置与行为不一致。
3. 调整 Overlay 穿透交互，避免用户无法从小窗恢复。
4. 改进历史导入/导出路径和 schema 校验。
5. 发布前补 CSP、隐私说明、FAQ 和实机验收记录。
