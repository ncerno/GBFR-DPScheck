import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, AppDiagnostics, GbfrActServiceStatus } from '../config/appConfig';
import { fallbackAppConfig } from '../config/appConfig';
import { GBFR_DPSCHECK_MANUAL_RESET_EVENT, type GbfrActRawEvent } from '../gbfr-act/events';
import { useGbfrActStream } from '../gbfr-act/useGbfrActStream';
import { replayCombatEvents } from '../combat/replay';
import type { CombatAreaStrategy } from '../combat/models';
import type { CombatActionNameMap } from '../combat/actionNames';
import { parseGbfrActActionNameText } from '../combat/gbfrActActionTextParser';
import type { GbfrActLoadoutTextMap } from '../features/loadout/loadoutText';
import { parseGbfrActDumpText } from '../features/loadout/loadoutText';
import { callTauriCommand, isTauriRuntime } from '../tauri/commands';

export function useAppRuntime() {
  const [config, setConfig] = useState<AppConfig>(fallbackAppConfig);
  const [serviceStatus, setServiceStatus] = useState<GbfrActServiceStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<AppDiagnostics | null>(null);
  const [actionNameMap, setActionNameMap] = useState<CombatActionNameMap | undefined>();
  const [actionNameStatus, setActionNameStatus] = useState('动作名映射未加载，使用 fallback 名称。');
  const [loadoutTextMap, setLoadoutTextMap] = useState<GbfrActLoadoutTextMap | undefined>();
  const [loadoutTextStatus, setLoadoutTextStatus] = useState('配装文本未加载，使用 raw ID。');
  const [operationMessage, setOperationMessage] = useState<string>('');
  const autoStartAttemptedRef = useRef(false);

  const saveRawEvent = useCallback(async (event: GbfrActRawEvent) => {
    if (!config.combat.keep_raw_events) {
      return;
    }

    if (!isTauriRuntime()) {
      return;
    }

    try {
      await callTauriCommand<void>('save_raw_event', { event });
    } catch (error) {
      setOperationMessage(`保存 raw event 失败：${errorToMessage(error)}`);
    }
  }, [config.combat.keep_raw_events]);

  const stream = useGbfrActStream({
    url: config.gbfr_act.websocket_url,
    maxEvents: 2000,
    onEvent: saveRawEvent,
  });

  const combatReplay = useMemo(() => replayCombatEvents([...stream.combatEvents].reverse(), {
    inactiveTimeoutSec: config.combat.inactive_timeout_sec,
    trainingInactiveTimeoutSec: config.combat.training_inactive_timeout_sec,
    defaultStrategy: config.combat.area_strategy as CombatAreaStrategy,
    actionNameMap,
  }), [
    actionNameMap,
    config.combat.area_strategy,
    config.combat.inactive_timeout_sec,
    config.combat.training_inactive_timeout_sec,
    stream.combatEvents,
  ]);

  const loadActionNameMap = useCallback(async () => {
    if (!isTauriRuntime()) {
      setActionNameStatus('当前是浏览器开发环境，使用 fallback 动作名。');
      return;
    }

    try {
      const text = await callTauriCommand<string | null>('load_gbfr_act_action_texts');
      if (!text) {
        setActionNameMap(undefined);
        setActionNameStatus('未找到 GBFR-ACT 动作名文件，使用 fallback 动作名。');
        return;
      }

      const nextMap = parseGbfrActActionNameText(text);
      setActionNameMap(nextMap);
      setActionNameStatus(`已加载 GBFR-ACT 动作名映射：${Object.keys(nextMap.actors).length} 个角色。`);
    } catch (error) {
      setActionNameMap(undefined);
      setActionNameStatus(`动作名映射加载失败：${errorToMessage(error)}`);
    }
  }, []);

  const loadLoadoutTextMap = useCallback(async () => {
    if (!isTauriRuntime()) {
      setLoadoutTextStatus('当前是浏览器开发环境，使用 raw ID。');
      return;
    }

    try {
      const text = await callTauriCommand<string | null>('load_gbfr_act_dump_texts');
      if (!text) {
        setLoadoutTextMap(undefined);
        setLoadoutTextStatus('未找到 GBFR-ACT 配装文本文件，使用 raw ID。');
        return;
      }

      const nextMap = parseGbfrActDumpText(text);
      setLoadoutTextMap(nextMap);
      setLoadoutTextStatus(`已加载 GBFR-ACT 配装文本：${Object.keys(nextMap.weapons).length} 把武器，${Object.keys(nextMap.sigils).length} 个因子。`);
    } catch (error) {
      setLoadoutTextMap(undefined);
      setLoadoutTextStatus(`配装文本加载失败：${errorToMessage(error)}`);
    }
  }, []);

  const autoStartGbfrAct = useCallback(async (nextConfig: AppConfig) => {
    if (!nextConfig.gbfr_act.auto_start || autoStartAttemptedRef.current || !isTauriRuntime()) {
      return;
    }

    autoStartAttemptedRef.current = true;

    try {
      const checkedStatus = await callTauriCommand<GbfrActServiceStatus>('check_gbfr_act_service');
      setServiceStatus(checkedStatus);
      if (checkedStatus.running) {
        setOperationMessage(checkedStatus.message ?? 'GBFR-ACT 已在运行。');
        return;
      }

      const startedStatus = await callTauriCommand<GbfrActServiceStatus>('start_gbfr_act_service');
      setServiceStatus(startedStatus);
      setOperationMessage(startedStatus.message ?? '已尝试自动启动 GBFR-ACT。');
    } catch (error) {
      setOperationMessage(`自动启动 GBFR-ACT 失败：${errorToMessage(error)}`);
    }
  }, []);

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
      void loadActionNameMap();
      void loadLoadoutTextMap();
      if (nextConfig.gbfr_act.auto_start) {
        setOperationMessage('配置已加载，正在检查自动启动 GBFR-ACT。');
        void autoStartGbfrAct(nextConfig);
      } else {
        setOperationMessage('配置已加载。');
      }
    } catch (error) {
      setOperationMessage(`配置加载失败：${errorToMessage(error)}`);
    }
  }, [autoStartGbfrAct, loadActionNameMap, loadLoadoutTextMap]);

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

  const updateOverlayConfig = useCallback((field: keyof AppConfig['overlay'], value: boolean | number | null) => {
    setConfig((current) => ({
      ...current,
      overlay: {
        ...current.overlay,
        [field]: value,
      },
    }));
  }, []);

  const updateCombatConfig = useCallback((field: keyof AppConfig['combat'], value: boolean | number | string) => {
    setConfig((current) => ({
      ...current,
      combat: {
        ...current.combat,
        [field]: value,
      },
    }));
  }, []);

  const resetCurrentCombatRecord = useCallback(() => {
    const event: GbfrActRawEvent = {
      time_ms: Date.now(),
      type: GBFR_DPSCHECK_MANUAL_RESET_EVENT,
      data: {
        source: 'GBFR-DPScheck',
        reason: 'manual',
      },
    };
    const source = stream.eventSource;
    stream.pushEvent(event, {
      source,
      persist: source === 'live' && config.combat.keep_raw_events,
    });
    setOperationMessage(source === 'live'
      ? '已手动重置当前战斗记录，并写入内部重置标记用于后续回放分段。'
      : '已手动重置当前调试回放记录，不会写入 Raw Events 文件。');
  }, [config.combat.keep_raw_events, stream]);

  const saveConfig = useCallback(async () => {
    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，无法写入 Tauri 配置。');
      return;
    }

    try {
      await callTauriCommand<void>('save_app_config', { config });
      void loadActionNameMap();
      void loadLoadoutTextMap();
      setOperationMessage('配置已保存。');
    } catch (error) {
      setOperationMessage(`配置保存失败：${errorToMessage(error)}`);
    }
  }, [config, loadActionNameMap, loadLoadoutTextMap]);

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
      setOperationMessage('Raw Events 文件已清空，可以重新采集干净样本。');
    } catch (error) {
      setOperationMessage(`清空 Raw Events 失败：${errorToMessage(error)}`);
    }
  }, [stream]);

  const loadSavedRawEvents = useCallback(async () => {
    if (!isTauriRuntime()) {
      setOperationMessage('当前是浏览器开发环境，无法读取本地 Raw Events。');
      return;
    }

    try {
      const events = await callTauriCommand<GbfrActRawEvent[]>('load_raw_events');
      stream.clearEvents();
      stream.pushEvents([...events].reverse(), { source: 'replay', persist: false });
      setOperationMessage(`已加载 ${events.length} 条本地 Raw Events 供调试回放，不会重新写入 Raw Events 文件。`);
    } catch (error) {
      setOperationMessage(`加载 Raw Events 失败：${errorToMessage(error)}`);
    }
  }, [stream]);

  return {
    config,
    serviceStatus,
    diagnostics,
    actionNameStatus,
    loadoutTextMap,
    loadoutTextStatus,
    operationMessage,
    stream,
    combatReplay,
    updateGbfrActConfig,
    updateOverlayConfig,
    updateCombatConfig,
    resetCurrentCombatRecord,
    saveConfig,
    checkService,
    startService,
    clearSavedRawEvents,
    loadSavedRawEvents,
    reloadActionNameMap: loadActionNameMap,
    reloadLoadoutTextMap: loadLoadoutTextMap,
    setOperationMessage,
  };
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type AppRuntime = ReturnType<typeof useAppRuntime>;
