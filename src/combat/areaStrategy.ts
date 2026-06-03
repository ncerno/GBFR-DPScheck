import type { CombatAreaStrategy } from './models';

const trainingAreaKeywords = [
  '木桩',
  '训练',
  '练习',
  '修炼',
  'dummy',
  'training',
  'practice',
  'trial',
  'test',
  'dps',
  'トレーニング',
  '練習',
];

const questAreaKeywords = [
  '任务',
  '副本',
  '战斗',
  '讨伐',
  '挑战',
  'raid',
  'quest',
  'boss',
  'battle',
  'mission',
  'extreme',
  'proud',
  'maniac',
  'very hard',
  'クエスト',
  'バトル',
  'ボス',
];

export function resolveAreaStrategy(defaultStrategy: CombatAreaStrategy, areaName?: string): CombatAreaStrategy {
  if (defaultStrategy !== 'auto') {
    return defaultStrategy;
  }

  const normalizedAreaName = normalizeAreaName(areaName);
  if (!normalizedAreaName) {
    return 'quest';
  }

  if (containsAnyKeyword(normalizedAreaName, trainingAreaKeywords)) {
    return 'training';
  }

  if (containsAnyKeyword(normalizedAreaName, questAreaKeywords)) {
    return 'quest';
  }

  return 'quest';
}

function normalizeAreaName(areaName?: string) {
  return areaName?.trim().toLowerCase() ?? '';
}

function containsAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}
