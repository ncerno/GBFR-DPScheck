export const GBFR_DPSCHECK_MANUAL_RESET_EVENT = 'gbfr_dpscheck_manual_reset';

export type GbfrActEventType =
  | 'damage'
  | 'load_party'
  | 'enter_area'
  | 'inc_death_cnt'
  | typeof GBFR_DPSCHECK_MANUAL_RESET_EVENT
  | string;

export interface GbfrActRawEvent<TData = unknown> {
  time_ms: number;
  type: GbfrActEventType;
  data: TData;
}

export interface GbfrActActorRef {
  type?: number;
  index?: number;
  id?: number;
  partyIndex?: number;
  raw: unknown;
}

export interface GbfrActDamageEventData {
  source: unknown;
  target: unknown;
  damage: number;
  flags?: number;
  action_id?: number;
  [key: string]: unknown;
}

export interface GbfrActLoadPartyEventData {
  members?: unknown[];
  [key: string]: unknown;
}

export interface GbfrActEnterAreaEventData {
  area_id?: number;
  area_name?: string;
  [key: string]: unknown;
}

export interface GbfrActDeathEventData {
  actor?: unknown;
  [key: string]: unknown;
}

export interface GbfrDpscheckManualResetEventData {
  source: 'GBFR-DPScheck';
  reason: 'manual';
}
