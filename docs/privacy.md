# 隐私说明

更新时间：2026-06-04

GBFR-DPScheck 只在本机运行，不主动上传数据，不内置联网统计，也不向外部服务器发送战斗记录。

## 本地保存的数据

默认应用数据目录由 Tauri 决定，Windows 通常位于：

```text
%APPDATA%\dev.ncerno.gbfr-dpscheck
```

主要文件包括：

```text
config.json
records/raw-events.jsonl
records/loadout-tests.json
records/combat-history/<history-id>/record.json
records/combat-history/<history-id>/raw-events.jsonl
records/combat-history-export.json
```

## 可能包含的信息

Raw Events、历史记录、配装测试和导出文件可能包含：

- 玩家名、角色名、队伍成员信息。
- 伤害事件时间线、动作 id、目标 id、死亡次数等战斗数据。
- GBFR-ACT 推送的原始 payload。
- 本机配置路径，例如 GBFR-ACT 脚本路径或用户目录片段。
- 用户手动填写的配装备注、武器备注、因子/加护备注。

分享日志、历史导出或问题复现包前，应先检查并移除不想公开的用户名、路径和备注。

## Raw Events 默认策略

Raw Events 默认不自动落盘，避免长期运行产生大量日志和隐私风险。

写入 raw events 的方式只有：

- 在设置页手动开启实时采集。
- 在设置页手动保存当前内存事件样本。
- 保存 Dashboard 历史记录时，为该历史记录保存对应 raw events 折录。

加载本地 raw events 做调试回放时，不会自动重新写回日志。

## 清理数据

可以通过应用内功能清理：

- 设置页清空 raw events。
- Dashboard 删除历史记录。
- 配装测试页删除测试记录。

也可以在关闭应用后手动删除应用数据目录：

```text
%APPDATA%\dev.ncerno.gbfr-dpscheck
```

手动删除会清空配置、历史记录、配装测试和 raw events。

## 发布建议

公开发布页面应明确说明：

- 本项目不上传战斗数据。
- 用户主动导出的历史记录和 raw events 可能包含个人信息。
- 反馈问题时优先提供脱敏后的最小日志片段。
