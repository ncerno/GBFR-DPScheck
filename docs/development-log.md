# 开发日志

更新时间：2026-06-04

## 阶段概览

本项目从 Tauri + React 框架推进到可用的 GBFR-ACT 客户端基础版。当前已具备实时接入、回放调试、统计、Overlay、Dashboard、配装测试和历史记录管理能力。

## 已完成时间线

### 1. 项目框架

- Tauri 2
- React 18
- TypeScript
- Vite
- Rust 后端 commands/config/storage/gbfr_act 分层
- 中文 UI 基础结构

### 2. GBFR-ACT 接入

- 配置 WebSocket URL。
- 检查 GBFR-ACT 端口。
- 启动 GBFR-ACT。
- 后台启动 GBFR-ACT `act_ws.py`，隐藏控制台并通过 UAC 请求管理员权限。
- 区分实时 `live` 和调试 `replay` 事件源。

### 3. Raw Events

- Raw Events 默认不自动落盘，避免长时间实机测试产生过多日志。
- 设置页可手动开启实时采集，也可手动追加保存当前内存事件样本到 `records/raw-events.jsonl`。
- 后端提供写入 `records/raw-events.jsonl` 的命令。
- `Mutex` 串行化写入，避免高频事件并发写入黏连。
- 加载本地 raw events 时只注入前端回放，不重新持久化。
- Raw Event Viewer 显示事件和解析错误。

### 4. 事件标准化与统计

- 标准化 `enter_area`、`load_party`、`damage`、`inc_death_cnt`。
- 维护 actor ref、party member 和 raw actor。
- 统计总伤害、DPS、最近 60 秒 DPS、占比、死亡次数。
- 过滤敌方/场地来源伤害，仅队伍玩家正伤害进入团队 DPS；同 objectId 的临时 actor 归并回队员。
- 统计技能/动作伤害、最小/最大/平均值。
- 团队增伤归因不实现，避免在缺少归因数据时误导用户。

### 5. 分段策略

- 支持 `auto`、`training`、`quest`、`generic`。
- 支持通用空窗秒数和木桩独立空窗秒数。
- `auto` 对未知但非空区域名按 `quest` 处理，避免真实任务因停手时间被切成多段。
- 新增内部手动重置事件 `gbfr_dpscheck_manual_reset`。
- 设置页新增分段策略配置和木桩多轮 Mock。
- `src/combat/areaStrategy.ts` 集中维护区域识别关键词。

### 6. Overlay

- Overlay 内嵌页接入统计模型。
- 独立 Tauri Overlay 窗口基础版完成。
- 主窗口通过 `overlay:snapshot` 推送 runtime 快照。
- 独立窗口不重复创建 WebSocket，不重复写 raw events。
- 支持置顶、透明、无边框、跳过任务栏、鼠标穿透。
- 支持窗口位置和尺寸保存。
- 独立 Overlay 重做为紧凑 damage meter 样式，内部固定逻辑尺寸并随窗口整体缩放。

### 7. Dashboard

- 接入实时/回放 CombatRecord。
- 支持选择记录和选择角色。
- 展示总览、队伍详情、技能详情、队伍/配装基础信息。
- 新增 DPS 时间线、角色伤害柱、技能伤害柱。
- 新增所选记录 raw events 折叠查看。

### 8. 配装测试

- 从当前 CombatRecord 保存配装测试。
- 本地保存/读取/删除 `records/loadout-tests.json`。
- 保存手动备注和 `load_party` 原始配装字段。
- 解析 GBFR-ACT `assets/dump_texts.js`。
- 展示配装摘要和 raw 调试信息。
- 增加筛选、搜索、排序、同角色汇总和同角色多轮对比。

### 9. 动作名映射

- 读取 GBFR-ACT `assets/act_ws_texts.js`。
- 安全解析 `game.actions` 对象，不执行外部 JS。
- 统计层统一解析动作名。
- fallback 保留 actor、action_id 和来源信息。

### 10. 历史记录管理

