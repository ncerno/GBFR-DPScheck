import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatActionStats, CombatActorStats, CombatPartyMember, CombatRecord } from './models';
import { normalizeGbfrActEvent } from './normalizer';

interface MutableActionStats {
  id: string;
  name: string;
  totalDamage: number;
  minDamage: number;
  maxDamage: number;
  damageEventCount: number;
}

interface MutableActorStats {
  id: string;
  name: string;
  characterName?: string;
  userName?: string;
  partyIndex?: number;
  rawActor?: unknown;
  totalDamage: number;
  deathCount: number;
  actions: Map<string, MutableActionStats>;
  damageEvents: Array<{ timeMs: number; damage: number }>;
}

export function applyCombatEvent(record: CombatRecord, event: GbfrActRawEvent): CombatRecord {
  const normalized = normalizeGbfrActEvent(event);
  const partyMembers = normalized.type === 'load_party' && normalized.members.length > 0
    ? normalized.members
    : record.partyMembers;

  const actorMap = createActorMap(record.actors);

  let nextRecord: CombatRecord = {
    ...record,
    areaName: normalized.type === 'enter_area' ? normalized.areaName ?? record.areaName : record.areaName,
    partyMembers,
    eventCount: record.eventCount + 1,
    rawEvents: [...record.rawEvents, event],
  };

  if (normalized.type === 'damage') {
    const actor = ensureActor(actorMap, normalized.source.id, partyMembers, normalized.source.raw);
    actor.totalDamage += normalized.damage;
    actor.damageEvents.push({ timeMs: normalized.timeMs, damage: normalized.damage });

    const action = ensureAction(actor, normalized.actionKey);
    action.totalDamage += normalized.damage;
    action.damageEventCount += 1;
    action.minDamage = Math.min(action.minDamage, normalized.damage);
    action.maxDamage = Math.max(action.maxDamage, normalized.damage);

    nextRecord = {
      ...nextRecord,
      startedAtMs: nextRecord.startedAtMs ?? normalized.timeMs,
      endedAtMs: normalized.timeMs,
      lastDamageAtMs: normalized.timeMs,
      damageEventCount: nextRecord.damageEventCount + 1,
      totalDamage: nextRecord.totalDamage + normalized.damage,
    };
  }

  if (normalized.type === 'inc_death_cnt') {
    const actor = ensureActor(actorMap, normalized.actor.id, partyMembers, normalized.actor.raw);
    actor.deathCount = Math.max(actor.deathCount, normalized.deathCount);
  }

  return finalizeRecord({
    ...nextRecord,
    actors: finalizeActors(actorMap, nextRecord),
  });
}

export function recalculateCombatRecord(record: CombatRecord): CombatRecord {
  const seed: CombatRecord = {
    ...record,
    startedAtMs: undefined,
    endedAtMs: undefined,
    lastDamageAtMs: undefined,
    durationMs: 0,
    totalDamage: 0,
    eventCount: 0,
    damageEventCount: 0,
    actors: [],
    rawEvents: [],
  };

  return record.rawEvents.reduce<CombatRecord>(
    (current, event) => applyCombatEvent(current, event),
    seed,
  );
}

function createActorMap(actors: CombatActorStats[]): Map<string, MutableActorStats> {
  return new Map(actors.map((actor) => [actor.id, {
    id: actor.id,
    name: actor.name,
    characterName: actor.characterName,
    userName: actor.userName,
    partyIndex: actor.partyIndex,
    rawActor: actor.rawActor,
    totalDamage: actor.totalDamage,
    deathCount: actor.deathCount,
    actions: new Map(actor.actions.map((action) => [action.id, {
      id: action.id,
      name: action.name,
      totalDamage: action.totalDamage,
      minDamage: action.minDamage,
      maxDamage: action.maxDamage,
      damageEventCount: action.damageEventCount,
    }])),
    damageEvents: actor.damageEvents ?? [],
  }]));
}

