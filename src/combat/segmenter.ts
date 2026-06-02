import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatAreaStrategy, CombatPartyMember, CombatRecord } from './models';
import { normalizeGbfrActEvent } from './normalizer';
import { applyCombatEvent } from './statistics';

export interface CombatSegmenterConfig {
  inactiveTimeoutSec: number;
  defaultStrategy: CombatAreaStrategy;
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
  return event.type === 'enter_area';
}

export function appendEventToRecord(record: CombatRecord, event: GbfrActRawEvent): CombatRecord {
  return applyCombatEvent(record, event);
}

export function segmentCombatEvents(
  events: GbfrActRawEvent[],
  config: CombatSegmenterConfig = { inactiveTimeoutSec: 30, defaultStrategy: 'generic' },
): SegmentCombatEventsResult {
  const records: CombatRecord[] = [];
  let recordIndex = 1;
  let current = createEmptyCombatRecord(createRecordId(recordIndex), config.defaultStrategy);

  for (const event of events) {
    const normalized = normalizeGbfrActEvent(event);

    if (normalized.type === 'enter_area' && current.eventCount > 0) {
      if (current.damageEventCount > 0 || current.partyMembers.length > 0) {
        records.push(current);
        recordIndex += 1;
      }

      current = createEmptyCombatRecord(createRecordId(recordIndex), config.defaultStrategy);
    }

    if (
      normalized.type === 'damage'
      && current.lastDamageAtMs !== undefined
      && current.damageEventCount > 0
      && normalized.timeMs - current.lastDamageAtMs > config.inactiveTimeoutSec * 1000
    ) {
      records.push(current);
      recordIndex += 1;
      current = createEmptyCombatRecord(createRecordId(recordIndex), config.defaultStrategy, {
        areaName: current.areaName,
        partyMembers: current.partyMembers,
      });
    }

    current = applyCombatEvent(current, event);
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
