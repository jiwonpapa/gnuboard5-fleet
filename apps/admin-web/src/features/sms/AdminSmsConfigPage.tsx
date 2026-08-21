import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminSmsConfig,
  syncAdminSmsMembers,
  updateAdminSmsConfig,
  type AdminSmsConfig,
  type AdminSmsMemberSyncResult,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminSmsConfigUpdate,
  emptyAdminSmsConfigDraft,
  smsConfigToDraft,
  validateAdminSmsConfigDraft,
  type AdminSmsConfigDraft,
} from "./adminSmsConfigForm";

export function AdminSmsConfigPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [config, setConfig] = useState<AdminSmsConfig | null>(null);
  const [draft, setDraft] = useState<AdminSmsConfigDraft>(emptyAdminSmsConfigDraft);
  const [latestSync, setLatestSync] = useState<AdminSmsMemberSyncResult | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const next = await getAdminSmsConfig(siteId);
    setConfig(next);
    setDraft(smsConfigToDraft(next));
    return next;
  }, [siteId]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The async site-scoped read hydrates state only after the request resolves.
    void refresh()
      .catch((caught) => active && setError(errorMessage(caught, "SMS 설정을 읽지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [refresh]);

  const update = useMemo(
    () => config ? buildAdminSmsConfigUpdate(config, draft) : null,
    [config, draft],
  );
  const validationError = validateAdminSmsConfigDraft(draft);
  const writeDisabled = busy || !session.step_up_active;
  const syncDisabled = writeDisabled || config?.cf_sms_use !== "icode" || !config.storage_ready;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config || !update) {
      setError(validationError ?? "저장할 변경 내용이 없습니다.");
      return;
    }
    await run(async () => {
      await updateAdminSmsConfig(siteId, update, session.csrf_token);
      await refresh();
      setMessage(`${Object.keys(update).length}개 SMS 설정을 저장하고 서버 값을 재조회했습니다.`);
    });
  }

  async function syncMembers() {
    await run(async () => {
      const result = await syncAdminSmsMembers(siteId, session.csrf_token);
      setLatestSync(result);
      setSyncOpen(false);
      await refresh();
      setMessage(`회원 ${result.summary.total_members.toLocaleString()}건을 동기화하고 설정을 재조회했습니다.`);
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(errorMessage(caught, "SMS 작업에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 SMS 설정 경로입니다.</p>;

  return (
    <section className="page sms-config-page" aria-labelledby="sms-config-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / SMS</span>
          <h2 id="sms-config-title">SMS 기본설정</h2>
          <p>공급자 연결과 회신번호를 관리하고 회원 연락처를 사이트별 SMS 저장소와 동기화합니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {!session.step_up_active ? <p className="admin-step-up-note">설정 변경과 회원 동기화에는 최근 재인증이 필요합니다.</p> : null}

      <div className="theme-summary-grid sms-summary-grid" aria-label="SMS 상태 요약">
        <Summary label="Provider" value={config?.provider_ready ? "준비됨" : "확인 필요"} ready={config?.provider_ready} />
        <Summary label="Storage" value={config?.storage_ready ? "정상" : "미구성"} ready={config?.storage_ready} />
        <Summary label="인증 방식" value={authMode(config)} ready={Boolean(config?.uses_token_key || config?.uses_legacy_credentials)} />
        <Summary label="최근 갱신" value={config?.cf_datetime || "기록 없음"} />
      </div>

      {config && !config.storage_ready ? (
        <aside className="sms-storage-warning" role="status">
          <strong>SMS 저장소 구성이 필요합니다.</strong>
          <span>{config.missing_tables.length ? `누락 테이블: ${config.missing_tables.join(", ")}` : "공급자 플러그인의 저장소 상태를 확인하십시오."}</span>
        </aside>
      ) : null}

      <div className="sms-config-workspace">
        <form className="member-editor sms-provider-editor" onSubmit={save}>
          <header>
            <span className="eyebrow">Provider boundary</span>
            <h3>공급자 연결</h3>
            <p>조회 가능한 상태와 교체용 비밀 입력을 분리합니다. 저장 시 변경 필드만 전송합니다.</p>
          </header>
          <fieldset disabled={writeDisabled}>
            <div className="sms-field-grid">
              <SelectField label="SMS 사용" value={draft.cf_sms_use} onChange={(value) => patchDraft(setDraft, "cf_sms_use", value as AdminSmsConfigDraft["cf_sms_use"])}>
                <option value="">사용 안 함</option><option value="icode">icode</option>
              </SelectField>
              <SelectField label="전송 타입" value={draft.cf_sms_type} onChange={(value) => patchDraft(setDraft, "cf_sms_type", value as AdminSmsConfigDraft["cf_sms_type"])}>
                <option value="">기본 SMS</option><option value="LMS">LMS</option>
              </SelectField>
              <TextField label="icode ID" value={draft.cf_icode_id} placeholder="icode-user" onChange={(value) => patchDraft(setDraft, "cf_icode_id", value)} />
              <TextField label="서버 IP" value={draft.cf_icode_server_ip} placeholder="121.78.96.124" onChange={(value) => patchDraft(setDraft, "cf_icode_server_ip", value)} />
              <TextField label="서버 포트" value={draft.cf_icode_server_port} inputMode="numeric" placeholder="7295" onChange={(value) => patchDraft(setDraft, "cf_icode_server_port", value)} />
              <TextField label="회신번호" value={draft.cf_phone} inputMode="tel" placeholder="02-1234-5678" onChange={(value) => patchDraft(setDraft, "cf_phone", value)} />
              <TextField label="icode 비밀번호 교체" value={draft.cf_icode_pw} type="password" autoComplete="new-password" placeholder={config?.uses_legacy_credentials ? "설정됨 · 교체할 때만 입력" : "새 비밀번호"} onChange={(value) => patchDraft(setDraft, "cf_icode_pw", value)} />
              <TextField label="토큰 키 교체" value={draft.cf_icode_token_key} type="password" autoComplete="new-password" placeholder={config?.uses_token_key ? "설정됨 · 교체할 때만 입력" : "새 토큰 키"} onChange={(value) => patchDraft(setDraft, "cf_icode_token_key", value)} />
            </div>
          </fieldset>
          {validationError ? <p className="field-error">{validationError}</p> : null}
          <div className="action-row sms-config-actions">
            <button type="button" disabled={busy || !config} onClick={() => config && setDraft(smsConfigToDraft(config))}>서버 값 복원</button>
            <button className="primary-action" type="submit" disabled={writeDisabled || !update || Boolean(validationError)}>{busy ? "처리 중" : `변경 ${update ? Object.keys(update).length : 0}개 저장·재조회`}</button>
          </div>
        </form>

        <section className="member-list-panel sms-sync-panel" aria-labelledby="sms-sync-title">
          <div className="workspace-panel-heading">
            <div><span className="eyebrow">Local mutation</span><h3 id="sms-sync-title">회원 연락처 동기화</h3><p>G5 회원의 전화번호·수신 동의를 SMS 저장소에 반영합니다. 문자를 발송하지 않습니다.</p></div>
            <span>{config?.cf_sms_use === "icode" ? "SMS 활성" : "SMS 비활성"}</span>
          </div>
          <dl className="sms-sync-results">
            <SyncValue label="전체 회원" value={latestSync?.summary.total_members} />
            <SyncValue label="유효 번호" value={latestSync?.summary.phone_valid} />
            <SyncValue label="잘못된 번호" value={latestSync?.summary.phone_invalid} />
            <SyncValue label="수신 허용" value={latestSync?.summary.receipt_enabled} />
            <SyncValue label="수신 거부" value={latestSync?.summary.receipt_disabled} />
            <SyncValue label="탈퇴 회원" value={latestSync?.summary.leave_members} />
          </dl>
          <button className="primary-action" type="button" disabled={syncDisabled} onClick={() => setSyncOpen(true)}>회원 동기화 확인</button>
          <small>{latestSync?.datetime ? `최근 동기화 ${latestSync.datetime}` : "이 화면에서 실행한 동기화 기록이 없습니다."}</small>
        </section>
      </div>

      {syncOpen ? (
        <div className="dialog-backdrop">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sms-sync-confirm-title">
            <span className="eyebrow">Explicit confirmation</span>
            <h3 id="sms-sync-confirm-title">회원 연락처를 동기화하시겠습니까?</h3>
            <p>현재 사이트의 회원 전화번호와 SMS 수신 상태가 SMS 저장소에 반영됩니다. 외부 문자는 발송되지 않습니다.</p>
            <div><button type="button" onClick={() => setSyncOpen(false)}>취소</button><button className="primary-action" type="button" disabled={busy} onClick={() => void syncMembers()}>동기화·재조회</button></div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value, ready }: { label: string; value: string; ready?: boolean }) {
  return <article data-ready={ready}><span>{label}</span><strong>{value}</strong></article>;
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; inputMode?: "numeric" | "tel"; autoComplete?: string }) {
  return <label>{props.label}<input aria-label={props.label} value={props.value} type={props.type ?? "text"} inputMode={props.inputMode} autoComplete={props.autoComplete} placeholder={props.placeholder} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function SelectField(props: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label>{props.label}<select aria-label={props.label} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)}>{props.children}</select></label>;
}

function SyncValue({ label, value }: { label: string; value: number | undefined }) {
  return <div><dt>{label}</dt><dd>{value === undefined ? "—" : value.toLocaleString()}</dd></div>;
}

function patchDraft<K extends keyof AdminSmsConfigDraft>(setter: Dispatch<SetStateAction<AdminSmsConfigDraft>>, key: K, value: AdminSmsConfigDraft[K]) {
  setter((current) => ({ ...current, [key]: value }));
}

function authMode(config: AdminSmsConfig | null): string {
  if (config?.uses_token_key) return "Token";
  if (config?.uses_legacy_credentials) return "ID / PW";
  return "미설정";
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
