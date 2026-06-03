# 交付打包记录

日期：2026-06-03

## 交付范围

本次交付包含 GBFR-DPScheck 当前源码、Tauri 配置、Rust 后端、React 前端、中文 UI 文案、项目文档和问题审查记录。

包含的关键内容：

- `src/` 前端源码。
- `src-tauri/` Tauri/Rust 源码、配置和图标引用。
- `docs/` 全量项目过程文档。
- `README.md`、`CLAUDE.md`、`package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`。

源代码归档不包含以下可再生成或本机环境相关内容：

- `.git/`
- `node_modules/`
- `dist/`
- `src-tauri/target/`
- `src-tauri/gen/`
- `*.log`
- `.env`、`.env.local`

## 本次归档文件

本地源代码归档路径：

```text
D:\yzy\GBFR-DPScheck-source-2026-06-03.zip
```

归档用途：

- 离线交接当前源码和文档。
- 在未拉取 Git 仓库时快速恢复项目结构。
- 配合 `npm install`、`npm run build`、`cargo check` 重新生成依赖、前端构建产物和 Tauri 目标目录。

归档不替代 Git 仓库；正式版本以 Git commit 和远端仓库为准。

## Git 交付

远端仓库：

```text
https://github.com/ncerno/GBFR-DPScheck.git
```

目标分支：

```text
main
```

本次提交应包含：

- Overlay、Dashboard、配装测试、历史记录管理。
- 完整统计源与 Raw Event Viewer 展示缓冲拆分。
- `auto_start` 实际启动流程。
- 历史导入/导出安全校验。
- Tauri CSP。
- 文档、开发日志、技术计划和 issue review 处理结果。

## 验证命令

前端构建：

```bash
npm run build
```

Rust 检查：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml" --offline
```

空白检查：

```bash
git diff --check
```

静态扫描：检查调试日志、旧命令、未完成标记和 CSP 空配置残留，结果应无命中。

## 发布前仍需实机验收

本机当前不能启动游戏，因此以下不纳入本次本机验证结论：

- 真实游戏窗口下 Overlay 置顶、透明和鼠标穿透表现。
- 全屏独占模式下 Overlay 可见性。
- 长时间真实 WebSocket 事件流稳定性。
- 真实任务区域名下 `auto` 分段关键词覆盖率。
- 干净 Windows 环境安装包启动、WebView2、管理员权限、端口占用。

## 后续发布材料

2026-06-04 已补充：

- `docs/faq.md`：管理员权限、端口占用、WebView2、全屏 Overlay 限制。
- `docs/privacy.md`：raw events / 历史记录隐私说明。
- `docs/third-party-notices.md`：GBFR-ACT 第三方项目说明和署名策略。
- `docs/clean-windows-test.md`：干净 Windows 环境安装、连接、Overlay、数据持久化和卸载验收步骤。
- `docs/user-quick-start.md`：面向普通用户的最短启动流程。
- `docs/release-status.md`：当前完成项、待验收项和后续增强项。

公开发布前仍建议补充：

- 安装包在干净 Windows 环境的截图或验收记录。
- 长时间实机运行稳定性记录。
