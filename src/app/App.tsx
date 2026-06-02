import { useMemo, useState } from 'react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LoadoutPage } from '../features/loadout/LoadoutPage';
import { OverlayPage } from '../features/overlay/OverlayPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { appRoutes, type AppRouteKey } from './routes';
import { useAppRuntime } from './useAppRuntime';

export function App() {
  const [route, setRoute] = useState<AppRouteKey>('overlay');
  const runtime = useAppRuntime();

  const currentTitle = useMemo(() => appRoutes.find((item) => item.key === route)?.label, [route]);

  const pageMap: Record<AppRouteKey, JSX.Element> = {
    overlay: <OverlayPage runtime={runtime} />,
    dashboard: <DashboardPage />,
    loadout: <LoadoutPage />,
    settings: <SettingsPage runtime={runtime} />,
  };

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
