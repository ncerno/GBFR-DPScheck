import type { GbfrActRawEvent } from '../../gbfr-act/events';

const now = Date.now();

export const mockGbfrActEvents: GbfrActRawEvent[] = [
  {
    time_ms: now,
    type: 'enter_area',
    data: {
      mock: true,
      area_name: 'Debug 木桩区域',
    },
  },
  {
    time_ms: now + 100,
    type: 'load_party',
    data: [
      ['player', 0, 1001, 0, '队员 A'],
      ['player', 1, 1002, 1, '队员 B'],
      ['player', 2, 1003, 2, '队员 C'],
      ['player', 3, 1004, 3, '队员 D'],
    ],
  },
  {
    time_ms: now + 200,
    type: 'damage',
    data: {
      source: ['player', 0, 1001, 0],
      target: ['enemy', 0, 9001, -1],
      action_id: 0x12345678,
      damage: 123456,
      flags: 0,
    },
  },
  {
    time_ms: now + 500,
    type: 'inc_death_cnt',
    data: {
      actor: ['player', 2, 1003, 2],
      death_cnt: 1,
    },
  },
];

export const mockTrainingMultiRoundEvents: GbfrActRawEvent[] = [
  {
    time_ms: now,
    type: 'enter_area',
    data: {
      mock: true,
      area_name: 'Debug 木桩区域',
    },
  },
  {
    time_ms: now + 100,
    type: 'load_party',
    data: [
      ['player', 0, 1001, 0, '队员 A'],
      ['player', 1, 1002, 1, '队员 B'],
    ],
  },
  {
    time_ms: now + 500,
    type: 'damage',
    data: {
      source: ['player', 0, 1001, 0],
      target: ['enemy', 0, 9001, -1],
      action_id: 0x12345678,
      damage: 100000,
      flags: 0,
    },
  },
  {
    time_ms: now + 2_000,
    type: 'damage',
    data: {
      source: ['player', 1, 1002, 1],
      target: ['enemy', 0, 9001, -1],
      action_id: 0x12345679,
      damage: 50000,
      flags: 0,
    },
  },
  {
    time_ms: now + 14_000,
    type: 'damage',
    data: {
      source: ['player', 0, 1001, 0],
      target: ['enemy', 0, 9001, -1],
      action_id: 0x12345678,
      damage: 130000,
      flags: 0,
    },
  },
];
