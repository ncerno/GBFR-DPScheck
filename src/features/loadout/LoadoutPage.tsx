import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import type { AppRuntime } from '../../app/useAppRuntime';
import type { CombatActorStats, CombatPartyMember, CombatRecord } from '../../combat/models';
import { callTauriCommand, isTauriRuntime } from '../../tauri/commands';
import type { RawLoadoutInfo, ResolvedLoadoutInfo } from './loadoutText';
import { resolveLoadoutInfo, summarizeResolvedLoadout } from './loadoutText';

interface LoadoutPageProps {
  runtime: AppRuntime;
}

interface LoadoutTestRecord {
  id: string;
  createdAt: string;
  label: string;
  combatRecordId: string;
  areaName?: string;
  characterName: string;
  actorName: string;
  actorId: string;
  durationMs: number;
  recordTotalDamage: number;
  teamDps: number;
  damageEventCount: number;
  actorTotalDamage: number;
  actorDps: number;
  actorDpsInLastMinute: number;
  actorDamageRate: number;
  deathCount: number;
  weaponNote: string;
  sigilNote: string;
  note: string;
  rawLoadout?: RawLoadoutInfo;
}

interface LoadoutFormState {
  label: string;
  characterName: string;
  weaponNote: string;
  sigilNote: string;
  note: string;
}

const emptyForm: LoadoutFormState = {
  label: '',
  characterName: '',
  weaponNote: '',
  sigilNote: '',
  note: '',
};

const ALL_CHARACTERS = '__all__';

type LoadoutSortKey = 'createdAt' | 'actorDps' | 'actorDpsInLastMinute' | 'actorTotalDamage' | 'durationMs';
type LoadoutSortDirection = 'asc' | 'desc';

const loadoutSortOptions: Array<{ value: LoadoutSortKey; label: string }> = [
  { value: 'actorDps', label: 'DPS' },
  { value: 'actorDpsInLastMinute', label: '60 秒 DPS' },
  { value: 'actorTotalDamage', label: '角色伤害' },
  { value: 'durationMs', label: '战斗时长' },
  { value: 'createdAt', label: '保存时间' },
];

