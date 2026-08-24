import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getAdminSystemPhpInfo, type AdminSystemPhpInfoSummary } from "../../api/fleet";

export function AdminPhpInfoPage() {
  const { siteId = "" } = useParams();
  const [info, setInfo] = useState<AdminSystemPhpInfoSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSystemPhpInfo(siteId)
      .then((value) => active && setInfo(value))
      .catch((caught) => active && setError(errorMessage(caught, "PHP 정보를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [siteId]);

  if (!siteId) return <p className="error-message">site_id가 없는 시스템 도구 경로입니다.</p>;

  return (
    <section className="page" aria-labelledby="phpinfo-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / System tools</span>
          <h2 id="phpinfo-title">PHP 런타임 요약</h2>
          <p>원격 G5의 PHP 실행 환경을 확인하되 환경변수·토큰이 포함될 수 있는 phpinfo 원문은 브라우저에 전달하지 않습니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}/admin/system-tools/browscap`}>Browscap 관리</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <aside className="sms-storage-warning" role="status">
        <strong>민감정보 차단</strong>
        <span>서버가 공급자 응답을 typed DTO로 검증한 뒤 안전한 요약 필드만 반환합니다.</span>
      </aside>
      <div className="theme-summary-grid" aria-label="PHP 런타임 요약">
        <Summary label="PHP 버전" value={info?.php_version ?? "읽는 중"} />
        <Summary label="SAPI" value={info?.sapi ?? "—"} />
        <Summary label="확장 모듈" value={info ? `${info.extension_count}개` : "—"} />
        <Summary label="php.ini" value={info ? (info.loaded_ini_configured ? "설정됨" : "없음") : "—"} />
        <Summary label="추가 ini" value={info ? (info.scanned_ini_configured ? "설정됨" : "없음") : "—"} />
        <Summary label="원문 HTML" value={info?.raw_html_withheld ? "차단됨" : "—"} />
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
