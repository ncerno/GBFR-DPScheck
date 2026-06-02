# 开发过程记录

本文档用于交接给后续 Agent。目标是让新的开发者/Agent 不需要翻完整对话，也能理解项目为什么这样做、已经踩过哪些坑、当前代码跑到哪里。

## 1. 项目背景

用户想做一个《碧蓝幻想 Relink》的 DPS 监测插件/客户端。

经过讨论后确定：

- 不自研底层游戏采集层。
- 不直接实现游戏进程注入、hook、反检测等逻辑。
- 复用成熟项目 GBFR-ACT 的 WebSocket 事件流。
- 本项目负责：事件消费、raw events 保存、统计计算、Overlay、Dashboard、配装测试和后续安装包。

参考数据源：<https://github.com/nyaoouo/GBFR-ACT>

本地 GBFR-ACT 克隆位置：

```text
D:\yzy\GBFR-ACT
```

本项目位置：

```text
D:\yzy\GBFR-DPScheck
```

GitHub 仓库：

```text
https://github.com/ncerno/GBFR-DPScheck
```

当前仓库是私有仓库。

## 2. 用户已确认的需求

### 2.1 项目形态

- 新写客户端，消费 GBFR-ACT WebSocket，不 fork GBFR-ACT。
- Tauri + TypeScript + Rust。
- 透明置顶 Overlay。
- 战后 Dashboard。
- 中文 UI。
- 后续公开发布 GitHub，并做安装包式社区工具。

### 2.2 统计需求

基础指标：

- 队员名称 / 角色
- 总伤害
- 总 DPS
- 最近 60 秒 DPS
- rDPS
- 战斗时长
- 死亡次数
- 伤害占比

明确不要：

- 基础指标里的命中次数。
- 技能分析里的技能命中数展示。

技能分析需要：

- 技能 / 动作名称
- 技能总伤害
- 技能伤害占比
- 单次最小伤害
- 单次最大伤害
- 单次平均伤害

配装测试第一版需要：

- 当前记录标记为配装测试。
- 手动填写角色、武器、因子/备注。
- 对比多次测试的 DPS、总伤害、战斗时长。
- 保存测试历史。

### 2.3 数据保存

- 默认保留 raw events。
- 暂不需要 CSV/JSON 导出按钮。
- 如果面板显示不全，后续再做 HTML/Web 报告页。

## 3. 关键架构决策

### 3.1 采集层复用 GBFR-ACT

GBFR-ACT 的 `act_ws.py` 会暴露 WebSocket，默认端口：

```text
24399
```

已确认事件类型：

- `enter_area`
- `load_party`
- `damage`
- `inc_death_cnt`

伤害事件样例：

```json
{
  "time_ms": 1780408315306,
  "type": "damage",
  "data": {
    "source": ["Pl1200", 45, 726311188, 0],
    "target": ["Em2700", 64, 2742660197, -1],
    "action_id": 201,
    "damage": 18848,
    "flags": 131072
  }
}
```

`load_party` 会包含角色、武器、因子、Over Mastery 等数据。真实样本里确认有：

- `c_name`: 角色名，例如夏洛特
- `common_info`: actor 标识，例如 `["Pl1200",45,726311188,0]`
- `weapon`
- `sigils`
- `over_mastery`

### 3.2 前端直接连 WebSocket

当前阶段前端直接连接：

```text
ws://127.0.0.1:24399
```

原因：

- 调试简单。
- GBFR-ACT 原版也是前端消费 WebSocket。
- Overlay / Dashboard 可以直接共享前端 runtime 状态。

后续如果要后台持续记录，可演进为 Rust 后端代理 WebSocket。

### 3.3 统计逻辑独立于 UI

统计相关代码集中在：

```text
src/combat/
```

当前文件：

- `models.ts`：CombatRecord / ActorStats / ActionStats 等模型。
- `normalizer.ts`：GBFR-ACT raw event 标准化。
- `segmenter.ts`：战斗分段。
- `statistics.ts`：伤害、DPS、动作统计。
- `replay.ts`：从 raw events 回放得到 records。

UI 不应直接重新计算统计，后续也应遵守这个原则。

### 3.4 App 级 runtime

当前应用级状态在：

```text
src/app/useAppRuntime.ts
```

