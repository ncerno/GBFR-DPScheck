import type { GbfrActDamageEventData, GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatActorRef, CombatPartyMember } from './models';

export type NormalizedCombatEvent =
  | NormalizedEnterAreaEvent
  | NormalizedLoadPartyEvent
  | NormalizedDamageEvent
  | NormalizedDeathEvent
  | NormalizedUnknownEvent;

export interface NormalizedEnterAreaEvent {
  type: 'enter_area';
  timeMs: number;
  areaName?: string;
  raw: GbfrActRawEvent;
}

export interface NormalizedLoadPartyEvent {
  type: 'load_party';
  timeMs: number;
  members: CombatPartyMember[];
  raw: GbfrActRawEvent;
}

export interface NormalizedDamageEvent {
  type: 'damage';
  timeMs: number;
  source: CombatActorRef;
  target: CombatActorRef;
  damage: number;
  actionId?: number;
  actionKey: string;
  flags?: number;
  raw: GbfrActRawEvent<GbfrActDamageEventData>;
}

export interface NormalizedDeathEvent {
  type: 'inc_death_cnt';
  timeMs: number;
  actor: CombatActorRef;
  deathCount: number;
  raw: GbfrActRawEvent;
}

export interface NormalizedUnknownEvent {
  type: 'unknown';
  originalType: string;
  timeMs: number;
  raw: GbfrActRawEvent;
}

export function normalizeGbfrActEvent(event: GbfrActRawEvent): NormalizedCombatEvent {
  const timeMs = typeof event.time_ms === 'number' ? event.time_ms : Date.now();

  switch (event.type) {
    case 'enter_area':
      return normalizeEnterAreaEvent(event, timeMs);
    case 'load_party':
      return normalizeLoadPartyEvent(event, timeMs);
    case 'damage':
      return normalizeDamageEvent(event as GbfrActRawEvent<GbfrActDamageEventData>, timeMs);
    case 'inc_death_cnt':
      return normalizeDeathEvent(event, timeMs);
    default:
      return {
        type: 'unknown',
        originalType: event.type,
        timeMs,
        raw: event,
      };
  }
}

export function createActorRef(raw: unknown): CombatActorRef {
  if (Array.isArray(raw)) {
    const [actorType, index, objectId, partyIndex] = raw;
    const normalized: CombatActorRef = {
      id: actorRefKey(raw),
      raw,
    };

    if (typeof actorType === 'string') {
      normalized.actorType = actorType;
    }
    if (typeof index === 'number') {
      normalized.index = index;
    }
    if (typeof objectId === 'number') {
      normalized.objectId = objectId;
    }
    if (typeof partyIndex === 'number') {
      normalized.partyIndex = partyIndex;
    }

    return normalized;
  }

  return {
    id: actorRefKey(raw),
    raw,
  };
}

export function actorRefKey(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.slice(0, 4).map((item) => String(item)).join(':');
  }

  if (raw && typeof raw === 'object') {
    return JSON.stringify(raw);
  }

  return String(raw ?? 'unknown');
}

function normalizeEnterAreaEvent(event: GbfrActRawEvent, timeMs: number): NormalizedEnterAreaEvent {
  const data = event.data;
  const areaName = data && typeof data === 'object' && 'area_name' in data && typeof data.area_name === 'string'
    ? data.area_name
    : undefined;

  return {
    type: 'enter_area',
    timeMs,
    areaName,
    raw: event,
  };
}

function normalizeLoadPartyEvent(event: GbfrActRawEvent, timeMs: number): NormalizedLoadPartyEvent {
  const members = Array.isArray(event.data)
    ? event.data.map((item, index) => normalizePartyMember(item, index)).filter((item): item is CombatPartyMember => Boolean(item))
    : [];

  return {
    type: 'load_party',
    timeMs,
    members,
    raw: event,
  };
}

function normalizeDamageEvent(event: GbfrActRawEvent<GbfrActDamageEventData>, timeMs: number): NormalizedDamageEvent {
  const source = createActorRef(event.data?.source);
  const target = createActorRef(event.data?.target);
  const actionId = typeof event.data?.action_id === 'number' ? event.data.action_id : undefined;

  return {
    type: 'damage',
    timeMs,
    source,
    target,
    damage: typeof event.data?.damage === 'number' ? event.data.damage : 0,
    actionId,
    actionKey: actionId === undefined ? 'unknown' : String(actionId),
    flags: typeof event.data?.flags === 'number' ? event.data.flags : undefined,
    raw: event,
  };
}

function normalizeDeathEvent(event: GbfrActRawEvent, timeMs: number): NormalizedDeathEvent {
  const data = event.data;
  const actor = data && typeof data === 'object' && 'actor' in data ? createActorRef(data.actor) : createActorRef(undefined);
  const deathCount = data && typeof data === 'object' && 'death_cnt' in data && typeof data.death_cnt === 'number'
    ? data.death_cnt
    : 0;

  return {
    type: 'inc_death_cnt',
    timeMs,
    actor,
    deathCount,
    raw: event,
  };
}

function normalizePartyMember(raw: unknown, fallbackIndex: number): CombatPartyMember | null {
  if (!raw) {
    return null;
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const item = raw as Record<string, unknown>;
    const actor = createActorRef(item.common_info);
    const characterName = typeof item.c_name === 'string' ? item.c_name : undefined;
    const userName = typeof item.name === 'string' ? item.name : undefined;
    const displayName = characterName ?? userName ?? `队员 ${fallbackIndex + 1}`;

    return {
      id: actor.id,
      actor,
      name: displayName,
      characterName,
      userName,
      isOnline: typeof item.is_online === 'number' ? item.is_online !== 0 : undefined,
      raw,
    };
  }

  if (Array.isArray(raw)) {
    const actor = createActorRef(raw);
    const displayName = typeof raw[4] === 'string' ? raw[4] : `队员 ${fallbackIndex + 1}`;

    return {
      id: actor.id,
      actor,
      name: displayName,
      partyIndex: actor.partyIndex,
      raw,
    };
  }

  return null;
}
