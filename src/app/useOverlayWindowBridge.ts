import { useEffect, useMemo, useRef } from 'react';
import type { AppRuntime } from './useAppRuntime';
import { isTauriRuntime } from '../tauri/commands';
import {
  createOverlaySnapshot,
  OVERLAY_READY_EVENT,
  OVERLAY_SNAPSHOT_EVENT,
  OVERLAY_WINDOW_LABEL,
  type OverlaySnapshot,
} from '../features/overlay/overlaySnapshot';

export function useOverlayWindowBridge(runtime: AppRuntime) {
  const snapshot = useMemo(() => createOverlaySnapshot(runtime), [runtime]);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
    void publishOverlaySnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void import('@tauri-apps/api/event').then(({ listen }) => (
      listen(OVERLAY_READY_EVENT, () => {
        void publishOverlaySnapshot(snapshotRef.current);
      })
    )).then((nextUnlisten) => {
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
  }, []);
}

async function publishOverlaySnapshot(snapshot: OverlaySnapshot) {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const { emitTo } = await import('@tauri-apps/api/event');
    await emitTo(OVERLAY_WINDOW_LABEL, OVERLAY_SNAPSHOT_EVENT, snapshot);
  } catch {
    return;
  }
}