它负责：

- 加载配置。
- 保存配置。
- 检查 GBFR-ACT 服务。
- 启动 GBFR-ACT。
- 管理 WebSocket 事件流。
- 保存 raw events。
- 清空 raw events。
- 加载本地 raw events。
- 生成 `combatReplay`。

Overlay、Dashboard、Settings 共用同一个 runtime。

## 4. 已遇到的问题和修复

### 4.1 Rust / Tauri 链接环境问题

问题：初装 Rust 后 `cargo check` 报：

```text
link.exe failed
```

原因：bash 环境优先找到了 Git 自带的：

```text
D:\Git\usr\bin\link.exe
```

而不是 MSVC 的 `link.exe`。

解决：通过 Visual Studio DevCmd 环境运行 Rust 命令。

临时脚本写法：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml"
```

注意：普通 bash 直接跑 `cargo check` 可能仍然会拿到错误的 `link.exe`。

### 4.2 Windows SDK 缺失

问题：

```text
LINK : fatal error LNK1181: 无法打开输入文件“kernel32.lib”
```

原因：Visual Studio Build Tools 安装不完整，Windows SDK 缺 `Lib`。

解决：用户安装/补齐 Visual Studio Build Tools 的 Windows SDK 后通过。

### 4.3 Tauri 缺 icon.ico

问题：

```text
icons/icon.ico not found
```

解决：生成临时占位图标：

```text
src-tauri/icons/icon.ico
```

后续发布前应替换成正式图标。

### 4.4 GBFR-ACT 权限问题

用户第一次直接启动 `act_ws.py` 后报：

```text
PermissionError: [WinError 5] 拒绝访问
```

原因：GBFR-ACT 注入游戏进程需要管理员权限。

解决：本项目的 `start_service` 改为优先调用 GBFR-ACT 自带的：

```text
D:\yzy\GBFR-ACT\uac_start.cmd
```

相关代码：

```text
src-tauri/src/gbfr_act.rs
```

### 4.5 GBFR-ACT uac_start.cmd 脚本问题

GBFR-ACT 原脚本在当前 Windows/cmd 环境下有问题：

1. 把 Python 版本输出当命令执行，导致：

```text
Python: can't open file 'D:\yzy\GBFR-ACT\3.14.3'
```

2. 用 `./python-3.11.6-amd64.exe` 执行安装器，Windows cmd 不支持，导致：

```text
'.' 不是内部或外部命令
```

3. Python 路径双引号处理错误，导致：

```text
'""C:\Program' 不是内部或外部命令
```

已在本地修复：

```text
D:\yzy\GBFR-ACT\uac_start.cmd
```

注意：这个修复不在本项目仓库内，因为 GBFR-ACT 是单独克隆的外部项目。后续如果要做安装包，需要避免依赖这种本地补丁，或者在文档中明确用户需要 Python 3.11 并管理员运行。

### 4.6 raw events 并发写入粘连

旧版本出现过多个 JSON 对象写在同一行：

```text
{...}{...}
```

原因：Tauri 前端高频调用 `save_raw_event`，后端并发追加文件时写入交错。

修复：

- `src-tauri/src/storage.rs` 增加 `StorageState { write_lock: Mutex<()> }`。
- `save_raw_event` / `save_summary` / `clear_raw_events` 使用同一把锁。

同时 `load_raw_events` 不按行解析，而使用 serde_json 流式反序列化，兼容旧粘连文件。

## 5. 已验证的数据链路

已经实际验证：

```text
GBFR-ACT → WebSocket → 前端 Raw Event Viewer → 后端 raw-events.jsonl → 历史读取 → replay → Overlay/Dashboard
```

raw events 文件位置：

```text
C:\Users\59237\AppData\Roaming\dev.ncerno.gbfr-dpscheck\records\raw-events.jsonl
```

已采到真实木桩数据。示例角色：夏洛特。

## 6. 当前已实现功能

### 6.1 设置与调试页

文件：

```text
src/features/settings/SettingsPage.tsx
```

已支持：

- 配置 WebSocket 地址。
- 配置 `act_ws.py` 路径。
- 保存配置。
- 检查 GBFR-ACT 服务。
- 启动 GBFR-ACT。
- 连接/断开 WebSocket。
- 写入 Mock 事件。
- 清空 Raw Events。
- 加载本地 Raw Events。
- 显示诊断信息。
- Raw Event Viewer。
- 统计预览。

### 6.2 Overlay

文件：

```text
src/features/overlay/OverlayPage.tsx
```

已支持基于实时/历史回放的最新 CombatRecord 展示：

- 连接状态。
- 战斗时间。
- 总伤害。
- 队员。
- DPS。
- 最近 60 秒 DPS。
- rDPS 占位 `--`。
- 伤害占比。

### 6.3 Dashboard

文件：

```text
src/features/dashboard/DashboardPage.tsx
```

已支持：

- 战斗记录列表。
- 切换战斗记录。
- 总览：总伤害、团队 DPS、战斗时长、伤害事件数。
- 队伍详情表。
- 点击队员切换技能详情。
- 技能详情表：总伤害、占比、最小、最大、平均。
- 队伍/配装基础信息展示。

### 6.4 历史回放

后端命令：

```text
load_raw_events
clear_raw_events
save_raw_event
```

前端通过 `loadSavedRawEvents` 注入事件流，Overlay 和 Dashboard 会自动重算。

## 7. 当前未完成 / 仍需注意

### 7.1 rDPS 未实现

当前模型有 `rdps` 字段，但显示为 `--` 或 `null`。

原因：目前 GBFR-ACT 事件还没有确认足够的 buff/debuff/团队贡献归因数据，不能伪造。

### 7.2 技能名称映射未实现

当前技能名是：

```text
动作 <action_id>
```

需要后续接入 GBFR-ACT 的动作名映射或自建映射表。

### 7.3 战斗分段仍是基础版

当前分段：

- `enter_area` 新建记录。
- 无伤害超过配置秒数新建记录。
- 默认按 training 策略回放。

还没有完成木桩/任务/区域细分策略。

### 7.4 配装测试页面未接入真实记录

`LoadoutPage` 仍是占位。下一阶段建议优先做：

- 从当前 CombatRecord 创建配装测试。
- 保存备注。
- 多轮对比。
- 利用 `load_party` 原始 weapon/sigils/over_mastery 数据。

### 7.5 GBFR-ACT 分发和 license 未确认

本项目目前只是开发机本地克隆 GBFR-ACT。后续打包/公开发布前必须确认：

- GBFR-ACT license。
- 是否允许内置/再分发。
- 是否需要用户自行下载。
- 是否需要署名。

## 8. 如何运行当前项目

### 8.1 前端构建

```bash
npm run build --prefix /d/yzy/GBFR-DPScheck
```

### 8.2 Rust 检查

推荐通过 Visual Studio DevCmd：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml"
```

