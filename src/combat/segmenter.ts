import type { GbfrActRawEvent } from '../gbfr-act/events';
import { GBFR_DPSCHECK_MANUAL_RESET_EVENT } from '../gbfr-act/events';
import type { CombatActionNameMap } from './actionNames';
import { resolveAreaStrategy } from './areaStrategy';
import type { CombatAreaStrategy, CombatPartyMember, CombatRecord } from './models';
import { isTrackedPlayerDamageEvent, normalizeGbfrActEvent } from './normalizer';
import { createFallbackAreaName } from './recordLabels';
import { applyCombatEvent } from './statistics';

export interface CombatSegmenterConfig {
  inactiveTimeoutSec: number;
  defaultStrategy: CombatAreaStrategy;
  trainingInactiveTimeoutSec?: number;
  actionNameMap?: CombatActionNameMap;
  actorTextMap?: Record<string, string>;
}

export interface SegmentCombatEventsResult {
  records: CombatRecord[];
  latestRecord?: CombatRecord;
}

export function createEmptyCombatRecord(
  id: string,
  strategy: CombatAreaStrategy,
  seed?: Partial<Pick<CombatRecord, 'areaName' | 'partyMembers'>>,
): CombatRecord {
  return {
    id,
    areaName: seed?.areaName,
    strategy,
    durationMs: 0,
    totalDamage: 0,
    eventCount: 0,
    damageEventCount: 0,
    actors: [],
    targets: [],
    partyMembers: seed?.partyMembers ?? [],
    rawEvents: [],
  };
}

export function segmentCombatEvents(
  events: GbfrActRawEvent[],
  config: CombatSegmenterConfig = { inactiveTimeoutSec: 30, defaultStrategy: 'generic' },
): SegmentCombatEventsResult {
  const records: CombatRecord[] = [];
  let recordIndex = 1;
  let current = createEmptyCombatRecord(
    createRecordId(recordIndex),
    resolveAreaStrategy(config.defaultStrategy),
    { areaName: createFallbackAreaName(recordIndex) },
  );

  for (const event of events) {
    const normalized = normalizeGbfrActEvent(event);

    if (normalized.type === GBFR_DPSCHECK_MANUAL_RESET_EVENT) {
      if (shouldArchiveRecord(current)) {
        records.push(current);
        recordIndex += 1;
      }

      current = createEmptyCombatRecord(createRecordId(recordIndex), current.strategy, {
        areaName: current.areaName ?? createFallbackAreaName(recordIndex),
        partyMembers: current.partyMembers,
      });
      continue;
    }

    if (normalized.type === 'enter_area') {
      const nextStrategy = resolveAreaStrategy(config.defaultStrategy, normalized.areaName);
      const nextAreaName = normalized.areaName?.trim();

      if (current.eventCount > 0 && shouldArchiveRecord(current)) {
        records.push(current);
        recordIndex += 1;
        current = createEmptyCombatRecord(createRecordId(recordIndex), nextStrategy, {
          areaName: nextAreaName || createFallbackAreaName(recordIndex),
          partyMembers: current.partyMembers,
        });
      } else {
        current = {
          ...current,
          areaName: nextAreaName || current.areaName || createFallbackAreaName(recordIndex),
          strategy: nextStrategy,
        };
      }
    }

    const isTrackedDamage = normalized.type === 'damage' && isTrackedPlayerDamageEvent(normalized, current.partyMembers);

    if (
      isTrackedDamage
      && shouldSplitOnInactiveTimeout(current.strategy)
      && current.lastDamageAtMs !== undefined
      && current.damageEventCount > 0
      && normalized.timeMs - current.lastDamageAtMs > getInactiveTimeoutMs(current.strategy, config)
    ) {
      records.push(current);
      recordIndex += 1;
      current = createEmptyCombatRecord(createRecordId(recordIndex), current.strategy, {
        areaName: current.areaName ?? createFallbackAreaName(recordIndex),
        partyMembers: current.partyMembers,
      });
    }

    current = applyCombatEvent(current, event, {
      actionNameMap: config.actionNameMap,
      actorTextMap: config.actorTextMap,
    });
  }

  if (shouldArchiveRecord(current)) {
    records.push(current);
  }

  return {
    records,
    latestRecord: records.length > 0 ? records[records.length - 1] : undefined,
  };
}

function createRecordId(index: number) {
  return `record-${index}`;
}

function shouldArchiveRecord(record: CombatRecord) {
  return record.damageEventCount > 0;
}

function shouldSplitOnInactiveTimeout(strategy: CombatAreaStrategy) {
  return strategy === 'training';
}

function getInactiveTimeoutMs(strategy: CombatAreaStrategy, config: CombatSegmenterConfig) {
  if (strategy === 'training') {
    const trainingTimeoutSec = config.trainingInactiveTimeoutSec ?? Math.min(config.inactiveTimeoutSec, 10);
    return Math.max(1, trainingTimeoutSec) * 1000;
  }

  return Math.max(1, config.inactiveTimeoutSec) * 1000;
}
