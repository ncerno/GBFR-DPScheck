import type { GbfrActRawEvent } from '../gbfr-act/events';
import { GBFR_DPSCHECK_MANUAL_RESET_EVENT } from '../gbfr-act/events';
import type { CombatActionNameMap } from './actionNames';
import { resolveAreaStrategy } from './areaStrategy';
import type { CombatAreaStrategy, CombatPartyMember, CombatRecord } from './models';
import { normalizeGbfrActEvent } from './normalizer';
import { applyCombatEvent } from './statistics';

export interface CombatSegmenterConfig {
  inactiveTimeoutSec: number;
  defaultStrategy: CombatAreaStrategy;
  trainingInactiveTimeoutSec?: number;
  actionNameMap?: CombatActionNameMap;
}

export interface SegmentCombatEventsResult {
  records: CombatRecord[];
  latestRecord?: CombatRecord;
}

export function createEmptyCombatRecord(
  id: string,
  strategy: CombatAreaStrategy,
  seed?: Pick<CombatRecord, 'areaName' | 'partyMembers'>,
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
    partyMembers: seed?.partyMembers ?? [],
    rawEvents: [],
  };
}

export function shouldStartNewRecord(event: GbfrActRawEvent) {
  return event.type === 'enter_area' || event.type === GBFR_DPSCHECK_MANUAL_RESET_EVENT;
}

export function appendEventToRecord(
  record: CombatRecord,
  event: GbfrActRawEvent,
  config?: Pick<CombatSegmenterConfig, 'actionNameMap'>,
): CombatRecord {
  return applyCombatEvent(record, event, { actionNameMap: config?.actionNameMap });
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
  );

  for (const event of events) {
    const normalized = normalizeGbfrActEvent(event);

    if (normalized.type === GBFR_DPSCHECK_MANUAL_RESET_EVENT) {
      if (shouldArchiveRecord(current)) {
        records.push(current);
        recordIndex += 1;
      }

      current = createEmptyCombatRecord(createRecordId(recordIndex), current.strategy, {
        areaName: current.areaName,
        partyMembers: current.partyMembers,
      });
      continue;
    }

    if (normalized.type === 'enter_area') {
      const nextStrategy = resolveAreaStrategy(config.defaultStrategy, normalized.areaName);

      if (current.eventCount > 0 && shouldArchiveRecord(current)) {
        records.push(current);
        recordIndex += 1;
        current = createEmptyCombatRecord(createRecordId(recordIndex), nextStrategy, {
          partyMembers: current.partyMembers,
        });
      } else {
        current = {
          ...current,
          strategy: nextStrategy,
        };
      }
    }

    if (
      normalized.type === 'damage'
      && current.lastDamageAtMs !== undefined
      && current.damageEventCount > 0
      && normalized.timeMs - current.lastDamageAtMs > getInactiveTimeoutMs(current.strategy, config)
    ) {
      records.push(current);
      recordIndex += 1;
      current = createEmptyCombatRecord(createRecordId(recordIndex), current.strategy, {
        areaName: current.areaName,
        partyMembers: current.partyMembers,
      });
    }

    current = applyCombatEvent(current, event, { actionNameMap: config.actionNameMap });
  }

  if (current.eventCount > 0 || current.damageEventCount > 0) {
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
  return record.damageEventCount > 0 || record.partyMembers.length > 0;
}

function getInactiveTimeoutMs(strategy: CombatAreaStrategy, config: CombatSegmenterConfig) {
  if (strategy === 'training') {
    const trainingTimeoutSec = config.trainingInactiveTimeoutSec ?? Math.min(config.inactiveTimeoutSec, 10);
    return Math.max(1, trainingTimeoutSec) * 1000;
  }

  return Math.max(1, config.inactiveTimeoutSec) * 1000;
}
