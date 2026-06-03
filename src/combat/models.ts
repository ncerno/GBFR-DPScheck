import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatActionNameSource } from './actionNames';

export type CombatAreaStrategy = 'auto' | 'training' | 'quest' | 'generic';

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
  damageEvents?: Array<{ timeMs: number; damage: number }>;
  totalDamage: number;
  dps: number;
  rdps?: number | null;
  dpsInLastMinute: number;
  damageRate: number;
  deathCount: number;
  actions: CombatActionStats[];
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
  partyMembers: CombatPartyMember[];
  rawEvents: GbfrActRawEvent[];
}
