import { useMemo, useState } from 'react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LoadoutPage } from '../features/loadout/LoadoutPage';
import { OverlayPage } from '../features/overlay/OverlayPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { appRoutes, type AppRouteKey } from './routes';

const pageMap: Record<AppRouteKey, JSX.Element> = {
  overlay: <OverlayPage />,
  dashboard: <DashboardPage />,
  loadout: <LoadoutPage />,
  settings: <SettingsPage />,
};

export function App() {
  const [route, setRoute] = useState<AppRouteKey>('overlay');

  const currentTitle = useMemo(() => appRoutes.find((item) => item.key === route)?.label, [route]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>GBFR-DPScheck</h1>
          <p>{currentTitle}</p>
        </div>
        <nav className="app-nav" aria-label="主导航">
          {appRoutes.map((item) => (
            <button
              key={item.key}
              className={item.key === route ? 'active' : ''}
              type="button"
              onClick={() => setRoute(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      {pageMap[route]}
    </main>
  );
}
