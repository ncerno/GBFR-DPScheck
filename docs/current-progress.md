# 当前进度与交接清单

更新时间：2026-06-03

## 1. 当前一句话状态

项目已经从“框架阶段”推进到：

```text
GBFR-ACT WebSocket 接入 + raw events 保存/读取 + 事件标准化 + 战斗分段 + 基础统计 + Overlay + Dashboard 基础版
```

现在即使不启动游戏，也可以通过“加载本地 Raw Events”回放之前采集到的木桩日志，验证 Overlay 和 Dashboard。

## 2. 最新 Git 状态

远端仓库：

```text
https://github.com/ncerno/GBFR-DPScheck
```

当前分支：

```text
main
```

截至本文档编写前，已推送的关键提交包括：

```text
425a173 Initial project scaffold
632b8ce Implement GBFR-ACT connection diagnostics
234e902 Prefer UAC startup for GBFR-ACT
5e0ff99 Serialize raw event writes
3739f53 Add combat event normalization and summary preview
670baf2 Connect overlay to live combat stats
f518d58 Add dashboard combat analysis view
4c6bc71 Load saved raw events for replay
f6c139a Allow selecting actors in dashboard
```

## 3. 已完成模块

### 3.1 项目框架

- Tauri 2
- React 18
- TypeScript
- Vite
- Rust 后端 commands/config/storage/gbfr_act 分层
- 基础中文 UI

### 3.2 GBFR-ACT 接入

前端：

```text
src/gbfr-act/client.ts
src/gbfr-act/useGbfrActStream.ts
src/gbfr-act/events.ts
```

后端：

```text
src-tauri/src/gbfr_act.rs
```

能力：

- 配置 WebSocket URL，默认 `ws://127.0.0.1:24399`。
- 检查 WebSocket 端口。
- 启动 GBFR-ACT。
- 优先通过 `uac_start.cmd` 请求管理员权限。

### 3.3 raw events 保存和读取

后端：

```text
src-tauri/src/storage.rs
```

命令：

```text
save_raw_event
load_raw_events
clear_raw_events
```

保存路径：

```text
C:\Users\59237\AppData\Roaming\dev.ncerno.gbfr-dpscheck\records\raw-events.jsonl
```

特性：

- 写入有 `Mutex`，避免高频事件并发写入粘连。
- 读取用 serde_json 流式解析，兼容旧日志中多个 JSON 对象粘在同一行的情况。

### 3.4 战斗事件标准化和统计

核心目录：

```text
src/combat/
```

文件：

```text
models.ts
normalizer.ts
segmenter.ts
statistics.ts
replay.ts
```

已支持：

- 标准化 `enter_area`
- 标准化 `load_party`
- 标准化 `damage`
- 标准化 `inc_death_cnt`
- unknown event 透传
- actor key 生成
- party member 识别
- 基础战斗分段
- 总伤害
- DPS
- 最近 60 秒 DPS
- 伤害占比
- 死亡次数
- 动作伤害统计
- 最小/最大/平均伤害

### 3.5 App 级 runtime

文件：

```text
src/app/useAppRuntime.ts
```

负责：

- 配置读写
- 服务检查/启动
- WebSocket 连接
- raw events 保存
- raw events 读取
- combat replay
- 操作消息

Overlay、Dashboard、Settings 共享这个 runtime。

### 3.6 Overlay

文件：

```text
src/features/overlay/OverlayPage.tsx
```

已接入真实统计，显示：

- 连接状态
- 战斗时间
- 总伤害
- 角色列表
- DPS
- 最近 60 秒 DPS
- rDPS，占位 `--`
- 伤害占比

### 3.7 Dashboard

文件：

```text
src/features/dashboard/DashboardPage.tsx
```

已支持：

- 战斗记录列表
- 切换记录
- 总览卡片
- 队伍详情表
- 点击角色切换技能详情
- 技能详情表
- 队伍/配装基础信息

### 3.8 设置与调试页

文件：

```text
src/features/settings/SettingsPage.tsx
```

已支持：

- 保存配置
- 检查服务
- 启动 GBFR-ACT
- 连接/断开 WebSocket
- 写入 Mock 事件
- 加载本地 Raw Events
- 清空 Raw Events
- 诊断信息
- 统计预览
- Raw Event Viewer

## 4. 已真实验证的数据

已通过用户实际启动游戏、GBFR-ACT、打木桩采集到真实事件。

确认事件包括：

```text
enter_area
load_party
damage
inc_death_cnt
```

真实 damage 示例：

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

真实 `load_party` 中确认存在：

- `c_name`
- `common_info`
- `weapon`
- `sigils`
- `over_mastery`

## 5. 当前限制

### 5.1 rDPS

尚未实现。当前显示为：

```text
--
```

不要在没有可靠归因数据前伪造 rDPS。

### 5.2 技能名称

当前动作名称仍是：

```text
动作 <action_id>
```

需要后续动作映射。

### 5.3 配装测试

`LoadoutPage` 仍是占位，还未接入真实 CombatRecord。

### 5.4 历史记录管理

现在只有读取一个全局 raw-events 文件，还没有按场次保存独立记录目录。

### 5.5 Overlay 窗口形态

当前 Overlay 是应用内页面，不是独立小窗/点击穿透窗口。后续需要做 Tauri 多窗口或窗口控制。

## 6. 建议下一步

最推荐下一步：

```text
配装测试页面接入真实 CombatRecord
```

具体任务：

1. 在 `LoadoutPage` 接入 `AppRuntime`。
2. 显示当前/最新 CombatRecord。
3. 允许“保存为配装测试”。
4. 手动填写备注。
5. 保存到本地 `loadout-tests.json` 或类似文件。
6. 显示多轮测试对比：总伤害、DPS、60 秒 DPS、战斗时长、角色。
7. 先保留 raw `weapon/sigils/over_mastery`，不急着翻译因子名。

## 7. 交接后首个自检动作

新的 Agent 接手后建议先执行：

```bash
npm run build --prefix /d/yzy/GBFR-DPScheck
```

然后通过 DevCmd 执行：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml"
```

如果要启动应用：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:dev
```

启动后在设置页点击：

```text
加载本地 Raw Events
```

即可不用开游戏验证当前统计 UI。
