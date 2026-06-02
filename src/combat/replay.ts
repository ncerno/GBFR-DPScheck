import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatAreaStrategy } from './models';
import { segmentCombatEvents } from './segmenter';

export interface ReplayCombatEventsOptions {
  inactiveTimeoutSec?: number;
  defaultStrategy?: CombatAreaStrategy;
}

export function replayCombatEvents(events: GbfrActRawEvent[], options: ReplayCombatEventsOptions = {}) {
  return segmentCombatEvents(events, {
    inactiveTimeoutSec: options.inactiveTimeoutSec ?? 30,
    defaultStrategy: options.defaultStrategy ?? 'generic',
  });
}
