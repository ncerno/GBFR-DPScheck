import type { CombatTargetStats } from './models';

const secondaryTargetKeywords = [
  'SHOT',
  'AREA',
  'CIRCLE',
  'CRYSTAL',
  'ORB',
  'TRAP',
  'FIELD',
  'DAMAGE',
  'GOPHERWOOD',
];

const dpsTargetShareThreshold = 0.15;

export function selectDpsTargetIds(targets: CombatTargetStats[]) {
  const eligibleTargets = targets.filter((target) => isEligibleDpsTarget(target));
  const candidateTargets = eligibleTargets.length > 0 ? eligibleTargets : targets;
  const topDamage = Math.max(...candidateTargets.map((target) => target.totalDamage), 0);

  if (topDamage <= 0) {
    return new Set<string>();
  }

  return new Set(candidateTargets
    .filter((target) => target.totalDamage >= topDamage * dpsTargetShareThreshold)
    .map((target) => target.id));
}

export function explainTargetExclusion(target: CombatTargetStats, includedTargetIds: Set<string>) {
  if (includedTargetIds.has(target.id)) {
    return undefined;
  }

  if (!isEligibleDpsTarget(target)) {
    return '机制/投射物目标';
  }

  return '小怪/次要目标';
}

function isEligibleDpsTarget(target: Pick<CombatTargetStats, 'actorType'>) {
  const actorType = target.actorType?.trim().toUpperCase();
  if (!actorType) {
    return true;
  }

  if (actorType.startsWith('PL')) {
    return false;
  }

  if (secondaryTargetKeywords.some((keyword) => actorType.includes(keyword))) {
    return false;
  }

  if (actorType.startsWith('WE')) {
    return false;
  }

  return true;
}
