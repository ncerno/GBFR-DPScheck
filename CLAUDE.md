# GBFR-DPScheck 开发说明

## 项目边界

GBFR-DPScheck 是 GBFR-ACT WebSocket 事件流客户端。

必须遵守：

- 不注入游戏进程。
- 不实现 hook、绕过、隐藏、反检测或破坏性逻辑。
- 不伪造 rDPS；缺少可靠归因数据时显示 `--`。
- raw events 是核心调试资产，统计调整优先用 raw events 回放验证。
- 本地 raw events 回放只用于无游戏调试，不是主产品形态。

## 技术栈

- Tauri 2
- React 18
- TypeScript
- Rust
- Vite

## 关键目录

```text
src/app/                 应用入口、runtime、窗口桥接
src/gbfr-act/            GBFR-ACT WebSocket 客户端和事件类型
src/combat/              事件标准化、分段、统计、图表数据、动作名
src/features/overlay/    Overlay 内嵌页和独立窗口
src/features/dashboard/  会话分析和历史记录
src/features/loadout/    配装测试和配装文本解析
src/features/settings/   设置、诊断、Mock、Raw Event Viewer
src-tauri/src/           Tauri commands、配置、存储、GBFR-ACT 服务管理
docs/                    当前状态、开发日志、技术计划、审查和交付记录
```

## 开发原则

- 统计逻辑放在 `src/combat/`，UI 不重复计算核心统计。
- Overlay、Dashboard、配装测试共享 `CombatRecord`。
- 新功能优先复用 `useAppRuntime` 和现有 Tauri command 分层。
- 对 GBFR-ACT 字段保持宽容解析，未知字段保留 raw。
- UI 文案默认中文。
- 修改文档时同步 README、`docs/current-progress.md`、`docs/development-log.md`、`docs/technical-plan.md`。
- 交付或打包时同步 `docs/release-package-2026-06-03.md`。

## 当前能力

已完成：

- GBFR-ACT 连接、服务检查和启动。
- raw events 保存、清空、加载和回放。
- 战斗分段和手动重置。
- DPS/伤害/技能/死亡统计。
- Overlay 主窗口和独立透明窗口。
- Dashboard 图表、raw events 查看、历史记录管理。
- 配装测试保存、筛选、排序、多轮对比。
- 动作名映射和配装文本解析。
- 历史记录重命名、筛选、排序、导入、导出。
- 源代码和文档交付归档记录。

待实机验收：

- 真实游戏窗口中的 Overlay 置顶、透明、鼠标穿透。
- 全屏独占模式表现。
- 长时间实时 WebSocket 稳定性。

## 常用命令

前端构建：

```bash
npm run build
```

Rust 检查：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cargo check --manifest-path "D:\yzy\GBFR-DPScheck\src-tauri\Cargo.toml" --offline
```

Tauri 开发：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:dev
```

打包：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
cd /d D:\yzy\GBFR-DPScheck
npm run tauri:build
```

## 无游戏验证

1. 启动 `npm run dev` 或 `npm run tauri:dev`。
2. 设置页写入 Mock 或木桩多轮 Mock。
3. 检查 Overlay、Dashboard、配装测试。
4. Dashboard 保存历史，验证筛选、重命名、导出、导入。

## 发布前注意

- 需要干净 Windows 环境安装测试。
- 需要确认 GBFR-ACT 授权和署名。
- 需要写明 raw events / 历史记录隐私风险。
- 需要说明全屏独占模式下 Overlay 可能不可见。
- 源代码归档记录见 `docs/release-package-2026-06-03.md`。
