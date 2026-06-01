# GBFR-DPScheck 技术方案

## 1. 项目定位

GBFR-DPScheck 是一个新的《碧蓝幻想 Relink》DPS 监测客户端。

本项目第一阶段不直接接入游戏进程，不重新实现底层战斗日志采集，而是消费 GBFR-ACT 暴露的 WebSocket 事件流，在此基础上实现自己的 UI、统计模型、中文化、配装测试和后续扩展能力。

目标形态：

- 启动一个桌面工具。
- 工具自动检查并启动 GBFR-ACT 数据服务。
- 工具自动打开透明置顶 Overlay。
- 用户战斗中查看实时 DPS。
- 战斗结束后切换到 Dashboard 查看详细分析。
- 默认保存原始事件和统计快照，方便未来回放、排错、复算和配装对比。

## 2. 核心需求

### 2.1 第一版必须支持

- Tauri 桌面应用。
- 自动处理 GBFR-ACT 数据服务启动。
- 连接 GBFR-ACT WebSocket 事件流。
- 默认保留原始事件日志。
- 按 `enter_area` 自动新建记录。
- 根据区域类型支持不同分段策略，至少预留木桩 / 任务 / 普通区域三类规则。
- 透明置顶 Overlay。
- 战后 Dashboard。
- Overlay 与 Dashboard 可切换。
- 全队统计。
- 中文 UI。
- 配装测试基础能力。

### 2.2 基础统计指标

第一版基础指标：

- 队员名称 / 角色
- 总伤害
- 总 DPS
- 最近 60 秒 DPS
- rDPS
- 战斗时长
- 死亡次数
- 伤害占比

明确不做：

- 命中次数

### 2.3 技能分析

第一版技能分析：

- 技能 / 动作名称
- 技能总伤害
- 技能伤害占比
- 单次最小伤害
- 单次最大伤害
- 单次平均伤害
- 技能时间轴或散点图预留

明确不做：

- 技能命中数展示

### 2.4 队伍分析

- 全队总伤害
- 每名队员 DPS / 最近 60 秒 DPS / rDPS
- 每名队员伤害占比
- 每名队员死亡次数
- 队伍 DPS 曲线预留

### 2.5 配装测试

第一版配装测试不追求完整配装读取，先支持“测试记录管理”：

- 当前记录标记为配装测试
- 手动填写角色、武器、因子/备注
- 对比多次测试的 DPS、总伤害、战斗时长
- 保存测试历史

后续可接入 GBFR-ACT 提供的 member_info，自动展示武器、因子、Over Mastery 等信息。

### 2.6 暂不做

- 导出 CSV / JSON / 文本日志按钮
- 完整 Web 报告页
- 自研游戏采集层
- 游戏内 UI
- 反检测、绕过、隐藏类功能

说明：虽然不做导出按钮，但底层仍默认保存 raw events，供内部复盘和未来扩展使用。

## 3. 外部依赖与数据源

### 3.1 GBFR-ACT

参考仓库：<https://github.com/nyaoouo/GBFR-ACT>

当前已知信息：

- `act_ws.py` 会启动 WebSocket 服务。
- 默认端口暂按 `24399` 设计。
- 事件格式大致为：

```json
{
  "time_ms": 123456,
  "type": "damage",
  "data": {}
}
```

已知事件类型：

- `damage`
- `load_party`
- `enter_area`
- `inc_death_cnt`

### 3.2 数据源边界

项目将 GBFR-ACT 视为外部数据源。

第一阶段只实现：

- 检查数据服务状态
- 启动数据服务
- 连接 WebSocket
- 消费事件
- 保存事件
- 统计展示

不实现：

- 注入逻辑
- 游戏进程 hook
- 内存结构解析

## 4. 总体架构

