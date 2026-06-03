import { useEffect, useMemo, useState } from 'react';
import type { AppRuntime } from '../../app/useAppRuntime';
import { ConnectionBadge } from '../../components/ConnectionBadge';

interface SetupAssistantProps {
  runtime: AppRuntime;
  onOpenOverlayWindow: () => void;
}

export function SetupAssistant({ runtime, onOpenOverlayWindow }: SetupAssistantProps) {
  const [actPath, setActPath] = useState(runtime.config.gbfr_act.act_ws_path ?? '');
  const hasActPath = Boolean(runtime.config.gbfr_act.act_ws_path);
  const isConnected = runtime.stream.connection.status === 'connected';
  const hasDamage = (runtime.combatReplay.latestRecord?.damageEventCount ?? 0) > 0;
  const compact = hasActPath && isConnected && hasDamage;
  const setupHint = useMemo(() => getSetupHint({ hasActPath, isConnected, hasDamage }), [hasActPath, hasDamage, isConnected]);

  useEffect(() => {
    setActPath(runtime.config.gbfr_act.act_ws_path ?? '');
  }, [runtime.config.gbfr_act.act_ws_path]);

  if (compact) {
    return (
      <section className="setup-assistant setup-assistant--compact">
        <div>
          <strong>实时分析已就绪</strong>
          <span>已连接 GBFR-ACT，Overlay 会跟随当前战斗刷新。</span>
        </div>
        <ConnectionBadge status={runtime.stream.connection.status} error={runtime.stream.connection.lastError} />
        <button type="button" onClick={onOpenOverlayWindow}>打开小窗</button>
      </section>
    );
  }

  return (
    <section className="setup-assistant">
      <div className="setup-assistant__header">
        <div>
          <span className="setup-assistant__eyebrow">首次使用</span>
          <h2>三步开始看 DPS</h2>
          <p>{setupHint}</p>
        </div>
        <ConnectionBadge status={runtime.stream.connection.status} error={runtime.stream.connection.lastError} />
      </div>

      <div className="setup-steps">
        <article className={hasActPath ? 'setup-step setup-step--done' : 'setup-step'}>
          <span>1</span>
          <div>
            <strong>准备 GBFR-ACT</strong>
            <p>下载 GBFR-ACT 后，把 `act_ws.py` 文件路径填到下面。GBFR-DPScheck 不内置第三方 ACT。</p>
            <div className="setup-path-row">
              <input
                value={actPath}
                placeholder="例如 D:\\yzy\\GBFR-ACT\\act_ws.py，也可以填 GBFR-ACT 文件夹"
                onChange={(event) => setActPath(event.target.value)}
              />
              <button type="button" disabled={!actPath.trim()} onClick={() => void runtime.configureGbfrActPath(actPath)}>
                保存并启动
              </button>
            </div>
            <button type="button" className="button-link" onClick={() => void runtime.openGbfrActDownloadPage()}>
              打开 GBFR-ACT 下载页
            </button>
          </div>
        </article>

        <article className={isConnected ? 'setup-step setup-step--done' : 'setup-step'}>
          <span>2</span>
          <div>
            <strong>连接 WebSocket</strong>
            <p>游戏和 GBFR-ACT 启动后，连接默认端口 `24399`。如果弹出 UAC，请允许 GBFR-ACT 管理员权限。</p>
            <div className="button-row">
              <button type="button" onClick={() => void runtime.startService()}>启动 ACT</button>
              <button type="button" onClick={runtime.stream.connect}>连接</button>
              <button type="button" onClick={() => void runtime.checkService()}>检查状态</button>
            </div>
          </div>
        </article>

        <article className={hasDamage ? 'setup-step setup-step--done' : 'setup-step'}>
          <span>3</span>
          <div>
            <strong>打开小窗并进游戏测试</strong>
            <p>打一轮木桩或任务，看到伤害后小窗会显示团队 DPS 和玩家名（角色名）。</p>
            <div className="button-row">
              <button type="button" onClick={onOpenOverlayWindow}>打开 Overlay 小窗</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function getSetupHint({
  hasActPath,
  isConnected,
  hasDamage,
}: {
  hasActPath: boolean;
  isConnected: boolean;
  hasDamage: boolean;
}) {
  if (!hasActPath) {
    return '先选择 GBFR-ACT 路径。后面启动、连接和小窗都可以在这里完成。';
  }

  if (!isConnected) {
    return 'GBFR-ACT 路径已配置，下一步启动服务并连接 WebSocket。';
  }

  if (!hasDamage) {
    return 'WebSocket 已连接，进游戏打一轮伤害即可看到实时 DPS。';
  }

  return '实时分析已就绪。';
}
