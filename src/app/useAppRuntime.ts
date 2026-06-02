import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppConfig, AppDiagnostics, GbfrActServiceStatus } from '../config/appConfig';
import { fallbackAppConfig } from '../config/appConfig';
import type { GbfrActRawEvent } from '../gbfr-act/events';
import { useGbfrActStream } from '../gbfr-act/useGbfrActStream';
import { replayCombatEvents } from '../combat/replay';
import { callTauriCommand, isTauriRuntime } from '../tauri/commands';

export function useAppRuntime() {
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
    maxEvents: 2000,
    onEvent: saveRawEvent,
  });

  const combatReplay = useMemo(() => replayCombatEvents([...stream.events].reverse(), {
    inactiveTimeoutSec: config.combat.inactive_timeout_sec,
    defaultStrategy: 'training',
  }), [config.combat.inactive_timeout_sec, stream.events]);

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

  const updateGbfrActConfig = useCallback((field: keyof AppConfig['gbfr_act'], value: string | boolean | null) => {
    setConfig((current) => ({
      ...current,
      gbfr_act: {
        ...current.gbfr_act,
        [field]: value,
      },
    }));
  }, []);

  const saveConfig = useCallback(async () => {
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
  }, [config]);

  const checkService = useCallback(async () => {
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
  }, []);

  const startService = useCallback(async () => {
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
  }, [config]);

  const clearSavedRawEvents = useCallback(async () => {
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
  }, [stream]);

  return {
    config,
    serviceStatus,
    diagnostics,
    operationMessage,
    stream,
    combatReplay,
    updateGbfrActConfig,
    saveConfig,
    checkService,
    startService,
    clearSavedRawEvents,
    setOperationMessage,
  };
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type AppRuntime = ReturnType<typeof useAppRuntime>;
