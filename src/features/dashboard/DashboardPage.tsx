import { PlaceholderPanel } from '../../components/PlaceholderPanel';

export function DashboardPage() {
  return (
    <PlaceholderPanel title="战后分析" description="战斗结束后的详细分析面板占位。后续展示队伍统计、技能分析和历史记录。">
      <div className="dashboard-grid">
        <article>
          <h3>总览</h3>
          <p>总伤害、总 DPS、最近 60 秒 DPS、rDPS。</p>
        </article>
        <article>
          <h3>队伍</h3>
          <p>全队成员伤害占比、死亡次数和 DPS 曲线。</p>
        </article>
        <article>
          <h3>技能</h3>
          <p>动作伤害、占比、最大/最小/平均伤害。</p>
        </article>
      </div>
    </PlaceholderPanel>
  );
}
