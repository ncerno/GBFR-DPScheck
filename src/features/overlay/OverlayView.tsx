import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import { formatCombatRecordAreaName } from '../../combat/recordLabels';
import type { OverlaySnapshot } from './overlaySnapshot';

type OverlayViewVariant = 'embedded' | 'window';
type LiveStateTone = 'active' | 'waiting' | 'idle' | 'replay' | 'error';
const OVERLAY_HUD_BASE_WIDTH = 460;
const OVERLAY_HUD_BASE_HEIGHT = 236;

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
  const recordAreaName = snapshot.record ? formatCombatRecordAreaName(snapshot.record) : '--';
  const primaryTargetName = snapshot.record?.targets[0]?.name ?? '--';
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

  if (variant === 'window') {
    return (
      <OverlayWindowHud
        snapshot={snapshot}
        clickThrough={clickThrough}
        onClose={onClose}
        onStartDrag={onStartDrag}
        onToggleClickThrough={onToggleClickThrough}
        style={style}
      />
    );
  }

  return (
    <div
      className={`overlay-layout overlay-layout--${variant}${snapshot.config.compact ? ' overlay-layout--compact' : ''}`}
      style={style}
    >
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
          <strong>{recordAreaName}</strong>
          <small>{snapshot.record ? `${primaryTargetName} / ${snapshot.record.damageEventCount} 条伤害事件` : '等待伤害事件'}</small>
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
          <span>目标：{primaryTargetName}</span>
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
                  <td>{formatActorDisplayName(actor)}</td>
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

function OverlayWindowHud({
  snapshot,
  clickThrough,
  onClose,
  onStartDrag,
  onToggleClickThrough,
  style,
}: {
  snapshot: OverlaySnapshot;
  clickThrough: boolean;
  onClose?: () => void;
  onStartDrag?: () => void;
  onToggleClickThrough?: (enabled: boolean) => void;
  style: CSSProperties;
}) {
  const topActors = (snapshot.record?.actors ?? []).slice(0, snapshot.config.compact ? 4 : 6);
  const [hudRef, hudScale] = useOverlayHudScale(OVERLAY_HUD_BASE_WIDTH, OVERLAY_HUD_BASE_HEIGHT);
  const teamDps = snapshot.record?.durationMs
    ? Math.floor(snapshot.record.totalDamage / Math.max(snapshot.record.durationMs / 1000, 1))
    : 0;
  const hasDamage = (snapshot.record?.damageEventCount ?? 0) > 0;
  const recordAreaName = snapshot.record ? formatCombatRecordAreaName(snapshot.record) : 'WAIT';
  const primaryTargetName = snapshot.record?.targets[0]?.name ?? '--';
  const frameStyle = {
    ...style,
    '--hud-scale': String(hudScale),
  } as CSSProperties;

  return (
    <div className="overlay-window-hud" ref={hudRef}>
      <div
        className={`meter-window${snapshot.config.compact ? ' meter-window--compact' : ''}`}
        style={frameStyle}
      >
        <header className="meter-window__header">
          <div className="meter-window__title">
            <strong>{formatCompactNumber(teamDps)}</strong>
            <span>TEAM DPS</span>
          </div>
          <div className="meter-window__meta">
            <span title={recordAreaName}>{hasDamage ? recordAreaName : 'WAIT'}</span>
            <span title={primaryTargetName}>{primaryTargetName}</span>
            <span>{formatDuration(snapshot.record?.durationMs ?? 0)}</span>
          </div>
          <div className="meter-window__toolbar">
            <button type="button" onMouseDown={() => onStartDrag?.()} title="拖动窗口">移动</button>
            {clickThrough ? (
              <span>穿透中</span>
            ) : (
              <button type="button" onClick={() => onToggleClickThrough?.(true)} title="让鼠标点击穿过 Overlay">穿透</button>
            )}
            <button type="button" onClick={onClose} title="关闭 Overlay">关闭</button>
          </div>
        </header>

        <section className="meter-window__list" aria-label="队伍 DPS 排名">
          {topActors.length === 0 ? (
            <p className="meter-window__empty">等待伤害事件</p>
          ) : topActors.map((actor, index) => {
            const displayName = formatActorDisplayName(actor);
            const actorStyle = {
              '--actor-color': getActorColor(actor.id, index),
              '--actor-rate': `${Math.max(2, Math.min(100, actor.damageRate * 100))}%`,
            } as CSSProperties;

            return (
              <article key={actor.id} className="meter-row" style={actorStyle}>
                <span className="meter-row__rank">{index + 1}</span>
                <div className="meter-row__body">
                  <span className="meter-row__bar" />
                  <div className="meter-row__name">
                    <strong title={displayName}>{displayName}</strong>
                    <span>{formatPercent(actor.damageRate)} · 60s {formatCompactNumber(actor.dpsInLastMinute)}</span>
                  </div>
                </div>
                <div className="meter-row__damage">
                  <strong>{formatCompactNumber(actor.dps)}</strong>
                  <span>{formatCompactNumber(actor.totalDamage)}</span>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function useOverlayHudScale(baseWidth: number, baseHeight: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const updateScale = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      setScale(Math.max(0.4, Math.min(rect.width / baseWidth, rect.height / baseHeight)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [baseHeight, baseWidth]);

  return [ref, scale] as const;
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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
    notation: value >= 10_000 ? 'compact' : 'standard',
  }).format(value);
}

function getActorColor(actorId: string, index: number) {
  const palette = [
    '#78d6ff',
    '#73e2a7',
    '#ffd166',
    '#ff9f7a',
    '#c7a6ff',
    '#ff7aa8',
    '#8df0d2',
    '#b9d878',
  ];
  let hash = index;
  for (let charIndex = 0; charIndex < actorId.length; charIndex += 1) {
    hash = (hash * 31 + actorId.charCodeAt(charIndex)) >>> 0;
  }
  return palette[hash % palette.length];
}

function formatActorDisplayName(actor: NonNullable<OverlaySnapshot['record']>['actors'][number]) {
  const userName = actor.userName?.trim();
  const characterName = actor.characterName?.trim();

  if (userName && characterName && userName !== characterName) {
    return `${userName}（${characterName}）`;
  }

  return userName || characterName || actor.name;
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
