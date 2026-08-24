import { Link, useLocation } from "react-router-dom";

import { PageIntro } from "../layout/PageIntro";
import {
  deliveryLabel,
  resolveRouteMeta,
} from "../layout/navigation";

export function AdminMenuStatusPage() {
  const location = useLocation();
  const meta = resolveRouteMeta(location.pathname);
  if (!meta) {
    return null;
  }
  return (
    <section className="page">
      <PageIntro
        kicker="Site selection"
        title={`${meta.label} 사이트 선택`}
        description="전역 활성 사이트를 두지 않으며, 명시적으로 선택한 site_id에서만 작업면을 엽니다."
        metrics={[
          {
            label: "현재 판정",
            value: deliveryLabel(meta.delivery),
            hint: "이 도메인은 이관 완료되었으며 사이트 선택이 필요합니다.",
          },
          {
            label: "legacy 근거",
            value: meta.legacySource,
          },
        ]}
      />
      <div className="settings-card">
        <h3>관리 대상 선택</h3>
        <p>{meta.description}</p>
        <Link className="primary-action" to="/sites">사이트 목록으로 이동</Link>
      </div>
    </section>
  );
}
