import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  deleteAdminQaBulk,
  getAdminQaConfig,
  updateAdminQaConfig,
  type AdminQaConfig,
} from "../../api/fleet";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildQaConfigUpdate,
  parseQaIds,
  qaBaseFields,
  qaContactFields,
  qaContentFields,
  qaExtraFields,
  qaFieldLabels,
  qaFlagFields,
  qaNumericFields,
  qaTextAreaFields,
  toQaConfigDraft,
  type QaConfigDraft,
  type QaConfigField,
} from "./adminQaForm";

type PendingAction = "save" | "delete" | null;

export function AdminQaPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [baseline, setBaseline] = useState<AdminQaConfig | null>(null);
  const [draft, setDraft] = useState<QaConfigDraft | null>(null);
  const [deleteIds, setDeleteIds] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminQaConfig(siteId)
      .then((config) => {
        if (!active) return;
        setBaseline(config);
        setDraft(toQaConfigDraft(config));
      })
      .catch((caught) => active && setError(errorMessage(caught, "QA 설정을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [siteId]);

  const update = baseline && draft ? buildQaConfigUpdate(baseline, draft) : null;
  const parsedDeleteIds = parseQaIds(deleteIds);

  async function saveConfig() {
    if (!update) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await updateAdminQaConfig(siteId, update, session.csrf_token);
      const readback = await getAdminQaConfig(siteId);
      if (Object.entries(update).some(([field, value]) => readback[field as QaConfigField] !== value)) {
        throw new Error("저장 후 QA 설정 재조회 값이 일치하지 않습니다.");
      }
      setBaseline(readback); setDraft(toQaConfigDraft(readback)); setPendingAction(null);
      setMessage(`${Object.keys(update).length}개 설정을 저장하고 서버 값을 재조회했습니다.`);
    } catch (caught) {
      setError(errorMessage(caught, "QA 설정을 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteQa() {
    if (!parsedDeleteIds) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await deleteAdminQaBulk(siteId, { qa_ids: parsedDeleteIds }, session.csrf_token);
      if (result.qa_ids.length !== parsedDeleteIds.length || result.qa_ids.some((id, index) => id !== parsedDeleteIds[index])) {
        throw new Error("삭제 응답의 문의 ID가 요청과 일치하지 않습니다.");
      }
      setDeleteIds(""); setPendingAction(null);
      setMessage(`문의 ${result.deleted_count}건을 삭제했습니다. 요청 ID: ${result.qa_ids.join(", ")}`);
    } catch (caught) {
      setError(errorMessage(caught, "문의 일괄 삭제에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: QaConfigField, value: string) {
    if (draft) setDraft({ ...draft, [field]: value });
  }

  if (!siteId) return <p className="error-message">site_id가 없는 QA 관리 경로입니다.</p>;

  return (
    <section className="page qa-page" aria-labelledby="qa-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / QA</span><h2 id="qa-title">1:1 문의 설정</h2><p>기존 QA 설정 36개 필드를 보존하고, 문의 삭제는 확인된 ID만 별도 실행합니다.</p></div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {!session.step_up_active ? <p className="admin-step-up-note">설정 저장과 문의 삭제는 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}

      <div className="qa-workspace">
        <div className="qa-settings-column">
          <QaFieldGroup title="기본 노출" description="제목, 카테고리, 스킨과 목록·첨부 제한을 관리합니다." fields={qaBaseFields} draft={draft} busy={busy} onField={updateField} />
          <QaFieldGroup title="문의·알림" description="문의자 연락처 입력과 관리자 알림 수신값을 관리합니다." fields={qaContactFields} draft={draft} busy={busy} onField={updateField} />
          <QaFieldGroup title="본문·레이아웃" description="기본 안내문과 PC·모바일 상하단 콘텐츠를 원문 그대로 저장합니다." fields={qaContentFields} draft={draft} busy={busy} onField={updateField} />
          <QaFieldGroup title="추가 필드" description="그누보드 QA의 사용자 정의 제목·값 다섯 쌍을 모두 보존합니다." fields={qaExtraFields} draft={draft} busy={busy} onField={updateField} />
        </div>

        <aside className="qa-action-column">
          <section className="qa-action-panel">
            <div className="workspace-panel-heading"><h3>설정 저장</h3><span>{baseline ? `qa_id ${baseline.qa_id}` : "읽는 중"}</span></div>
            <p>서버에서 읽은 기준값과 달라진 필드만 전송하고, 저장 후 다시 조회합니다.</p>
            <button className="primary-action" type="button" disabled={busy || !session.step_up_active || !update} onClick={() => setPendingAction("save")}>변경 내용 확인</button>
            <button type="button" disabled={busy || !baseline} onClick={() => baseline && setDraft(toQaConfigDraft(baseline))}>서버 값으로 되돌리기</button>
          </section>

          <section className="qa-action-panel qa-danger-panel">
            <div className="workspace-panel-heading"><h3>문의 일괄 삭제</h3><span>복구 불가</span></div>
            <p>삭제할 문의 번호를 쉼표 또는 줄바꿈으로 입력하십시오. 빈 값·중복·0 이하는 차단합니다.</p>
            <label>문의 ID<textarea aria-label="삭제할 문의 ID" rows={5} value={deleteIds} onChange={(event) => setDeleteIds(event.currentTarget.value)} placeholder="예: 101, 102" /></label>
            <button className="danger-action" type="button" disabled={busy || !session.step_up_active || !parsedDeleteIds} onClick={() => setPendingAction("delete")}>문의 삭제 확인</button>
          </section>
        </aside>
      </div>

      <ConfirmActionDialog busy={busy} description={pendingAction === "delete" ? `문의 ID ${parsedDeleteIds?.join(", ") ?? "-"}을(를) 영구 삭제합니다.` : `${Object.keys(update ?? {}).length}개 QA 설정을 저장하고 서버 값을 재조회합니다.`} onCancel={() => setPendingAction(null)} onConfirm={() => void (pendingAction === "delete" ? deleteQa() : saveConfig())} open={pendingAction !== null} title={pendingAction === "delete" ? "문의 삭제 확인" : "QA 설정 저장 확인"} />
    </section>
  );
}

function QaFieldGroup(props: { title: string; description: string; fields: readonly QaConfigField[]; draft: QaConfigDraft | null; busy: boolean; onField: (field: QaConfigField, value: string) => void }) {
  return <section className="qa-field-group"><div className="workspace-panel-heading"><div><h3>{props.title}</h3><p>{props.description}</p></div><span>{props.fields.length}개</span></div><div className="qa-field-grid">{props.fields.map((field) => <QaField key={field} field={field} value={props.draft?.[field] ?? ""} disabled={props.busy || !props.draft} onChange={(value) => props.onField(field, value)} />)}</div></section>;
}

function QaField(props: { field: QaConfigField; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const label = qaFieldLabels[props.field];
  if (qaFlagFields.has(props.field)) return <label>{label}<select aria-label={label} disabled={props.disabled} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)}><option value="">기본값</option><option value="0">사용 안 함</option><option value="1">사용</option></select></label>;
  if (qaTextAreaFields.has(props.field)) return <label className="qa-wide-field">{label}<textarea aria-label={label} disabled={props.disabled} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} rows={5} /></label>;
  return <label>{label}<input aria-label={label} disabled={props.disabled} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} inputMode={qaNumericFields.has(props.field) ? "numeric" : "text"} /></label>;
}

function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
