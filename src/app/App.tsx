import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LoadoutPage } from '../features/loadout/LoadoutPage';
import { OverlayPage } from '../features/overlay/OverlayPage';
import { OverlayWindowPage } from '../features/overlay/OverlayWindowPage';
import { OVERLAY_CLICK_THROUGH_EVENT } from '../features/overlay/overlaySnapshot';
import { SettingsPage } from '../features/settings/SettingsPage';
import { isTauriRuntime } from '../tauri/commands';
import { appRoutes, type AppRouteKey } from './routes';
import {
  isOverlayWindowMode,
  openOverlayWindow,
  setOverlayWindowClickThrough,
} from './overlayWindow';
import { useAppRuntime } from './useAppRuntime';
import { useOverlayWindowBridge } from './useOverlayWindowBridge';

export function App() {
  return isOverlayWindowMode() ? <OverlayWindowPage /> : <MainApp />;
}

function MainApp() {
  const [route, setRoute] = useState<AppRouteKey>('overlay');
  const [overlayClickThrough, setOverlayClickThrough] = useState(false);
  const runtime = useAppRuntime();

  useOverlayWindowBridge(runtime);

  useEffect(() => {
    setOverlayClickThrough(runtime.config.overlay.click_through);
  }, [runtime.config.overlay.click_through]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void import('@tauri-apps/api/event')
      .then(({ listen }) => listen<boolean>(OVERLAY_CLICK_THROUGH_EVENT, (event) => {
        setOverlayClickThrough(event.payload);
        runtime.updateOverlayConfig('click_through', event.payload);
      }))
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }

        unlisten = nextUnlisten;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [runtime.updateOverlayConfig]);

  const currentTitle = useMemo(() => appRoutes.find((item) => item.key === route)?.label, [route]);

  const pageMap: Record<AppRouteKey, JSX.Element> = {
    overlay: <OverlayPage runtime={runtime} />,
    dashboard: <DashboardPage runtime={runtime} />,
    loadout: <LoadoutPage runtime={runtime} />,
    settings: <SettingsPage runtime={runtime} />,
  };

  const handleOpenOverlayWindow = useCallback(async () => {
    try {
      await openOverlayWindow(runtime.config);
      runtime.setOperationMessage('Overlay 独立窗口已打开。');
    } catch (error) {
      runtime.setOperationMessage(`打开 Overlay 独立窗口失败：${errorToMessage(error)}`);
    }
  }, [runtime]);

  const handleToggleClickThrough = useCallback(async () => {
    const nextClickThrough = !overlayClickThrough;
    setOverlayClickThrough(nextClickThrough);
    runtime.updateOverlayConfig('click_through', nextClickThrough);

    try {
      await setOverlayWindowClickThrough(nextClickThrough);
      runtime.setOperationMessage(nextClickThrough ? 'Overlay 独立窗口已启用鼠标穿透。' : 'Overlay 独立窗口已关闭鼠标穿透。');
    } catch (error) {
      setOverlayClickThrough(overlayClickThrough);
      runtime.updateOverlayConfig('click_through', overlayClickThrough);
      runtime.setOperationMessage(`设置 Overlay 鼠标穿透失败：${errorToMessage(error)}`);
    }
  }, [overlayClickThrough, runtime]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>GBFR-DPScheck</h1>
          <p>{currentTitle}</p>
        </div>
        <div className="app-header__actions">
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
          <div className="overlay-window-actions">
            <button type="button" onClick={() => void handleOpenOverlayWindow()}>
              打开 Overlay 窗口
            </button>
            <button type="button" onClick={() => void handleToggleClickThrough()}>
              {overlayClickThrough ? '关闭鼠标穿透' : '开启鼠标穿透'}
            </button>
          </div>
        </div>
      </header>
      {pageMap[route]}
    </main>
  );
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
