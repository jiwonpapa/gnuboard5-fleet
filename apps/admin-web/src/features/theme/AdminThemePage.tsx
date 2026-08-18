import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type AdminTheme,
  type AdminThemeConfig,
  getAdminTheme,
  getAdminThemeConfig,
  listAdminThemes,
  updateAdminThemeConfig,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminThemeUpdate,
  themeConfigToDraft,
  type AdminThemeDraft,
} from "./adminThemeForm";

const emptyDraft: AdminThemeDraft = { cf_theme: "", cf_mobile_theme: "" };

export function AdminThemePage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [config, setConfig] = useState<AdminThemeConfig | null>(null);
  const [draft, setDraft] = useState<AdminThemeDraft>(emptyDraft);
  const [themes, setThemes] = useState<AdminTheme[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AdminTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([getAdminThemeConfig(siteId), listAdminThemes(siteId)])
      .then(async ([nextConfig, list]) => {
        if (!active) return;
        setConfig(nextConfig);
        setDraft(themeConfigToDraft(nextConfig));
        setThemes(list.items);
        setTotal(list.total);
        const preferred = list.items.find((item) => item.id === nextConfig.cf_theme)
          ?? list.items.find((item) => item.id === nextConfig.cf_mobile_theme)
          ?? list.items[0];
        if (preferred) {
          const detail = await getAdminTheme(siteId, preferred.id);
          if (active) setSelected(detail);
        }
      })
      .catch((caught) => active && setError(errorMessage(caught, "테마 정보를 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [siteId]);

  async function selectTheme(themeId: string) {
    setError("");
    setSelected(await getAdminTheme(siteId, themeId));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config) return;
    const update = buildAdminThemeUpdate(config, draft);
    if (!update) {
      setError("변경된 테마 설정이 없거나 테마 ID 형식이 올바르지 않습니다.");
      return;
    }
    await applyUpdate(update);
  }

  async function applySelected(target: "desktop" | "mobile" | "both") {
    if (!config || !selected) return;
    const nextDraft = {
      cf_theme: target === "mobile" ? config.cf_theme : selected.id,
      cf_mobile_theme: target === "desktop" ? config.cf_mobile_theme : selected.id,
    };
    const update = buildAdminThemeUpdate(config, nextDraft);
    if (!update) {
      setMessage("선택한 테마가 이미 적용되어 있습니다.");
      return;
    }
    await applyUpdate(update);
  }

  async function applyUpdate(update: NonNullable<ReturnType<typeof buildAdminThemeUpdate>>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateAdminThemeConfig(siteId, update, session.csrf_token);
      const [readback, list] = await Promise.all([
        getAdminThemeConfig(siteId),
        listAdminThemes(siteId),
      ]);
      setConfig(readback);
      setDraft(themeConfigToDraft(readback));
      setThemes(list.items);
      setTotal(list.total);
      if (selected) setSelected(await getAdminTheme(siteId, selected.id));
      setMessage("테마 설정을 저장하고 설정·목록·상세를 재조회했습니다.");
    } catch (caught) {
      setError(errorMessage(caught, "테마 설정을 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 테마 관리 경로입니다.</p>;

  const options = [
    { id: "", label: "사용 안 함" },
    ...themes.map((theme) => ({ id: theme.id, label: `${theme.theme_name} (${theme.id})` })),
  ];

  return (
    <section className="page theme-page" aria-labelledby="theme-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Theme</span>
          <h2 id="theme-title">테마 설정</h2>
          <p>설치 테마를 조회하고 PC·모바일 적용값을 사이트별 typed HTTP로 저장·재조회합니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="theme-summary-grid" aria-label="테마 상태 요약">
        <Summary label="설치 테마" value={`${config?.installed_count ?? total}개`} />
        <Summary label="PC 기본" value={themeLabel(themes, config?.cf_theme)} />
        <Summary label="모바일 기본" value={themeLabel(themes, config?.cf_mobile_theme)} />
      </div>

      <div className="member-workspace theme-workspace">
        <section className="member-list-panel" aria-labelledby="theme-list-title">
          <div className="workspace-panel-heading">
            <h3 id="theme-list-title">설치된 테마</h3>
            <span>{total}개</span>
          </div>
          {loading ? <p className="audit-loading">테마 목록을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "테마", render: (theme: AdminTheme) => <><strong>{theme.theme_name}</strong><small>{theme.id}</small></> },
                { header: "제작/버전", render: (theme: AdminTheme) => <><span>{theme.maker || "-"}</span><small>{theme.version || "-"}</small></> },
                { header: "상태", render: (theme: AdminTheme) => themeStatus(theme) },
              ]}
              emptyMessage="설치된 테마가 없습니다."
              getRowKey={(theme: AdminTheme) => theme.id}
              onRowClick={(theme: AdminTheme) => void selectTheme(theme.id).catch((caught) => setError(errorMessage(caught, "테마 상세를 읽지 못했습니다.")))}
              rows={themes}
              selectedKey={selected?.id ?? null}
            />
          )}
        </section>

        <div className="theme-editor-stack">
          <form className="member-editor" onSubmit={save}>
            <header><span className="eyebrow">Theme config</span><h3>현재 적용 테마</h3><p>빈 값은 테마 사용 안 함을 뜻합니다.</p></header>
            <fieldset disabled={busy || !config}>
              <legend>기본 테마</legend>
              <label>PC 기본 테마<select aria-label="PC 기본 테마" value={draft.cf_theme} onChange={(event) => setDraft({ ...draft, cf_theme: event.currentTarget.value })}>{options.map((option) => <option key={`pc-${option.id}`} value={option.id}>{option.label}</option>)}</select></label>
              <label>모바일 기본 테마<select aria-label="모바일 기본 테마" value={draft.cf_mobile_theme} onChange={(event) => setDraft({ ...draft, cf_mobile_theme: event.currentTarget.value })}>{options.map((option) => <option key={`mobile-${option.id}`} value={option.id}>{option.label}</option>)}</select></label>
            </fieldset>
            <div className="action-row">
              <button className="primary-action" type="submit" disabled={busy || !config}>저장·재조회</button>
              <button type="button" disabled={busy || !config} onClick={() => config && setDraft(themeConfigToDraft(config))}>원복</button>
            </div>
          </form>

          <section className="member-editor theme-detail" aria-labelledby="theme-detail-title">
            <header><span className="eyebrow">Theme detail</span><h3 id="theme-detail-title">{selected?.theme_name ?? "테마를 선택하십시오"}</h3><p>{selected?.detail || "선택한 테마의 메타데이터와 빠른 적용 작업을 표시합니다."}</p></header>
            {selected ? <>
              <div className="action-row">
                <button type="button" disabled={busy || selected.is_active} onClick={() => void applySelected("desktop")}>PC 적용</button>
                <button type="button" disabled={busy || selected.is_mobile_active} onClick={() => void applySelected("mobile")}>모바일 적용</button>
                <button className="primary-action" type="button" disabled={busy || (selected.is_active && selected.is_mobile_active)} onClick={() => void applySelected("both")}>둘 다 적용</button>
              </div>
              <dl className="theme-meta-grid">
                <Meta label="테마 ID" value={selected.id} />
                <Meta label="버전" value={selected.version} />
                <Meta label="제작자" value={selected.maker} />
                <Meta label="라이선스" value={selected.license} />
                <Meta label="게시판 스킨" value={selected.preview_board_skin} />
                <Meta label="모바일 스킨" value={selected.preview_mobile_board_skin} />
                <Meta label="테마 경로" value={selected.path} />
                <Meta label="설정 경로" value={selected.theme_config_path ?? "-"} />
              </dl>
            </> : null}
          </section>
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value || "-"}</dd></div>;
}

function themeLabel(themes: AdminTheme[], id = "") {
  if (!id) return "사용 안 함";
  const theme = themes.find((item) => item.id === id);
  return theme ? `${theme.theme_name} (${id})` : id;
}

function themeStatus(theme: AdminTheme) {
  const states = [theme.is_active ? "PC" : "", theme.is_mobile_active ? "모바일" : ""]
    .filter(Boolean);
  return states.length ? states.join(" · ") : "대기";
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
