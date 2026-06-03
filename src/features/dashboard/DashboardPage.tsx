import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import type { AppRuntime } from '../../app/useAppRuntime';
import { buildActionDamageBars, buildActorDamageBars, buildDamageTimeline } from '../../combat/charts';
import type { CombatActionNameMap } from '../../combat/actionNames';
import type { CombatActionStats, CombatActorStats, CombatRecord, CombatTargetStats } from '../../combat/models';
import { formatCombatRecordAreaName } from '../../combat/recordLabels';
import { recalculateCombatRecord } from '../../combat/statistics';
import type { GbfrActRawEvent } from '../../gbfr-act/events';
import { callTauriCommand, isTauriRuntime } from '../../tauri/commands';

interface DashboardPageProps {
  runtime: AppRuntime;
}

interface CombatHistoryEntry {
  id: string;
  savedAt: string;
  label: string;
  source: 'live' | 'replay' | 'history';
  record: CombatRecord;
}

interface SelectableCombatRecord {
  key: string;
  label: string;
  source: 'runtime' | 'history';
  record: CombatRecord;
  historyEntry?: CombatHistoryEntry;
}

type DamageTimelineData = ReturnType<typeof buildDamageTimeline>;
type DamageBarData = ReturnType<typeof buildActorDamageBars>;
type HistorySourceFilter = 'all' | 'live' | 'replay' | 'history';
type HistorySortKey = 'savedAt' | 'totalDamage' | 'durationMs' | 'damageEventCount';

