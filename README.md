# GBFR-DPScheck

GBFR-DPScheck 是一个面向《Granblue Fantasy: Relink》的 DPS 小窗和战斗记录工具。

它是在 [GBFR-ACT](https://github.com/nyaoouo/GBFR-ACT) 提供的本地 WebSocket 数据基础上做的桌面化优化迭代：保留 GBFR-ACT 的数据来源能力，另外补上更适合日常使用的透明 Overlay、历史记录、配装测试、目标过滤和更简单的启动流程。

GBFR-DPScheck 不读取游戏进程，不注入游戏，不做 hook，也不绕过任何检测。它只连接你本机运行的 GBFR-ACT。

## 下载与安装

请到 Releases 页面下载安装包：

```text
https://github.com/ncerno/GBFR-DPScheck/releases/latest
```

推荐下载：

```text
GBFR-DPScheck_0.1.0_x64-setup.exe
```

如果你更习惯 MSI，也可以下载：

```text
GBFR-DPScheck_0.1.0_x64_en-US.msi
```

## 能做什么

- 在游戏上方显示一个半透明 DPS 小窗。
- 显示团队 DPS、个人 DPS、总伤害、占比和最近 60 秒 DPS。
- 小窗里显示 `玩家名（角色名）`，方便看清谁在操作哪个角色。
- 自动连接 GBFR-ACT，支持后台启动。
- 保存战斗历史，重启后还能查看。
- 记录技能伤害、角色伤害和目标承伤。
- 保存配装测试，方便比较同一角色不同配置的表现。
- 默认不保存 Raw Events，避免日志越积越多。

## 使用前需要

你需要准备：

- Windows 10 / Windows 11
- 游戏本体
- GBFR-ACT
- Python 3.11 64-bit

说明：

- GBFR-DPScheck 不随安装包分发 GBFR-ACT。GBFR-ACT 是独立的第三方项目，需要用户自行下载。
- 如果系统缺少 Microsoft Edge WebView2 Runtime，应用可能无法正常显示。多数 Windows 10/11 已经自带；缺少时按系统提示安装即可。

## 第一次使用

1. 安装并启动 GBFR-DPScheck。
2. 首页会出现“首次使用”向导。
3. 如果还没有 GBFR-ACT，点击“打开 GBFR-ACT 下载页”，下载并解压。
4. 在向导里填写 GBFR-ACT 的路径，可以填：

```text
D:\Tools\GBFR-ACT\act_ws.py
```

也可以直接填 GBFR-ACT 文件夹：

```text
D:\Tools\GBFR-ACT
```

5. 点击“保存并启动”。
6. 如果 Windows 弹出 UAC 管理员权限，点击允许。
7. 点击“连接”。
8. 点击“打开 Overlay 小窗”。
9. 进入游戏打一轮木桩或任务，看到伤害后小窗会自动刷新。

以后再打开 GBFR-DPScheck，会按保存好的路径自动尝试启动 GBFR-ACT、连接 WebSocket 并打开小窗。

## 常见问题

**为什么不把 GBFR-ACT 一起打进安装包？**

GBFR-ACT 是第三方项目，当前仓库没有明确的再分发许可证。为了尊重原项目和避免授权风险，GBFR-DPScheck 不复制、不打包、不再发布 GBFR-ACT 的代码或资源。你需要单独下载 GBFR-ACT，本工具只连接它在本机提供的数据。

**启动时还会弹窗口吗？**

正常情况下不会再弹额外的黑色命令行窗口。需要管理员权限时，Windows 仍会显示 UAC 授权弹窗，这是正常行为。

**全屏模式看不到 Overlay 怎么办？**

优先使用无边框全屏或窗口化全屏。Windows 独占全屏下，透明置顶窗口可能被游戏或显卡驱动覆盖。

**会自动保存大量日志吗？**

不会。Raw Events 默认不落盘。只有你在设置里的“高级调试”手动开启或手动保存时，才会写入本地文件。

**会上传我的数据吗？**

不会。GBFR-DPScheck 不内置联网统计，不主动上传战斗记录。历史记录和 Raw Events 都保存在本机。

## 当前限制

- GBFR-DPScheck 依赖 GBFR-ACT 提供数据；GBFR-ACT 没有上报的信息，本工具不能凭空计算。
- 当前不做团队增伤归因。GBFR-ACT 事件流没有可靠的 BUFF / DEBUFF 归因数据，因此界面只展示可从日志稳定计算的 DPS。
- 真实地图名依赖 GBFR-ACT 上报；如果事件里没有地图名，只能按区域切换和任务策略处理。
- 干净 Windows 环境安装测试仍在补充中。

## 相关文档

- 普通用户快速开始：[docs/user-quick-start.md](docs/user-quick-start.md)
- 常见问题：[docs/faq.md](docs/faq.md)
- 隐私说明：[docs/privacy.md](docs/privacy.md)
- 第三方项目说明：[docs/third-party-notices.md](docs/third-party-notices.md)
- 干净 Windows 验收清单：[docs/clean-windows-test.md](docs/clean-windows-test.md)
- 发布状态：[docs/release-status.md](docs/release-status.md)
- 项目进度与剩余事项：[docs/current-progress.md](docs/current-progress.md)

## 第三方说明

GBFR-ACT 项目地址：

```text
https://github.com/nyaoouo/GBFR-ACT
```

Granblue Fantasy: Relink 及相关名称、角色和素材归其权利方所有。GBFR-DPScheck 是非官方工具，不代表游戏发行方、开发方或 GBFR-ACT 原作者。