```text
GBFR-ACT / act_ws.py
        ↓ WebSocket
Tauri Rust 后端
        ├─ 服务管理：启动/停止/检查 GBFR-ACT
        ├─ 本地配置：窗口、路径、显示设置
        └─ 本地存储：raw events、战斗记录、配装测试
        ↓ Tauri command / event
TypeScript 前端
        ├─ gbfr-act：WebSocket 客户端、事件类型
        ├─ combat：战斗分段、统计引擎、回放
        ├─ overlay：实时透明面板
        ├─ dashboard：战后分析
        ├─ loadout：配装测试
        └─ settings：设置
```

### 4.1 为什么 WebSocket 由前端连接

第一版建议前端直接连接 `ws://127.0.0.1:24399`：

- 调试简单。
- 与 GBFR-ACT 原始前端模式接近。
- UI 状态更新直接。
- 后续可把连接迁移到 Rust 后端代理，不影响上层统计模型。

Rust 后端负责启动和管理 GBFR-ACT 服务，不负责第一版事件转发。

### 4.2 后续可演进为后端代理

未来如果需要更稳定的日志保存、重连、后台运行，可以改成：

```text
GBFR-ACT WebSocket
        ↓
Rust 后端 WebSocket Client
        ↓ Tauri event
前端统计和 UI
```

这样可以在窗口关闭或后台时继续记录数据。

## 5. 项目构成

```text
GBFR-DPScheck/
  CLAUDE.md
  README.md
  docs/
    technical-plan.md
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    app/
      App.tsx
      routes.ts
    components/
      PlaceholderPanel.tsx
    features/
      overlay/
        OverlayPage.tsx
      dashboard/
        DashboardPage.tsx
      settings/
        SettingsPage.tsx
      loadout/
        LoadoutPage.tsx
    gbfr-act/
      events.ts
      client.ts
      connection.ts
    combat/
      models.ts
      segmenter.ts
      statistics.ts
      replay.ts
    storage/
      storage.ts
    i18n/
      zh-CN.ts
    styles/
      global.css
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs
      commands.rs
      config.rs
      gbfr_act.rs
      storage.rs
```

## 6. 分层设计

### 6.1 GBFR-ACT 事件层

职责：

- 定义原始事件类型。
- 连接 WebSocket。
- 处理连接状态。
- 处理断线重连。
- 透传 unknown 事件。

原则：

- 不在这一层做复杂统计。
- 对不确定字段保留原样。
- 所有事件都允许被保存和回放。

核心文件：

- `src/gbfr-act/events.ts`
- `src/gbfr-act/client.ts`
- `src/gbfr-act/connection.ts`

### 6.2 战斗模型层

职责：

- 定义 CombatRecord、ActorStats、ActionStats。
- 处理事件回放。
- 处理战斗开始、结束、切区域。
- 计算实时统计。

核心文件：

- `src/combat/models.ts`
- `src/combat/segmenter.ts`
- `src/combat/statistics.ts`
- `src/combat/replay.ts`

设计要点：

- 输入是 GBFR-ACT raw event。
- 输出是 UI 可消费的统计状态。
- 所有计算应尽量是纯函数，方便后续写测试。
- 战斗分段策略独立出来，避免写死在 UI 里。

### 6.3 rDPS 设计

rDPS 在第一版先作为独立字段预留。

原因：

- GBFR-ACT 当前已知事件不一定包含完整 buff、debuff、团队贡献归因数据。
- 如果没有可靠来源，不能把 rDPS 伪装成准确统计。

第一版策略：

- 数据模型中保留 `rdps` 字段。
- UI 中可显示为 `--` 或“实验性”。
- 如果后续确认能从事件 flags、动作 ID 或其他事件推导贡献，再实现真实算法。

### 6.4 UI 层

分为两套 UI：

#### Overlay

职责：

- 透明置顶。
- 战斗中显示核心指标。
- 小体积、低干扰。

建议显示：

- 队伍排名
- 队员名称 / 角色
- 总 DPS
- 最近 60 秒 DPS
- rDPS
- 伤害占比
- 战斗时间

#### Dashboard

职责：