export function DashboardPage({ runtime }: DashboardPageProps) {
  const records = runtime.combatReplay.records;
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<CombatHistoryEntry[]>([]);
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historySourceFilter, setHistorySourceFilter] = useState<HistorySourceFilter>('all');
  const [historySortKey, setHistorySortKey] = useState<HistorySortKey>('savedAt');
  const [renameLabel, setRenameLabel] = useState('');
  const [historyTransferPath, setHistoryTransferPath] = useState('');

  const runtimeEntries = useMemo<SelectableCombatRecord[]>(
    () => records.map((record, index) => ({
      key: `runtime:${record.id}`,
      label: formatCombatRecordAreaName(record, index + 1),
      source: 'runtime',
      record,
    })),
    [records],
  );

  const filteredHistoryEntries = useMemo(
    () => filterAndSortHistoryEntries(historyEntries, {
      query: historyQuery,
      sourceFilter: historySourceFilter,
      sortKey: historySortKey,
    }),
    [historyEntries, historyQuery, historySortKey, historySourceFilter],
  );

  const savedEntries = useMemo<SelectableCombatRecord[]>(
    () => filteredHistoryEntries.map((entry) => ({
      key: `history:${entry.id}`,
      label: entry.label,
      source: 'history',
      record: entry.record,
      historyEntry: entry,
    })),
    [filteredHistoryEntries],
  );

  const selectedEntry = useMemo(() => {
    const allEntries = [...runtimeEntries, ...savedEntries];
    if (allEntries.length === 0) {
      return undefined;
    }

    return allEntries.find((entry) => entry.key === selectedRecordKey)
      ?? runtimeEntries[runtimeEntries.length - 1]
      ?? savedEntries[0];
  }, [runtimeEntries, savedEntries, selectedRecordKey]);

  const selectedRecord = selectedEntry?.record;
  const selectedActor = useMemo(() => {
    if (!selectedRecord || selectedRecord.actors.length === 0) {
      return undefined;
    }

    return selectedRecord.actors.find((actor) => actor.id === selectedActorId) ?? selectedRecord.actors[0];
  }, [selectedActorId, selectedRecord]);

  useEffect(() => {
    if (!selectedEntry) {
      setSelectedRecordKey(null);
      return;
    }

    if (selectedRecordKey !== selectedEntry.key) {
      setSelectedRecordKey(selectedEntry.key);
    }
  }, [selectedEntry, selectedRecordKey]);

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

  useEffect(() => {
    setRenameLabel(selectedEntry?.historyEntry?.label ?? '');
  }, [selectedEntry?.historyEntry?.id, selectedEntry?.historyEntry?.label]);

  const loadCombatHistory = useCallback(async () => {
    if (!isTauriRuntime()) {
      setHistoryStatus('浏览器开发环境不会读取本地历史记录。');
      return;
    }

    try {
      const entries = await callTauriCommand<CombatHistoryEntry[]>('load_combat_history');
      const recalculatedEntries = entries.map((entry) => recalculateHistoryEntry(
        entry,
        runtime.actionNameMap,
        runtime.loadoutTextMap?.actors,
      ));
      setHistoryEntries(sortHistoryEntries(recalculatedEntries));
      setHistoryStatus(`已加载 ${entries.length} 条历史记录。`);
    } catch (error) {
      setHistoryStatus(`加载历史记录失败：${errorToMessage(error)}`);
    }
  }, [runtime.actionNameMap, runtime.loadoutTextMap?.actors]);

  useEffect(() => {
    void loadCombatHistory();
  }, [loadCombatHistory]);

  const handleSelectRecord = (key: string) => {
    setSelectedRecordKey(key);
    setSelectedActorId(null);
  };

  const handleSaveSelectedRecord = async () => {
    if (!selectedRecord) {
      setHistoryStatus('当前没有可保存的战斗记录。');
      return;
    }

    const savedAt = new Date().toISOString();
    const entry: CombatHistoryEntry = {
      id: createHistoryId(),
      savedAt,
      label: createHistoryLabel(selectedRecord, savedAt),
      source: selectedEntry?.source === 'history'
        ? selectedEntry.historyEntry?.source ?? 'history'
        : runtime.stream.eventSource,
      record: selectedRecord,
    };

    try {
      if (isTauriRuntime()) {
        await callTauriCommand<void>('save_combat_history_entry', { entry });
      }

      setHistoryEntries((current) => sortHistoryEntries([entry, ...current]));
      setSelectedRecordKey(`history:${entry.id}`);
      setHistoryStatus(isTauriRuntime()
        ? '已保存当前记录到历史记录。'
        : '浏览器开发环境已暂存历史记录，刷新后会丢失。');
    } catch (error) {
      setHistoryStatus(`保存历史记录失败：${errorToMessage(error)}`);
    }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    try {
      if (isTauriRuntime()) {
        await callTauriCommand<void>('delete_combat_history_entry', { id: entryId });
      }

      setHistoryEntries((current) => current.filter((entry) => entry.id !== entryId));
      if (selectedRecordKey === `history:${entryId}`) {
        setSelectedRecordKey(runtimeEntries[runtimeEntries.length - 1]?.key ?? null);
      }
      setHistoryStatus('已删除历史记录。');
    } catch (error) {
      setHistoryStatus(`删除历史记录失败：${errorToMessage(error)}`);
    }
  };

  const handleRenameHistoryEntry = async () => {
    const entry = selectedEntry?.historyEntry;
    if (!entry) {
      setHistoryStatus('请选择一条历史记录后再重命名。');
      return;
    }

    const nextLabel = renameLabel.trim();
    if (!nextLabel) {
      setHistoryStatus('历史记录名称不能为空。');
      return;
    }

    const nextEntry: CombatHistoryEntry = {
      ...entry,
      label: nextLabel,
    };

    try {
      if (isTauriRuntime()) {
        await callTauriCommand<void>('save_combat_history_entry', { entry: nextEntry });
      }

      setHistoryEntries((current) => sortHistoryEntries(current.map((item) => (
        item.id === nextEntry.id ? nextEntry : item
      ))));
      setHistoryStatus('已重命名历史记录。');
    } catch (error) {
      setHistoryStatus(`重命名历史记录失败：${errorToMessage(error)}`);
    }
  };

  const handleExportHistory = async () => {
    if (!isTauriRuntime()) {
      setHistoryStatus('浏览器开发环境不能导出到本地文件。');
      return;
    }

    try {
      const path = await callTauriCommand<string>('export_combat_history', {
        path: historyTransferPath.trim() || null,
      });
      setHistoryTransferPath(path);
      setHistoryStatus(`已导出历史记录：${path}`);
    } catch (error) {
      setHistoryStatus(`导出历史记录失败：${errorToMessage(error)}`);
    }
  };

  const handleImportHistory = async () => {
    if (!isTauriRuntime()) {
      setHistoryStatus('浏览器开发环境不能从本地文件导入。');
      return;
    }

    try {
      const entries = await callTauriCommand<CombatHistoryEntry[]>('import_combat_history', {
        path: historyTransferPath.trim() || null,
      });
      const recalculatedEntries = entries.map((entry) => recalculateHistoryEntry(
        entry,
        runtime.actionNameMap,
        runtime.loadoutTextMap?.actors,
      ));
      setHistoryEntries((current) => mergeHistoryEntries(current, recalculatedEntries));
      setHistoryStatus(`已导入 ${entries.length} 条历史记录。`);
    } catch (error) {
      setHistoryStatus(`导入历史记录失败：${errorToMessage(error)}`);
    }
  };

  return (
    <PlaceholderPanel title="会话分析" description="基于当前事件流和已保存历史记录的详细分析。">
      <div className="dashboard-runtime-note">
        数据源：{runtime.stream.eventSource === 'live' ? '实时 WebSocket' : '调试回放'}；
        累计事件：{runtime.stream.eventCount}；
        缓冲事件：{runtime.stream.bufferedEventCount}
      </div>
      <div className="dashboard-layout">
        <aside className="record-list-panel">
          <div className="record-list-panel__header">
            <h3>当前记录</h3>
          </div>
          {runtimeEntries.length === 0 ? (
            <p className="empty-state">暂无当前记录。请先连接 WebSocket，或在设置页加载本地 Raw Events。</p>
          ) : (
            <div className="record-list">
              {runtimeEntries.map((entry) => (
                <RecordListButton
                  key={entry.key}
                  entry={entry}
                  active={entry.key === selectedEntry?.key}
                  onSelect={handleSelectRecord}
                />
              ))}
            </div>
          )}

          <div className="record-list-panel__header dashboard-history-header">
            <h3>历史记录</h3>
            <button type="button" onClick={() => void loadCombatHistory()}>刷新</button>
          </div>
          <HistoryControls
            query={historyQuery}
            sourceFilter={historySourceFilter}
            sortKey={historySortKey}
            transferPath={historyTransferPath}
            visibleCount={savedEntries.length}
            totalCount={historyEntries.length}
            onQueryChange={setHistoryQuery}
            onSourceFilterChange={setHistorySourceFilter}
            onSortKeyChange={setHistorySortKey}
            onTransferPathChange={setHistoryTransferPath}
            onExport={() => void handleExportHistory()}
            onImport={() => void handleImportHistory()}
          />
          {historyEntries.length === 0 ? (
            <p className="empty-state">暂无历史记录。选择一条当前记录后可以保存。</p>
          ) : savedEntries.length === 0 ? (
            <p className="empty-state">没有匹配筛选条件的历史记录。</p>
          ) : (
            <div className="record-list">
              {savedEntries.map((entry) => (
                <RecordListButton
                  key={entry.key}
                  entry={entry}
                  active={entry.key === selectedEntry?.key}
                  onSelect={handleSelectRecord}
                />
              ))}
            </div>
          )}
        </aside>

        <section className="dashboard-main-panel">
          {selectedRecord ? (
            <>
              <RecordToolbar
                entry={selectedEntry}
                historyStatus={historyStatus}
                renameLabel={renameLabel}
                onRenameLabelChange={setRenameLabel}
                onSave={() => void handleSaveSelectedRecord()}
                onRename={selectedEntry?.historyEntry ? () => void handleRenameHistoryEntry() : undefined}
                onDelete={selectedEntry?.historyEntry
                  ? () => void handleDeleteHistoryEntry(selectedEntry.historyEntry!.id)
                  : undefined}
              />
              <RecordOverview record={selectedRecord} />
              <RecordCharts record={selectedRecord} selectedActor={selectedActor} />
              <TeamTable
                record={selectedRecord}
                selectedActorId={selectedActor?.id}
                onSelectActor={setSelectedActorId}
              />
              <TargetTable record={selectedRecord} />
              <ActionTable actor={selectedActor} actionNameStatus={runtime.actionNameStatus} />
              <PartyInfo record={selectedRecord} />
              <RecordRawEventsPanel record={selectedRecord} />
            </>
          ) : (
            <p className="empty-state">选择一条战斗记录后查看详情。</p>
          )}
        </section>
      </div>
    </PlaceholderPanel>
  );
}

