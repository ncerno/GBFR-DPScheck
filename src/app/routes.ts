export type AppRouteKey = 'overlay' | 'dashboard' | 'loadout' | 'settings';

export interface AppRouteItem {
  key: AppRouteKey;
  label: string;
}

export const appRoutes: AppRouteItem[] = [
  { key: 'overlay', label: '实时 Overlay' },
  { key: 'dashboard', label: '会话分析' },
  { key: 'loadout', label: '配装测试' },
  { key: 'settings', label: '设置' },
];
