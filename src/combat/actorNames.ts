import type { CombatActorNameSource, CombatActorRef } from './models';

export interface CombatActorNameResult {
  name: string;
  source: CombatActorNameSource;
}

interface ResolveCombatActorNameInput {
  actor: CombatActorRef;
  actorTextMap?: Record<string, string>;
  fallbackKind: 'actor' | 'target';
}

export function resolveCombatActorName({
  actor,
  actorTextMap,
  fallbackKind,
}: ResolveCombatActorNameInput): CombatActorNameResult {
  const actorType = actor.actorType?.trim();
  const normalizedActorType = actorType?.toUpperCase();
  const mappedName = normalizedActorType ? actorTextMap?.[normalizedActorType] : undefined;

  if (mappedName) {
    return {
      name: mappedName,
      source: 'gbfr-act',
    };
  }

  if (normalizedActorType) {
    return {
      name: `${fallbackKind === 'target' ? '目标' : '角色'} ${normalizedActorType}`,
      source: 'fallback',
    };
  }

  return {
    name: fallbackKind === 'target' ? '未知目标' : '未知角色',
    source: 'fallback',
  };
}
