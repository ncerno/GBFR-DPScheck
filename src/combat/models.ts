import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatActionNameSource } from './actionNames';

export type CombatAreaStrategy = 'auto' | 'training' | 'quest' | 'generic';
export type CombatActorNameSource = 'gbfr-act' | 'fallback';

export interface CombatActorRef {
  id: string;
  actorType?: string;
  index?: number;
  objectId?: number;
  partyIndex?: number;
  raw: unknown;
}

export interface CombatPartyMember {
  id: string;
  actor: CombatActorRef;
  name: string;
  characterName?: string;
  userName?: string;
  partyIndex?: number;
  isOnline?: boolean;
  raw: unknown;
}

export interface CombatActorStats {
  id: string;
  name: string;
  characterName?: string;
  userName?: string;
  partyIndex?: number;
  rawActor?: unknown;
  damageEvents?: Array<{ timeMs: number; damage: number; targetId?: string }>;
  totalDamage: number;
  dps: number;
  dpsInLastMinute: number;
  damageRate: number;
  deathCount: number;
  actions: CombatActionStats[];
  targets: CombatTargetStats[];
}

export interface CombatActionStats {
  id: string;
  name: string;
  actionId?: number;
  actorType?: string;
  nameSource: CombatActionNameSource;
  totalDamage: number;
  damageRate: number;
  minDamage: number;
  maxDamage: number;
  averageDamage: number;
  damageEventCount: number;
  targetDamages?: Record<string, CombatActionTargetStats>;
}

export interface CombatActionTargetStats {
  totalDamage: number;
  minDamage: number;
  maxDamage: number;
  damageEventCount: number;
}

export interface CombatTargetStats {
  id: string;
  name: string;
  actorType?: string;
  rawActor?: unknown;
  nameSource: CombatActorNameSource;
  includedInDps: boolean;
  exclusionReason?: string;
  totalDamage: number;
  damageRate: number;
  damageEventCount: number;
}

export interface CombatRecord {
  id: string;
  areaName?: string;
  strategy: CombatAreaStrategy;
  startedAtMs?: number;
  endedAtMs?: number;
  lastDamageAtMs?: number;
  durationMs: number;
  totalDamage: number;
  eventCount: number;
  damageEventCount: number;
  actors: CombatActorStats[];
  targets: CombatTargetStats[];
  partyMembers: CombatPartyMember[];
  rawEvents: GbfrActRawEvent[];
}
