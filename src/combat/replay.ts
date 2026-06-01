import type { GbfrActRawEvent } from '../gbfr-act/events';
import { createEmptyCombatRecord } from './segmenter';
import { applyCombatEvent } from './statistics';

export function replayCombatEvents(events: GbfrActRawEvent[]) {
  return events.reduce(
    (record, event) => applyCombatEvent(record, event),
    createEmptyCombatRecord('replay', 'generic'),
  );
}
