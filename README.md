# GBFR-DPScheck

GBFR-DPScheck 是一个基于 GBFR-ACT WebSocket 事件流的 Tauri 桌面客户端，用于《Granblue Fantasy: Relink》的实时 DPS Overlay、会话分析 Dashboard、配装测试和 raw events 调试回放。

项目只消费 GBFR-ACT 暴露的数据，不注入游戏进程，不实现 hook、绕过或反检测逻辑。

## 当前状态

已完成的主流程：

- GBFR-ACT WebSocket 连接、服务检查和启动入口。
- 自动启动 GBFR-ACT 开关已生效：加载配置后检查端口，不可连接时再尝试启动。
- raw events 实时保存、清空、本地加载和调试回放。
- `enter_area`、`load_party`、`damage`、`inc_death_cnt` 标准化。
- 战斗分段：`auto` / `training` / `quest` / `generic`。
- 木桩独立空窗秒数、通用空窗秒数、手动重置当前记录。
- 统计模型：总伤害、DPS、最近 60 秒 DPS、占比、死亡、技能伤害统计。
- 动作名映射：读取 GBFR-ACT `assets/act_ws_texts.js`，缺失时 fallback。
- 配装文本解析：读取 GBFR-ACT `assets/dump_texts.js`，展示武器、因子、词条等摘要。
- Overlay：主窗口内展示和独立透明置顶小窗基础版，鼠标穿透可从主窗口关闭。
- Dashboard：当前记录、历史记录、队伍详情、技能详情、图表和 raw events 查看。
- 配装测试：保存、读取、删除、筛选、排序、同角色多轮对比。
- 历史记录：按目录保存、重命名、筛选、排序、导入、导出。
- 统计源与 Raw Event Viewer 展示缓冲已拆分，长时间战斗统计不依赖最近 2000 条展示缓冲。

仍需实机验收：

- 独立 Overlay 在真实游戏无边框窗口、全屏独占下的置顶、透明和鼠标穿透表现。
- 实时游戏采集状态下的长时间稳定性和窗口兼容性。

不做或暂不做：

- 不伪造 rDPS。缺少可靠归因数据时保持 `--`。
- 不把本地 raw events 回放作为主要产品形态；它只用于无游戏时调试、复算和排错。
- 不分发未授权的第三方代码。公开发布前需要确认 GBFR-ACT 相关授权。

## 本机开发

安装依赖：

```bash
npm install
```

前端构建：

```bash
npm run build
```

Tauri/Rust 检查建议在 Visual Studio 2022 DevCmd 中执行：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml" --offline
```

启动开发版：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:dev
```

只看前端页面：

```bash
npm run dev
```

默认 Vite 地址：

```text
http://127.0.0.1:1420
```

## 无游戏验证

当前机器不能启动游戏时，可以用以下方式验证大部分功能：

1. 启动前端或 Tauri 开发版。
2. 打开“设置与调试”。
3. 点击“写入 Mock 回放”或“写入木桩多轮 Mock”。
4. 切到 Overlay、Dashboard、配装测试检查统计和图表。
5. 在 Dashboard 保存当前记录为历史记录，验证筛选、重命名、导出、导入和 raw events 展开。

## 数据文件

默认应用数据目录由 Tauri `app_data_dir` 决定，Windows 上通常在：

```text
%APPDATA%\dev.ncerno.gbfr-dpscheck
```

主要文件：

```text
config.json
records/raw-events.jsonl
records/loadout-tests.json
records/combat-history/<history-id>/record.json
records/combat-history/<history-id>/raw-events.jsonl
records/combat-history-export.json
```

## 打包

应用安装包打包命令：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:build
```

当前已验证可生成：

```text
src-tauri\target\release\bundle\msi\GBFR-DPScheck_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\GBFR-DPScheck_0.1.0_x64-setup.exe
```

源代码和文档交付归档见：

```text
docs/release-package-2026-06-03.md
```

本地源代码归档：

```text
D:\yzy\GBFR-DPScheck-source-2026-06-03.zip
```

公开发布前需要补齐：

- 干净 Windows 环境安装测试。
- 管理员权限、端口占用、WebView2、Overlay 全屏限制等 FAQ。
- 隐私说明：raw events 和历史记录可能包含用户名、系统路径等信息。
