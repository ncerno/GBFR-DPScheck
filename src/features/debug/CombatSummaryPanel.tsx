import type { GbfrActRawEvent } from '../../gbfr-act/events';
import { replayCombatEvents } from '../../combat/replay';

interface CombatSummaryPanelProps {
  events: GbfrActRawEvent[];
}

export function CombatSummaryPanel({ events }: CombatSummaryPanelProps) {
  const { records, latestRecord } = replayCombatEvents([...events].reverse(), {
    inactiveTimeoutSec: 30,
    defaultStrategy: 'training',
  });

  return (
    <section className="combat-summary-panel">
      <div className="section-title-row">
        <div>
          <h3>统计预览</h3>
          <p>基于 Raw Event Viewer 当前事件实时回放，主要用于验证分段和基础统计。</p>
        </div>
      </div>

      <div className="summary-cards">
        <article>
          <span>记录数</span>
          <strong>{records.length}</strong>
        </article>
        <article>
          <span>总伤害</span>
          <strong>{formatNumber(latestRecord?.totalDamage ?? 0)}</strong>
        </article>
        <article>
          <span>战斗时长</span>
          <strong>{formatDuration(latestRecord?.durationMs ?? 0)}</strong>
        </article>
        <article>
          <span>伤害事件</span>
          <strong>{latestRecord?.damageEventCount ?? 0}</strong>
        </article>
      </div>

      {latestRecord ? (
        <table>
          <thead>
            <tr>
              <th>角色</th>
              <th>总伤害</th>
              <th>DPS</th>
              <th>60 秒 DPS</th>
              <th>占比</th>
              <th>死亡</th>
            </tr>
          </thead>
          <tbody>
            {latestRecord.actors.map((actor) => (
              <tr key={actor.id}>
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
      ) : (
        <p className="empty-state">还没有可统计的战斗记录。</p>
      )}
    </section>
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
