# 技术计划

更新时间：2026-06-04

## 目标

GBFR-DPScheck 的目标是消费 GBFR-ACT WebSocket 事件流，在此基础上提供：

- 实时透明 Overlay
- 会话分析 Dashboard
- 队伍和技能统计
- 配装测试管理
- raw events 保存、回放、排错
- 历史记录归档和导入/导出

项目不直接接入游戏进程，不实现 hook、注入、绕过或反检测逻辑。

## 架构

```text
GBFR-ACT
  -> WebSocket
  -> src/gbfr-act/
  -> useGbfrActStream
  -> src/combat/
  -> useAppRuntime
  -> Overlay / Dashboard / Loadout / Settings
  -> Tauri commands
  -> local records
```

## 前端模块

```text
src/app/
  App.tsx
  routes.ts
  useAppRuntime.ts
  overlayWindow.ts
  useOverlayWindowBridge.ts

src/gbfr-act/
  client.ts
  connection.ts
  events.ts
  useGbfrActStream.ts

src/combat/
  actionNames.ts
  areaStrategy.ts
  charts.ts
  gbfrActActionTextParser.ts
  models.ts
  normalizer.ts
  replay.ts
  segmenter.ts
  statistics.ts

src/features/
  dashboard/
  debug/
  loadout/
  onboarding/
  overlay/
  settings/
```

## 后端模块

```text
src-tauri/src/
  commands.rs
  config.rs
  gbfr_act.rs
  lib.rs
  storage.rs
```

后端职责：

- 配置读写
- 诊断路径
- GBFR-ACT 服务检查和启动
- GBFR-ACT 文本资源读取
- raw events 保存/读取/清空
- 配装测试保存/读取
- 战斗历史保存/读取/删除/导入/导出

## 数据模型原则

- 统计逻辑放在 `src/combat/`。
- UI 只展示 `CombatRecord` 和派生图表数据，不重新计算核心统计。
- 原始事件保留在 `rawEvents`，方便回放和复算。
- `useGbfrActStream.events` 是 Raw Event Viewer 展示缓冲，`useGbfrActStream.combatEvents` 是完整统计源。
- 统计只归属队伍玩家源的正伤害，敌方和场地伤害保留 raw events 但不计入团队 DPS。
- 同队员的临时 actor / 分身按 actorType + objectId 归并回 party member。
- `CombatTargetStats` 保留全部目标承伤明细。
- 团队/个人 DPS 只统计主目标：排除投射物、场地、水晶、武器部件和低占比次要目标，Dashboard 目标表显示是否计入 DPS。
- 不实现团队增伤归因字段和界面组件。当前 GBFR-ACT WebSocket 未提供 BUFF / DEBUFF 施加、移除或增伤归因事件，项目只展示可可靠计算的 DPS。
- 本地 raw events 回放只作为调试辅助，不作为主产品形态。

## 战斗分段

策略：

- `auto`：根据区域名关键词自动识别；未知或缺失区域名按任务处理。
- `training`：木桩/训练/配装测试，使用较短空窗。
- `quest`：任务/Boss/副本。
- `generic`：通用区域。

关键词维护位置：

```text
src/combat/areaStrategy.ts
```

分段规则：

- `enter_area` 可启动新记录。
- 只有 `training` 下，长时间无伤害后下一次伤害可启动新记录，用于木桩多轮测试。
- `quest` / `generic` 下不按空窗时间切段，主要依赖区域切换和手动重置。
- `gbfr_dpscheck_manual_reset` 可手动切断当前记录。
- 木桩默认空窗 10 秒。
- 通用空窗配置保留，但当前不再用于任务地图切分。
- 当前实机日志中的 `enter_area` 多数没有 `area_name` 或 `area_id`，只能作为区域切换信号；真实地图名需要 GBFR-ACT 继续扩展上报字段。

## Overlay

已实现：

- 主窗口内 Overlay。
- 独立 Tauri Overlay 窗口。
- 主窗口向独立窗口同步快照。
- 透明、置顶、无边框、跳过任务栏。
- 鼠标穿透开关。
- 位置和尺寸持久化。
- 独立 Overlay 采用固定逻辑尺寸整体缩放，窗口缩放时保持内部比例。
- 开启鼠标穿透后，小窗提示回主窗口关闭穿透。
- Overlay 窗口模式会强制 `html/body/#root` 透明，避免 WebView 根背景遮住透明窗口。
- HUD 背景半透明，伤害色条使用高对比暗底和高不透明度色块。
- 队员名在可用时显示 `玩家名（角色名）`。

## 首次使用向导

已实现：