function HistoryControls({
  query,
  sourceFilter,
  sortKey,
  transferPath,
  visibleCount,
  totalCount,
  onQueryChange,
  onSourceFilterChange,
  onSortKeyChange,
  onTransferPathChange,
  onExport,
  onImport,
}: {
  query: string;
  sourceFilter: HistorySourceFilter;
  sortKey: HistorySortKey;
  transferPath: string;
  visibleCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onSourceFilterChange: (value: HistorySourceFilter) => void;
  onSortKeyChange: (value: HistorySortKey) => void;
  onTransferPathChange: (value: string) => void;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <div className="history-controls">
      <label>
        搜索
        <input
          value={query}
          placeholder="名称、区域、策略"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label>
        来源
        <select
          value={sourceFilter}
          onChange={(event) => onSourceFilterChange(event.target.value as HistorySourceFilter)}
        >
          <option value="all">全部</option>
          <option value="live">实时</option>
          <option value="replay">回放</option>
          <option value="history">历史</option>
        </select>
      </label>
      <label>
        排序
        <select value={sortKey} onChange={(event) => onSortKeyChange(event.target.value as HistorySortKey)}>
          <option value="savedAt">保存时间</option>
          <option value="totalDamage">总伤害</option>
          <option value="durationMs">战斗时长</option>
          <option value="damageEventCount">伤害事件</option>
        </select>
      </label>
      <label>
        导入 / 导出路径
        <input
          value={transferPath}
          placeholder="留空使用默认 combat-history-export.json"
          onChange={(event) => onTransferPathChange(event.target.value)}
        />
      </label>
      <div className="history-controls__actions">
        <span>{visibleCount} / {totalCount}</span>
        <button type="button" onClick={onExport}>导出</button>
        <button type="button" onClick={onImport}>导入</button>
      </div>
    </div>
  );
}

