# GBFR-DPScheck

《碧蓝幻想 Relink》DPS 监测客户端。

本项目计划基于 GBFR-ACT 的 WebSocket 事件流构建新的 Tauri 桌面客户端，提供透明置顶 Overlay、战后分析 Dashboard、中文 UI、全队 DPS 统计和配装测试能力。

## 当前状态

当前只完成项目框架和技术方案，尚未实现完整业务功能。

## 技术栈

- Tauri
- Rust
- TypeScript
- React
- Vite

## 文档

- [技术方案](docs/technical-plan.md)
- [Claude 项目说明](CLAUDE.md)

## 第一阶段目标

- 消费 GBFR-ACT WebSocket 事件流
- 自动处理 GBFR-ACT 数据服务启动
- 展示透明置顶 Overlay
- 展示战后 Dashboard
- 默认保存 raw events
- 支持全队基础统计
- 支持配装测试记录
