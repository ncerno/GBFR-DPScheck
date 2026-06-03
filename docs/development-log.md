# 开发日志

更新时间：2026-06-03

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
- 优先通过 GBFR-ACT `uac_start.cmd` 请求管理员权限。
- 区分实时 `live` 和调试 `replay` 事件源。

### 3. Raw Events

- 后端写入 `records/raw-events.jsonl`。
- `Mutex` 串行化写入，避免高频事件并发写入黏连。
- 加载本地 raw events 时只注入前端回放，不重新持久化。
- Raw Event Viewer 显示事件和解析错误。

### 4. 事件标准化与统计

- 标准化 `enter_area`、`load_party`、`damage`、`inc_death_cnt`。
- 维护 actor ref、party member 和 raw actor。
- 统计总伤害、DPS、最近 60 秒 DPS、占比、死亡次数。
- 统计技能/动作伤害、最小/最大/平均值。
- rDPS 保留为空，避免在缺少归因数据时误导用户。

### 5. 分段策略

- 支持 `auto`、`training`、`quest`、`generic`。
- 支持通用空窗秒数和木桩独立空窗秒数。
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
- Overlay 创建失败会向调用方返回错误；rDPS 在缺少可靠归因前统一显示 `--`。
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

## 验证记录

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

- Overlay 独立窗口在真实游戏窗口上的置顶、透明和穿透。
- 全屏独占模式下的可见性。
- 真实任务区域名下 `auto` 策略的覆盖率。
- 长时间实时 WebSocket 事件流下的稳定性。

## 后续发布准备

- 在干净 Windows 环境测试安装和启动。
- 准备 FAQ：管理员权限、端口占用、WebView2、全屏 Overlay 限制。
- 准备授权说明和隐私说明。
