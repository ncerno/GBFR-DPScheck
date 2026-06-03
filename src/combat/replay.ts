import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatActionNameMap } from './actionNames';
import type { CombatAreaStrategy } from './models';
import { segmentCombatEvents } from './segmenter';

export interface ReplayCombatEventsOptions {
  inactiveTimeoutSec?: number;
  trainingInactiveTimeoutSec?: number;
  defaultStrategy?: CombatAreaStrategy;
  actionNameMap?: CombatActionNameMap;
  actorTextMap?: Record<string, string>;
}

export function replayCombatEvents(events: GbfrActRawEvent[], options: ReplayCombatEventsOptions = {}) {
  return segmentCombatEvents(events, {
    inactiveTimeoutSec: options.inactiveTimeoutSec ?? 30,
    trainingInactiveTimeoutSec: options.trainingInactiveTimeoutSec,
    defaultStrategy: options.defaultStrategy ?? 'generic',
    actionNameMap: options.actionNameMap,
    actorTextMap: options.actorTextMap,
  });
}