### 8.3 启动 Tauri 开发版

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:dev
```

### 8.4 无游戏验证

1. 启动应用。
2. 打开设置页。
3. 点击“加载本地 Raw Events”。
4. 切到 Overlay / Dashboard 查看回放统计。

### 8.5 有游戏验证

1. 启动游戏。
2. 启动应用。
3. 设置页点击“启动 GBFR-ACT”。
4. UAC 弹窗同意管理员权限。
5. GBFR-ACT 成功后点击“连接 WebSocket”。
6. 打木桩/任务。
7. 看 Raw Event Viewer、Overlay、Dashboard。

## 9. 建议下一步

优先级建议：

1. 配装测试页面接入真实 CombatRecord。
2. 保存配装测试记录到本地。
3. 多轮配装测试对比。
4. 技能动作名映射。
5. 区域策略/木桩策略细化。
6. Dashboard 图表。
7. Overlay 独立窗口和透明点击穿透优化。
8. 安装包和公开发布准备。

## 10. 交接注意事项

- 不要把统计逻辑写进 UI，继续放在 `src/combat/`。
- 不要伪造 rDPS。
- 不要实现注入/绕过/反检测逻辑。
- raw events 是核心资产，改统计逻辑时优先用历史回放验证。
- 每轮开发后跑：

```bash
npm run build --prefix /d/yzy/GBFR-DPScheck
```

以及：

```cmd
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml"
```

- bash 环境直接跑 cargo 可能误用 Git 的 `link.exe`，推荐通过 DevCmd。
