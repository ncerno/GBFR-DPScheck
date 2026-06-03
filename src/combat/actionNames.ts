export type CombatActionNameSource = 'gbfr-act' | 'common' | 'fallback';

export interface CombatActionNameMap {
  common: Record<string, string>;
  actors: Record<string, Record<string, string>>;
}

export interface CombatActionNameResult {
  name: string;
  source: CombatActionNameSource;
}

interface ResolveCombatActionNameInput {
  actionKey: string;
  actorType?: string;
  actionNameMap?: CombatActionNameMap;
}

const builtInCommonActionNames: Record<string, string> = {
  '-1': 'Link',
  '-2': '奥义',
  '-3': '追击',
  '-256': '持续伤害',
  '5000': '标准弹',
  '5010': '蓄能弹',
};

export function resolveCombatActionName({
  actionKey,
  actorType,
  actionNameMap,
}: ResolveCombatActionNameInput): CombatActionNameResult {
  const normalizedActorType = actorType?.toUpperCase();
  const mappedByActor = normalizedActorType ? actionNameMap?.actors[normalizedActorType]?.[actionKey] : undefined;
  if (mappedByActor) {
    return {
      name: mappedByActor,
      source: 'gbfr-act',
    };
  }

  const mappedCommon = actionNameMap?.common[actionKey] ?? builtInCommonActionNames[actionKey];
  if (mappedCommon) {
    return {
      name: mappedCommon,
      source: actionNameMap?.common[actionKey] ? 'gbfr-act' : 'common',
    };
  }

  return {
    name: actionKey === 'unknown' ? '未知动作' : `${normalizedActorType ? `${normalizedActorType} ` : ''}动作 ${actionKey}`,
    source: 'fallback',
  };
}

