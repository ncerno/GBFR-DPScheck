import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import type { AppRuntime } from '../../app/useAppRuntime';
import { mockGbfrActEvents } from '../debug/mockEvents';
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
    operationMessage,
    stream,
    updateGbfrActConfig,
    saveConfig,
    checkService,
    startService,
    clearSavedRawEvents,
    setOperationMessage,
  } = runtime;

  const pushMockEvents = async () => {
    for (const event of mockGbfrActEvents) {
      stream.pushEvent(event);
    }
    setOperationMessage('Mock 事件已写入 Raw Event Viewer，并已尝试保存到 raw events。');
  };

  return (
    <PlaceholderPanel title="设置与调试" description="M1/M2 阶段用于配置 GBFR-ACT、连接 WebSocket、查看 raw events 和诊断本地环境。">
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
          <h3>连接状态</h3>
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
          </dl>
          <div className="button-row">
            <button type="button" onClick={stream.connect}>连接 WebSocket</button>
            <button type="button" onClick={stream.disconnect}>断开</button>
            <button type="button" onClick={() => void pushMockEvents()}>写入 Mock 事件</button>
            <button type="button" onClick={() => void clearSavedRawEvents()}>清空 Raw Events</button>
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

      <CombatSummaryPanel events={stream.events} />
      <RawEventViewer events={stream.events} parseErrors={stream.parseErrors} onClear={stream.clearEvents} />
    </PlaceholderPanel>
  );
}
