import type { GbfrActRawEvent } from '../gbfr-act/events';
import type { CombatRecord } from '../combat/models';

export interface AppStorageAdapter {
  saveRawEvent(event: GbfrActRawEvent): Promise<void>;
  saveCombatSummary(record: CombatRecord): Promise<void>;
}

export class NoopStorageAdapter implements AppStorageAdapter {
  async saveRawEvent(_event: GbfrActRawEvent) {
    // 框架阶段先不落盘。
  }

  async saveCombatSummary(_record: CombatRecord) {
    // 框架阶段先不落盘。
  }
}
