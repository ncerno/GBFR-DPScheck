import type { CombatRecord } from './models';

export function createFallbackAreaName(index: number) {
  const normalizedIndex = Number.isFinite(index) ? Math.max(1, Math.floor(index)) : 1;
  return `地图 ${normalizedIndex}`;
}

export function formatCombatRecordAreaName(
  record: Pick<CombatRecord, 'areaName' | 'id'> | undefined,
  fallbackIndex?: number,
) {
  const explicitAreaName = record?.areaName?.trim();
  if (explicitAreaName) {
    return explicitAreaName;
  }

  return createFallbackAreaName(fallbackIndex ?? readRecordIndex(record?.id) ?? 1);
}

function readRecordIndex(recordId: string | undefined) {
  if (!recordId) {
    return undefined;
  }

  const match = /^record-(\d+)$/i.exec(recordId);
  return match ? Number(match[1]) : undefined;
}