- 新增 `records/combat-history/<history-id>/record.json`。
- 每条历史记录导出同目录 `raw-events.jsonl`。
- Dashboard 支持保存当前记录为历史、加载历史、删除历史。
- 新增筛选、排序、重命名。
- 新增导出/导入 JSON 文件，默认路径为 `records/combat-history-export.json`。

### 11. Rust 和构建环境

- 已安装 Rust stable toolchain。
- 已安装 Visual Studio Build Tools 2022 C++ 工具链。
- Cargo 配置 `rsproxy.cn` sparse 镜像，解决 crates.io 下载超时。
- Rust check 推荐在 VS 2022 DevCmd 中执行。

### 12. 代码复盘清理

- 修复 WebSocket 重连时旧 client 回调可能污染新连接状态的问题。
- 拆分 `events` 展示缓冲和 `combatEvents` 完整统计源，避免长时间战斗统计被 2000 条上限截断。
- 接入 `auto_start` 配置，加载配置后自动检查并尝试启动 GBFR-ACT。
- `load_party` 标准化兼容数组式 payload 和 `data.members` payload。
- Overlay 创建失败会向调用方返回错误。
- 独立 Overlay 开启鼠标穿透后提示回主窗口关闭，避免小窗提供无法点击的恢复按钮。
- 删除旧 Noop 存储适配器和未使用的战斗摘要保存命令。
- 清理前端控制台日志和无引用样式。
- 历史记录存储错误信息统一为中文，并处理无 raw events 保存时旧 jsonl 残留。
- 历史导入/导出增加 `.json` 限制、文件大小限制、条数限制、schema 校验和安全 id 校验。
- Tauri CSP 从 `null` 改为最小本地资源和本地 WebSocket 白名单。

### 13. 交付打包与文档整理

- 新增 `docs/release-package-2026-06-03.md`，记录源代码归档范围、排除项、验证命令、Git 交付分支和剩余实机验收项。
- README、当前进度、技术计划和开发日志同步到同一交付状态。
- 本地源代码归档路径：`D:\yzy\GBFR-DPScheck-source-2026-06-03.zip`。
- 归档排除 `.git`、`node_modules`、`dist`、`src-tauri/target`、日志和本机环境文件。

### 14. 实机日志复查与收尾修正

- 复查 `%APPDATA%\dev.ncerno.gbfr-dpscheck\records\raw-events.jsonl`，当前样本包含 5885 条事件：19 条 `enter_area`、5834 条 `damage`、13 条 `load_party`、19 条 `inc_death_cnt`。
- 确认真实 `enter_area` 多数不携带 `area_name` 或 `area_id`，因此现阶段只能准确识别区域切换事件，不能从日志恢复真实地图名。
- `auto` 在区域名缺失时按 `quest` 处理；只有 `training` 继续按无伤害空窗切分木桩多轮测试。
- 修复仅有 `enter_area` / 队伍信息但没有有效伤害时生成空战斗记录的问题。
- 接入目标过滤：目标详情保留全部承伤，DPS 口径只统计主目标，排除投射物、场地、水晶、武器部件和低占比次要目标。
- 复查路西法样本：`Em7700` 本体计入 DPS，`We7700` 完全否认之剑和 `Em7700Trial8_11Crystal` 等机制目标排除。
- 独立 Overlay 根节点透明化，避免 WebView `:root` 背景遮住透明窗口；HUD 背景半透明并增强伤害色条可读性。
- 删除团队增伤归因字段和界面组件：当前 GBFR-ACT 事件流没有 BUFF / DEBUFF 归因数据，不能可靠计算团队增伤贡献。

### 15. 发布前材料和 Overlay 识别优化

- 独立 Overlay 队员名在可用时显示为 `玩家名（角色名）`，缺失信息时回退到原展示名。
- 保持 Overlay 统计链路不变，仅在快照和展示层补充 `userName` / `characterName`。
- 新增 `docs/faq.md`：WebView2、管理员权限、端口占用、全屏 Overlay 限制和 raw events 体积说明。
- 新增 `docs/privacy.md`：说明 raw events、历史记录、配装测试和导出文件可能包含用户名、路径、队伍和战斗事件信息。
- 新增 `docs/third-party-notices.md`：说明 GBFR-ACT 为第三方项目，不随包分发，发布页需保留署名和链接。
- 新增 `docs/clean-windows-test.md`：整理干净 Windows 安装、GBFR-ACT 连接、Overlay、数据持久化和卸载验收清单。
- 用户实机反馈：Overlay 无边框、透明、鼠标穿透和全屏基础测试已基本通过。

