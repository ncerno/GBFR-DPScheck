import { useEffect, useMemo, useState } from 'react';
import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import type { AppRuntime } from '../../app/useAppRuntime';
import type { CombatActionStats, CombatActorStats, CombatRecord } from '../../combat/models';

interface DashboardPageProps {
  runtime: AppRuntime;
}

export function DashboardPage({ runtime }: DashboardPageProps) {
  const records = runtime.combatReplay.records;
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

  const selectedRecord = useMemo(() => {
    if (records.length === 0) {
      return undefined;
    }

    return records.find((record) => record.id === selectedRecordId) ?? records[records.length - 1];
  }, [records, selectedRecordId]);

  const selectedActor = useMemo(() => {
    if (!selectedRecord || selectedRecord.actors.length === 0) {
      return undefined;
    }

    return selectedRecord.actors.find((actor) => actor.id === selectedActorId) ?? selectedRecord.actors[0];
  }, [selectedActorId, selectedRecord]);

  useEffect(() => {
    if (!selectedRecord) {
      setSelectedActorId(null);
      return;
    }

    if (selectedActorId && selectedRecord.actors.some((actor) => actor.id === selectedActorId)) {
      return;
    }

    setSelectedActorId(selectedRecord.actors[0]?.id ?? null);
  }, [selectedActorId, selectedRecord]);

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    setSelectedActorId(null);
  };

  return (
    <PlaceholderPanel title="战后分析" description="基于当前会话 raw events 的战后分析。后续会接入更完整的历史记录管理。">
      <div className="dashboard-layout">
        <aside className="record-list-panel">
          <h3>战斗记录</h3>
          {records.length === 0 ? (
            <p className="empty-state">暂无记录。请先在设置页连接 WebSocket，或加载本地 Raw Events。</p>
          ) : (
            <div className="record-list">
              {records.map((record, index) => (
                <button
                  key={record.id}
                  className={record.id === selectedRecord?.id ? 'record-list__item active' : 'record-list__item'}
                  type="button"
                  onClick={() => handleSelectRecord(record.id)}
                >
                  <strong>记录 {index + 1}</strong>
                  <span>{formatNumber(record.totalDamage)} 伤害</span>
                  <span>{formatDuration(record.durationMs)} · {record.damageEventCount} 条伤害</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="dashboard-main-panel">
          {selectedRecord ? (
            <>
              <RecordOverview record={selectedRecord} />
              <TeamTable
                record={selectedRecord}
                selectedActorId={selectedActor?.id}
                onSelectActor={setSelectedActorId}
              />
              <ActionTable actor={selectedActor} />
              <PartyInfo record={selectedRecord} />
            </>
          ) : (
            <p className="empty-state">选择一条战斗记录后查看详情。</p>
          )}
        </section>
      </div>
    </PlaceholderPanel>
  );
}

function RecordOverview({ record }: { record: CombatRecord }) {
  const teamDps = record.durationMs > 0 ? Math.floor(record.totalDamage / Math.max(record.durationMs / 1000, 1)) : 0;

  return (
    <section className="dashboard-section">
      <h3>总览</h3>
      <div className="summary-cards">
        <article>
          <span>总伤害</span>
          <strong>{formatNumber(record.totalDamage)}</strong>
        </article>
        <article>
          <span>团队 DPS</span>
          <strong>{formatNumber(teamDps)}</strong>
        </article>
        <article>
          <span>战斗时长</span>
          <strong>{formatDuration(record.durationMs)}</strong>
        </article>
        <article>
          <span>伤害事件</span>
          <strong>{record.damageEventCount}</strong>
        </article>
      </div>
    </section>
  );
}

interface TeamTableProps {
  record: CombatRecord;
  selectedActorId?: string;
  onSelectActor: (actorId: string) => void;
}

function TeamTable({ record, selectedActorId, onSelectActor }: TeamTableProps) {
  return (
    <section className="dashboard-section">
      <h3>队伍详情</h3>
      {record.actors.length === 0 ? (
        <p className="empty-state">当前记录没有角色伤害。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>角色</th>
              <th>总伤害</th>
              <th>DPS</th>
              <th>60 秒 DPS</th>
              <th>rDPS</th>
              <th>占比</th>
              <th>死亡</th>
            </tr>
          </thead>
          <tbody>
            {record.actors.map((actor, index) => (
              <tr
                key={actor.id}
                className={actor.id === selectedActorId ? 'selectable-row active' : 'selectable-row'}
                onClick={() => onSelectActor(actor.id)}
              >
                <td>{index + 1}</td>
                <td>{actor.name}</td>
                <td>{formatNumber(actor.totalDamage)}</td>
                <td>{formatNumber(actor.dps)}</td>
                <td>{formatNumber(actor.dpsInLastMinute)}</td>
                <td>{actor.rdps ?? '--'}</td>
                <td>{formatPercent(actor.damageRate)}</td>
                <td>{actor.deathCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ActionTable({ actor }: { actor?: CombatActorStats }) {
  return (
    <section className="dashboard-section">
      <div className="section-title-row">
        <div>
          <h3>技能详情{actor ? `：${actor.name}` : ''}</h3>
          <p>点击上方队伍成员可切换查看对象。</p>
        </div>
      </div>
      {!actor || actor.actions.length === 0 ? (
        <p className="empty-state">暂无技能伤害数据。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>动作</th>
              <th>总伤害</th>
              <th>占比</th>
              <th>最小</th>
              <th>最大</th>
              <th>平均</th>
            </tr>
          </thead>
          <tbody>
            {actor.actions.map((action) => <ActionRow key={action.id} action={action} />)}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ActionRow({ action }: { action: CombatActionStats }) {
  return (
    <tr title={`内部调试：${action.damageEventCount} 条伤害事件`}>
      <td>{action.name}</td>
      <td>{formatNumber(action.totalDamage)}</td>
      <td>{formatPercent(action.damageRate)}</td>
      <td>{formatNumber(action.minDamage)}</td>
      <td>{formatNumber(action.maxDamage)}</td>
      <td>{formatNumber(action.averageDamage)}</td>
    </tr>
  );
}

function PartyInfo({ record }: { record: CombatRecord }) {
  return (
    <section className="dashboard-section">
      <h3>队伍 / 配装信息</h3>
      {record.partyMembers.length === 0 ? (
        <p className="empty-state">当前记录没有 load_party 信息。</p>
      ) : (
        <div className="party-card-grid">
          {record.partyMembers.map((member) => (
            <article key={member.id} className="party-card">
              <strong>{member.name}</strong>
              <span>角色：{member.characterName ?? '--'}</span>
              <span>队伍位置：{member.partyIndex ?? member.actor.partyIndex ?? '--'}</span>
              <span>在线：{member.isOnline === undefined ? '--' : member.isOnline ? '是' : '否'}</span>
            </article>
          ))}
        </div>
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