- 战后分析。
- 查看完整队伍统计、技能分析、配装测试。
- 支持从 Overlay 切换。

建议页签：

- 总览
- 队伍
- 技能
- 配装测试
- 设置

### 6.5 存储层

职责：

- 保存 raw events。
- 保存战斗统计快照。
- 保存配装测试记录。
- 保存应用配置。

第一版可以先定义接口和占位实现。

建议本地目录：

```text
%APPDATA%/GBFR-DPScheck/
  config.json
  records/
    2026-06-02_xxx/
      raw-events.jsonl
      summary.json
      loadout-note.json
```

具体路径由 Tauri 后端通过系统 app data 目录决定。

### 6.6 Rust 后端层

职责：

- Tauri 应用入口。
- 创建 Overlay / Dashboard 窗口。
- 管理置顶、透明、点击穿透等窗口能力。
- 启动 / 检查 GBFR-ACT 数据服务。
- 保存和读取本地文件。
- 暴露 Tauri commands 给前端。

第一版占位命令：

- `get_app_config`
- `save_app_config`
- `check_gbfr_act_service`
- `start_gbfr_act_service`
- `save_raw_event`
- `save_combat_summary`

## 7. 战斗分段策略

### 7.1 基础规则

- 收到 `enter_area`：创建新的区域上下文。
- 收到第一条有效 `damage`：开始当前战斗记录。
- 长时间无有效伤害：结束当前战斗记录。
- 收到新的 `enter_area`：归档上一条记录，并新建记录。

### 7.2 区域策略

预留三类：

- 木桩：更适合配装测试，允许快速重置和多轮记录。
- 任务：按区域 / boss 战分段。
- 普通区域：使用通用自动分段。

第一版先实现策略类型和配置结构，不急着识别所有区域。

## 8. 配装测试设计

第一版目标是好用，不追求全自动：

- 用户可以把某一场战斗标记为配装测试。
- 用户填写备注，例如“炎帝因子方案 A”“上限+追击”。
- Dashboard 中展示多次测试对比。
- 保存测试记录。

后续增强：

- 自动读取 member_info。
- 自动显示武器、祝福、因子、Over Mastery。
- 支持同角色聚合对比。
- 支持木桩专用统计。

## 9. 自动启动 GBFR-ACT 服务

### 9.1 第一版方式

用户在设置里配置 GBFR-ACT 目录或 `act_ws.py` 路径。

启动时：

1. 检查 `ws://127.0.0.1:24399` 是否可连接。
2. 如果不可连接，调用 Rust 后端启动 `act_ws.py`。
3. 前端开始重连 WebSocket。
4. 显示连接状态和错误提示。

### 9.2 后续安装包方式

如果 license 和分发方式允许，可以考虑：

- 安装包内置 GBFR-ACT 依赖。
- 首次启动引导 Python 环境。
- 或提供外部下载 / 路径配置。

公开发布前必须明确署名和授权。

## 10. 配置项

第一版建议配置：

```ts
interface AppConfig {
  gbfrAct: {
    websocketUrl: string;
    actWsPath?: string;
    autoStart: boolean;
  };
  overlay: {
    alwaysOnTop: boolean;
    opacity: number;
    compact: boolean;
  };
  combat: {
    inactiveTimeoutSec: number;
    keepRawEvents: boolean;
    areaStrategy: 'auto' | 'training' | 'quest' | 'generic';
  };
  ui: {
    language: 'zh-CN';
    showRdps: boolean;
  };
}
```

## 11. 项目阶段规划

项目按“先拿到真实数据，再做统计，再做 UI，再做发布”的顺序推进。

每个阶段都必须有明确产出、测试方式、自检清单和 debug 手段。不要跨阶段一次性做太多，尤其不要在没有真实事件样本前写死统计逻辑。

### M0：项目框架与文档

当前状态：已完成基础框架。

#### 需要实现

