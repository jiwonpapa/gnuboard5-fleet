import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  connectorHealth,
  connectorLogin,
  deleteSite,
  getSite,
  listSites,
  updateSite,
  type ConnectorHealth,
  type Site,
} from "../../api/fleet";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";

export function SiteDashboardPage() {
  const { siteId } = useParams();
  const { session } = useAuthSession();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectorMessage, setConnectorMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const request = siteId ? getSite(siteId) : listSites();
    void request
      .then((value) => {
        if (!active) return;
        if (Array.isArray(value)) setSites(value);
        else setSite(value);
      })
      .catch((caught) =>
        active &&
        setError(caught instanceof Error ? caught.message : "사이트 정보를 읽지 못했습니다.")
      );
    return () => {
      active = false;
    };
  }, [siteId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await updateSite(
        site.site_id,
        {
          display_name: String(data.get("display_name") ?? "").trim(),
          base_url: String(data.get("base_url") ?? "").trim(),
        },
        session.csrf_token,
      );
      setSite(await getSite(site.site_id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "사이트를 수정하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!site) return;
    setBusy(true);
    setError("");
    try {
      await deleteSite(site.site_id, session.csrf_token);
      navigate("/sites", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "사이트를 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  async function checkHealth() {
    if (!site) return;
    setBusy(true);
    setError("");
    try {
      setHealth(await connectorHealth(site.site_id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "G5 API 상태를 확인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function loginToConnector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setConnectorMessage("");
    try {
      const result = await connectorLogin(
        site.site_id,
        {
          mb_id: String(data.get("mb_id") ?? "").trim(),
          mb_password: String(data.get("mb_password") ?? ""),
        },
        session.csrf_token,
      );
      if (!result.connected) throw new Error("Connector 연결 상태를 확인하지 못했습니다.");
      form.reset();
      setConnectorMessage("G5 관리자 인증을 서버에 안전하게 저장했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "G5 관리자 인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) {
    return (
      <section className="page" aria-labelledby="site-dashboard-title">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Sites / Catalog</span>
            <h2 id="site-dashboard-title">사이트 통합 관리</h2>
            <p>전역 활성 사이트 없이 각 작업 URL에 명시적인 site_id를 사용합니다.</p>
          </div>
          <Link className="primary-action" to="/sites/new">사이트 등록</Link>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <div className="workspace-section">
          <div className="section-heading">
            <h3>등록 사이트</h3>
            <span className="count">{sites.length} sites</span>
          </div>
          {sites.length ? (
            <ul className="site-list">
              {sites.map((entry) => (
                <li key={entry.site_id}>
                  <div>
                    <strong>{entry.display_name}</strong>
                    <span>{entry.base_url}</span>
                  </div>
                  <Link to={`/sites/${encodeURIComponent(entry.site_id)}`}>관리</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-row">
              <span className="empty-index">—</span>
              <div><strong>등록된 사이트가 없습니다.</strong><p>첫 사이트를 등록하십시오.</p></div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="page" aria-labelledby="site-detail-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId}</span>
          <h2 id="site-detail-title">{site?.display_name ?? "사이트 확인 중"}</h2>
          <p>이 화면의 요청은 <code>{siteId}</code> 사이트 경계에만 귀속됩니다.</p>
        </div>
        <div className="action-row">
          <Link
            to={`/sites/${encodeURIComponent(siteId)}/admin/permissions`}
          >
            관리자 권한
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/members`}>
            회원 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/points`}>
            포인트 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/groups`}>
            게시판 그룹
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/boards`}>
            게시판 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/contents`}>
            내용 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/faqs`}>
            FAQ 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/menus`}>
            메뉴 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/layouts`}>
            레이아웃 관리
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/theme`}>
            테마 설정
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/popular`}>
            인기검색어
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/visits`}>
            접속자 운영
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/reports`}>
            신고 운영
          </Link>
          <Link
            className="primary-action"
            to={`/sites/${encodeURIComponent(siteId)}/admin/config`}
          >
            기본환경설정
          </Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/remote`}>
            SSH · SFTP
          </Link>
          <button type="button" disabled={busy || !site} onClick={() => void checkHealth()}>
            G5 API 상태 확인
          </button>
        </div>
      </div>
      {health ? (
        <p className="success-message" role="status">
          Connector {health.status} · v{health.version}
        </p>
      ) : null}
      {connectorMessage ? <p className="success-message" role="status">{connectorMessage}</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {site ? (
        <div className="settings-grid">
          <form className="settings-card stacked-form" onSubmit={save}>
            <h3>사이트 설정</h3>
            <label>
              사이트 식별자
              <input value={site.site_id} readOnly />
            </label>
            <label>
              표시 이름
              <input name="display_name" defaultValue={site.display_name} required maxLength={200} />
            </label>
            <label>
              기준 주소
              <input name="base_url" type="url" defaultValue={site.base_url} required />
            </label>
            <div className="action-row">
              <button className="primary-action" disabled={busy} type="submit">변경 저장</button>
              <button className="danger-action" disabled={busy} type="button" onClick={() => setDeleteOpen(true)}>
                사이트 삭제
              </button>
            </div>
          </form>
          <form className="settings-card stacked-form" onSubmit={loginToConnector}>
            <h3>G5 Connector 로그인</h3>
            <p>G5 JWT는 서버의 암호화 저장소에만 보관되며 브라우저로 전달되지 않습니다.</p>
            <label>
              G5 관리자 아이디
              <input name="mb_id" autoComplete="off" required />
            </label>
            <label>
              G5 관리자 비밀번호
              <input name="mb_password" type="password" autoComplete="off" required />
            </label>
            <button className="primary-action" disabled={busy} type="submit">Connector 로그인</button>
          </form>
        </div>
      ) : null}
      <ConfirmActionDialog
        busy={busy}
        description="사이트와 연결된 로컬 비밀·작업 데이터가 함께 삭제됩니다. 감사 기록은 보존됩니다."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
        open={deleteOpen}
        title="사이트를 삭제하시겠습니까?"
      />
    </section>
  );
}