### 16. 首次使用向导和流程精简

- 新增首页首次使用向导，把普通用户流程压缩为：下载 GBFR-ACT、填写 `act_ws.py` 或 GBFR-ACT 文件夹、保存并启动、连接 WebSocket、打开 Overlay。
- 新增后端命令 `normalize_gbfr_act_path`，支持校验 `act_ws.py` 文件路径或 GBFR-ACT 文件夹路径。
- 新增后端命令 `open_gbfr_act_download_page`，从应用内打开 GBFR-ACT 仓库页面。
- `useAppRuntime` 增加 `configureGbfrActPath` 和 `openGbfrActDownloadPage`，避免用户理解“先保存配置再启动”的顺序。
- 设置页改为日常设置优先，Mock、Raw Events、诊断路径和回放查看器默认收进“高级调试”。
- 新增 `docs/user-quick-start.md`，面向普通用户描述最短使用路径。

### 17. GBFR-ACT 后台启动

- 不再调用 GBFR-ACT 的 `uac_start.cmd`，因为该脚本会显式拉起管理员 `cmd.exe /k` 并在结束时 `pause`。
- 后端改为查找 Python 3.11 64-bit，并通过 PowerShell `Start-Process -Verb RunAs -WindowStyle Hidden` 后台启动 `act_ws.py`。
- 所有后台启动命令使用 `CREATE_NO_WINDOW`，避免 GBFR-DPScheck 启动时闪出命令行窗口。
- 打开 GBFR-ACT 下载页改为直接调用 `explorer`，不再通过 `cmd /C start`。

## 验证记录

2026-06-04 Overlay 名称展示和发布材料补充后复验通过：

- `npm run build`
- `cargo check --manifest-path src-tauri\Cargo.toml --offline`
- `cargo test --manifest-path src-tauri\Cargo.toml --offline`
- `cargo build --manifest-path src-tauri\Cargo.toml --release --offline`
- `npm run tauri:build`

2026-06-04 首次使用向导补充后复验通过：

- `npm run build`
- `cargo check --manifest-path src-tauri\Cargo.toml --offline`
- `cargo test --manifest-path src-tauri\Cargo.toml --offline`

2026-06-04 GBFR-ACT 后台启动修正后复验通过：

- `npm run build`
- `cargo check --manifest-path src-tauri\Cargo.toml --offline`
- `cargo test --manifest-path src-tauri\Cargo.toml --offline`
- `npm run tauri:build`

已通过：

```bash
npm run build
```

已通过：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml" --offline
```

已通过：

```bash
git diff --check
```

已通过静态扫描：无调试日志、旧命令、未完成标记和 CSP 空配置残留。

已通过：

```cmd
npm run tauri:build
```

生成安装包：

```text
src-tauri\target\release\bundle\msi\GBFR-DPScheck_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\GBFR-DPScheck_0.1.0_x64-setup.exe
```

## 无游戏验证流程

1. 运行 `npm run dev` 或 `npm run tauri:dev`。
2. 打开设置页。
3. 写入普通 Mock 或木桩多轮 Mock。
4. 检查 Overlay、Dashboard 和配装测试。
5. 在 Dashboard 保存历史记录。
6. 验证历史筛选、排序、重命名、导出、导入和 raw events 展开。

## 当前阻塞

本机当前不能启动游戏，因此以下仍需后续实机验证：

- 干净 Windows 环境安装、WebView2 缺失处理和卸载残留。
- 真实任务区域名下 `auto` 策略的覆盖率。
- 长时间实时 WebSocket 事件流下的稳定性。

## 后续发布准备

- 在干净 Windows 环境测试安装和启动。
- 按 `docs/clean-windows-test.md` 完成安装和卸载验收。
- 发布页引用 `docs/user-quick-start.md`、`docs/faq.md`、`docs/privacy.md` 和 `docs/third-party-notices.md`。
