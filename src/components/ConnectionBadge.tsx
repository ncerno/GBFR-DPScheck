import type { GbfrActConnectionStatus } from '../gbfr-act/connection';

const statusText: Record<GbfrActConnectionStatus, string> = {
  idle: '未连接',
  connecting: '连接中',
  connected: '已连接',
  disconnected: '已断开',
  error: '连接错误',
};

interface ConnectionBadgeProps {
  status: GbfrActConnectionStatus;
  error?: string;
}

export function ConnectionBadge({ status, error }: ConnectionBadgeProps) {
  return (
    <span className={`connection-badge connection-badge--${status}`} title={error}>
      {statusText[status]}
    </span>
  );
}
