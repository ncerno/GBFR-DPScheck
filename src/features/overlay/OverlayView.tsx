import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import type { OverlaySnapshot } from './overlaySnapshot';

type OverlayViewVariant = 'embedded' | 'window';
type LiveStateTone = 'active' | 'waiting' | 'idle' | 'replay' | 'error';

interface LiveState {
  label: string;
  detail: string;
  tone: LiveStateTone;
}

interface OverlayViewProps {
  snapshot: OverlaySnapshot;
  variant?: OverlayViewVariant;
  clickThrough?: boolean;
  onClose?: () => void;
  onStartDrag?: () => void;
  onToggleClickThrough?: (enabled: boolean) => void;
}

export function OverlayView({
  snapshot,
  variant = 'embedded',
  clickThrough = false,
  onClose,
  onStartDrag,
  onToggleClickThrough,
}: OverlayViewProps) {
  const now = useNow();
  const topActors = (snapshot.record?.actors ?? []).slice(0, snapshot.config.compact ? 4 : 8);
  const timeoutMs = snapshot.config.inactiveTimeoutSec * 1000;
  const lastEventAgeMs = snapshot.lastReceivedAtMs === null ? null : now - snapshot.lastReceivedAtMs;
  const lastDamageAgeMs = snapshot.lastDamageReceivedAtMs === null ? null : now - snapshot.lastDamageReceivedAtMs;
  const teamDps = snapshot.record?.durationMs
    ? Math.floor(snapshot.record.totalDamage / Math.max(snapshot.record.durationMs / 1000, 1))
    : 0;
  const liveState = getLiveState({
    source: snapshot.eventSource,
    connectionStatus: snapshot.connectionStatus,
    hasDamage: (snapshot.record?.damageEventCount ?? 0) > 0,
    lastDamageAgeMs,
    timeoutMs,
  });
  const eventTypeEntries = useMemo(
    () => Object.entries(snapshot.eventTypeCounts)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 6),
    [snapshot.eventTypeCounts],
  );
  const style = {
    '--overlay-opacity': String(snapshot.config.opacity),
  } as CSSProperties;

  return (
    <div
      className={`overlay-layout overlay-layout--${variant}${snapshot.config.compact ? ' overlay-layout--compact' : ''}`}
      style={style}
    >
      {variant === 'window' ? (
        <div className="overlay-window-toolbar">
          <button type="button" onMouseDown={() => onStartDrag?.()}>移动</button>
          {clickThrough ? (
            <span className="overlay-window-toolbar__hint">已穿透，请回主窗口关闭</span>
          ) : (
            <button type="button" onClick={() => onToggleClickThrough?.(true)}>开启穿透</button>
          )}
          <button type="button" onClick={onClose}>关闭</button>
        </div>
      ) : null}

      <section className={`overlay-live-state overlay-live-state--${liveState.tone}`}>
        <div>
          <span className="overlay-live-state__dot" />
          <strong>{liveState.label}</strong>
          <span>{liveState.detail}</span>
        </div>
        <ConnectionBadge status={snapshot.connectionStatus} error={snapshot.connectionError} />
      </section>

      <section className="overlay-metric-grid">
        <article>
          <span>数据源</span>
          <strong>{snapshot.eventSource === 'live' ? '实时 WebSocket' : '调试回放'}</strong>
          <small>累计 {snapshot.eventCount} 条 / 缓冲 {snapshot.bufferedEventCount} 条</small>
        </article>
        <article>
          <span>当前记录</span>
          <strong>{snapshot.record?.areaName ?? snapshot.record?.id ?? '--'}</strong>
          <small>{snapshot.record ? `${snapshot.record.damageEventCount} 条伤害事件` : '等待伤害事件'}</small>
        </article>
        <article>
          <span>团队 DPS</span>
          <strong>{formatNumber(teamDps)}</strong>
          <small>总伤害 {formatNumber(snapshot.record?.totalDamage ?? 0)}</small>
        </article>
        <article>
          <span>实时更新</span>
          <strong>{formatAge(lastEventAgeMs)}</strong>
          <small>最后伤害 {formatAge(lastDamageAgeMs)}</small>
        </article>
      </section>

      <section className="event-type-strip" aria-label="事件类型统计">
        {eventTypeEntries.length === 0 ? (
          <span>暂无事件</span>
        ) : eventTypeEntries.map(([type, count]) => (
          <span key={type}>{formatEventType(type)} {count}</span>
        ))}
      </section>

      <section className="overlay-card">
        <div className="overlay-card__meta">
          <span>战斗时间：{formatDuration(snapshot.record?.durationMs ?? 0)}</span>
          <span>队员：{snapshot.record?.actorCount ?? 0}</span>
          <span>rDPS：--</span>
        </div>
        <div className="overlay-table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>队员</th>
                <th>总伤害</th>
                <th>DPS</th>
                <th>60 秒 DPS</th>
                <th>占比</th>
                <th>死亡</th>
              </tr>
            </thead>
            <tbody>
              {topActors.length === 0 ? (
                <tr>
                  <td colSpan={7}>暂无实时战斗数据。请在设置页连接 WebSocket，或等待 GBFR-ACT 推送伤害事件。</td>
                </tr>
              ) : topActors.map((actor, index) => (
                <tr key={actor.id}>
                  <td>{index + 1}</td>
                  <td>{actor.name}</td>
                  <td>{formatNumber(actor.totalDamage)}</td>
                  <td>{formatNumber(actor.dps)}</td>
                  <td>{formatNumber(actor.dpsInLastMinute)}</td>
                  <td>{formatPercent(actor.damageRate)}</td>
                  <td>{actor.deathCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function getLiveState({
  source,
  connectionStatus,
  hasDamage,
  lastDamageAgeMs,
  timeoutMs,
}: {
  source: OverlaySnapshot['eventSource'];
  connectionStatus: OverlaySnapshot['connectionStatus'];
  hasDamage: boolean;
  lastDamageAgeMs: number | null;
  timeoutMs: number;
}): LiveState {
  if (source === 'replay') {
    return {
      label: '调试回放',
      detail: '当前展示来自本地 Raw Events 或 Mock 数据，不会写回日志。',
      tone: 'replay',
    };
  }

  if (connectionStatus === 'error') {
    return {
      label: '连接错误',
      detail: '请检查 GBFR-ACT 是否启动、端口是否为 24399 或配置的 WebSocket 地址。',
      tone: 'error',
    };
  }

  if (connectionStatus !== 'connected') {
    return {
      label: '未连接',
      detail: '连接 GBFR-ACT WebSocket 后开始接收实时事件。',
      tone: 'idle',
    };
  }

  if (!hasDamage) {
    return {
      label: '等待伤害',
      detail: 'WebSocket 已连接，正在等待游戏内伤害事件。',
      tone: 'waiting',
    };
  }

  if (lastDamageAgeMs !== null && lastDamageAgeMs <= timeoutMs) {
    return {
      label: '战斗中',
      detail: `最近伤害 ${formatAge(lastDamageAgeMs)}，按 ${Math.floor(timeoutMs / 1000)} 秒无伤害判定空闲。`,
      tone: 'active',
    };
  }

  return {
    label: '空闲',
    detail: '最近伤害已超过无伤害判定时间，等待下一轮战斗。',
    tone: 'idle',
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return `${minute}:${second.toString().padStart(2, '0')}`;
}

function formatAge(ms: number | null) {
  if (ms === null) {
    return '尚未收到';
  }

  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) {
    return `${seconds} 秒前`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒前`;
}

function formatEventType(type: string) {
  const labels: Record<string, string> = {
    damage: '伤害',
    load_party: '队伍',
    enter_area: '区域',
    inc_death_cnt: '死亡',
    gbfr_dpscheck_manual_reset: '手动重置',
  };

  return labels[type] ?? type;
}
