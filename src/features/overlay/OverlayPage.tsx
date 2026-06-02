import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import type { AppRuntime } from '../../app/useAppRuntime';

interface OverlayPageProps {
  runtime: AppRuntime;
}

export function OverlayPage({ runtime }: OverlayPageProps) {
  const latestRecord = runtime.combatReplay.latestRecord;
  const actors = latestRecord?.actors ?? [];

  return (
    <PlaceholderPanel title="实时 Overlay" description="实时面板已接入 GBFR-ACT 事件流。rDPS 暂未实现，先显示为 --。">
      <div className="overlay-card">
        <div className="overlay-card__meta">
          <span>连接状态：<ConnectionBadge status={runtime.stream.connection.status} error={runtime.stream.connection.lastError} /></span>
          <span>战斗时间：{formatDuration(latestRecord?.durationMs ?? 0)}</span>
          <span>总伤害：{formatNumber(latestRecord?.totalDamage ?? 0)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>队员</th>
              <th>DPS</th>
              <th>60 秒 DPS</th>
              <th>rDPS</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {actors.length === 0 ? (
              <tr>
                <td colSpan={6}>暂无战斗数据。请先在设置页连接 WebSocket，或等待伤害事件。</td>
              </tr>
            ) : actors.map((actor, index) => (
              <tr key={actor.id}>
                <td>{index + 1}</td>
                <td>{actor.name}</td>
                <td>{formatNumber(actor.dps)}</td>
                <td>{formatNumber(actor.dpsInLastMinute)}</td>
                <td>{actor.rdps ?? '--'}</td>
                <td>{formatPercent(actor.damageRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlaceholderPanel>
  );
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
