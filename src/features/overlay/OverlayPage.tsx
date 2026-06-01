import { PlaceholderPanel } from '../../components/PlaceholderPanel';

const mockRows = [
  { rank: 1, name: '队员 A', dps: '--', rdps: '--', damageRate: '--' },
  { rank: 2, name: '队员 B', dps: '--', rdps: '--', damageRate: '--' },
  { rank: 3, name: '队员 C', dps: '--', rdps: '--', damageRate: '--' },
  { rank: 4, name: '队员 D', dps: '--', rdps: '--', damageRate: '--' },
];

export function OverlayPage() {
  return (
    <PlaceholderPanel title="实时 Overlay" description="透明置顶实时面板占位。后续接入 GBFR-ACT 事件流后显示全队 DPS。">
      <div className="overlay-card">
        <div className="overlay-card__meta">
          <span>连接状态：未连接</span>
          <span>战斗时间：--:--</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>队员</th>
              <th>DPS</th>
              <th>rDPS</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {mockRows.map((row) => (
              <tr key={row.rank}>
                <td>{row.rank}</td>
                <td>{row.name}</td>
                <td>{row.dps}</td>
                <td>{row.rdps}</td>
                <td>{row.damageRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlaceholderPanel>
  );
}
