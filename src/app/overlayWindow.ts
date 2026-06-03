import type { AppConfig } from '../config/appConfig';
import { OVERLAY_CLICK_THROUGH_EVENT, OVERLAY_WINDOW_LABEL } from '../features/overlay/overlaySnapshot';
import { callTauriCommand, isTauriRuntime } from '../tauri/commands';

const OVERLAY_WINDOW_URL = 'index.html?window=overlay';
const DEFAULT_OVERLAY_WIDTH = 420;
const DEFAULT_OVERLAY_HEIGHT = 260;

export function isOverlayWindowMode() {
  return new URLSearchParams(window.location.search).get('window') === 'overlay';
}

export async function openOverlayWindow(config: AppConfig) {
  ensureTauriRuntime();

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const existing = await WebviewWindow.getByLabel(OVERLAY_WINDOW_LABEL);
  if (existing) {
    await existing.show();
    await existing.setAlwaysOnTop(config.overlay.always_on_top);
    await existing.setIgnoreCursorEvents(config.overlay.click_through);
    await existing.setFocus();
    return;
  }

  const options = {
    url: OVERLAY_WINDOW_URL,
    title: 'GBFR-DPScheck Overlay',
    width: config.overlay.window_width ?? DEFAULT_OVERLAY_WIDTH,
    height: config.overlay.window_height ?? DEFAULT_OVERLAY_HEIGHT,
    minWidth: 320,
    minHeight: 180,
    transparent: true,
    decorations: false,
    alwaysOnTop: config.overlay.always_on_top,
    skipTaskbar: true,
    resizable: true,
    shadow: false,
    focus: true,
  };

  if (typeof config.overlay.window_x === 'number' && typeof config.overlay.window_y === 'number') {
    Object.assign(options, {
      x: config.overlay.window_x,
      y: config.overlay.window_y,
    });
  } else {
    Object.assign(options, { center: true });
  }

  await new Promise<void>((resolve, reject) => {
    const overlayWindow = new WebviewWindow(OVERLAY_WINDOW_LABEL, options);
    void overlayWindow.once('tauri://created', () => {
      void overlayWindow
        .setIgnoreCursorEvents(config.overlay.click_through)
        .then(() => overlayWindow.show())
        .then(() => overlayWindow.setFocus())
        .then(resolve)
        .catch(reject);
    }).catch(reject);
    void overlayWindow.once('tauri://error', (event) => {
      reject(new Error(`创建 Overlay 窗口失败：${String(event.payload)}`));
    }).catch(reject);
  });
}

export async function setOverlayWindowClickThrough(enabled: boolean) {
  ensureTauriRuntime();

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const { emitTo } = await import('@tauri-apps/api/event');
  const overlayWindow = await WebviewWindow.getByLabel(OVERLAY_WINDOW_LABEL);
  if (!overlayWindow) {
    throw new Error('Overlay 独立窗口尚未打开');
  }

  await overlayWindow.setIgnoreCursorEvents(enabled);
  await emitTo(OVERLAY_WINDOW_LABEL, OVERLAY_CLICK_THROUGH_EVENT, enabled);
  await saveOverlayConfigPatch({ click_through: enabled });
}

export async function closeCurrentWindow() {
  ensureTauriRuntime();

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().close();
}

export async function dragCurrentWindow() {
  ensureTauriRuntime();

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().startDragging();
}

export async function configureCurrentOverlayWindow(config: Pick<AppConfig['overlay'], 'always_on_top' | 'click_through'>) {
  ensureTauriRuntime();

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const currentWindow = getCurrentWindow();
  const currentWebviewWindow = WebviewWindow.getCurrent();

  await Promise.allSettled([
    currentWindow.setDecorations(false),
    currentWindow.setAlwaysOnTop(config.always_on_top),
    currentWindow.setSkipTaskbar(true),
    currentWindow.setShadow(false),
    currentWindow.setIgnoreCursorEvents(config.click_through),
    currentWebviewWindow.setBackgroundColor([0, 0, 0, 0]),
  ]);
}

export async function installOverlayWindowBoundsPersistence() {
  ensureTauriRuntime();

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const currentWindow = getCurrentWindow();
  let saveTimer: number | undefined;

  const scheduleSave = () => {
    if (saveTimer !== undefined) {
      window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(() => {
      void saveCurrentOverlayWindowBounds();
    }, 500);
  };

  const unlistenResize = await currentWindow.onResized(scheduleSave);
  const unlistenMove = await currentWindow.onMoved(scheduleSave);

  return () => {
    if (saveTimer !== undefined) {
      window.clearTimeout(saveTimer);
    }

    unlistenResize();
    unlistenMove();
  };
}

export async function saveOverlayConfigPatch(patch: Partial<AppConfig['overlay']>) {
  const config = await callTauriCommand<AppConfig>('get_app_config');
  const nextConfig: AppConfig = {
    ...config,
    overlay: {
      ...config.overlay,
      ...patch,
    },
  };

  await callTauriCommand<void>('save_app_config', { config: nextConfig });
}

async function saveCurrentOverlayWindowBounds() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const currentWindow = getCurrentWindow();
  const [config, position, size, scaleFactor] = await Promise.all([
    callTauriCommand<AppConfig>('get_app_config'),
    currentWindow.outerPosition(),
    currentWindow.innerSize(),
    currentWindow.scaleFactor(),
  ]);

  const nextConfig: AppConfig = {
    ...config,
    overlay: {
      ...config.overlay,
      window_x: Math.round(position.x / scaleFactor),
      window_y: Math.round(position.y / scaleFactor),
      window_width: Math.round(size.width / scaleFactor),
      window_height: Math.round(size.height / scaleFactor),
    },
  };

  await callTauriCommand<void>('save_app_config', { config: nextConfig });
}

function ensureTauriRuntime() {
  if (!isTauriRuntime()) {
    throw new Error('当前不在 Tauri 环境中');
  }
}
