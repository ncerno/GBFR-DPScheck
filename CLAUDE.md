# GBFR-DPScheck 项目说明

## 项目目标

GBFR-DPScheck 是一个面向《碧蓝幻想 Relink》的 DPS 监测工具。

第一阶段不重新实现战斗日志采集，也不直接修改游戏进程，而是作为新的客户端消费 GBFR-ACT 提供的 WebSocket 事件流，重点实现：

- 透明置顶 Overlay 实时面板
- 战后分析 Dashboard
- 中文 UI
- 全队 DPS / rDPS / 总伤害 / 最近 60 秒 DPS / 死亡次数等基础统计
- 技能伤害分析，但第一版不统计技能命中数
- 队伍分析
- 配装测试记录与对比
- 默认保留原始事件日志，方便后续回放和重算
- 一键启动工具，自动处理 GBFR-ACT 数据服务并打开 UI

后续目标是公开发布 GitHub，并做成安装包式社区工具。

## 技术路线

采用 Tauri + TypeScript + Rust：

- TypeScript：前端 UI、状态管理、图表、统计展示
- Rust：Tauri 桌面壳、本地文件、配置、进程管理、GBFR-ACT 服务管理、窗口控制
- WebSocket：连接 GBFR-ACT 事件流，默认端口暂按 `24399` 设计
- 前端框架：优先使用 React + Vite
- 样式：先使用普通 CSS / CSS Modules，避免过度引入 UI 框架

## 重要边界

- 不在本项目第一阶段实现游戏进程注入逻辑。
- 不实现绕过、隐藏、反检测或破坏性行为。
- 采集层优先复用 GBFR-ACT，项目自己只消费事件流并做统计展示。
- 如果后续要内置或分发 GBFR-ACT 相关文件，必须先确认 license、署名和分发方式。
- 公开发布前必须处理日志隐私、错误提示、依赖安装和用户文档。

## 开发原则

- 先做框架，再逐步填功能，不要一开始写完整业务。
- 统计逻辑要和 UI 分离，方便单元测试和离线回放。
- 原始事件要保留，不要只保存计算结果。
- Overlay 和 Dashboard 共享同一套统计状态，不要重复计算两套逻辑。
- 战斗分段规则要可配置：不同区域、木桩、任务可以有不同策略。
- rDPS 先保留独立指标和接口，第一版如果缺少 buff / 贡献数据，可以先定义为“待实现/实验性”，不要伪造准确结果。
- 代码注释使用中文。
- UI 文案默认中文。
- 遇到 GBFR-ACT 事件格式不确定时，先记录 raw event，再根据真实样本调整类型。

## 推荐目录分层

```text
src/
  app/              应用入口、路由、窗口级状态
  components/       通用 UI 组件
  features/
    overlay/        实时 Overlay 面板
    dashboard/      战后分析面板
    settings/       设置面板
    loadout/        配装测试功能
  gbfr-act/         GBFR-ACT WebSocket 客户端、事件类型、连接状态
  combat/           战斗分段、统计计算、事件回放
  storage/          前端侧存储适配
  i18n/             中文文案与后续多语言
  styles/           全局样式
src-tauri/
  src/
    main.rs         Tauri 入口
    commands.rs     前后端命令
    config.rs       本地配置
    gbfr_act.rs     GBFR-ACT 服务进程管理
    storage.rs      日志与记录文件管理
```

## 工作流程建议

1. 先确认 GBFR-ACT WebSocket 真实事件样本。
2. 建立 TypeScript 类型，但允许 unknown 字段透传。
3. 完成 raw event 保存与回放。
4. 完成基础统计引擎。
5. 做 Overlay UI。
6. 做 Dashboard UI。
7. 做配装测试记录。
8. 再考虑安装包、自动启动 GBFR-ACT、版本检查与公开发布。

## 当前阶段范围

当前只搭建项目框架，不做完整业务开发。

框架应包含：

- 项目文档
- package 配置
- Vite / React / TypeScript 基础结构
- Tauri 基础结构
- 模块目录和占位文件
- GBFR-ACT WebSocket 客户端占位
- Combat 统计引擎占位
- Overlay / Dashboard 页面占位
- 配置和存储接口占位
