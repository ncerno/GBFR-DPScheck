export interface GbfrActLoadoutTextMap {
  actors: Record<string, string>;
  weapons: Record<string, string>;
  sigils: Record<string, string>;
  skills: Record<string, string>;
  items: Record<string, string>;
  overMastery: Record<string, string>;
}

export interface RawLoadoutInfo {
  weapon?: unknown;
  sigils?: unknown;
  overMastery?: unknown;
  rawMember?: unknown;
}

export interface ResolvedLoadoutInfo {
  weapon?: ResolvedWeaponInfo;
  sigils: ResolvedSigilInfo[];
  overMastery: ResolvedOverMasteryInfo[];
}

export interface ResolvedWeaponInfo {
  id?: string;
  name: string;
  blessing?: NamedLevel;
  skills: NamedLevel[];
}

export interface ResolvedSigilInfo {
  id?: string;
  name: string;
  level?: number;
  traits: NamedLevel[];
}

export interface ResolvedOverMasteryInfo extends NamedLevel {
  id?: string;
}

export interface NamedLevel {
  id?: string;
  name: string;
  level?: number;
}

const emptyHash = '887AE0B0';

export function parseGbfrActDumpText(text: string): GbfrActLoadoutTextMap {
  const objectText = findAssignedObject(text, 'window.dump_texts');
  const parsed = JSON.parse(objectText) as Record<string, Record<string, Record<string, DumpTextEntry>>>;
  const zhs = parsed.zhs;
  if (!zhs) {
    throw new Error('GBFR-ACT dump_texts.js 缺少 zhs 文本。');
  }

  return {
    actors: keyAsText(zhs.actors),
    weapons: hashAsText(zhs.weapons),
    sigils: hashAsText(zhs.sigils),
    skills: hashAsText(zhs.skills),
    items: hashAsText(zhs.items),
    overMastery: hashAsText(zhs.over_mastery),
  };
}

export function resolveLoadoutInfo(rawLoadout: RawLoadoutInfo | undefined, textMap: GbfrActLoadoutTextMap | undefined): ResolvedLoadoutInfo | undefined {
  if (!rawLoadout) {
    return undefined;
  }

  return {
    weapon: resolveWeaponInfo(rawLoadout.weapon, textMap),
    sigils: resolveSigils(rawLoadout.sigils, textMap),
    overMastery: resolveOverMastery(rawLoadout.overMastery, textMap),
  };
}

export function summarizeResolvedLoadout(loadout: ResolvedLoadoutInfo | undefined) {
  if (!loadout) {
    return '--';
  }

  const weapon = loadout.weapon?.name;
  const sigilNames = loadout.sigils
    .slice(0, 3)
    .map((sigil) => sigil.name)
    .filter(Boolean);
  const moreSigils = loadout.sigils.length > sigilNames.length ? `等 ${loadout.sigils.length} 个因子` : '';

  return [weapon, ...sigilNames, moreSigils].filter(Boolean).join(' / ') || '--';
}

function resolveWeaponInfo(rawWeapon: unknown, textMap: GbfrActLoadoutTextMap | undefined): ResolvedWeaponInfo | undefined {
  if (!rawWeapon || typeof rawWeapon !== 'object' || Array.isArray(rawWeapon)) {
    return undefined;
  }

  const weapon = rawWeapon as Record<string, unknown>;
  const weaponId = normalizeHashId(weapon.weapon_id);
  const blessingId = normalizeHashId(weapon.bless_item);
  const skill1Id = normalizeHashId(weapon.skill1);
  const skill2Id = normalizeHashId(weapon.skill2);
  const skill3Id = normalizeHashId(weapon.skill3);

  return {
    id: weaponId,
    name: resolveName(textMap?.weapons, weaponId, '未知武器'),
    blessing: resolveNamedLevel(textMap?.items, blessingId, weapon.bless_level),
    skills: [
      resolveNamedLevel(textMap?.skills, skill1Id, weapon.skill1_lv),
      resolveNamedLevel(textMap?.skills, skill2Id, weapon.skill2_lv),
      resolveNamedLevel(textMap?.skills, skill3Id, weapon.skill3_lv),
    ].filter((item): item is NamedLevel => Boolean(item)),
  };
}

