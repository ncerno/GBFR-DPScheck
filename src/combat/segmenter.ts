import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatAreaStrategy, CombatRecord } from './models';

export interface CombatSegmenterConfig {
  inactiveTimeoutSec: number;
  defaultStrategy: CombatAreaStrategy;
}

export function createEmptyCombatRecord(id: string, strategy: CombatAreaStrategy): CombatRecord {
  return {
    id,
    strategy,
    durationMs: 0,
    totalDamage: 0,
    actors: [],
    rawEvents: [],
  };
}

export function shouldStartNewRecord(event: GbfrActRawEvent) {
  return event.type === 'enter_area';
}

export function appendEventToRecord(record: CombatRecord, event: GbfrActRawEvent): CombatRecord {
  return {
    ...record,
    rawEvents: [...record.rawEvents, event],
  };
}
