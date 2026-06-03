import { useCallback, useEffect, useState } from 'react';
import {
  closeCurrentWindow,
  configureCurrentOverlayWindow,
  dragCurrentWindow,
  installOverlayWindowBoundsPersistence,
  saveOverlayConfigPatch,
} from '../../app/overlayWindow';
import { callTauriCommand, isTauriRuntime } from '../../tauri/commands';
import type { AppConfig } from '../../config/appConfig';
import { OverlayView } from './OverlayView';
import {
  createEmptyOverlaySnapshot,
  OVERLAY_CLICK_THROUGH_EVENT,
  OVERLAY_READY_EVENT,
  OVERLAY_SNAPSHOT_EVENT,
  type OverlaySnapshot,
} from './overlaySnapshot';

export function OverlayWindowPage() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(() => createEmptyOverlaySnapshot());
  const [clickThrough, setClickThrough] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('overlay-window-html');
    document.body.classList.add('overlay-window-body');
    return () => {
      document.documentElement.classList.remove('overlay-window-html');
      document.body.classList.remove('overlay-window-body');
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined;
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];
    const addCleanup = (cleanup: () => void) => {
      if (disposed) {
        cleanup();
        return;
      }

      cleanups.push(cleanup);
    };

    void setupOverlayWindow(addCleanup, {
      onSnapshot: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setClickThrough(nextSnapshot.config.clickThrough);
        void configureCurrentOverlayWindow({
          always_on_top: nextSnapshot.config.alwaysOnTop,
          click_through: nextSnapshot.config.clickThrough,
        });
      },
      onClickThrough: setClickThrough,
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
    };
  }, []);

  const handleToggleClickThrough = useCallback(async (enabled: boolean) => {
    const previous = clickThrough;
    setClickThrough(enabled);

    if (!isTauriRuntime()) {
      return;
    }

    let currentWindow: Awaited<ReturnType<typeof import('@tauri-apps/api/window')['getCurrentWindow']>> | undefined;

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { emit } = await import('@tauri-apps/api/event');
      currentWindow = getCurrentWindow();
      await currentWindow.setIgnoreCursorEvents(enabled);
      await saveOverlayConfigPatch({ click_through: enabled });
      await emit(OVERLAY_CLICK_THROUGH_EVENT, enabled);
    } catch {
      setClickThrough(previous);
      await currentWindow?.setIgnoreCursorEvents(previous).catch(() => undefined);
    }
  }, [clickThrough]);

  return (
    <main className="overlay-window-shell">
      <OverlayView
        snapshot={snapshot}
        variant="window"
        clickThrough={clickThrough}
        onClose={() => void closeCurrentWindow()}
        onStartDrag={() => void dragCurrentWindow()}
        onToggleClickThrough={(enabled) => void handleToggleClickThrough(enabled)}
      />
    </main>
  );
}

async function setupOverlayWindow(
  addCleanup: (cleanup: () => void) => void,
  handlers: {
    onSnapshot: (snapshot: OverlaySnapshot) => void;
    onClickThrough: (enabled: boolean) => void;
  },
) {
  const config = await callTauriCommand<AppConfig>('get_app_config');
  handlers.onClickThrough(config.overlay.click_through);
  await configureCurrentOverlayWindow(config.overlay);

  const cleanupBounds = await installOverlayWindowBoundsPersistence();
  addCleanup(cleanupBounds);

  const { emit, listen } = await import('@tauri-apps/api/event');
  addCleanup(await listen<OverlaySnapshot>(OVERLAY_SNAPSHOT_EVENT, (event) => {
    handlers.onSnapshot(event.payload);
  }));
  addCleanup(await listen<boolean>(OVERLAY_CLICK_THROUGH_EVENT, (event) => {
    handlers.onClickThrough(event.payload);
  }));
  await emit(OVERLAY_READY_EVENT);
}
