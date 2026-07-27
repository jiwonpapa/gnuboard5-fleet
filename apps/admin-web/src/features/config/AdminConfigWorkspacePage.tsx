import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminConfig,
  getAdminDashboard,
  getAdminFieldSchema,
  listAdminFieldSchemas,
  updateAdminConfig,
  type AdminConfig,
  type AdminDashboardData,
  type AdminFieldSchema,
  type AdminSchemaCatalog,
  type AdminSchemaDetail,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminConfigUpdate,
  checkedConfigValue,
  hydrateAdminConfig,
  validateAdminConfigValues,
  validateAdminFieldSchema,
} from "./adminConfigForm";

export function AdminConfigWorkspacePage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [catalog, setCatalog] = useState<AdminSchemaCatalog | null>(null);
  const [schema, setSchema] = useState<AdminSchemaDetail | null>(null);
  const [baseline, setBaseline] = useState<AdminConfig>({});
  const [values, setValues] = useState<AdminConfig>({});
  const [activeSection, setActiveSection] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        setLoading(true);
        setError("");
      }
    });
    void Promise.all([
      getAdminDashboard(siteId, 5),
      getAdminConfig(siteId),
      listAdminFieldSchemas(siteId),
      getAdminFieldSchema(siteId, "config"),
    ])
      .then(([nextDashboard, config, nextCatalog, rawSchema]) => {
        if (!active) return;
        const nextSchema = validateAdminFieldSchema("config", rawSchema);
        const hydrated = hydrateAdminConfig(config, nextSchema);
        setDashboard(nextDashboard);
        setCatalog(nextCatalog);
        setSchema(nextSchema);
        setBaseline(hydrated);
        setValues(hydrated);
        setActiveSection(nextSchema.sections[0]?.key ?? "");
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "관리자 설정을 읽지 못했습니다.");
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [siteId]);

  const update = useMemo(
    () => buildAdminConfigUpdate(values, baseline),
    [baseline, values],
  );
  const changedCount = Object.keys(update).length;
  const currentSection = schema?.sections.find((section) => section.key === activeSection) ??
    schema?.sections[0] ??
    null;

  function setField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schema || changedCount === 0) return;
    const nextErrors = validateAdminConfigValues(values, schema);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      const section = schema.sections.find((entry) =>
        entry.fields.some((field) => field.name === firstInvalid)
      );
      if (section) setActiveSection(section.key);
      requestAnimationFrame(() => document.getElementsByName(firstInvalid)[0]?.focus());
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateAdminConfig(siteId, update, session.csrf_token);
      const readback = hydrateAdminConfig(await getAdminConfig(siteId), schema);
      for (const [name, expected] of Object.entries(update)) {
        if (readback[name] !== String(expected)) {
          throw new Error(`${name} 저장 후 재조회 값이 일치하지 않습니다.`);
        }
      }
      setBaseline(readback);
      setValues(readback);
      setMessage(`${Object.keys(update).length}개 설정을 저장하고 재조회했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "관리자 설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!siteId) {
    return <p className="error-message" role="alert">site_id가 없는 관리자 경로입니다.</p>;
  }

  return (
    <section className="page admin-config-page" aria-labelledby="admin-config-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Admin</span>
          <h2 id="admin-config-title">기본환경설정</h2>
          <p>G5 필드 스키마를 기준으로 변경된 값만 저장하고 즉시 재조회합니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>

      {dashboard ? <AdminOperationsStrip dashboard={dashboard} /> : null}
      {loading ? <p className="audit-loading" role="status">설정과 필드 계약을 확인 중입니다.</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      {!loading && schema && currentSection ? (
        <form className="admin-config-workspace" onSubmit={save}>
          <aside className="admin-config-index" aria-label="설정 섹션">
            <span className="eyebrow">Schema sections</span>
            <strong>{schema.title}</strong>
            <nav>
              {schema.sections.map((section) => (
                <button
                  aria-current={section.key === currentSection.key ? "page" : undefined}
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  type="button"
                >
                  <span>{section.label}</span>
                  <small>{section.fields.length}</small>
                </button>
              ))}
            </nav>
            <dl>
              <div><dt>계약 필드</dt><dd>{schema.field_count}</dd></div>
              <div><dt>스키마 도메인</dt><dd>{schema.domain}</dd></div>
              <div><dt>등록 도메인</dt><dd>{catalog?.total ?? 0}</dd></div>
            </dl>
          </aside>

          <div className="admin-config-editor">
            <header>
              <div>
                <span className="eyebrow">{currentSection.key}</span>
                <h3>{currentSection.label}</h3>
                {currentSection.description ? <p>{currentSection.description}</p> : null}
              </div>
              <span className="admin-change-count">{changedCount} changed</span>
            </header>
            <div className="admin-config-fields">
              {currentSection.fields.map((field) => (
                <AdminConfigField
                  error={errors[field.name]}
                  field={field}
                  key={field.name}
                  onChange={(value) => setField(field.name, value)}
                  value={values[field.name] ?? ""}
                />
              ))}
            </div>
            <footer className="admin-config-actions">
              <div>
                <strong>{changedCount ? `${changedCount}개 변경 대기` : "서버 값과 일치"}</strong>
                <span>저장 요청에는 변경된 필드만 포함됩니다.</span>
              </div>
              <button
                disabled={!changedCount || saving}
                onClick={() => {
                  setValues(baseline);
                  setErrors({});
                }}
                type="button"
              >
                변경 취소
              </button>
              <button
                className="primary-action"
                disabled={!changedCount || saving || !session.step_up_active}
                type="submit"
              >
                {saving ? "저장·재조회 중" : "설정 저장"}
              </button>
            </footer>
            {!session.step_up_active ? (
              <p className="admin-step-up-note">저장하려면 보안 설정에서 최근 본인 확인을 완료해야 합니다.</p>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}

function AdminOperationsStrip({ dashboard }: { dashboard: AdminDashboardData }) {
  const summary = dashboard.summary;
  return (
    <dl className="admin-operations-strip" aria-label="선택 사이트 운영 요약">
      <div><dt>회원</dt><dd>{summary?.members?.total_members ?? "—"}</dd></div>
      <div><dt>게시물</dt><dd>{summary?.posts?.total_rows ?? "—"}</dd></div>
      <div><dt>포인트 기록</dt><dd>{summary?.points?.total_rows ?? "—"}</dd></div>
      <div><dt>누적 방문</dt><dd>{summary?.visits?.total_visits ?? "—"}</dd></div>
    </dl>
  );
}

function AdminConfigField(props: {
  error?: string;
  field: AdminFieldSchema;
  onChange: (value: string) => void;
  value: string;
}) {
  const { field } = props;
  if (field.input_type === "hidden") return null;
  const describedBy = `${field.name}-help ${field.name}-error`;
  const common = {
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(props.error),
    disabled: field.readonly_on_update,
    name: field.name,
    required: field.required,
  };

  let control;
  if (field.input_type === "checkbox") {
    control = (
      <input
        {...common}
        checked={checkedConfigValue(props.value)}
        onChange={(event) => props.onChange(event.currentTarget.checked ? "1" : "0")}
        type="checkbox"
      />
    );
  } else if (field.input_type === "textarea") {
    control = (
      <textarea
        {...common}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        rows={5}
        value={props.value}
      />
    );
  } else if (field.input_type === "select" || field.input_type === "radio") {
    control = (
      <select
        {...common}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      >
        {!field.required ? <option value="">선택 안 함</option> : null}
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  } else if (field.input_type === "file") {
    control = <p className="admin-file-boundary">파일 설정은 해당 도메인 전용 업로드 화면에서 관리합니다.</p>;
  } else {
    control = (
      <input
        {...common}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        type={field.input_type === "number" ? "number" : field.input_type}
        value={props.value}
      />
    );
  }

  return (
    <label className="admin-config-field" data-error={Boolean(props.error)}>
      <span>
        {field.label}
        {field.required ? <em>필수</em> : null}
      </span>
      {control}
      <small id={`${field.name}-help`}>{field.description ?? field.name}</small>
      {props.error ? <strong id={`${field.name}-error`} role="alert">{props.error}</strong> : null}
    </label>
  );
}
