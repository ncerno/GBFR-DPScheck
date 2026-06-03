import type { AppRuntime } from '../../app/useAppRuntime';
import type { CombatAreaStrategy } from '../../combat/models';
import type { GbfrActConnectionStatus } from '../../gbfr-act/connection';
import type { GbfrActEventSource } from '../../gbfr-act/useGbfrActStream';

export const OVERLAY_WINDOW_LABEL = 'overlay';
export const OVERLAY_SNAPSHOT_EVENT = 'overlay:snapshot';
export const OVERLAY_CLICK_THROUGH_EVENT = 'overlay:click-through';
export const OVERLAY_READY_EVENT = 'overlay:ready';

export interface OverlayActorSnapshot {
  id: string;
  name: string;
  characterName?: string;
  userName?: string;
  totalDamage: number;
  dps: number;
  dpsInLastMinute: number;
  damageRate: number;
  deathCount: number;
}

export interface OverlayTargetSnapshot {
  id: string;
  name: string;
  totalDamage: number;
  damageRate: number;
  damageEventCount: number;
}

export interface OverlayRecordSnapshot {
  id: string;
  areaName?: string;
  strategy: CombatAreaStrategy;
  durationMs: number;
  totalDamage: number;
  damageEventCount: number;
  actorCount: number;
  actors: OverlayActorSnapshot[];
  targets: OverlayTargetSnapshot[];
}

export interface OverlayConfigSnapshot {
  alwaysOnTop: boolean;
  clickThrough: boolean;
  opacity: number;
  compact: boolean;
  inactiveTimeoutSec: number;
}

export interface OverlaySnapshot {
  eventSource: GbfrActEventSource;
  connectionStatus: GbfrActConnectionStatus;
  connectionError?: string;
  eventCount: number;
  bufferedEventCount: number;
  eventTypeCounts: Record<string, number>;
  lastReceivedAtMs: number | null;
  lastDamageReceivedAtMs: number | null;
  record: OverlayRecordSnapshot | null;
  config: OverlayConfigSnapshot;
}

export function createOverlaySnapshot(runtime: AppRuntime): OverlaySnapshot {
  const latestRecord = runtime.combatReplay.latestRecord;

  return {
    eventSource: runtime.stream.eventSource,
    connectionStatus: runtime.stream.connection.status,
    connectionError: runtime.stream.connection.lastError,
    eventCount: runtime.stream.eventCount,
    bufferedEventCount: runtime.stream.bufferedEventCount,
    eventTypeCounts: runtime.stream.eventTypeCounts,
    lastReceivedAtMs: runtime.stream.lastReceivedAtMs,
    lastDamageReceivedAtMs: runtime.stream.lastDamageReceivedAtMs,
    record: latestRecord
      ? {
        id: latestRecord.id,
        areaName: latestRecord.areaName,
        strategy: latestRecord.strategy,
        durationMs: latestRecord.durationMs,
        totalDamage: latestRecord.totalDamage,
        damageEventCount: latestRecord.damageEventCount,
        actorCount: latestRecord.actors.length,
        actors: latestRecord.actors.map((actor) => ({
          id: actor.id,
          name: actor.name,
          characterName: actor.characterName,
          userName: actor.userName,
          totalDamage: actor.totalDamage,
          dps: actor.dps,
          dpsInLastMinute: actor.dpsInLastMinute,
          damageRate: actor.damageRate,
          deathCount: actor.deathCount,
        })),
        targets: (latestRecord.targets ?? []).map((target) => ({
          id: target.id,
          name: target.name,
          totalDamage: target.totalDamage,
          damageRate: target.damageRate,
          damageEventCount: target.damageEventCount,
        })),
      }
      : null,
    config: {
      alwaysOnTop: runtime.config.overlay.always_on_top,
      clickThrough: runtime.config.overlay.click_through,
      opacity: runtime.config.overlay.opacity,
      compact: runtime.config.overlay.compact,
      inactiveTimeoutSec: runtime.config.combat.inactive_timeout_sec,
    },
  };
}

export function createEmptyOverlaySnapshot(): OverlaySnapshot {
  return {
    eventSource: 'live',
    connectionStatus: 'idle',
    eventCount: 0,
    bufferedEventCount: 0,
    eventTypeCounts: {},
    lastReceivedAtMs: null,
    lastDamageReceivedAtMs: null,
    record: null,
    config: {
      alwaysOnTop: true,
      clickThrough: false,
      opacity: 0.86,
      compact: false,
      inactiveTimeoutSec: 30,
    },
  };
}