- 首页展示首次使用向导，未完整连接前保持展开。
- 向导支持打开 GBFR-ACT 下载页。
- 向导支持填写 `act_ws.py` 路径或 GBFR-ACT 文件夹路径。
- 保存路径时后端校验并规范化为 `act_ws.py` 文件路径。
- 保存后自动写入配置、加载文本资源并尝试启动 GBFR-ACT。
- 向导提供连接 WebSocket 和打开 Overlay 小窗入口。
- 设置页保留高级能力，但 Mock、Raw Events 和诊断信息默认收起。

实机验收项：

- 无边框、透明、鼠标穿透和全屏基础表现已基本通过。
- 长时间运行时的同步稳定性。

## Dashboard

已实现：

- 当前记录和历史记录双来源。
- 保存当前记录为历史。
- 历史记录筛选、排序、重命名、删除。
- 历史记录导入/导出。
- 总览、队伍表、技能表、队伍/配装信息。
- DPS 时间线、角色伤害柱、技能伤害柱。
- 所选记录 raw events 展开。

后续增强：

- 历史记录批量删除。
- 更细的时间窗口选择。
- 导出 CSV。

## 配装测试

已实现：

- 从 CombatRecord 保存配装测试。
- 保存手动备注和原始 load_party 配装字段。
- 本地读写 `records/loadout-tests.json`。
- 解析 GBFR-ACT `assets/dump_texts.js`。
- 筛选、搜索、排序。
- 同角色汇总和多轮对比。

后续增强：

- 更稳定的 GBFR-ACT 字段兼容表。
- 按武器、因子、词条过滤。
- 更细的同角色同条件对比。

## 历史记录

存储格式：

```text
records/combat-history/<history-id>/record.json
records/combat-history/<history-id>/raw-events.jsonl
records/combat-history-export.json
```

命令：

```text
load_combat_history
save_combat_history_entry
delete_combat_history_entry
export_combat_history
import_combat_history
```

导入/导出：

- Dashboard 路径输入留空时使用默认 `records/combat-history-export.json`。
- 指定路径时读写用户填写的 JSON 文件。
- 导入时按 `id` 合并，重复 id 覆盖。
- 导入/导出路径必须是 `.json`。
- 导入限制文件大小和条数，并校验 `id`、`savedAt`、`label`、`record`、`rawEvents` 等字段。
- 历史记录 id 只能包含英文字母、数字、短横线和下划线，非法 id 直接拒绝。

## 安装包和发布

打包命令：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:build
```

发布前必须完成：

- 干净 Windows 环境安装测试。
- 发布页引用 `docs/faq.md`。
- 发布页引用 `docs/privacy.md`。
- 发布页引用 `docs/third-party-notices.md`。
- 发布页引用 `docs/user-quick-start.md`。
- 按 `docs/clean-windows-test.md` 记录干净 Windows 验收结果。
- CSP 已限制为本地资源、内联样式和本地 WebSocket 连接；如果后续支持非本机 WebSocket，需要同步扩展白名单。

当前本机已通过 `npm run tauri:build`，生成：

```text
src-tauri\target\release\bundle\msi\GBFR-DPScheck_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\GBFR-DPScheck_0.1.0_x64-setup.exe
```

## 源代码归档和 Git 交付

交付记录：

```text
docs/release-package-2026-06-03.md
```

本地源代码归档：

```text
D:\yzy\GBFR-DPScheck-source-2026-06-03.zip
```

归档包含源码、配置、lockfile 和文档；排除 `.git`、`node_modules`、`dist`、`src-tauri/target`、日志和本机环境文件。

Git 远端：

```text
origin https://github.com/ncerno/GBFR-DPScheck.git
```

目标分支：

```text
main
```

## 验收标准

无游戏环境：

- `npm run build` 通过。
- Rust `cargo check --offline` 通过。
- `npm run tauri:build` 通过。
- Mock 回放能生成 CombatRecord。
- 木桩多轮 Mock 能切出多条记录。
- Dashboard 图表、历史保存、重命名、导入、导出可用。
- 配装测试保存、筛选、排序、对比可用。

有游戏环境：

- GBFR-ACT 能启动并连接 WebSocket。
- 木桩和任务都能产生正确统计。
- Overlay 独立窗口能显示实时数据。
- 鼠标穿透开关可控。
- 保存历史后重启应用仍可查看。

## 风险

- GBFR-ACT 事件字段可能变更，需要保持 normalizer 兼容。
- GBFR-ACT 文本资源结构可能变更，需要维护解析器。
- 全屏独占模式下 Windows 透明置顶窗口可能不可见。
- raw events 和历史记录可能包含用户名、路径等隐私信息。