- 项目级 `CLAUDE.md`。
- 技术方案文档。
- README。
- Tauri + React + TypeScript + Rust 基础结构。
- 前端目录分层：`gbfr-act`、`combat`、`features`、`storage`、`i18n`。
- Rust 后端目录分层：`commands`、`config`、`gbfr_act`、`storage`。
- Overlay / Dashboard / 配装测试 / 设置页占位。
- GBFR-ACT WebSocket 客户端占位。
- Combat 统计模型占位。

#### 测试方式

- 安装依赖后执行：

```bash
npm run build
npm run tauri:dev
```

- Rust 侧执行：

```bash
cd src-tauri
cargo check
```

#### 自检清单

- 项目能启动到占位 UI。
- 文档能说明项目目标、边界和分层。
- 没有复制 GBFR-ACT 的注入逻辑。
- 没有写死未知事件字段。
- `rDPS` 只预留字段，不伪装成准确实现。

#### Debug 方法

- 前端启动失败：先看 Vite 控制台和浏览器 DevTools Console。
- Tauri 启动失败：看终端 Rust 编译错误。
- 路径问题：确认当前目录是项目根目录。
- 依赖问题：删除 `node_modules` 和锁文件后重新安装。

### M1：连接 GBFR-ACT 与采集真实事件样本

这是项目真正开始前最关键的一步。目标不是做 UI，而是确认 GBFR-ACT 的真实事件格式。

#### 需要实现

- 设置页配置 GBFR-ACT WebSocket 地址，默认 `ws://127.0.0.1:24399`。
- 设置页配置 `act_ws.py` 路径。
- Rust 后端检查 GBFR-ACT 服务是否运行。
- Rust 后端尝试启动用户配置的 `act_ws.py`。
- 前端 WebSocket 连接、断线、重连状态。
- Raw Event Viewer：实时显示收到的原始事件。
- 默认保存 raw events 到本地 `jsonl`。
- 记录连接日志：连接成功、断开、重连、解析失败。
- 支持 unknown event 原样显示和保存。

#### 测试方式

- 用 mock WebSocket 服务发送假事件，验证前端能显示。
- 用真实 GBFR-ACT + 游戏验证能收到事件。
- 分别验证这些事件：
  - `load_party`
  - `enter_area`
  - `damage`
  - `inc_death_cnt`
- 人为关闭 GBFR-ACT，验证断线状态。
- 重启 GBFR-ACT，验证自动重连。
- 发送格式错误 JSON，验证不会导致前端崩溃。

#### 自检清单

- Raw Event Viewer 中能看到完整原始 JSON。
- 所有事件都保存到 raw events 文件。
- 未识别事件不会丢失。
- 断线后 UI 明确显示“未连接”。
- 重连后不会重复注册多个 WebSocket 监听器。
- 事件保存失败时 UI 有提示或日志，不静默失败。

#### Debug 方法

- 浏览器 DevTools → Network → WS 查看 WebSocket 帧。
- 浏览器 DevTools Console 打印解析失败的原始消息。
- 设置页显示当前 WebSocket URL 和连接状态。
- Rust 后端打印 `act_ws.py` 启动命令、工作目录和退出码。
- 保存最近 N 条 raw events，方便复制到 issue 或测试用例。
- 做一个 `debug/raw-event-viewer` 页面或开关，专门看原始事件。

### M2：事件标准化与战斗分段

拿到真实样本后再做这一阶段。目标是把不稳定的原始事件转成项目内部稳定模型，并正确切分战斗记录。

#### 需要实现

- 为真实事件补全 TypeScript 类型。
- 写事件 normalizer：把 GBFR-ACT 原始字段转成内部字段。
- 处理 actor / party 成员识别。
- 处理 target 识别。
- 处理 action_id。
- 根据 `enter_area` 创建区域上下文。
- 根据第一条有效 `damage` 开始战斗。
- 根据无伤害超时结束战斗。
- 预留区域策略：
  - `training`：木桩 / 配装测试
  - `quest`：任务 / Boss 战
  - `generic`：普通区域
  - `auto`：自动判断
