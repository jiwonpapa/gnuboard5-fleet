import { useEffect, useState } from "react";

import { listAuditEntries, type AuditEntry } from "../../api/fleet";

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [siteId, setSiteId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextSiteId = siteId) {
    setLoading(true);
    setError("");
    try {
      setEntries(await listAuditEntries({ siteId: nextSiteId || undefined, limit: 100 }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "감사 기록을 읽지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void listAuditEntries({ limit: 100 })
      .then((result) => {
        if (active) setEntries(result);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "감사 기록을 읽지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page" aria-labelledby="audit-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Audit / append-only</span>
          <h2 id="audit-title">감사 기록</h2>
          <p>로그인 사용자에게 귀속된 변경 결과를 최신순으로 조회합니다.</p>
        </div>
      </div>

      <form
        className="audit-filter"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label>
          <span>site_id 선택 필터</span>
          <input
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            placeholder="비우면 전체"
          />
        </label>
        <button className="secondary-action" disabled={loading} type="submit">
          조회
        </button>
      </form>

      {error && <p className="flow-error" role="alert">{error}</p>}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>시각</th>
              <th>작업</th>
              <th>결과</th>
              <th>site_id</th>
              <th>request_id</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.audit_id}>
                <td>{entry.created_at}</td>
                <td><code>{entry.action}</code></td>
                <td><span data-outcome={entry.outcome}>{entry.outcome}</span></td>
                <td>{entry.site_id ?? "—"}</td>
                <td><code>{entry.request_id ?? "—"}</code></td>
                <td>
                  <details>
                    <summary>보기</summary>
                    <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={6}>조건에 맞는 감사 기록이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="audit-loading">감사 기록을 읽는 중입니다.</p>}
      </div>
    </section>
  );
}
