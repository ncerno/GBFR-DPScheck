import { useCallback, useEffect, useState } from 'react';
import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import type { AppConfig, AppDiagnostics, GbfrActServiceStatus } from '../../config/appConfig';
import { fallbackAppConfig } from '../../config/appConfig';
import type { GbfrActRawEvent } from '../../gbfr-act/events';
import { useGbfrActStream } from '../../gbfr-act/useGbfrActStream';
import { callTauriCommand, isTauriRuntime } from '../../tauri/commands';
import { mockGbfrActEvents } from '../debug/mockEvents';
import { RawEventViewer } from '../debug/RawEventViewer';

export function SettingsPage() {
  const [config, setConfig] = useState<AppConfig>(fallbackAppConfig);
  const [serviceStatus, setServiceStatus] = useState<GbfrActServiceStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<AppDiagnostics | null>(null);
  const [operationMessage, setOperationMessage] = useState<string>('');

  const saveRawEvent = useCallback(async (event: GbfrActRawEvent) => {
    if (!isTauriRuntime()) {
      return;
    }

    await callTauriCommand<void>('save_raw_event', { event });
  }, []);

  const stream = useGbfrActStream({
    url: config.gbfr_act.websocket_url,
    onEvent: saveRawEvent,
  });

  const loadConfig = useCallback(async () => {
    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，使用前端默认配置。');
      return;
    }

    try {
      const nextConfig = await callTauriCommand<AppConfig>('get_app_config');
      setConfig(nextConfig);
      const nextDiagnostics = await callTauriCommand<AppDiagnostics>('get_app_diagnostics');
      setDiagnostics(nextDiagnostics);
      setOperationMessage('配置已加载。');
    } catch (error) {
      setOperationMessage(`配置加载失败：${errorToMessage(error)}`);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const updateGbfrActConfig = (field: keyof AppConfig['gbfr_act'], value: string | boolean | null) => {
    setConfig((current) => ({
      ...current,
      gbfr_act: {
        ...current.gbfr_act,
        [field]: value,
      },
    }));
  };

  const saveConfig = async () => {
    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，无法写入 Tauri 配置。');
      return;
    }

    try {
      await callTauriCommand<void>('save_app_config', { config });
      setOperationMessage('配置已保存。');
    } catch (error) {
      setOperationMessage(`配置保存失败：${errorToMessage(error)}`);
    }
  };

  const checkService = async () => {
    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，无法检查本地服务。');
      return;
    }

    try {
      const status = await callTauriCommand<GbfrActServiceStatus>('check_gbfr_act_service');
      setServiceStatus(status);
      setOperationMessage(status.message ?? '服务检查完成。');
    } catch (error) {
      setOperationMessage(`服务检查失败：${errorToMessage(error)}`);
    }
  };

  const startService = async () => {
    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，无法启动 GBFR-ACT。');
      return;
    }

    try {
      await callTauriCommand<void>('save_app_config', { config });
      const status = await callTauriCommand<GbfrActServiceStatus>('start_gbfr_act_service');
      setServiceStatus(status);
      setOperationMessage(status.message ?? '已尝试启动 GBFR-ACT。');
    } catch (error) {
      setOperationMessage(`启动失败：${errorToMessage(error)}`);
    }
  };

  const pushMockEvents = async () => {
    for (const event of mockGbfrActEvents) {
      stream.pushEvent(event);
    }
    setOperationMessage('Mock 事件已写入 Raw Event Viewer，并已尝试保存到 raw events。');
  };

  const clearSavedRawEvents = async () => {
    stream.clearEvents();

    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，只清空了前端事件列表。');
      return;
    }

    try {
      await callTauriCommand<void>('clear_raw_events');
      setOperationMessage('Raw events 文件已清空，可以重新采集干净样本。');
    } catch (error) {
      setOperationMessage(`清空 raw events 失败：${errorToMessage(error)}`);
    }
  };

  return (
    <PlaceholderPanel title="设置与调试" description="M1 阶段用于配置 GBFR-ACT、连接 WebSocket、查看 raw events 和诊断本地环境。">
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

      <RawEventViewer events={stream.events} parseErrors={stream.parseErrors} onClear={stream.clearEvents} />
    </PlaceholderPanel>
  );
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