- 支持手动重置当前记录。

#### 测试方式

- 使用 M1 保存的 raw events 做离线回放测试。
- 构造测试事件：
  - 只有 `enter_area` 没有伤害
  - 没有 `enter_area` 直接有伤害
  - 多次 `enter_area`
  - 长时间无伤害
  - 队员信息晚于伤害事件到达
- 验证每组事件得到的战斗记录数量和时间范围。

#### 自检清单

- 同一份 raw events 多次回放结果一致。
- `enter_area` 不会错误清空已归档记录。
- 无伤害超时不会把同一场战斗切得过碎。
- 木桩模式能支持多次短测试。
- 没有 party 信息时仍能保留伤害事件，不直接丢弃。

#### Debug 方法

- 给每个 CombatRecord 显示：开始时间、结束时间、区域、策略、事件数量。
- 给 segmenter 增加 debug log：为什么开始、为什么结束、为什么归档。
- 做“事件回放速度”开关：1x / 5x / 立即回放。
- 对每条事件显示它被归到哪个 CombatRecord。

### M3：基础统计引擎

目标是先把数字算对，不急着美化 UI。

#### 需要实现

- 全队总伤害。
- 每名队员总伤害。
- 每名队员总 DPS。
- 每名队员最近 60 秒 DPS。
- 每名队员伤害占比。
- 每名队员死亡次数。
- 战斗时长。
- 技能 / 动作维度统计：
  - 动作名称
  - 总伤害
  - 伤害占比
  - 最小伤害
  - 最大伤害
  - 平均伤害
- `rDPS` 字段继续保留，若缺少可靠归因数据，显示为 `--` 或“实验性”。
- 统计逻辑尽量写成纯函数，方便测试。

#### 测试方式

- 用手写小样本测试基础统计：
  - 10 秒内 10000 伤害，DPS 应为 1000。
  - 两名队员分别 7000 / 3000 伤害，占比应为 70% / 30%。
  - 最近 60 秒窗口只计算窗口内伤害。
- 用 M1 真实 raw events 回放，对比 GBFR-ACT 原面板结果。
- 使用边界样本：
  - 0 秒战斗
  - 只有一条伤害
  - 超大伤害数字
  - 未知 actor
  - 未知 action_id

#### 自检清单

- 总伤害等于所有队员伤害之和。
- 队员伤害占比总和约等于 100%。
- DPS 没有出现 `Infinity`、`NaN`。
- 最近 60 秒 DPS 不会包含 60 秒前伤害。
- 死亡次数不会因为重复事件被多算。
- 未知技能有明确 fallback 名称，例如 `未知动作 0x12345678`。

#### Debug 方法

- Dashboard 增加“统计调试”区域：显示原始事件数、damage 事件数、参与 actor 数。
- 每个角色可展开看到参与计算的关键事件。
- 提供“复制当前统计输入”按钮，把当前 raw events 复制出来。
- 统计函数单独写测试，失败时打印输入事件和实际结果。

### M4：Overlay 实时 UI

目标是做战斗中能看的透明置顶小窗，信息少但清楚。

#### 需要实现

- 透明置顶窗口。
- Overlay 紧凑布局。
- 全队排名。
- 队员名称 / 角色。
- 总 DPS。
- 最近 60 秒 DPS。
- rDPS 显示位。
- 伤害占比。
- 战斗时间。
- 连接状态提示。
- 无数据时的空状态。
- Overlay 和 Dashboard 切换入口。
- Overlay 透明度和缩放配置。

#### 测试方式

- 使用 mock 数据验证 1～4 名队员显示。
- 使用真实游戏窗口验证置顶效果。
- 验证游戏无边框窗口下 Overlay 可见。
- 验证全屏独占模式下的表现，并在文档中说明限制。
- 长时间运行 30 分钟，观察是否卡顿或内存增长明显。

#### 自检清单

