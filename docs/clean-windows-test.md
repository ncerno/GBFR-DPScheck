# 干净 Windows 安装验收

更新时间：2026-06-04

这份清单用于验证安装包在没有开发环境的 Windows 机器上是否可用。建议优先使用 Windows 10/11 虚拟机、备用电脑，或新建的干净 Windows 用户环境。

## 准备

需要准备：

- GBFR-DPScheck 安装包：优先测试 `GBFR-DPScheck_0.1.0_x64-setup.exe`，再测试 MSI。
- 游戏本体。
- GBFR-ACT 独立安装目录。
- 可选：Microsoft Edge WebView2 Evergreen Runtime 安装包。

测试环境尽量不要预装：

- Node.js
- Rust
- Visual Studio Build Tools
- 本项目源码目录

这样可以验证安装包是否真的不依赖开发环境。

## 基础安装测试

1. 安装 GBFR-DPScheck。
2. 从开始菜单或桌面快捷方式启动。
3. 确认主窗口可以打开，页面没有白屏。
4. 如果白屏或提示缺少 WebView2，安装 Microsoft Edge WebView2 Runtime 后重启应用。
5. 确认首页出现“首次使用”向导。
6. 关闭应用再重新打开，确认仍能正常启动。

记录结果：

```text
系统版本：
安装包类型：EXE / MSI
是否需要手动安装 WebView2：
应用是否能启动：
配置是否能持久化：
```

## GBFR-ACT 连接测试

1. 启动游戏。
2. 如果测试环境还没有 GBFR-ACT，点击首页向导里的“打开 GBFR-ACT 下载页”，下载并解压。
3. 在首页向导里填写 GBFR-ACT 的 `act_ws.py` 路径；也可以填写 GBFR-ACT 文件夹。
4. 点击“保存并启动”。
5. 如果出现 UAC 弹窗，确认授权给 GBFR-ACT。
6. 点击“连接”，确认 WebSocket 连接成功。
7. 点击“打开 Overlay 小窗”。
8. 进入木桩或任务打一轮伤害。
9. 确认 Overlay、Dashboard 都出现伤害数据。

记录结果：

```text
GBFR-ACT 是否能被启动：
UAC 是否出现：
WebSocket 是否连接：
是否收到 damage 事件：
是否能显示队伍和角色：
```

## Overlay 验收

你当前已经基本完成 Overlay 实机验收。干净系统上仍建议快速复测：

1. 打开独立 Overlay。
2. 调整窗口大小，确认内部 HUD 等比例缩放。
3. 调整透明度，确认背景半透明。
4. 开启鼠标穿透，确认游戏可正常点击。
5. 回主窗口关闭鼠标穿透。
6. 测试普通窗口、无边框窗口和全屏模式。

记录结果：

```text
透明：
置顶：
无边框：
鼠标穿透：
窗口缩放：
全屏可见性：
```

## 数据持久化测试

1. 打一轮木桩或任务。
2. 在 Dashboard 保存当前记录为历史记录。
3. 关闭并重新打开 GBFR-DPScheck。
4. 确认历史记录仍能读取。
5. 保存一条配装测试记录。
6. 关闭并重新打开，确认配装测试仍能读取。
7. 在设置页手动保存 raw events 样本。
8. 确认 `%APPDATA%\dev.ncerno.gbfr-dpscheck` 下生成对应文件。
9. 清空 raw events，确认文件被清理。

记录结果：

```text
历史保存/读取：
配装测试保存/读取：
raw events 手动保存：
raw events 清空：
```

## 卸载和残留测试

1. 通过系统设置卸载 GBFR-DPScheck。
2. 确认程序文件被移除。
3. 检查 `%APPDATA%\dev.ncerno.gbfr-dpscheck` 是否仍保留用户数据。
4. 发布说明里注明：卸载应用不一定自动删除用户数据，如需彻底清理请手动删除应用数据目录。

记录结果：

```text
卸载是否成功：
用户数据是否保留：
是否需要手动清理说明：
```

## 通过标准

最低发布门槛：

- 不安装 Node/Rust/VS Build Tools 也能启动。
- 缺少 WebView2 时有明确处理路径。
- GBFR-ACT 可以启动或手动连接。
- 能收到实时伤害并显示 Overlay/Dashboard。
- 历史记录和配装测试重启后仍可读取。
- Overlay 在无边框窗口下透明、置顶、鼠标穿透可用。

如果全屏独占不可见，但无边框全屏可用，可以发布，但必须在 FAQ 中说明限制。
