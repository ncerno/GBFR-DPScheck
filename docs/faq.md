# FAQ

更新时间：2026-06-04

## WebView2

GBFR-DPScheck 是 Tauri 桌面应用，Windows 版本依赖 Microsoft Edge WebView2 Runtime 渲染前端界面。多数 Windows 10/11 机器已经安装了 WebView2；如果干净系统打开后白屏、无法启动或提示 WebView2 缺失，请安装 Microsoft 官方 WebView2 Evergreen Runtime：

```text
https://developer.microsoft.com/microsoft-edge/webview2/
```

建议发布说明中注明：如果安装包启动异常，先安装 WebView2 Runtime，再重新启动 GBFR-DPScheck。

## 管理员权限

GBFR-DPScheck 本身不需要管理员权限读取游戏进程；它只连接 GBFR-ACT 暴露的本地 WebSocket。

GBFR-ACT 可能需要管理员权限才能读取游戏数据。GBFR-DPScheck 会在后台启动 `act_ws.py`，并通过系统 UAC 请求管理员权限；正常情况下不会弹出额外的黑色命令行窗口。正常使用路径是：

1. 启动游戏。
2. 启动 GBFR-DPScheck。
3. 在首页首次使用向导里填写 GBFR-ACT 路径并点击“保存并启动”。
4. 如果出现 UAC 弹窗，确认授权给 GBFR-ACT。
5. 回到 GBFR-DPScheck，确认 WebSocket 状态为已连接。

如果 GBFR-ACT 已经以管理员权限运行，而 GBFR-DPScheck 连接正常，则不需要再以管理员身份启动 GBFR-DPScheck。

如果提示未找到 Python 3.11 64-bit，请先安装 Python 3.11 64-bit。GBFR-ACT 自带的 `uac_start.cmd` 可以安装 Python，但它会打开可见命令行窗口，因此 GBFR-DPScheck 默认不再调用它。

## 端口占用

默认 WebSocket 地址是：

```text
ws://127.0.0.1:24399
```

如果连接失败，先检查 GBFR-ACT 是否运行，再检查端口是否被占用。

PowerShell 检查端口：

```powershell
Test-NetConnection 127.0.0.1 -Port 24399
```

查看占用进程：

```cmd
netstat -ano | findstr :24399
```

如果 24399 被其他程序占用，需要关闭占用程序，或在 GBFR-ACT 和 GBFR-DPScheck 中统一改成另一个端口。

## 找不到 act_ws.py

首次使用向导支持两种写法：

```text
D:\Tools\GBFR-ACT\act_ws.py
D:\Tools\GBFR-ACT
```

填写文件夹时，应用会自动检查该文件夹下是否存在 `act_ws.py`。如果提示路径不存在或文件夹内没有 `act_ws.py`，重新解压 GBFR-ACT 或重新填写路径。

## 全屏 Overlay 限制

独立 Overlay 使用透明、置顶、无边框 Tauri 窗口。你已经完成的实机测试表明无边框、透明、鼠标穿透和全屏场景基本可用，但仍建议在发布说明里保留以下限制：

- Windows 独占全屏下，第三方透明置顶窗口可能被游戏或显卡驱动覆盖。
- 如果 Overlay 在独占全屏不可见，优先改用无边框全屏或窗口化全屏。
- 开启鼠标穿透后，小窗本身不能再接收鼠标点击；需要回主窗口关闭穿透或关闭 Overlay。
- 多显示器、HDR、录屏/串流软件可能影响透明窗口显示效果。

## Raw Events 和历史记录过大

Raw Events 默认不自动落盘。只有在设置页手动开启实时采集，或手动保存当前事件样本时，才会写入本地文件。

长时间采集后如果磁盘占用变大，可以在设置页清空 raw events，或删除应用数据目录中的日志文件：

```text
%APPDATA%\dev.ncerno.gbfr-dpscheck
```

删除前请确认不再需要对应历史记录或调试样本。
