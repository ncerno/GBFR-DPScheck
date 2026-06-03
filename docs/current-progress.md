# 当前进度与交接清单

更新时间：2026-06-04

## 一句话状态

项目已经完成 GBFR-ACT WebSocket 消费、raw events 保存/回放、战斗分段、统计模型、Overlay、Dashboard、配装测试、动作名/配装文本解析、历史记录管理、首页首次使用向导和无游戏 Mock 验证链路。Overlay 实机基础验收已基本通过，公开发布前材料已补齐；当前没有已知代码阻塞项，剩余重点是干净 Windows 安装验收和长时间实机稳定性观察。

## 已完成

### 代码复盘与清理

- 清理旧的前端 Noop 存储适配器和未使用的战斗摘要保存命令。
- 清理解析失败和 Overlay 创建失败的控制台日志，改为通过现有状态/异常链路反馈。
- 修复 WebSocket 重连时旧 client 回调可能覆盖新连接状态的问题。
- 拆分 Raw Event Viewer 展示缓冲和完整战斗统计源，长时间战斗统计不再被 2000 条展示缓冲截断。
- `load_party` 兼容 `data` 直接为数组和 `data.members` 两种结构。
- `auto_start` 配置已接入启动流程，Tauri 环境加载配置后会检查并尝试启动 GBFR-ACT。
- 独立 Overlay 创建失败现在会返回到调用方，不再误报“已打开”。
- 独立 Overlay 开启鼠标穿透后提示回主窗口关闭，避免展示不可操作的“取消穿透”按钮。
- 历史记录存储错误信息统一为中文，并清理重复保存时可能残留的旧 `raw-events.jsonl`。
- 历史导入/导出增加 `.json` 限制、导入大小限制、导入数量限制、schema 校验和安全 id 校验。
- Tauri CSP 从 `null` 改为最小本地资源和本地 WebSocket 白名单。
- 独立 Overlay 队员名显示为 `玩家名（角色名）`，缺失玩家名或角色名时自动回退到现有名称。
- 补充发布前 FAQ、隐私说明、第三方署名/授权说明和干净 Windows 验收清单。
- 新增首页首次使用向导：打开 GBFR-ACT 下载页、填写 `act_ws.py` 或 GBFR-ACT 文件夹、保存并启动、连接 WebSocket、打开 Overlay 小窗。
- 设置页已精简，Mock、Raw Events、诊断信息和回放工具默认收进“高级调试”。
- README 已改为面向普通用户的说明，开发和验收信息移入 docs。

### GBFR-ACT 接入

- 配置 WebSocket URL，默认 `ws://127.0.0.1:24399`。
- 检查 GBFR-ACT WebSocket 端口。
- 后台启动 GBFR-ACT：查找 Python 3.11 64-bit 后隐藏控制台启动 `act_ws.py`，并通过 UAC 请求管理员权限。
- 实时事件区分 `live` 和 `replay` 来源。
- 记录事件计数、缓冲事件数、事件类型计数、最后事件时间和最后伤害时间。
- 自动启动开关生效：加载配置后会先检查端口，不可连接时再尝试启动 GBFR-ACT。

### Raw Events

- Raw Events 默认不自动持久化，避免长时间运行产生过多日志。
- 设置页可手动开启实时采集到 `records/raw-events.jsonl`，也可手动追加保存当前内存事件样本。
- 支持清空 raw events。
- 支持加载本地 raw events 做调试回放，不重新写回日志。
- Raw Event Viewer 只展示最近缓冲事件，统计链路使用完整 `combatEvents`。
- 读取时使用 serde_json 流式反序列化，兼容旧日志中 JSON 对象黏连的情况。

### 战斗统计

核心目录：

```text
src/combat/
```

已支持：

- `enter_area`
- `load_party`
- `damage`
- `inc_death_cnt`
- 内部手动重置事件 `gbfr_dpscheck_manual_reset`
- actor key 生成
- party member 识别，兼容数组式和 `members` 字段式 `load_party`
- 总伤害
- DPS
- 最近 60 秒 DPS
- 伤害占比
- 死亡次数
- 只统计队伍玩家源的正伤害，敌方/场地来源保留在 raw events 中但不进入团队 DPS。
- 同一队员的临时 actor / 分身如果 actorType 和 objectId 匹配，会归并回队伍成员。
- 技能/动作伤害统计
- 最小、最大、平均伤害
- 已移除团队增伤归因字段和界面组件；当前只展示可从 GBFR-ACT 日志可靠计算的 DPS。
- 目标统计保留全部目标承伤；团队/个人 DPS 只统计主目标。
- 主目标过滤会排除投射物、场地、水晶、武器部件，以及低于主目标伤害阈值的次要目标/小怪。
- 实机 raw events 复查确认：路西法战中 `Em7700` 本体计入 DPS，`We7700` 完全否认之剑和 `Em7700Trial8_11Crystal` 等机制目标排除。

### 分段策略

- 配置项：`auto` / `training` / `quest` / `generic`。
- `auto` 通过 `src/combat/areaStrategy.ts` 的关键词表识别训练、木桩、任务、Boss 等区域。
- `auto` 遇到未知或缺失区域名时按 `quest` 处理，避免真实任务因停手时间或过场动画被误切段。
- `training` 使用独立空窗秒数，默认 10 秒。
- 只有 `training` 使用无伤害空窗切分多轮木桩测试；`quest` / `generic` 不再按无伤害空窗切地图。
- 真实 GBFR-ACT `enter_area` 当前通常不携带 `area_name` / `area_id`，因此可准确识别区域切换事件，但不能从现有日志恢复真实地图名称。
- 设置页支持调整策略和空窗秒数。
- 设置页支持手动重置当前记录。