export function LoadoutPage({ runtime }: LoadoutPageProps) {
  const records = runtime.combatReplay.records;
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [form, setForm] = useState<LoadoutFormState>(emptyForm);
  const [tests, setTests] = useState<LoadoutTestRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [characterFilter, setCharacterFilter] = useState(ALL_CHARACTERS);
  const [comparisonCharacter, setComparisonCharacter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<LoadoutSortKey>('actorDps');
  const [sortDirection, setSortDirection] = useState<LoadoutSortDirection>('desc');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (selectedRecordId && records.some((record) => record.id === selectedRecordId)) {
      return;
    }

    setSelectedRecordId(records[records.length - 1]?.id ?? null);
  }, [records, selectedRecordId]);

  const selectedRecord = useMemo(() => {
    if (records.length === 0) {
      return undefined;
    }

    return records.find((record) => record.id === selectedRecordId) ?? records[records.length - 1];
  }, [records, selectedRecordId]);

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

  const selectedActor = useMemo(() => {
    if (!selectedRecord || selectedRecord.actors.length === 0) {
      return undefined;
    }

    return selectedRecord.actors.find((actor) => actor.id === selectedActorId) ?? selectedRecord.actors[0];
  }, [selectedActorId, selectedRecord]);

  const characterOptions = useMemo(() => getCharacterOptions(tests), [tests]);

  useEffect(() => {
    if (comparisonCharacter && characterOptions.includes(comparisonCharacter)) {
      return;
    }

    setComparisonCharacter(characterOptions[0] ?? null);
  }, [characterOptions, comparisonCharacter]);

  const selectedPartyMember = useMemo(() => {
    if (!selectedRecord || !selectedActor) {
      return undefined;
    }

    return selectedRecord.partyMembers.find((member) => member.id === selectedActor.id);
  }, [selectedActor, selectedRecord]);

  const rawLoadoutPreview = useMemo(() => extractRawLoadout(selectedPartyMember), [selectedPartyMember]);
  const resolvedLoadoutPreview = useMemo(
    () => resolveLoadoutInfo(rawLoadoutPreview, runtime.loadoutTextMap),
    [rawLoadoutPreview, runtime.loadoutTextMap],
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      characterName: selectedActor?.characterName ?? selectedActor?.name ?? '',
    }));
  }, [selectedActor?.id, selectedActor?.characterName, selectedActor?.name]);

  const loadSavedTests = useCallback(async () => {
    if (!isTauriRuntime()) {
      setStatusMessage('当前是浏览器开发环境，无法读取本地配装测试记录。');
      return;
    }

    try {
      const savedTests = await callTauriCommand<LoadoutTestRecord[]>('load_loadout_tests');
      setTests(savedTests);
      setStatusMessage(`已加载 ${savedTests.length} 条配装测试记录。`);
    } catch (error) {
      setStatusMessage(`加载配装测试记录失败：${errorToMessage(error)}`);
    }
  }, []);

  useEffect(() => {
    void loadSavedTests();
  }, [loadSavedTests]);

  const persistTests = useCallback(async (nextTests: LoadoutTestRecord[]) => {
    if (!isTauriRuntime()) {
      setTests(nextTests);
      setStatusMessage('当前是浏览器开发环境，测试记录只保存在本次页面状态中。');
      return;
    }

    await callTauriCommand<void>('save_loadout_tests', { records: nextTests });
    setTests(nextTests);
  }, []);

  const handleSaveTest = async () => {
    if (!selectedRecord || !selectedActor) {
      setStatusMessage('当前没有可保存的战斗记录。请先加载本地 Raw Events 或连接 WebSocket。');
      return;
    }

    const nextTest = createLoadoutTestRecord(selectedRecord, selectedActor, selectedPartyMember, form);
    const nextTests = [nextTest, ...tests];

    try {
      await persistTests(nextTests);
      setForm({
        ...emptyForm,
        characterName: selectedActor.characterName ?? selectedActor.name,
      });
      setStatusMessage('已保存为配装测试记录。');
    } catch (error) {
      setStatusMessage(`保存配装测试记录失败：${errorToMessage(error)}`);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    const nextTests = tests.filter((test) => test.id !== testId);

    try {
      await persistTests(nextTests);
      setStatusMessage('已删除配装测试记录；原始 raw events 不会被删除。');
    } catch (error) {
      setStatusMessage(`删除配装测试记录失败：${errorToMessage(error)}`);
    }
  };

  const filteredTests = useMemo(
    () => filterAndSortLoadoutTests(tests, {
      characterFilter,
      searchText,
      sortKey,
      sortDirection,
    }),
    [characterFilter, searchText, sortDirection, sortKey, tests],
  );
  const characterGroups = useMemo(() => summarizeByCharacter(filteredTests), [filteredTests]);
  const comparisonTests = useMemo(
    () => comparisonCharacter
      ? tests
        .filter((test) => test.characterName === comparisonCharacter)
        .sort((a, b) => b.actorDps - a.actorDps)
      : [],
    [comparisonCharacter, tests],
  );

  return (
    <PlaceholderPanel title="配装测试" description="从当前战斗记录创建配装测试，保存手动备注，并对比多轮结果。">
      <div className="loadout-layout">
        <section className="loadout-section">
          <div className="section-title-row">
            <div>
              <h3>当前记录</h3>
              <p>数据来自现有 CombatRecord，不在页面内重新计算统计。</p>
            </div>
          </div>

          {!selectedRecord ? (
            <p className="empty-state">暂无战斗记录。可以先到设置页点击“加载本地 Raw Events”。</p>
          ) : (
            <>
              <div className="loadout-select-grid">
                <label>
                  战斗记录
                  <select
                    value={selectedRecord.id}
                    onChange={(event) => {
                      setSelectedRecordId(event.target.value);
                      setSelectedActorId(null);
                    }}
                  >
                    {records.map((record, index) => (
                      <option key={record.id} value={record.id}>
                        记录 {index + 1} · {formatNumber(record.totalDamage)} 伤害 · {formatDuration(record.durationMs)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  测试角色
                  <select
                    value={selectedActor?.id ?? ''}
                    onChange={(event) => setSelectedActorId(event.target.value || null)}
                  >
                    {selectedRecord.actors.map((actor) => (
                      <option key={actor.id} value={actor.id}>
                        {actor.name} · DPS {formatNumber(actor.dps)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <RecordSnapshot record={selectedRecord} actor={selectedActor} />

              <form className="loadout-form" onSubmit={(event) => {
                event.preventDefault();
                void handleSaveTest();
              }}>
                <label>
                  测试名称
                  <input
                    value={form.label}
                    placeholder="例如：木桩 60 秒 上限+追击"
                    onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  />
                </label>
                <label>
                  角色
                  <input
                    value={form.characterName}
                    onChange={(event) => setForm((current) => ({ ...current, characterName: event.target.value }))}
                  />
                </label>
                <label>
                  武器备注
                  <input
                    value={form.weaponNote}
                    placeholder="手动填写武器或觉醒状态"
                    onChange={(event) => setForm((current) => ({ ...current, weaponNote: event.target.value }))}
                  />
                </label>
                <label>
                  因子 / 加护备注
                  <textarea
                    rows={3}
                    value={form.sigilNote}
                    placeholder="例如：伤害上限、追击、暴君、属性克制等"
                    onChange={(event) => setForm((current) => ({ ...current, sigilNote: event.target.value }))}
                  />
                </label>
                <label>
                  其他备注
                  <textarea
                    rows={3}
                    value={form.note}
                    placeholder="记录测试条件、连段、是否开爆发等"
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>

                {rawLoadoutPreview ? (
                  <LoadoutInfoPanel
                    rawLoadout={rawLoadoutPreview}
                    resolvedLoadout={resolvedLoadoutPreview}
                    textStatus={runtime.loadoutTextStatus}
                  />
                ) : (
                  <p className="empty-state">当前记录没有匹配到 load_party 配装信息，仍可保存手动备注。</p>
                )}

                <div className="button-row">
                  <button type="submit" disabled={!selectedActor}>保存为配装测试</button>
                  <button type="button" onClick={() => void loadSavedTests()}>重新加载历史</button>
                </div>
              </form>
            </>
          )}

          {statusMessage ? <p className="operation-message">{statusMessage}</p> : null}
        </section>

        <section className="loadout-section">
          <h3>同角色汇总</h3>
          {characterGroups.length === 0 ? (
            <p className="empty-state">保存测试记录后会显示同角色平均 DPS 和最高 DPS。</p>
          ) : (
            <div className="loadout-summary-grid">
              {characterGroups.map((group) => (
                <article key={group.characterName}>
                  <span>{group.characterName}</span>
                  <strong>{formatNumber(group.bestDps)}</strong>
                  <small>{group.count} 轮 · 平均 {formatNumber(group.averageDps)}</small>
                </article>
              ))}
            </div>
          )}
          <SameCharacterComparison
            characters={characterOptions}
            selectedCharacter={comparisonCharacter}
            tests={comparisonTests}
            onSelectCharacter={setComparisonCharacter}
          />
        </section>
      </div>

      <section className="loadout-section loadout-history">
        <h3>测试记录对比</h3>
        <LoadoutHistoryControls
          characters={characterOptions}
          characterFilter={characterFilter}
          searchText={searchText}
          sortKey={sortKey}
          sortDirection={sortDirection}
          visibleCount={filteredTests.length}
          totalCount={tests.length}
          onCharacterFilterChange={(value) => {
            setCharacterFilter(value);
            if (value !== ALL_CHARACTERS) {
              setComparisonCharacter(value);
            }
          }}
          onSearchTextChange={setSearchText}
          onSortKeyChange={setSortKey}
          onSortDirectionChange={setSortDirection}
        />
        {tests.length === 0 ? (
          <p className="empty-state">暂无配装测试记录。</p>
        ) : filteredTests.length === 0 ? (
          <p className="empty-state">没有匹配当前筛选条件的测试记录。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>名称</th>
                <th>角色</th>
                <th>DPS</th>
                <th>60 秒 DPS</th>
                <th>角色伤害</th>
                <th>战斗时长</th>
                <th>死亡</th>
                <th>配装摘要</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id}>
                  <td>{formatDateTime(test.createdAt)}</td>
                  <td>{test.label}</td>
                  <td>{test.characterName}</td>
                  <td>{formatNumber(test.actorDps)}</td>
                  <td>{formatNumber(test.actorDpsInLastMinute)}</td>
                  <td>{formatNumber(test.actorTotalDamage)}</td>
                  <td>{formatDuration(test.durationMs)}</td>
                  <td>{test.deathCount}</td>
                  <td>{summarizeResolvedLoadout(resolveLoadoutInfo(test.rawLoadout, runtime.loadoutTextMap))}</td>
                  <td>{compactNotes(test)}</td>
                  <td>
                    <button type="button" onClick={() => void handleDeleteTest(test.id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PlaceholderPanel>
  );
}

interface LoadoutHistoryControlsProps {
  characters: string[];
  characterFilter: string;
  searchText: string;
  sortKey: LoadoutSortKey;
  sortDirection: LoadoutSortDirection;
  visibleCount: number;
  totalCount: number;
  onCharacterFilterChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onSortKeyChange: (value: LoadoutSortKey) => void;
  onSortDirectionChange: (value: LoadoutSortDirection) => void;
}

function LoadoutHistoryControls({
  characters,
  characterFilter,
  searchText,
  sortKey,
  sortDirection,
  visibleCount,
  totalCount,
  onCharacterFilterChange,
  onSearchTextChange,
  onSortKeyChange,
  onSortDirectionChange,
}: LoadoutHistoryControlsProps) {
  return (
    <div className="loadout-history-controls">
      <label>
        角色
        <select value={characterFilter} onChange={(event) => onCharacterFilterChange(event.target.value)}>
          <option value={ALL_CHARACTERS}>全部角色</option>
          {characters.map((character) => (
            <option key={character} value={character}>{character}</option>
          ))}
        </select>
      </label>
      <label>
        搜索
        <input
          value={searchText}
          placeholder="名称、备注、区域"
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
      </label>
      <label>
        排序
        <select value={sortKey} onChange={(event) => onSortKeyChange(event.target.value as LoadoutSortKey)}>
          {loadoutSortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        方向
        <select
          value={sortDirection}
          onChange={(event) => onSortDirectionChange(event.target.value as LoadoutSortDirection)}
        >
          <option value="desc">从高到低 / 最新</option>
          <option value="asc">从低到高 / 最旧</option>
        </select>
      </label>
      <p>显示 {visibleCount} / {totalCount} 条</p>
    </div>
  );
}

function SameCharacterComparison({
  characters,
  selectedCharacter,
  tests,
  onSelectCharacter,
}: {
  characters: string[];
  selectedCharacter: string | null;
  tests: LoadoutTestRecord[];
  onSelectCharacter: (value: string | null) => void;
}) {
  const bestDps = Math.max(...tests.map((test) => test.actorDps), 1);

  return (
    <div className="loadout-comparison-panel">
      <div className="section-title-row">
        <div>
          <h4>同角色多轮对比</h4>
          <p>按 DPS 排序，最多显示前 8 轮。</p>
        </div>
      </div>

      {characters.length === 0 ? (
        <p className="empty-state">暂无可对比的角色。</p>
      ) : (
        <>
          <label>
            对比角色
            <select
              value={selectedCharacter ?? ''}
              onChange={(event) => onSelectCharacter(event.target.value || null)}
            >
              {characters.map((character) => (
                <option key={character} value={character}>{character}</option>
              ))}
            </select>
          </label>

          {tests.length === 0 ? (
            <p className="empty-state">当前角色暂无测试记录。</p>
          ) : (
            <div className="loadout-comparison-list">
              {tests.slice(0, 8).map((test) => {
                const widthPercent = test.actorDps > 0 ? Math.max(4, Math.round((test.actorDps / bestDps) * 100)) : 0;

                return (
                  <article key={test.id} className="loadout-comparison-item">
                    <div className="loadout-comparison-item__meta">
                      <strong>{test.label}</strong>
                      <span>{formatDateTime(test.createdAt)}</span>
                    </div>
                    <div className="loadout-comparison-item__track">
                      <span style={{ width: `${widthPercent}%` }} />
                    </div>
                    <small>
                      DPS {formatNumber(test.actorDps)} / 60 秒 {formatNumber(test.actorDpsInLastMinute)} / 伤害 {formatNumber(test.actorTotalDamage)}
                    </small>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadoutInfoPanel({
  rawLoadout,
  resolvedLoadout,
  textStatus,
}: {
  rawLoadout: RawLoadoutInfo;
  resolvedLoadout: ResolvedLoadoutInfo | undefined;
  textStatus: string;
}) {
  if (!resolvedLoadout) {
    return null;
  }

  return (
    <section className="loadout-info-panel">
      <div className="section-title-row">
        <div>
          <h4>配装信息</h4>
          <p className="debug-note">{textStatus}</p>
        </div>
      </div>

      {resolvedLoadout.weapon ? (
        <div className="loadout-info-block">
          <strong>{resolvedLoadout.weapon.name}</strong>
          {resolvedLoadout.weapon.blessing ? (
            <span>加护：{formatNamedLevel(resolvedLoadout.weapon.blessing)}</span>
          ) : null}
          {resolvedLoadout.weapon.skills.length > 0 ? (
            <span>武器技能：{resolvedLoadout.weapon.skills.map(formatNamedLevel).join(' / ')}</span>
          ) : null}
        </div>
      ) : null}

      {resolvedLoadout.overMastery.length > 0 ? (
        <div className="loadout-chip-list">
          {resolvedLoadout.overMastery.map((item, index) => (
            <span key={`${item.id ?? item.name}-${index}`}>{formatNamedLevel(item)}</span>
          ))}
        </div>
      ) : null}

      {resolvedLoadout.sigils.length > 0 ? (
        <div className="loadout-sigil-grid">
          {resolvedLoadout.sigils.map((sigil, index) => (
            <article key={`${sigil.id ?? sigil.name}-${index}`}>
              <strong>{formatNamedLevel(sigil)}</strong>
              {sigil.traits.length > 0 ? <span>{sigil.traits.map(formatNamedLevel).join(' / ')}</span> : null}
            </article>
          ))}
        </div>
      ) : null}

      <details className="raw-loadout-preview">
        <summary>查看 load_party 原始配装信息</summary>
        <pre>{JSON.stringify(rawLoadout, null, 2)}</pre>
      </details>
    </section>
  );
}

function RecordSnapshot({ record, actor }: { record: CombatRecord; actor?: CombatActorStats }) {
  const teamDps = calculateTeamDps(record);

  return (
    <div className="summary-cards">
      <article>
        <span>团队总伤害</span>
        <strong>{formatNumber(record.totalDamage)}</strong>
      </article>
      <article>
        <span>团队 DPS</span>
        <strong>{formatNumber(teamDps)}</strong>
      </article>
      <article>
        <span>角色 DPS</span>
        <strong>{formatNumber(actor?.dps ?? 0)}</strong>
      </article>
      <article>
        <span>战斗时长</span>
        <strong>{formatDuration(record.durationMs)}</strong>
      </article>
    </div>
  );
}

function createLoadoutTestRecord(
  record: CombatRecord,
  actor: CombatActorStats,
  partyMember: CombatPartyMember | undefined,
  form: LoadoutFormState,
): LoadoutTestRecord {
  const createdAt = new Date().toISOString();
  const characterName = form.characterName.trim() || actor.characterName || actor.name;

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt,
    label: form.label.trim() || `${characterName} ${formatDateTime(createdAt)}`,
    combatRecordId: record.id,
    areaName: record.areaName,
    characterName,
    actorName: actor.name,
    actorId: actor.id,
    durationMs: record.durationMs,
    recordTotalDamage: record.totalDamage,
    teamDps: calculateTeamDps(record),
    damageEventCount: record.damageEventCount,
    actorTotalDamage: actor.totalDamage,
    actorDps: actor.dps,
    actorDpsInLastMinute: actor.dpsInLastMinute,
    actorDamageRate: actor.damageRate,
    deathCount: actor.deathCount,
    weaponNote: form.weaponNote.trim(),
    sigilNote: form.sigilNote.trim(),
    note: form.note.trim(),
    rawLoadout: extractRawLoadout(partyMember),
  };
}

function extractRawLoadout(member?: CombatPartyMember): LoadoutTestRecord['rawLoadout'] | undefined {
  if (!member || !member.raw || typeof member.raw !== 'object' || Array.isArray(member.raw)) {
    return undefined;
  }

  const raw = member.raw as Record<string, unknown>;
  return {
    weapon: raw.weapon,
    sigils: raw.sigils,
    overMastery: raw.over_mastery,
    rawMember: member.raw,
  };
}

interface LoadoutFilterOptions {
  characterFilter: string;
  searchText: string;
  sortKey: LoadoutSortKey;
  sortDirection: LoadoutSortDirection;
}

function getCharacterOptions(tests: LoadoutTestRecord[]) {
  const collator = new Intl.Collator('zh-CN');
  return Array.from(new Set(tests.map((test) => test.characterName).filter(Boolean))).sort(collator.compare);
}

function filterAndSortLoadoutTests(tests: LoadoutTestRecord[], options: LoadoutFilterOptions) {
  const normalizedQuery = options.searchText.trim().toLowerCase();

  return tests
    .filter((test) => {
      const matchesCharacter = options.characterFilter === ALL_CHARACTERS
        || test.characterName === options.characterFilter;
      const matchesSearch = normalizedQuery.length === 0 || getLoadoutSearchText(test).includes(normalizedQuery);
      return matchesCharacter && matchesSearch;
    })
    .sort((a, b) => {
      const baseCompare = compareLoadoutTests(a, b, options.sortKey);
      if (baseCompare !== 0) {
        return options.sortDirection === 'asc' ? baseCompare : -baseCompare;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

function compareLoadoutTests(a: LoadoutTestRecord, b: LoadoutTestRecord, sortKey: LoadoutSortKey) {
  switch (sortKey) {
    case 'actorDps':
      return a.actorDps - b.actorDps;
    case 'actorDpsInLastMinute':
      return a.actorDpsInLastMinute - b.actorDpsInLastMinute;
    case 'actorTotalDamage':
      return a.actorTotalDamage - b.actorTotalDamage;
    case 'durationMs':
      return a.durationMs - b.durationMs;
    case 'createdAt':
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    default:
      return 0;
  }
}

function getLoadoutSearchText(test: LoadoutTestRecord) {
  return [
    test.label,
    test.characterName,
    test.actorName,
    test.areaName,
    test.combatRecordId,
    test.weaponNote,
    test.sigilNote,
    test.note,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

function summarizeByCharacter(tests: LoadoutTestRecord[]) {
  const groups = new Map<string, { characterName: string; count: number; totalDps: number; bestDps: number }>();

  for (const test of tests) {
    const current = groups.get(test.characterName) ?? {
      characterName: test.characterName,
      count: 0,
      totalDps: 0,
      bestDps: 0,
    };

    current.count += 1;
    current.totalDps += test.actorDps;
    current.bestDps = Math.max(current.bestDps, test.actorDps);
    groups.set(test.characterName, current);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      averageDps: Math.floor(group.totalDps / Math.max(group.count, 1)),
    }))
    .sort((a, b) => b.bestDps - a.bestDps);
}

function compactNotes(test: LoadoutTestRecord) {
  return [test.weaponNote, test.sigilNote, test.note].filter(Boolean).join(' / ') || '--';
}

function formatNamedLevel(item: { name: string; level?: number }) {
  return item.level === undefined ? item.name : `${item.name} Lv.${item.level}`;
}

function calculateTeamDps(record: CombatRecord) {
  return record.durationMs > 0 ? Math.floor(record.totalDamage / Math.max(record.durationMs / 1000, 1)) : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
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

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
