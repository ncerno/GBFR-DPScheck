import type { CombatActionNameMap } from './actionNames';

const actionNameLanguageCandidates = ['zhs', 'zh', 'zht', 'ja', 'en'];

export function parseGbfrActActionNameText(text: string): CombatActionNameMap {
  const actionsBlock = findActionsBlock(text);
  const jsonText = toJsonObjectText(actionsBlock);
  const parsed = JSON.parse(jsonText) as Record<string, Record<string, string> | string>;
  const common = readActionGroup(parsed.common);
  const actors: CombatActionNameMap['actors'] = {};

  for (const [actorType, value] of Object.entries(parsed)) {
    if (actorType === 'common') {
      continue;
    }

    const actorActions = readActionGroup(value);
    if (Object.keys(actorActions).length > 0) {
      actors[actorType.toUpperCase()] = actorActions;
    }
  }

  return {
    common: remapCommonActionKeys(common),
    actors,
  };
}

function findActionsBlock(text: string) {
  for (const language of actionNameLanguageCandidates) {
    try {
      const languageBlock = findPropertyObject(text, language);
      const gameBlock = findPropertyObject(languageBlock, 'game');
      return findPropertyObject(gameBlock, 'actions');
    } catch {
      continue;
    }
  }

  throw new Error(`未找到可用的动作名语言块：${actionNameLanguageCandidates.join(', ')}`);
}

function readActionGroup(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'desc' || key.endsWith('_desc') || typeof item !== 'string') {
      continue;
    }

    result[key] = item;
  }

  return result;
}

function remapCommonActionKeys(common: Record<string, string>) {
  return {
    '-1': common.link ?? 'Link',
    '-2': common.lb ?? '奥义',
    '-3': common.bonus ?? '追击',
    '-256': common.dot ?? '持续伤害',
    '5000': common.ether_round ?? '标准弹',
    '5010': common.charged_shot ?? '蓄能弹',
  };
}

function findPropertyObject(text: string, propertyName: string) {
  const propertyIndex = findPropertyIndex(text, propertyName);
  const objectStart = text.indexOf('{', propertyIndex);
  if (objectStart < 0) {
    throw new Error(`未找到 ${propertyName} 的对象内容。`);
  }

  const objectEnd = findMatchingBrace(text, objectStart);
  return text.slice(objectStart, objectEnd + 1);
}

function findPropertyIndex(text: string, propertyName: string) {
  const patterns = [
    new RegExp(`(^|[,{\\s])${escapeRegExp(propertyName)}\\s*:`, 'm'),
    new RegExp(`["']${escapeRegExp(propertyName)}["']\\s*:`),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      return match.index;
    }
  }

  throw new Error(`未找到 ${propertyName} 映射。`);
}

function findMatchingBrace(text: string, objectStart: number) {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = objectStart; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && nextChar === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error('动作名对象括号不完整。');
}

function toJsonObjectText(objectText: string) {
  return stripComments(objectText)
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');
}

function stripComments(text: string) {
  let result = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
        result += char;
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && nextChar === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    }
    result += char;
  }

  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