function ensureActor(
  actorMap: Map<string, MutableActorStats>,
  actorId: string,
  partyMembers: CombatPartyMember[],
  rawActor?: unknown,
): MutableActorStats {
  const existing = actorMap.get(actorId);
  if (existing) {
    return existing;
  }

  const partyMember = partyMembers.find((member) => member.id === actorId);
  const actor: MutableActorStats = {
    id: actorId,
    name: partyMember?.name ?? fallbackActorName(rawActor, actorId),
    characterName: partyMember?.characterName,
    userName: partyMember?.userName,
    partyIndex: partyMember?.actor.partyIndex,
    rawActor,
    totalDamage: 0,
    deathCount: 0,
    actions: new Map(),
    damageEvents: [],
  };
  actorMap.set(actorId, actor);
  return actor;
}

function ensureAction(actor: MutableActorStats, actionId: string): MutableActionStats {
  const existing = actor.actions.get(actionId);
  if (existing) {
    return existing;
  }

  const action: MutableActionStats = {
    id: actionId,
    name: actionId === 'unknown' ? '未知动作' : `动作 ${actionId}`,
    totalDamage: 0,
    minDamage: Number.POSITIVE_INFINITY,
    maxDamage: 0,
    damageEventCount: 0,
  };
  actor.actions.set(actionId, action);
  return action;
}

function finalizeRecord(record: CombatRecord): CombatRecord {
  const durationMs = record.startedAtMs !== undefined && record.endedAtMs !== undefined
    ? Math.max(0, record.endedAtMs - record.startedAtMs)
    : 0;

  return {
    ...record,
    durationMs,
  };
}

function finalizeActors(actorMap: Map<string, MutableActorStats>, record: CombatRecord): CombatActorStats[] {
  const durationSec = Math.max(record.durationMs / 1000, 1);
  const minuteWindowStart = record.endedAtMs === undefined ? undefined : record.endedAtMs - 60_000;

  return Array.from(actorMap.values())
    .map((actor) => {
      const damageInLastMinute = minuteWindowStart === undefined
        ? actor.totalDamage
        : actor.damageEvents
          .filter((item) => item.timeMs >= minuteWindowStart)
          .reduce((sum, item) => sum + item.damage, 0);
      const minuteDurationSec = Math.min(durationSec, 60);

      return {
        id: actor.id,
        name: actor.name,
        characterName: actor.characterName,
        userName: actor.userName,
        partyIndex: actor.partyIndex,
        rawActor: actor.rawActor,
        damageEvents: actor.damageEvents,
        totalDamage: actor.totalDamage,
        dps: Math.floor(actor.totalDamage / durationSec),
        rdps: null,
        dpsInLastMinute: Math.floor(damageInLastMinute / Math.max(minuteDurationSec, 1)),
        damageRate: record.totalDamage > 0 ? actor.totalDamage / record.totalDamage : 0,
        deathCount: actor.deathCount,
        actions: finalizeActions(actor, actor.totalDamage),
      } satisfies CombatActorStats;
    })
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

function finalizeActions(actor: MutableActorStats, actorTotalDamage: number): CombatActionStats[] {
  return Array.from(actor.actions.values())
    .map((action) => ({
      id: action.id,
      name: action.name,
      totalDamage: action.totalDamage,
      damageRate: actorTotalDamage > 0 ? action.totalDamage / actorTotalDamage : 0,
      minDamage: Number.isFinite(action.minDamage) ? action.minDamage : 0,
      maxDamage: action.maxDamage,
      averageDamage: action.damageEventCount > 0 ? Math.floor(action.totalDamage / action.damageEventCount) : 0,
      damageEventCount: action.damageEventCount,
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

function fallbackActorName(rawActor: unknown, actorId: string) {
  if (Array.isArray(rawActor) && typeof rawActor[0] === 'string') {
    return rawActor[3] === -1 ? `目标 ${rawActor[0]}` : `角色 ${rawActor[0]}`;
  }

  return `Actor ${actorId}`;
}
