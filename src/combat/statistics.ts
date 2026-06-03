import type { GbfrActRawEvent } from '../gbfr-act/events';
import { resolveCombatActorName } from './actorNames';
import type {
  CombatActionStats,
  CombatActorStats,
  CombatActorRef,
  CombatPartyMember,
  CombatRecord,
  CombatTargetStats,
} from './models';
import {
  isPlayerActorRef,
  isTrackedPlayerDamageEvent,
  normalizeGbfrActEvent,
  resolveTrackedActorId,
} from './normalizer';
import type { CombatActionNameMap, CombatActionNameSource } from './actionNames';
import { resolveCombatActionName } from './actionNames';
import { explainTargetExclusion, selectDpsTargetIds } from './targetFilter';

export interface CombatStatisticsOptions {
  actionNameMap?: CombatActionNameMap;
  actorTextMap?: Record<string, string>;
}

interface MutableActionStats {
  id: string;
  name: string;
  actionId?: number;
  actorType?: string;
  nameSource: CombatActionNameSource;
  totalDamage: number;
  minDamage: number;
  maxDamage: number;
  damageEventCount: number;
  targetDamages: Map<string, MutableDamageStats>;
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
  targets: Map<string, MutableTargetStats>;
  damageEvents: Array<{ timeMs: number; damage: number; targetId?: string }>;
}

interface MutableTargetStats {
  id: string;
  name: string;
  actorType?: string;
  rawActor?: unknown;
  nameSource: CombatTargetStats['nameSource'];
  totalDamage: number;
  damageEventCount: number;
}

interface MutableDamageStats {
  totalDamage: number;
  minDamage: number;
  maxDamage: number;
  damageEventCount: number;
}

export function applyCombatEvent(
  record: CombatRecord,
  event: GbfrActRawEvent,
  options: CombatStatisticsOptions = {},
): CombatRecord {
  const normalized = normalizeGbfrActEvent(event);
  const partyMembers = normalized.type === 'load_party' && normalized.members.length > 0
    ? normalized.members
    : record.partyMembers;

  const actorMap = createActorMap(record.actors);
  const targetMap = createTargetMap(record.targets);

  let nextRecord: CombatRecord = {
    ...record,
    areaName: normalized.type === 'enter_area'
      ? normalized.areaName?.trim() || record.areaName
      : record.areaName,
    partyMembers,
    eventCount: record.eventCount + 1,
    rawEvents: [...record.rawEvents, event],
  };

  if (normalized.type === 'damage' && isTrackedPlayerDamageEvent(normalized, partyMembers)) {
    const actorId = resolveTrackedActorId(normalized.source, partyMembers);
    const actor = ensureActor(actorMap, actorId, partyMembers, normalized.source.raw);
    actor.totalDamage += normalized.damage;
    actor.damageEvents.push({ timeMs: normalized.timeMs, damage: normalized.damage, targetId: normalized.target.id });

    const action = ensureAction(actor, normalized, options);
    action.totalDamage += normalized.damage;
    action.damageEventCount += 1;
    action.minDamage = Math.min(action.minDamage, normalized.damage);
    action.maxDamage = Math.max(action.maxDamage, normalized.damage);
    applyDamageStats(ensureDamageStats(action.targetDamages, normalized.target.id), normalized.damage);

    const actorTarget = ensureTarget(actor.targets, normalized.target, options.actorTextMap);
    actorTarget.totalDamage += normalized.damage;
    actorTarget.damageEventCount += 1;

    const recordTarget = ensureTarget(targetMap, normalized.target, options.actorTextMap);
    recordTarget.totalDamage += normalized.damage;
    recordTarget.damageEventCount += 1;

    nextRecord = {
      ...nextRecord,
      startedAtMs: nextRecord.startedAtMs ?? normalized.timeMs,
      endedAtMs: normalized.timeMs,
      lastDamageAtMs: normalized.timeMs,
      damageEventCount: nextRecord.damageEventCount + 1,
      totalDamage: nextRecord.totalDamage + normalized.damage,
    };
  }

  if (normalized.type === 'inc_death_cnt' && isPlayerActorRef(normalized.actor)) {
    const actorId = resolveTrackedActorId(normalized.actor, partyMembers);
    const actor = ensureActor(actorMap, actorId, partyMembers, normalized.actor.raw);
    actor.deathCount = Math.max(actor.deathCount, normalized.deathCount);
  }

  return finalizeCombatRecord(nextRecord, actorMap, targetMap);
}