- Overlay 不挡住主要游戏信息。
- 数字更新稳定，不闪烁。
- 断线时有明显状态提示。
- 无战斗时不会显示旧数据误导用户。
- 透明窗口背景正常，没有白边或黑底异常。
- 窗口置顶设置可开关。

#### Debug 方法

- 增加 UI debug 模式：显示 FPS、事件速率、最近更新时间。
- 增加 mock 数据模式，不启动游戏也能调 UI。
- 在 Overlay 上显示当前 record id，排查切战斗问题。
- Tauri 窗口问题优先检查 `tauri.conf.json` 和窗口创建参数。

### M5：Dashboard 战后分析

目标是战斗结束后能完整看结果，而不是只看 Overlay 的实时排名。

#### 需要实现

- 战斗记录列表。
- 当前记录总览。
- 队伍详情表。
- 技能 / 动作详情表。
- 单角色详情面板。
- 简单图表预留或基础图表。
- 历史记录读取。
- 从 Overlay 切换到 Dashboard。
- 支持记录归档后继续查看，不受新战斗覆盖。

#### 测试方式

- 用多场 raw events 回放，验证记录列表和切换。
- 验证归档记录不会被新事件修改。
- 验证技能表排序和占比。
- 验证未知动作、未知角色显示是否可读。
- 验证大记录量时页面不卡死。

#### 自检清单

- Dashboard 数字和 Overlay 同源，不重复实现一套统计。
- 切换记录后所有表格同步变化。
- 历史记录加载失败有提示。
- 技能占比基于当前角色伤害，而不是全队伤害，除非 UI 明确说明。
- 记录归档后仍可查看 raw event 数和统计摘要。

#### Debug 方法

- Dashboard 提供“查看 raw events”入口。
- 每个统计卡片显示它来自哪个 CombatRecord。
- 支持从本地选择一份 raw events 文件回放。
- 图表问题先用固定 mock 数据排查，再接真实数据。

### M6：配装测试

目标是让用户能围绕木桩或固定任务做多轮对比。

#### 需要实现

- 将当前战斗标记为配装测试。
- 手动填写角色、武器、因子、备注。
- 保存测试记录。
- 多轮测试对比表。
- 同角色测试聚合。
- 木桩策略的分段优化。
- 测试记录和普通战斗记录区分展示。

#### 测试方式

- 手动创建多条测试记录，验证保存和读取。
- 同一份 raw events 标记不同备注，验证不会覆盖原始记录。
- 木桩连续多轮测试，验证分段是否合理。
- 修改备注后重启应用，验证数据还在。

#### 自检清单

- 配装备注和 raw events 分开保存。
- 删除 / 修改备注不会删除原始战斗记录，除非用户明确删除。
- 对比表指标一致：总伤害、DPS、最近 60 秒 DPS、战斗时长。
- 没有完整配装数据时，UI 明确显示“手动备注”。

#### Debug 方法

- 给每条配装测试记录显示关联的 CombatRecord id。
- 保存失败时打印目标路径和错误原因。
- 提供“重新从 raw events 计算”按钮，排查统计缓存问题。

### M7：GBFR-ACT 服务管理与安装包准备

目标是让普通用户不用手动理解太多东西，也能启动工具。

#### 需要实现

- 配置向导：设置 GBFR-ACT 路径 / `act_ws.py` 路径。
- 自动检查 Python 环境。
- 自动启动 GBFR-ACT 数据服务。
- 显示启动失败原因。
- 打包 Tauri 安装包。
- README 使用说明。
- license 和署名说明。
- 日志隐私说明。
- 常见问题：管理员权限、端口占用、全屏模式 Overlay 不显示。

#### 测试方式

- 干净 Windows 环境安装测试。
- 未安装 Python 时测试提示。
- Python 版本不符合时测试提示。
- `act_ws.py` 路径错误时测试提示。
- 端口 `24399` 被占用时测试提示。
- 安装、升级、卸载流程测试。

#### 自检清单

