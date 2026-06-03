# 第三方说明

更新时间：2026-06-04

## GBFR-ACT

GBFR-DPScheck 依赖用户本机运行的 GBFR-ACT WebSocket 事件流，不直接读取游戏进程，不实现 hook、注入、绕过或反检测逻辑。

项目链接：

```text
https://github.com/nyaoouo/GBFR-ACT
```

当前发布策略：

- GBFR-DPScheck 不随安装包分发 GBFR-ACT。
- GBFR-DPScheck 不复制、打包或再发布 GBFR-ACT 源码、脚本和资源文件。
- 用户需要自行安装、配置和运行 GBFR-ACT。
- 应用只读取用户本机 GBFR-ACT 暴露的 WebSocket 数据，以及用户配置路径下的文本映射资源。
- 发布页面和 README 中保留 GBFR-ACT 项目链接和作者署名。

授权注意事项：

- 截至 2026-06-04，公开仓库根目录未看到明确的 `LICENSE` 文件。
- 在未确认授权前，不应把 GBFR-ACT 代码或资源打进 GBFR-DPScheck 安装包。
- 如果后续需要分发 GBFR-ACT、改造 GBFR-ACT 或内置其资源文件，应先取得作者授权或确认其许可证允许该用途。

建议发布文案：

```text
GBFR-DPScheck consumes local WebSocket events from GBFR-ACT. GBFR-ACT is a separate third-party project by nyaoouo and is not bundled with this application. Users must install and run GBFR-ACT separately.
```

## Microsoft Edge WebView2

Windows 版本依赖 Microsoft Edge WebView2 Runtime。多数 Windows 10/11 环境已经自带或由系统更新安装。

官方入口：

```text
https://developer.microsoft.com/microsoft-edge/webview2/
```

发布页面应提示：如果应用启动白屏或提示缺少 WebView2，请安装 Microsoft 官方 WebView2 Evergreen Runtime。

## 游戏与商标

Granblue Fantasy: Relink 及相关名称、角色和素材归其权利方所有。GBFR-DPScheck 是非官方工具，不代表游戏发行方或开发方。

发布页面应避免暗示官方背书。
