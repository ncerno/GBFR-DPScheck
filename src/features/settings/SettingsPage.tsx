import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import type { AppRuntime } from '../../app/useAppRuntime';
import { mockGbfrActEvents, mockTrainingMultiRoundEvents } from '../debug/mockEvents';
import { CombatSummaryPanel } from '../debug/CombatSummaryPanel';
import { RawEventViewer } from '../debug/RawEventViewer';

interface SettingsPageProps {
  runtime: AppRuntime;
}

export function SettingsPage({ runtime }: SettingsPageProps) {
  const {
    config,
    serviceStatus,
    diagnostics,
    actionNameStatus,
    loadoutTextStatus,
    operationMessage,
    stream,
    updateGbfrActConfig,
    updateOverlayConfig,
    updateCombatConfig,
    resetCurrentCombatRecord,
    saveConfig,
    checkService,
    startService,
    clearSavedRawEvents,
    loadSavedRawEvents,
    reloadActionNameMap,
    reloadLoadoutTextMap,
    setOperationMessage,
  } = runtime;

  const pushMockEvents = async () => {
    stream.clearEvents();
    stream.pushEvents([...mockGbfrActEvents].reverse(), { source: 'replay', persist: false });
    setOperationMessage('Mock 事件已写入前端调试回放，不会保存到本地 Raw Events 文件。');
  };

  const pushTrainingMultiRoundMockEvents = async () => {
    stream.clearEvents();
    stream.pushEvents([...mockTrainingMultiRoundEvents].reverse(), { source: 'replay', persist: false });
    setOperationMessage('木桩多轮 Mock 已写入前端调试回放，可用于验证 auto/training 分段和木桩空窗秒数。');
  };

  return (
    <PlaceholderPanel
      title="设置与调试"
      description="配置 GBFR-ACT WebSocket。Raw Events 与 Mock 数据只用于开发回放，实时分析以 WebSocket 推送为主。"
    >
      <div className="settings-grid">
        <section className="settings-card">
          <h3>GBFR-ACT</h3>
          <label>
            WebSocket 地址
            <input
              value={config.gbfr_act.websocket_url}
              onChange={(event) => updateGbfrActConfig('websocket_url', event.target.value)}
            />
          </label>
          <label>
            act_ws.py 路径
            <input
              value={config.gbfr_act.act_ws_path ?? ''}
              placeholder="例如：D:\\yzy\\GBFR-ACT\\act_ws.py"
              onChange={(event) => updateGbfrActConfig('act_ws_path', event.target.value || null)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.gbfr_act.auto_start}
              onChange={(event) => updateGbfrActConfig('auto_start', event.target.checked)}
            />
            自动启动 GBFR-ACT
          </label>
          <div className="button-row">
            <button type="button" onClick={() => void saveConfig()}>保存配置</button>
            <button type="button" onClick={() => void checkService()}>检查服务</button>
            <button type="button" onClick={() => void startService()}>启动 GBFR-ACT</button>
          </div>
        </section>

        <section className="settings-card">
          <h3>Overlay 窗口</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.overlay.always_on_top}
              onChange={(event) => updateOverlayConfig('always_on_top', event.target.checked)}
            />
            窗口置顶
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.overlay.compact}
              onChange={(event) => updateOverlayConfig('compact', event.target.checked)}
            />
            紧凑模式
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.overlay.click_through}
              onChange={(event) => updateOverlayConfig('click_through', event.target.checked)}
            />
            默认鼠标穿透
          </label>
          <label>
            透明度 {Math.round(config.overlay.opacity * 100)}%
            <input
              type="range"
              min="0.35"
              max="1"
              step="0.05"
              value={config.overlay.opacity}
              onChange={(event) => updateOverlayConfig('opacity', Number(event.target.value))}
            />
          </label>
          <div className="settings-size-row">
            <label>
              宽度
              <input
                type="number"
                min="520"
                value={config.overlay.window_width}
                onChange={(event) => updateOverlayConfig('window_width', Number(event.target.value))}
              />
            </label>
            <label>
              高度
              <input
                type="number"
                min="280"
                value={config.overlay.window_height}
                onChange={(event) => updateOverlayConfig('window_height', Number(event.target.value))}
              />
            </label>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => void saveConfig()}>保存 Overlay 配置</button>
          </div>
        </section>

        <section className="settings-card">
          <h3>战斗分段</h3>
          <label>
            区域策略
            <select
              value={config.combat.area_strategy}
              onChange={(event) => updateCombatConfig('area_strategy', event.target.value)}
            >
              <option value="auto">自动识别</option>
              <option value="training">木桩 / 训练</option>
              <option value="quest">任务 / Boss</option>
              <option value="generic">通用区域</option>
            </select>
          </label>
          <div className="settings-size-row">
            <label>
              通用空窗秒数
              <input
                type="number"
                min="1"
                max="600"
                value={config.combat.inactive_timeout_sec}
                onChange={(event) => updateCombatConfig('inactive_timeout_sec', Number(event.target.value))}
              />
            </label>
            <label>
              木桩空窗秒数
              <input
                type="number"
                min="1"
                max="120"
                value={config.combat.training_inactive_timeout_sec}
                onChange={(event) => updateCombatConfig('training_inactive_timeout_sec', Number(event.target.value))}
              />
            </label>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.combat.keep_raw_events}
              onChange={(event) => updateCombatConfig('keep_raw_events', event.target.checked)}
            />
            保存实时 Raw Events
          </label>
          <div className="button-row">
            <button type="button" onClick={() => void saveConfig()}>保存分段配置</button>
            <button type="button" onClick={resetCurrentCombatRecord}>手动重置当前记录</button>
          </div>
        </section>

        <section className="settings-card">
          <h3>实时连接</h3>
          <dl className="settings-list compact">
            <div>
              <dt>WebSocket</dt>
              <dd>{config.gbfr_act.websocket_url}</dd>
            </div>
            <div>
              <dt>前端连接</dt>
              <dd><ConnectionBadge status={stream.connection.status} error={stream.connection.lastError} /></dd>
            </div>
            <div>
              <dt>服务状态</dt>
              <dd>{serviceStatus ? (serviceStatus.running ? '可连接' : '未确认') : '未检查'}</dd>
            </div>
            <div>
              <dt>当前数据源</dt>
              <dd>{stream.eventSource === 'live' ? '实时 WebSocket' : '调试回放'}</dd>
            </div>
            <div>
              <dt>分段策略</dt>
              <dd>{formatAreaStrategy(config.combat.area_strategy)}；通用 {config.combat.inactive_timeout_sec}s，木桩 {config.combat.training_inactive_timeout_sec}s</dd>
            </div>
            <div>
              <dt>事件计数</dt>
              <dd>累计 {stream.eventCount} 条，当前缓冲 {stream.bufferedEventCount} 条</dd>
            </div>
            <div>
              <dt>动作名映射</dt>
              <dd>{actionNameStatus}</dd>
            </div>
            <div>
              <dt>配装文本</dt>
              <dd>{loadoutTextStatus}</dd>
            </div>
          </dl>
          <div className="button-row">
            <button type="button" onClick={stream.connect}>连接 WebSocket</button>
            <button type="button" onClick={stream.disconnect}>断开</button>
            <button type="button" onClick={() => void pushMockEvents()}>写入 Mock 回放</button>
            <button type="button" onClick={() => void pushTrainingMultiRoundMockEvents()}>写入木桩多轮 Mock</button>
            <button type="button" onClick={() => void loadSavedRawEvents()}>加载本地 Raw Events</button>
            <button type="button" onClick={resetCurrentCombatRecord}>手动重置记录</button>
            <button type="button" onClick={() => void clearSavedRawEvents()}>清空 Raw Events</button>
            <button type="button" onClick={() => void reloadActionNameMap()}>重新加载动作名</button>
            <button type="button" onClick={() => void reloadLoadoutTextMap()}>重新加载配装文本</button>
          </div>
        </section>
      </div>

      {operationMessage ? <p className="operation-message">{operationMessage}</p> : null}

      {diagnostics ? (
        <section className="settings-card diagnostics-card">
          <h3>诊断信息</h3>
          <dl className="settings-list compact">
            <div>
              <dt>数据目录</dt>
              <dd>{diagnostics.app_data_dir}</dd>
            </div>
            <div>
              <dt>配置文件</dt>
              <dd>{diagnostics.config_path}</dd>
            </div>
            <div>
              <dt>Raw Events</dt>
              <dd>{diagnostics.raw_events_path}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <CombatSummaryPanel
        events={stream.combatEvents}
        inactiveTimeoutSec={config.combat.inactive_timeout_sec}
        trainingInactiveTimeoutSec={config.combat.training_inactive_timeout_sec}
        defaultStrategy={config.combat.area_strategy}
      />
      <RawEventViewer events={stream.events} parseErrors={stream.parseErrors} onClear={stream.clearEvents} />
    </PlaceholderPanel>
  );
}

function formatAreaStrategy(strategy: string) {
  const labels: Record<string, string> = {
    auto: '自动识别',
    training: '木桩 / 训练',
    quest: '任务 / Boss',
    generic: '通用区域',
  };

  return labels[strategy] ?? strategy;
}
