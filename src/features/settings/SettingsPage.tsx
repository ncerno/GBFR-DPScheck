import { PlaceholderPanel } from '../../components/PlaceholderPanel';

export function SettingsPage() {
  return (
    <PlaceholderPanel title="设置" description="应用设置占位。后续配置 GBFR-ACT 路径、WebSocket 地址、Overlay 透明度和战斗分段规则。">
      <dl className="settings-list">
        <div>
          <dt>WebSocket</dt>
          <dd>ws://127.0.0.1:24399</dd>
        </div>
        <div>
          <dt>自动启动 GBFR-ACT</dt>
          <dd>待实现</dd>
        </div>
        <div>
          <dt>默认保留 raw events</dt>
          <dd>开启</dd>
        </div>
      </dl>
    </PlaceholderPanel>
  );
}