### Overlay

文件：

```text
src/features/overlay/OverlayPage.tsx
src/features/overlay/OverlayView.tsx
src/features/overlay/OverlayWindowPage.tsx
src/features/overlay/overlaySnapshot.ts
src/app/overlayWindow.ts
src/app/useOverlayWindowBridge.ts
```

已支持：

- 主窗口内 Overlay 和独立 Overlay 共享同一个展示组件。
- 独立窗口通过 Tauri event 接收主窗口 runtime 快照，不重复建立 WebSocket。
- 独立窗口透明、置顶、无边框、跳过任务栏。
- 独立窗口使用紧凑 damage meter 风格，固定逻辑画布整体缩放，避免窗口缩小时内部控件被挤没。
- 独立窗口已强制 overlay 模式下 `html/body/#root` 透明，避免 WebView 根背景遮住窗口透明效果。
- HUD 背景半透明，伤害色块使用高对比暗底和高不透明度色条。
- 队员名在可用时显示 `玩家名（角色名）`，方便识别玩家和操控角色。
- 鼠标穿透开关。
- 位置和尺寸保存到配置。
- 透明度、紧凑模式、宽高配置。

实机验收状态：

- 无边框、透明、鼠标穿透和全屏基础表现已由实机测试基本确认。
- 仍建议在干净 Windows 环境和长时间运行场景中复测窗口稳定性。

### Dashboard

文件：

```text
src/features/dashboard/DashboardPage.tsx
src/combat/charts.ts
```

已支持：

- 当前记录列表。
- 历史记录列表。
- 保存当前记录为历史。
- 历史记录筛选、排序、重命名、删除。
- 历史记录导入/导出。
- 总览卡片。
- DPS 时间线。
- 角色伤害柱。
- 技能伤害柱。
- 队伍详情表。
- 选中角色后查看技能详情。
- 队伍/配装基础信息。
- 所选记录 raw events 折叠查看。

### 配装测试

文件：

```text
src/features/loadout/LoadoutPage.tsx
src/features/loadout/loadoutText.ts
```

已支持：

- 从 CombatRecord 保存配装测试。
- 本地读取、保存、删除 `records/loadout-tests.json`。
- 手动填写测试名称、角色、武器备注、因子/加护备注和其他备注。
- 保存 `load_party` 原始 weapon / sigils / over_mastery / raw member。
- 解析 GBFR-ACT `assets/dump_texts.js` 中的武器、因子、技能、加护和突破上限中文名。
- 展示当前记录配装摘要。
- 历史测试筛选、搜索、排序。
- 同角色汇总和同角色多轮 DPS 对比。

### 动作名映射

文件：

```text
src/combat/actionNames.ts
src/combat/gbfrActActionTextParser.ts
```

已支持：

- 根据配置中的 `act_ws.py` 路径定位 GBFR-ACT 目录。
- 读取 `assets/act_ws_texts.js`。
- 安全解析 `game.actions`，不执行外部 JS。
- 按 `actorType + action_id` 解析动作名。
- 通用动作 fallback。
- 未匹配动作保留 fallback 名称，例如 `PL1200 动作 201`。

### 历史记录

存储目录：

```text
records/combat-history/<history-id>/record.json
records/combat-history/<history-id>/raw-events.jsonl
records/combat-history-export.json
```

Tauri commands：

```text
load_combat_history
save_combat_history_entry
delete_combat_history_entry
export_combat_history
import_combat_history
```

## 已验证

当前机器已验证：

- `npm run build`
- `cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml" --offline`
- `npm run tauri:build`
- `git diff --check`
- 静态扫描无调试日志、旧命令、未完成标记和 CSP 空配置残留。

Rust 环境：

- Rust stable toolchain：`C:\Users\great\.cargo\bin`
- Visual Studio Build Tools 2022 DevCmd：

```text
C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat
```

Cargo 用户镜像：

```text
C:\Users\great\.cargo\config.toml
```

## 当前仍需验收

以下项目仍建议继续验证：

- 干净 Windows 环境安装、启动、WebView2 缺失处理和卸载残留。
- 长时间实时采集后的窗口稳定性。
- 真实任务、多人联机、不同区域名的分段准确性。

## 下一步实机验收清单

1. 启动游戏和 GBFR-ACT。
2. 在设置页检查服务并连接 WebSocket。
3. 打木桩，确认 `training` 分段、DPS、技能占比和配装保存。
4. 进入任务，确认 `quest` 或 `generic` 分段。
5. 打开独立 Overlay，分别验证普通窗口、无边框窗口和全屏独占。
6. 开关鼠标穿透，确认能否操作游戏和关闭穿透。
7. 保存 Dashboard 历史记录，重启应用后确认历史仍可读取。

## 公开发布前清单

- 在干净 Windows 环境安装运行。
- 按 `docs/clean-windows-test.md` 完成安装和卸载验收。
- 发布页引用 `docs/user-quick-start.md`、`docs/faq.md`、`docs/privacy.md` 和 `docs/third-party-notices.md`。
- 发布状态见 `docs/release-status.md`。
- 继续收集长时间实机运行日志，复查目标过滤和分段边界。

当前本机已生成安装包：

```text
src-tauri\target\release\bundle\msi\GBFR-DPScheck_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\GBFR-DPScheck_0.1.0_x64-setup.exe
```

源代码和文档交付归档记录：

```text
docs/release-package-2026-06-03.md
```

本地归档文件：

```text
D:\yzy\GBFR-DPScheck-source-2026-06-03.zip
```
