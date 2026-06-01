import { PlaceholderPanel } from '../../components/PlaceholderPanel';

export function LoadoutPage() {
  return (
    <PlaceholderPanel title="配装测试" description="配装测试记录与对比占位。第一版计划支持手动备注和多轮测试对比。">
      <form className="placeholder-form">
        <label>
          角色
          <input placeholder="例如：娜露梅" disabled />
        </label>
        <label>
          配装备注
          <textarea placeholder="例如：上限 + 追击方案 A" disabled />
        </label>
      </form>
    </PlaceholderPanel>
  );
}
