import type { CombatActorStats, CombatRecord } from './models';

export interface DamageTimelinePoint {
  index: number;
  startOffsetMs: number;
  endOffsetMs: number;
  damage: number;
  dps: number;
}

export interface DamageBarPoint {
  id: string;
  label: string;
  damage: number;
  dps?: number;
  rate: number;
  eventCount?: number;
}

export function buildDamageTimeline(record: CombatRecord, targetBucketCount = 24): DamageTimelinePoint[] {
  if (record.damageEventCount === 0 || record.totalDamage === 0) {
    return [];
  }

  const events = record.actors.flatMap((actor) => actor.damageEvents ?? []);
  if (events.length === 0) {
    return [];
  }

  const startMs = record.startedAtMs ?? Math.min(...events.map((event) => event.timeMs));
  const endMs = record.endedAtMs ?? Math.max(...events.map((event) => event.timeMs));
  const durationMs = Math.max(endMs - startMs, record.durationMs, 1_000);
  const bucketCount = Math.max(1, Math.min(Math.ceil(durationMs / 1_000), targetBucketCount));
  const bucketDurationMs = durationMs / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, index): DamageTimelinePoint => ({
    index,
    startOffsetMs: Math.floor(index * bucketDurationMs),
    endOffsetMs: Math.floor((index + 1) * bucketDurationMs),
    damage: 0,
    dps: 0,
  }));

  for (const event of events) {
    const offsetMs = Math.max(0, event.timeMs - startMs);
    const bucketIndex = Math.min(bucketCount - 1, Math.floor(offsetMs / bucketDurationMs));
    buckets[bucketIndex].damage += event.damage;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    dps: Math.floor(bucket.damage / Math.max(bucketDurationMs / 1000, 1)),
  }));
}

export function buildActorDamageBars(record: CombatRecord): DamageBarPoint[] {
  return record.actors.map((actor) => ({
    id: actor.id,
    label: actor.name,
    damage: actor.totalDamage,
    dps: actor.dps,
    rate: record.totalDamage > 0 ? actor.totalDamage / record.totalDamage : 0,
    eventCount: actor.damageEvents?.length ?? 0,
  }));
}

export function buildActionDamageBars(actor: CombatActorStats | undefined, limit = 8): DamageBarPoint[] {
  if (!actor) {
    return [];
  }

  return actor.actions.slice(0, limit).map((action) => ({
    id: action.id,
    label: action.name,
    damage: action.totalDamage,
    rate: actor.totalDamage > 0 ? action.totalDamage / actor.totalDamage : 0,
    eventCount: action.damageEventCount,
  }));
}