function RecordListButton({
  entry,
  active,
  onSelect,
}: {
  entry: SelectableCombatRecord;
  active: boolean;
  onSelect: (key: string) => void;
}) {
  const areaName = formatCombatRecordAreaName(entry.record);
  const showEntryLabel = entry.label !== areaName;

  return (
    <button
      className={active ? 'record-list__item active' : 'record-list__item'}
      type="button"
      onClick={() => onSelect(entry.key)}
    >
      <strong>{areaName}</strong>
      {showEntryLabel ? <span>{entry.label}</span> : null}
      <span>{formatAreaStrategy(entry.record.strategy)} · {formatNumber(entry.record.totalDamage)} 伤害</span>
      <span>{formatDuration(entry.record.durationMs)} · {entry.record.damageEventCount} 条伤害</span>
      {entry.historyEntry ? <span>保存于 {formatDateTime(entry.historyEntry.savedAt)}</span> : null}
    </button>
  );
}

function RecordToolbar({
  entry,
  historyStatus,
  renameLabel,
  onRenameLabelChange,
  onSave,
  onRename,
  onDelete,
}: {
  entry?: SelectableCombatRecord;
  historyStatus: string;
  renameLabel: string;
  onRenameLabelChange: (value: string) => void;
  onSave: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const areaName = entry ? formatCombatRecordAreaName(entry.record) : '战斗记录';
  const showEntryLabel = entry?.label && entry.label !== areaName;

  return (
    <section className="dashboard-record-toolbar">
      <div>
        <h3>{areaName}</h3>
        <p>
          {entry?.source === 'history'
            ? `历史记录 · ${entry.historyEntry ? formatDateTime(entry.historyEntry.savedAt) : '--'}`
            : '当前实时/回放记录'}
          {showEntryLabel ? ` · ${entry.label}` : ''}
        </p>
        {historyStatus ? <p className="debug-note">{historyStatus}</p> : null}
      </div>
      <div className="dashboard-record-toolbar__actions">
        {onRename ? (
          <label>
            名称
            <input value={renameLabel} onChange={(event) => onRenameLabelChange(event.target.value)} />
          </label>
        ) : null}
        <div className="button-row">
          <button type="button" onClick={onSave}>保存为历史</button>
          {onRename ? <button type="button" onClick={onRename}>重命名</button> : null}
          {onDelete ? <button type="button" onClick={onDelete}>删除历史</button> : null}
        </div>
      </div>
    </section>
  );
}

function RecordCharts({ record, selectedActor }: { record: CombatRecord; selectedActor?: CombatActorStats }) {
  const timeline = useMemo(() => buildDamageTimeline(record), [record]);
  const actorBars = useMemo(() => buildActorDamageBars(record), [record]);
  const actionBars = useMemo(() => buildActionDamageBars(selectedActor), [selectedActor]);
  const maxTimelineDps = Math.max(...timeline.map((point) => point.dps), 1);

  return (
    <section className="dashboard-section dashboard-chart-section">
      <h3>图表</h3>
      <div className="dashboard-chart-grid">
        <article className="chart-panel chart-panel--wide">
          <div className="chart-panel__title">
            <strong>DPS 时间线</strong>
            <span>{timeline.length} 段</span>
          </div>
          <TimelineChart points={timeline} maxDps={maxTimelineDps} />
        </article>
        <article className="chart-panel">
          <div className="chart-panel__title">
            <strong>角色伤害</strong>
            <span>团队占比</span>
          </div>
          <HorizontalBarChart bars={actorBars} emptyMessage="暂无角色伤害数据。" />
        </article>
        <article className="chart-panel">
          <div className="chart-panel__title">
            <strong>技能伤害</strong>
            <span>{selectedActor?.name ?? '--'}</span>
          </div>
          <HorizontalBarChart bars={actionBars} emptyMessage="请选择有技能伤害的角色。" />
        </article>
      </div>
    </section>
  );
}

function TimelineChart({ points, maxDps }: { points: DamageTimelineData; maxDps: number }) {
  if (points.length === 0) {
    return <p className="empty-state">暂无伤害时间线数据。</p>;
  }

  return (
    <div className="timeline-chart" role="img" aria-label="DPS 时间线">
      {points.map((point) => {
        const heightPercent = point.dps > 0 ? Math.max(4, Math.round((point.dps / maxDps) * 100)) : 0;

        return (
          <div
            key={point.index}
            className="timeline-chart__bucket"
            title={`${formatDuration(point.startOffsetMs)}-${formatDuration(point.endOffsetMs)} / DPS ${formatNumber(point.dps)} / 伤害 ${formatNumber(point.damage)}`}
          >
            <span style={{ height: `${heightPercent}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarChart({ bars, emptyMessage }: { bars: DamageBarData; emptyMessage: string }) {
  if (bars.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="horizontal-bar-chart">
      {bars.map((bar) => {
        const widthPercent = bar.damage > 0 ? Math.max(3, Math.round(bar.rate * 100)) : 0;

        return (
          <div key={bar.id} className="horizontal-bar-chart__row">
            <div className="horizontal-bar-chart__meta">
              <strong>{bar.label}</strong>
              <span>
                {formatNumber(bar.damage)} / {formatPercent(bar.rate)}
              </span>
            </div>
            <div className="horizontal-bar-chart__track">
              <span style={{ width: `${widthPercent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecordOverview({ record }: { record: CombatRecord }) {
  const teamDps = calculateTeamDps(record);

  return (
    <section className="dashboard-section">
      <h3>总览</h3>
      <div className="summary-cards">
        <article>
          <span>地图 / 区域</span>
          <strong>{formatCombatRecordAreaName(record)}</strong>
        </article>
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
        <article>
          <span>分段策略</span>
          <strong>{formatAreaStrategy(record.strategy)}</strong>
        </article>
        <article>
          <span>Raw Events</span>
          <strong>{record.rawEvents.length}</strong>
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

function TargetTable({ record }: { record: CombatRecord }) {
  const targets = record.targets ?? [];

  return (
    <section className="dashboard-section">
      <h3>目标详情</h3>
      {targets.length === 0 ? (
        <p className="empty-state">当前记录没有可统计的目标伤害。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>目标</th>
              <th>DPS 口径</th>
              <th>总承伤</th>
              <th>占比</th>
              <th>伤害事件</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target, index) => (
              <TargetRow key={target.id} target={target} index={index} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TargetRow({ target, index }: { target: CombatTargetStats; index: number }) {
  return (
    <tr title={`actor=${target.actorType ?? '--'}；名称来源=${formatTargetNameSource(target.nameSource)}`}>
      <td>{index + 1}</td>
      <td>{target.name}</td>
      <td>{target.includedInDps ? '计入' : target.exclusionReason ?? '排除'}</td>
      <td>{formatNumber(target.totalDamage)}</td>
      <td>{formatPercent(target.damageRate)}</td>
      <td>{target.damageEventCount}</td>
    </tr>
  );
}

function formatTargetNameSource(source: CombatTargetStats['nameSource']) {
  switch (source) {
    case 'gbfr-act':
      return 'GBFR-ACT';
    default:
      return 'fallback';
  }
}

function ActionTable({ actor, actionNameStatus }: { actor?: CombatActorStats; actionNameStatus: string }) {
  return (
    <section className="dashboard-section">
      <div className="section-title-row">
        <div>
          <h3>技能详情{actor ? `：${actor.name}` : ''}</h3>
          <p>点击上方队伍成员可切换查看对象。</p>
          <p className="debug-note">动作名：{actionNameStatus}</p>
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
    <tr title={`内部调试：${action.damageEventCount} 条伤害事件；actor=${action.actorType ?? '--'}；action_id=${action.actionId ?? action.id}；名称来源=${formatActionNameSource(action.nameSource)}`}>
      <td>{action.name}</td>
      <td>{formatNumber(action.totalDamage)}</td>
      <td>{formatPercent(action.damageRate)}</td>
      <td>{formatNumber(action.minDamage)}</td>
      <td>{formatNumber(action.maxDamage)}</td>
      <td>{formatNumber(action.averageDamage)}</td>
    </tr>
  );
}

function formatActionNameSource(source: CombatActionStats['nameSource']) {
  switch (source) {
    case 'gbfr-act':
      return 'GBFR-ACT';
    case 'common':
      return '内置通用';
    default:
      return 'fallback';
  }
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

function RecordRawEventsPanel({ record }: { record: CombatRecord }) {
  const visibleEvents = record.rawEvents.slice(-120);

  return (
    <section className="dashboard-section">
      <details>
        <summary>查看 Raw Events（{record.rawEvents.length} 条，显示最后 {visibleEvents.length} 条）</summary>
        <div className="raw-event-list raw-event-list--compact">
          {visibleEvents.length === 0 ? (
            <p className="empty-state">当前记录没有 raw events。</p>
          ) : visibleEvents.map((event, index) => (
            <RawEventItem key={`${event.time_ms}-${event.type}-${index}`} event={event} />
          ))}
        </div>
      </details>
    </section>
  );
}

function RawEventItem({ event }: { event: GbfrActRawEvent }) {
  return (
    <article className="raw-event-item">
      <div className="raw-event-item__meta">
        <strong>{event.type}</strong>
        <span>{new Date(event.time_ms).toLocaleTimeString()}</span>
      </div>
      <pre>{JSON.stringify(event, null, 2)}</pre>
    </article>
  );
}

function filterAndSortHistoryEntries(
  entries: CombatHistoryEntry[],
  options: { query: string; sourceFilter: HistorySourceFilter; sortKey: HistorySortKey },
) {
  const query = options.query.trim().toLowerCase();

  return entries
    .filter((entry) => {
      const matchesSource = options.sourceFilter === 'all' || entry.source === options.sourceFilter;
      const matchesQuery = !query || getHistorySearchText(entry).includes(query);
      return matchesSource && matchesQuery;
    })
    .sort((a, b) => {
      switch (options.sortKey) {
        case 'totalDamage':
          return b.record.totalDamage - a.record.totalDamage;
        case 'durationMs':
          return b.record.durationMs - a.record.durationMs;
        case 'damageEventCount':
          return b.record.damageEventCount - a.record.damageEventCount;
        case 'savedAt':
        default:
          return b.savedAt.localeCompare(a.savedAt);
      }
    });
}

function getHistorySearchText(entry: CombatHistoryEntry) {
  return [
    entry.label,
    entry.source,
    entry.record.id,
    entry.record.areaName,
    formatCombatRecordAreaName(entry.record),
    entry.record.strategy,
    ...entry.record.actors.map((actor) => actor.name),
    ...(entry.record.targets ?? []).map((target) => target.name),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

function sortHistoryEntries(entries: CombatHistoryEntry[]) {
  return [...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function mergeHistoryEntries(current: CombatHistoryEntry[], incoming: CombatHistoryEntry[]) {
  const map = new Map<string, CombatHistoryEntry>();
  for (const entry of current) {
    map.set(entry.id, entry);
  }
  for (const entry of incoming) {
    map.set(entry.id, entry);
  }
  return sortHistoryEntries(Array.from(map.values()));
}

function createHistoryId() {
  return `history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createHistoryLabel(record: CombatRecord, savedAt: string) {
  const area = formatCombatRecordAreaName(record);
  return `${formatDateTime(savedAt)} · ${area} · ${formatNumber(record.totalDamage)}`;
}

function calculateTeamDps(record: CombatRecord) {
  return record.durationMs > 0 ? Math.floor(record.totalDamage / Math.max(record.durationMs / 1000, 1)) : 0;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAreaStrategy(strategy: string) {
  const labels: Record<string, string> = {
    auto: '自动',
    training: '木桩',
    quest: '任务',
    generic: '通用',
  };

  return labels[strategy] ?? strategy;
}

function recalculateHistoryEntry(
  entry: CombatHistoryEntry,
  actionNameMap?: CombatActionNameMap,
  actorTextMap?: Record<string, string>,
): CombatHistoryEntry {
  if (!Array.isArray(entry.record.rawEvents) || entry.record.rawEvents.length === 0) {
    return entry;
  }

  return {
    ...entry,
    record: recalculateCombatRecord(entry.record, { actionNameMap, actorTextMap }),
  };
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
