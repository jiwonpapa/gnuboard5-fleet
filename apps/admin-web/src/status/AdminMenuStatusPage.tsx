import { useLocation } from "react-router-dom";

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
        kicker="Migration status"
        title={`${meta.label} 작업면 준비 상태`}
        description={meta.description}
        metrics={[
          {
            label: "현재 판정",
            value: deliveryLabel(meta.delivery),
            hint: "해당 R 배치의 gate가 닫혀야 활성화됩니다.",
          },
          {
            label: "legacy 근거",
            value: meta.legacySource,
          },
        ]}
      />
      <div className="status-grid">
        <article>
          <h3>현재 상태</h3>
          <p>
            범용 JSON console을 완료 화면으로 사용하지 않습니다. 이 도메인의
            typed DTO, 서버 route, 기존 업무 화면과 readback이 모두 닫힐 때
            실제 작업면으로 교체합니다.
          </p>
        </article>
        <article>
          <h3>완료 조건</h3>
          <p>
            OpenAPI 분모, legacy page·command·test 분모와 전역 잔여 finding을
            함께 공개합니다.
          </p>
        </article>
      </div>
    </section>
  );
}