function resolveSigils(rawSigils: unknown, textMap: GbfrActLoadoutTextMap | undefined): ResolvedSigilInfo[] {
  if (!Array.isArray(rawSigils)) {
    return [];
  }

  return rawSigils
    .map<ResolvedSigilInfo | undefined>((rawSigil) => {
      if (!rawSigil || typeof rawSigil !== 'object' || Array.isArray(rawSigil)) {
        return undefined;
      }

      const sigil = rawSigil as Record<string, unknown>;
      const sigilId = normalizeHashId(sigil.sigil_id);
      if (!sigilId) {
        return undefined;
      }

      return {
        id: sigilId,
        name: resolveName(textMap?.sigils, sigilId, '未知因子'),
        level: normalizeLevel(sigil.sigil_level),
        traits: [
          resolveNamedLevel(textMap?.skills, normalizeHashId(sigil.first_trait_id), sigil.first_trait_level),
          resolveNamedLevel(textMap?.skills, normalizeHashId(sigil.second_trait_id), sigil.second_trait_level),
        ].filter((item): item is NamedLevel => Boolean(item)),
      };
    })
    .filter((item): item is ResolvedSigilInfo => item !== undefined);
}

function resolveOverMastery(rawOverMastery: unknown, textMap: GbfrActLoadoutTextMap | undefined): ResolvedOverMasteryInfo[] {
  if (!Array.isArray(rawOverMastery)) {
    return [];
  }

  return rawOverMastery
    .map<ResolvedOverMasteryInfo | undefined>((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        return undefined;
      }

      const item = rawItem as Record<string, unknown>;
      const id = normalizeHashId(item.type_id);
      if (!id) {
        return undefined;
      }

      return {
        id,
        name: resolveName(textMap?.overMastery, id, '未知突破'),
        level: normalizeLevel(item.level),
      };
    })
    .filter((item): item is ResolvedOverMasteryInfo => item !== undefined);
}

function resolveNamedLevel(texts: Record<string, string> | undefined, id: string | undefined, rawLevel: unknown): NamedLevel | undefined {
  if (!id) {
    return undefined;
  }

  return {
    id,
    name: resolveName(texts, id, '未知词条'),
    level: normalizeLevel(rawLevel),
  };
}

function resolveName(texts: Record<string, string> | undefined, id: string | undefined, fallback: string) {
  if (!id) {
    return fallback;
  }

  return texts?.[id] ?? `${fallback} ${id}`;
}

function normalizeHashId(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return numberToHex(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/^0x/i, '').toUpperCase();
    if (!normalized || normalized === emptyHash) {
      return undefined;
    }
    return normalized.padStart(8, '0');
  }

  return undefined;
}

function normalizeLevel(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function numberToHex(value: number) {
  const normalized = (value >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return normalized === emptyHash ? undefined : normalized;
}

interface DumpTextEntry {
  key: string;
  text: string;
}

function hashAsText(entries: Record<string, DumpTextEntry> | undefined) {
  const result: Record<string, string> = {};
  for (const [hash, entry] of Object.entries(entries ?? {})) {
    if (entry?.text) {
      result[hash.toUpperCase()] = entry.text;
    }
  }
  return result;
}

function keyAsText(entries: Record<string, DumpTextEntry> | undefined) {
  const result: Record<string, string> = {};
  for (const entry of Object.values(entries ?? {})) {
    if (entry?.key && entry?.text) {
      result[entry.key] = entry.text;
    }
  }
  return result;
}

function findAssignedObject(text: string, assignmentName: string) {
  const assignmentIndex = text.indexOf(assignmentName);
  if (assignmentIndex < 0) {
    throw new Error(`未找到 ${assignmentName}。`);
  }

  const objectStart = text.indexOf('{', assignmentIndex);
  if (objectStart < 0) {
    throw new Error(`未找到 ${assignmentName} 的对象内容。`);
  }

  const objectEnd = findMatchingBrace(text, objectStart);
  return text.slice(objectStart, objectEnd + 1);
}

function findMatchingBrace(text: string, objectStart: number) {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let index = objectStart; index < text.length; index += 1) {
    const char = text[index];

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

  throw new Error('文本对象括号不完整。');
}
