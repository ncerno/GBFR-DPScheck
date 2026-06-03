import { PlaceholderPanel } from '../../components/PlaceholderPanel';
import type { AppRuntime } from '../../app/useAppRuntime';
import { OverlayView } from './OverlayView';
import { createOverlaySnapshot } from './overlaySnapshot';

interface OverlayPageProps {
  runtime: AppRuntime;
}

export function OverlayPage({ runtime }: OverlayPageProps) {
  return (
    <PlaceholderPanel
      title="实时 Overlay"
      description="直接显示 GBFR-ACT WebSocket 推送的当前会话数据；本地 Raw Events 仅用于调试回放。"
    >
      <OverlayView snapshot={createOverlaySnapshot(runtime)} />
    </PlaceholderPanel>
  );
}
