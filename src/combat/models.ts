import type { GbfrActRawEvent } from '../gbfr-act/events';

export type CombatAreaStrategy = 'auto' | 'training' | 'quest' | 'generic';

export interface CombatActorStats {
  id: string;
  name: string;
  characterName?: string;
  totalDamage: number;
  dps: number;
  rdps?: number;
  dpsInLastMinute: number;
  damageRate: number;
  deathCount: number;
  actions: CombatActionStats[];
}

export interface CombatActionStats {
  id: string;
  name: string;
  totalDamage: number;
  damageRate: number;
  minDamage: number;
  maxDamage: number;
  averageDamage: number;
}

export interface CombatRecord {
  id: string;
  areaName?: string;
  strategy: CombatAreaStrategy;
  startedAtMs?: number;
  endedAtMs?: number;
  durationMs: number;
  totalDamage: number;
  actors: CombatActorStats[];
  rawEvents: GbfrActRawEvent[];
}
