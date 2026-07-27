import { useEffect, useState } from "react";

import { getRuntimeDiagnostics, type RuntimeDiagnostics } from "../../api/fleet";

export function DiagnosticsPage() {
  const [runtime, setRuntime] = useState<RuntimeDiagnostics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getRuntimeDiagnostics()
      .then((value) => active && setRuntime(value))
      .catch((caught) =>
        active &&
        setError(caught instanceof Error ? caught.message : "진단 정보를 읽지 못했습니다.")
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page" aria-labelledby="diagnostics-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">System / Diagnostics</span>
          <h2 id="diagnostics-title">서버 런타임 진단</h2>
          <p>데스크탑 DevTools와 개발 bootstrap을 제거한 서버 운영 정보입니다.</p>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <dl className="diagnostics-grid">
        <Row label="서비스" value={runtime?.service} />
        <Row label="서버 버전" value={runtime?.server_version} />
        <Row label="빌드" value={runtime?.build_revision} />
        <Row label="DB" value={runtime ? `${runtime.database_engine} / ${runtime.database_status}` : undefined} />
        <Row label="가동 시간" value={runtime ? `${runtime.uptime_seconds}초` : undefined} />
        <Row label="개발 bootstrap" value="사용 안 함" />
        <Row label="Native DevTools" value="서버 제품에서 제거됨" />
        <Row label="로그" value="systemd / 컨테이너 로그에서 확인" />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return <div><dt>{label}</dt><dd>{value ?? "확인 중"}</dd></div>;
}
