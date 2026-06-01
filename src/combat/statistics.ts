import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatRecord } from './models';

export function applyCombatEvent(record: CombatRecord, event: GbfrActRawEvent): CombatRecord {
  // 当前只是统计引擎占位。后续在这里处理 damage / death / party 等事件。
  return {
    ...record,
    rawEvents: [...record.rawEvents, event],
  };
}

export function recalculateCombatRecord(record: CombatRecord): CombatRecord {
  // 后续用于 raw events 回放重算。
  return record;
}