export function recalculateCombatRecord(record: CombatRecord, options: CombatStatisticsOptions = {}): CombatRecord {
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
    targets: [],
    rawEvents: [],
  };

  return record.rawEvents.reduce<CombatRecord>(
    (current, event) => applyCombatEvent(current, event, options),
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
      actionId: action.actionId,
      actorType: action.actorType,
      nameSource: action.nameSource,
      totalDamage: action.totalDamage,
      minDamage: action.minDamage,
      maxDamage: action.maxDamage,
      damageEventCount: action.damageEventCount,
      targetDamages: createActionTargetDamageMap(action),
    }])),
    targets: createTargetMap(actor.targets),
    damageEvents: actor.damageEvents ?? [],
  }]));
}

function createTargetMap(targets: CombatTargetStats[] | undefined): Map<string, MutableTargetStats> {
  return new Map((targets ?? []).map((target) => [target.id, {
    id: target.id,
    name: target.name,
    actorType: target.actorType,
      rawActor: target.rawActor,
      nameSource: target.nameSource,
      totalDamage: target.totalDamage,
      damageEventCount: target.damageEventCount,
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
    targets: new Map(),
    damageEvents: [],
  };
  actorMap.set(actorId, actor);
  return actor;
}

function ensureTarget(
  targetMap: Map<string, MutableTargetStats>,
  targetRef: CombatActorRef,
  actorTextMap?: Record<string, string>,
): MutableTargetStats {
  const existing = targetMap.get(targetRef.id);
  if (existing) {
    return existing;
  }

  const resolvedName = resolveCombatActorName({
    actor: targetRef,
    actorTextMap,
    fallbackKind: 'target',
  });
  const target: MutableTargetStats = {
    id: targetRef.id,
    name: resolvedName.name,
    actorType: targetRef.actorType,
    rawActor: targetRef.raw,
    nameSource: resolvedName.source,
    totalDamage: 0,
    damageEventCount: 0,
  };
  targetMap.set(targetRef.id, target);
  return target;
}

function ensureAction(
  actor: MutableActorStats,
  normalized: Extract<ReturnType<typeof normalizeGbfrActEvent>, { type: 'damage' }>,
  options: CombatStatisticsOptions,
): MutableActionStats {
  const existing = actor.actions.get(normalized.actionKey);
  if (existing) {
    return existing;
  }

  const resolvedName = resolveCombatActionName({
    actionKey: normalized.actionKey,
    actorType: normalized.source.actorType,
    actionNameMap: options.actionNameMap,
  });

  const action: MutableActionStats = {
    id: normalized.actionKey,
    name: resolvedName.name,
    actionId: normalized.actionId,
    actorType: normalized.source.actorType,
    nameSource: resolvedName.source,
    totalDamage: 0,
    minDamage: Number.POSITIVE_INFINITY,
    maxDamage: 0,
    damageEventCount: 0,
    targetDamages: new Map(),
  };
  actor.actions.set(normalized.actionKey, action);
  return action;
}

function finalizeCombatRecord(
  record: CombatRecord,
  actorMap: Map<string, MutableActorStats>,
  targetMap: Map<string, MutableTargetStats>,
): CombatRecord {
  const rawTargets = finalizeRawTargets(targetMap);
  const includedTargetIds = selectDpsTargetIds(rawTargets);
  const includedDamageEvents = Array.from(actorMap.values())
    .flatMap((actor) => actor.damageEvents)
    .filter((event) => event.targetId && includedTargetIds.has(event.targetId));
  const startedAtMs = includedDamageEvents.length > 0
    ? Math.min(...includedDamageEvents.map((event) => event.timeMs))
    : record.startedAtMs;
  const endedAtMs = includedDamageEvents.length > 0
    ? Math.max(...includedDamageEvents.map((event) => event.timeMs))
    : record.endedAtMs;
  const durationMs = startedAtMs !== undefined && endedAtMs !== undefined
    ? Math.max(0, endedAtMs - startedAtMs)
    : 0;
  const totalDamage = rawTargets
    .filter((target) => includedTargetIds.has(target.id))
    .reduce((sum, target) => sum + target.totalDamage, 0);
  const nextRecord: CombatRecord = {
    ...record,
    startedAtMs,
    endedAtMs,
    durationMs,
    totalDamage,
    damageEventCount: includedDamageEvents.length,
  };

  return {
    ...nextRecord,
    actors: finalizeActors(actorMap, nextRecord, includedTargetIds),
    targets: finalizeTargets(rawTargets, nextRecord.totalDamage, includedTargetIds),
  };
}

function finalizeActors(
  actorMap: Map<string, MutableActorStats>,
  record: CombatRecord,
  includedTargetIds: Set<string>,
): CombatActorStats[] {
  const durationSec = Math.max(record.durationMs / 1000, 1);
  const minuteWindowStart = record.endedAtMs === undefined ? undefined : record.endedAtMs - 60_000;

  return Array.from(actorMap.values())
    .map((actor) => {
      const includedEvents = actor.damageEvents.filter((event) => event.targetId && includedTargetIds.has(event.targetId));
      const includedTargets = finalizeTargets(
        finalizeRawTargets(actor.targets),
        includedEvents.reduce((sum, event) => sum + event.damage, 0),
        includedTargetIds,
      );
      const actorTotalDamage = includedTargets
        .filter((target) => target.includedInDps)
        .reduce((sum, target) => sum + target.totalDamage, 0);
      const damageInLastMinute = minuteWindowStart === undefined
        ? actorTotalDamage
        : includedEvents
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
        damageEvents: includedEvents,
        totalDamage: actorTotalDamage,
        dps: Math.floor(actorTotalDamage / durationSec),
        dpsInLastMinute: Math.floor(damageInLastMinute / Math.max(minuteDurationSec, 1)),
        damageRate: record.totalDamage > 0 ? actorTotalDamage / record.totalDamage : 0,
        deathCount: actor.deathCount,
        actions: finalizeActions(actor, actorTotalDamage, includedTargetIds),
        targets: includedTargets,
      } satisfies CombatActorStats;
    })
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

function finalizeRawTargets(targetMap: Map<string, MutableTargetStats>): CombatTargetStats[] {
  return Array.from(targetMap.values())
    .map((target) => ({
      id: target.id,
      name: target.name,
      actorType: target.actorType,
      rawActor: target.rawActor,
      nameSource: target.nameSource,
      includedInDps: true,
      totalDamage: target.totalDamage,
      damageRate: 0,
      damageEventCount: target.damageEventCount,
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

function finalizeTargets(
  targets: CombatTargetStats[],
  totalDamage: number,
  includedTargetIds: Set<string>,
): CombatTargetStats[] {
  return targets
    .map((target) => {
      const includedInDps = includedTargetIds.has(target.id);
      return {
        ...target,
        includedInDps,
        exclusionReason: explainTargetExclusion(target, includedTargetIds),
        damageRate: totalDamage > 0 ? target.totalDamage / totalDamage : 0,
      };
    })
    .sort((a, b) => Number(b.includedInDps) - Number(a.includedInDps) || b.totalDamage - a.totalDamage);
}

function finalizeActions(
  actor: MutableActorStats,
  actorTotalDamage: number,
  includedTargetIds: Set<string>,
): CombatActionStats[] {
  return Array.from(actor.actions.values())
    .map((action) => {
      const filteredStats = sumIncludedActionDamage(action, includedTargetIds);
      return {
        id: action.id,
        name: action.name,
        actionId: action.actionId,
        actorType: action.actorType,
        nameSource: action.nameSource,
        totalDamage: filteredStats.totalDamage,
        damageRate: actorTotalDamage > 0 ? filteredStats.totalDamage / actorTotalDamage : 0,
        minDamage: Number.isFinite(filteredStats.minDamage) ? filteredStats.minDamage : 0,
        maxDamage: filteredStats.maxDamage,
        averageDamage: filteredStats.damageEventCount > 0
          ? Math.floor(filteredStats.totalDamage / filteredStats.damageEventCount)
          : 0,
        damageEventCount: filteredStats.damageEventCount,
        targetDamages: serializeActionTargetDamages(action.targetDamages),
      };
    })
    .filter((action) => action.damageEventCount > 0)
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

function createActionTargetDamageMap(action: CombatActionStats): Map<string, MutableDamageStats> {
  if (action.targetDamages) {
    return new Map(Object.entries(action.targetDamages).map(([targetId, stats]) => [targetId, { ...stats }]));
  }

  return new Map([[
    '__legacy__',
    {
      totalDamage: action.totalDamage,
      minDamage: action.minDamage,
      maxDamage: action.maxDamage,
      damageEventCount: action.damageEventCount,
    },
  ]]);
}

function ensureDamageStats(targetDamages: Map<string, MutableDamageStats>, targetId: string) {
  const existing = targetDamages.get(targetId);
  if (existing) {
    return existing;
  }

  const next: MutableDamageStats = {
    totalDamage: 0,
    minDamage: Number.POSITIVE_INFINITY,
    maxDamage: 0,
    damageEventCount: 0,
  };
  targetDamages.set(targetId, next);
  return next;
}

function applyDamageStats(stats: MutableDamageStats, damage: number) {
  stats.totalDamage += damage;
  stats.damageEventCount += 1;
  stats.minDamage = Math.min(stats.minDamage, damage);
  stats.maxDamage = Math.max(stats.maxDamage, damage);
}

function sumIncludedActionDamage(action: MutableActionStats, includedTargetIds: Set<string>): MutableDamageStats {
  const result: MutableDamageStats = {
    totalDamage: 0,
    minDamage: Number.POSITIVE_INFINITY,
    maxDamage: 0,
    damageEventCount: 0,
  };

  for (const [targetId, stats] of action.targetDamages) {
    if (targetId !== '__legacy__' && !includedTargetIds.has(targetId)) {
      continue;
    }

    result.totalDamage += stats.totalDamage;
    result.damageEventCount += stats.damageEventCount;
    result.minDamage = Math.min(result.minDamage, stats.minDamage);
    result.maxDamage = Math.max(result.maxDamage, stats.maxDamage);
  }

  return result;
}

function serializeActionTargetDamages(targetDamages: Map<string, MutableDamageStats>) {
  return Object.fromEntries(Array.from(targetDamages.entries()).map(([targetId, stats]) => [targetId, {
    totalDamage: stats.totalDamage,
    minDamage: Number.isFinite(stats.minDamage) ? stats.minDamage : 0,
    maxDamage: stats.maxDamage,
    damageEventCount: stats.damageEventCount,
  }]));
}

function fallbackActorName(rawActor: unknown, actorId: string) {
  if (Array.isArray(rawActor) && typeof rawActor[0] === 'string') {
    return rawActor[3] === -1 ? `目标 ${rawActor[0]}` : `角色 ${rawActor[0]}`;
  }

  return `Actor ${actorId}`;
}
