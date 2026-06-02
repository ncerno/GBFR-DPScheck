# GBFR-DPScheck

《碧蓝幻想 Relink》DPS 监测客户端。

本项目基于 GBFR-ACT 的 WebSocket 事件流构建新的 Tauri 桌面客户端，目标是提供透明置顶 Overlay、战后分析 Dashboard、中文 UI、全队 DPS 统计和配装测试能力。

## 当前状态

当前已经完成：

- Tauri + React + TypeScript + Rust 项目框架
- GBFR-ACT WebSocket 连接
- GBFR-ACT 启动/检查基础逻辑
- raw events 保存、清空、历史读取
- 兼容旧日志中 JSON 对象粘连的历史读取
- GBFR-ACT 事件标准化
- 战斗分段基础版
- 总伤害、DPS、最近 60 秒 DPS、伤害占比、死亡次数基础统计
- 技能/动作伤害统计基础版
- Overlay 接入实时/历史统计
- Dashboard 战后分析基础版
- Dashboard 点击角色切换技能详情
- 设置页调试工具：Raw Event Viewer、统计预览、加载本地 Raw Events

还未完成：

- rDPS 真实算法
- 技能动作名映射
- 配装测试页面真实接入
- Tauri 独立 Overlay 小窗 / 点击穿透
- 按场次保存历史记录目录
- 安装包和公开发布流程

## 技术栈

- Tauri 2
- Rust
- TypeScript
- React
- Vite

## 文档

建议新 Agent 接手时按顺序阅读：

1. [当前进度与交接清单](docs/current-progress.md)
2. [开发过程记录](docs/development-log.md)
3. [技术方案](docs/technical-plan.md)
4. [Claude 项目说明](CLAUDE.md)

## 运行方式

### 前端构建

```bash
npm run build --prefix /d/yzy/GBFR-DPScheck
```

### Rust 检查

需要通过 Visual Studio DevCmd，避免 bash 环境误用 Git 自带 `link.exe`：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml"
```

### 启动开发版

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:dev
```

## 无游戏验证

启动应用后：

1. 打开“设置”页。
2. 点击“加载本地 Raw Events”。
3. 切到 Overlay / Dashboard 查看历史回放统计。

## 数据源

本项目依赖 GBFR-ACT：

- 仓库：<https://github.com/nyaoouo/GBFR-ACT>
- 本地开发路径：`D:\yzy\GBFR-ACT`
- 默认 WebSocket：`ws://127.0.0.1:24399`

本项目不实现游戏进程注入逻辑，只消费 GBFR-ACT 的事件流。