- 公开发布包不包含未授权分发的第三方代码。
- README 明确说明依赖 GBFR-ACT。
- 如果后续内置 GBFR-ACT，必须确认 license 允许。
- 用户日志路径明确。
- 错误提示能让普通用户知道下一步怎么做。

#### Debug 方法

- 应用内提供“诊断信息”页面：
  - 应用版本
  - WebSocket URL
  - GBFR-ACT 路径
  - Python 检测结果
  - 最近启动日志
  - 数据目录
- 一键复制诊断信息。
- 后端启动 GBFR-ACT 时记录 stdout / stderr。
- 安装包问题保留安装日志路径说明。

## 12. 通用测试策略

### 12.1 测试分层

```text
单元测试
  ↓
事件回放测试
  ↓
Mock WebSocket 集成测试
  ↓
真实 GBFR-ACT 联调
  ↓
真实游戏场景测试
  ↓
安装包测试
```

### 12.2 必须长期保留的测试资产

- 典型 raw events 样本：木桩、任务、多人、断线重连。
- 手写最小统计样本。
- 未知事件样本。
- 异常 JSON 样本。
- 大量事件压力样本。

### 12.3 不同类型测试重点

- 统计测试：看数字是否正确。
- 分段测试：看记录切分是否正确。
- UI 测试：看展示是否清楚、是否误导。
- 存储测试：看重启后数据是否还在。
- 服务管理测试：看普通用户能不能启动。
- 发布测试：看干净环境能不能安装和运行。

## 13. 通用自检清单

每次完成一个功能后都按下面清单过一遍：

- 是否符合当前阶段目标，有没有偷跑太多后续功能。
- 是否保留 raw event，方便未来重算。
- 是否对 unknown 字段和 unknown event 做了兼容。
- 是否有中文错误提示。
- 是否有空状态、断线状态、加载状态。
- 是否会出现 `NaN`、`Infinity`、负数 DPS。
- 是否把统计逻辑写进 UI 组件里了；如果是，应拆回 `combat` 层。
- 是否默认不丢用户数据。
- 是否没有引入未确认 license 的第三方代码。
- 是否没有实现项目边界外的注入、绕过、隐藏逻辑。

## 14. 通用 Debug 设计

项目从一开始就要把 debug 能力当成正式功能做，否则后面很难排查统计错误。

### 14.1 前端 Debug

- Raw Event Viewer。
- 当前 CombatRecord 状态查看。
- 当前统计输入 / 输出查看。
- WebSocket 连接状态查看。
- Mock 数据模式。
- 事件回放模式。
- 一键复制当前诊断信息。

### 14.2 后端 Debug

- GBFR-ACT 启动命令日志。
- GBFR-ACT stdout / stderr 捕获。
- 配置读取 / 保存日志。
- 数据目录显示。
- 文件保存失败时显示完整路径和错误原因。

### 14.3 统计 Debug

- 每个统计结果能追溯到 raw events。
- 每场战斗有唯一 record id。
- 每个 actor 有内部 id 和原始 actor 信息。
- 每个 action 有 action_id 和 fallback 名称。
- 统计异常时优先保存原始事件，不要只截图 UI。

### 14.4 用户反馈 Debug

公开发布后，用户反馈统计错误时应尽量提供：

- 应用版本。
- GBFR-ACT 版本或来源。
- 游戏场景：木桩 / 任务 / 联机。
- 角色和动作。
- raw events 片段或完整记录。
- 预期数值和实际数值。
- 是否发生断线 / 重连 / 切区。

## 15. 风险与待确认

- GBFR-ACT 的 license 和分发许可需要确认。
- WebSocket 事件真实字段需要用样本验证。
- rDPS 是否能准确计算需要确认数据来源。
- Tauri 透明置顶 Overlay 在 Windows 全屏独占模式下可能不可见，建议用户使用无边框窗口。
- 自动启动 `act_ws.py` 可能需要管理员权限和 Python 环境。
- 公开发布前需要处理用户日志中可能包含的用户名等隐私信息。
