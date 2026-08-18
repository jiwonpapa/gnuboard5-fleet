import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type AdminFaqImage,
  type AdminFaqItem,
  type AdminFaqMasterDetail,
  type AdminFaqMasterSummary,
  createAdminFaq,
  createAdminFaqMaster,
  deleteAdminFaq,
  deleteAdminFaqMaster,
  deleteAdminFaqMasterImage,
  getAdminFaq,
  getAdminFaqMaster,
  listAdminFaqMasters,
  listAdminFaqs,
  updateAdminFaq,
  updateAdminFaqMaster,
  uploadAdminFaqMasterImage,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  type AdminFaqDraft,
  type AdminFaqMasterDraft,
  buildAdminFaqCreate,
  buildAdminFaqMasterCreate,
  buildAdminFaqMasterUpdate,
  buildAdminFaqUpdate,
  emptyAdminFaqDraft,
  emptyAdminFaqMasterDraft,
  faqMasterToDraft,
  faqToDraft,
  validateAdminFaqDraft,
  validateAdminFaqMasterDraft,
} from "./adminFaqForm";

export function AdminFaqsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [masters, setMasters] = useState<AdminFaqMasterSummary[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<AdminFaqMasterDetail | null>(null);
  const [masterDraft, setMasterDraft] = useState<AdminFaqMasterDraft>(emptyAdminFaqMasterDraft);
  const [masterPage, setMasterPage] = useState(1);
  const [masterLastPage, setMasterLastPage] = useState(1);
  const [faqs, setFaqs] = useState<AdminFaqItem[]>([]);
  const [selectedFaq, setSelectedFaq] = useState<AdminFaqItem | null>(null);
  const [faqDraft, setFaqDraft] = useState<AdminFaqDraft>(emptyAdminFaqDraft);
  const [faqPage, setFaqPage] = useState(1);
  const [faqLastPage, setFaqLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteMasterOpen, setDeleteMasterOpen] = useState(false);
  const [deleteFaqOpen, setDeleteFaqOpen] = useState(false);

  async function selectMaster(fmId: number) {
    const detail = await getAdminFaqMaster(siteId, fmId);
    setSelectedMaster(detail);
    setMasterDraft(faqMasterToDraft(detail));
    setSelectedFaq(null);
    setFaqDraft({ ...emptyAdminFaqDraft, fm_id: String(detail.fm_id) });
    setFaqPage(1);
    await reloadFaqs(detail.fm_id, 1);
  }

  async function reloadMasters(preferredId?: number) {
    const result = await listAdminFaqMasters(siteId, { page: masterPage, per_page: 20 });
    setMasters(result.items);
    setMasterLastPage(result.pagination.last_page ?? 1);
    const target = result.items.find((item) => item.fm_id === preferredId)
      ?? result.items.find((item) => item.fm_id === selectedMaster?.fm_id)
      ?? result.items[0];
    if (target) await selectMaster(target.fm_id);
    else newMaster();
  }

  async function reloadFaqs(fmId: number, page = faqPage, preferredId?: number) {
    const result = await listAdminFaqs(siteId, { page, per_page: 20, fm_id: fmId });
    setFaqs(result.items);
    setFaqLastPage(result.pagination.last_page ?? 1);
    const target = result.items.find((item) => item.fa_id === preferredId)
      ?? result.items.find((item) => item.fa_id === selectedFaq?.fa_id);
    if (target) {
      const detail = await getAdminFaq(siteId, target.fa_id);
      setSelectedFaq(detail);
      setFaqDraft(faqToDraft(detail));
    } else {
      setSelectedFaq(null);
      setFaqDraft({ ...emptyAdminFaqDraft, fm_id: String(fmId) });
    }
  }

  useEffect(() => {
    let active = true;
    void listAdminFaqMasters(siteId, { page: masterPage, per_page: 20 })
      .then(async (result) => {
        if (!active) return;
        setMasters(result.items);
        setMasterLastPage(result.pagination.last_page ?? 1);
        const first = result.items[0];
        if (!first) {
          newMaster();
          return;
        }
        const detail = await getAdminFaqMaster(siteId, first.fm_id);
        const faqResult = await listAdminFaqs(siteId, {
          page: 1,
          per_page: 20,
          fm_id: first.fm_id,
        });
        if (!active) return;
        setSelectedMaster(detail);
        setMasterDraft(faqMasterToDraft(detail));
        setFaqs(faqResult.items);
        setFaqLastPage(faqResult.pagination.last_page ?? 1);
        setSelectedFaq(null);
        setFaqDraft({ ...emptyAdminFaqDraft, fm_id: String(first.fm_id) });
      })
      .catch((caught) => active && setError(errorMessage(caught, "FAQ를 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [masterPage, siteId]);

  useEffect(() => {
    const fmId = selectedMaster?.fm_id;
    if (!fmId) return;
    let active = true;
    void listAdminFaqs(siteId, { page: faqPage, per_page: 20, fm_id: fmId })
      .then((result) => {
        if (!active) return;
        setFaqs(result.items);
        setFaqLastPage(result.pagination.last_page ?? 1);
        setSelectedFaq(null);
        setFaqDraft({ ...emptyAdminFaqDraft, fm_id: String(fmId) });
      })
      .catch((caught) => active && setError(errorMessage(caught, "FAQ 문항을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [faqPage, siteId, selectedMaster?.fm_id]);

  function newMaster() {
    setSelectedMaster(null);
    setMasterDraft(emptyAdminFaqMasterDraft);
    setFaqs([]);
    setSelectedFaq(null);
    setFaqDraft(emptyAdminFaqDraft);
    setError("");
    setMessage("");
  }

  function newFaq() {
    setSelectedFaq(null);
    setFaqDraft({
      ...emptyAdminFaqDraft,
      fm_id: selectedMaster ? String(selectedMaster.fm_id) : "",
    });
    setError("");
    setMessage("");
  }

  async function saveMaster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminFaqMasterDraft(masterDraft);
    if (errors.length) return setError(errors.join(" "));
    const update = selectedMaster
      ? buildAdminFaqMasterUpdate(selectedMaster, masterDraft)
      : null;
    if (update && Object.keys(update).length === 0) return setError("변경된 항목이 없습니다.");
    await runMutation(async () => {
      const saved = selectedMaster
        ? await updateAdminFaqMaster(
          siteId,
          selectedMaster.fm_id,
          update!,
          session.csrf_token,
        )
        : await createAdminFaqMaster(
          siteId,
          buildAdminFaqMasterCreate(masterDraft),
          session.csrf_token,
        );
      const readback = await getAdminFaqMaster(siteId, saved.fm_id);
      await reloadMasters(readback.fm_id);
      setMessage("FAQ 분류를 저장하고 상세를 재조회했습니다.");
    });
  }

  async function saveFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminFaqDraft(faqDraft);
    if (errors.length) return setError(errors.join(" "));
    const update = selectedFaq ? buildAdminFaqUpdate(selectedFaq, faqDraft) : null;
    if (update && Object.keys(update).length === 0) return setError("변경된 항목이 없습니다.");
    await runMutation(async () => {
      const saved = selectedFaq
        ? await updateAdminFaq(siteId, selectedFaq.fa_id, update!, session.csrf_token)
        : await createAdminFaq(siteId, buildAdminFaqCreate(faqDraft), session.csrf_token);
      const readback = await getAdminFaq(siteId, saved.fa_id);
      await reloadFaqs(readback.fm_id, faqPage, readback.fa_id);
      setMessage("FAQ 문항을 저장하고 상세를 재조회했습니다.");
    });
  }

  async function removeMaster() {
    if (!selectedMaster) return;
    await runMutation(async () => {
      await deleteAdminFaqMaster(siteId, selectedMaster.fm_id, session.csrf_token);
      setDeleteMasterOpen(false);
      setSelectedMaster(null);
      await reloadMasters();
      setMessage("FAQ 분류를 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function removeFaq() {
    if (!selectedFaq || !selectedMaster) return;
    await runMutation(async () => {
      await deleteAdminFaq(siteId, selectedFaq.fa_id, session.csrf_token);
      setDeleteFaqOpen(false);
      setSelectedFaq(null);
      await reloadFaqs(selectedMaster.fm_id);
      setMessage("FAQ 문항을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function changeImage(kind: "header" | "footer", file: File) {
    if (!selectedMaster) return;
    await runMutation(async () => {
      await uploadAdminFaqMasterImage(
        siteId,
        selectedMaster.fm_id,
        kind,
        await fileUpload(file),
        session.csrf_token,
      );
      const readback = await getAdminFaqMaster(siteId, selectedMaster.fm_id);
      setSelectedMaster(readback);
      setMasterDraft(faqMasterToDraft(readback));
      setMessage(`${kind === "header" ? "상단" : "하단"} 이미지를 업로드하고 재조회했습니다.`);
    });
  }

  async function removeImage(kind: "header" | "footer") {
    if (!selectedMaster) return;
    await runMutation(async () => {
      await deleteAdminFaqMasterImage(
        siteId,
        selectedMaster.fm_id,
        kind,
        session.csrf_token,
      );
      const readback = await getAdminFaqMaster(siteId, selectedMaster.fm_id);
      setSelectedMaster(readback);
      setMasterDraft(faqMasterToDraft(readback));
      setMessage(`${kind === "header" ? "상단" : "하단"} 이미지를 삭제하고 재조회했습니다.`);
    });
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); }
    catch (caught) { setError(errorMessage(caught, "FAQ 관리 작업을 완료하지 못했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 FAQ 관리 경로입니다.</p>;

  return (
    <section className="page faq-page" aria-labelledby="faq-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / FAQs</span>
          <h2 id="faq-title">FAQ 관리</h2>
          <p>분류·문항·상하단 이미지를 동일한 사이트 범위에서 재조회합니다.</p>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={newMaster}>새 FAQ 분류</button>
          <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="member-workspace">
        <div className="member-list-panel">
          <header className="workspace-panel-heading"><h3>FAQ 분류</h3><span>{masters.length} items</span></header>
          {loading ? <p className="audit-loading">FAQ 분류를 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "분류", render: (item: AdminFaqMasterSummary) => <><strong>{item.fm_subject}</strong><small>fm_id {item.fm_id} · order {item.fm_order}</small></> },
                { header: "문항", render: (item: AdminFaqMasterSummary) => `${item.faq_count}개` },
                { header: "이미지", render: (item: AdminFaqMasterSummary) => `${item.header_image.exists ? "상단" : "-"} / ${item.footer_image.exists ? "하단" : "-"}` },
              ]}
              emptyMessage="등록된 FAQ 분류가 없습니다."
              getRowKey={(item: AdminFaqMasterSummary) => String(item.fm_id)}
              onRowClick={(item: AdminFaqMasterSummary) => void selectMaster(item.fm_id).catch((caught) => setError(errorMessage(caught, "FAQ 분류 상세를 읽지 못했습니다.")))}
              rows={masters}
              selectedKey={selectedMaster ? String(selectedMaster.fm_id) : undefined}
            />
          )}
          <Pagination page={masterPage} lastPage={masterLastPage} busy={busy} setPage={setMasterPage} />
        </div>

        <form className="member-editor" onSubmit={saveMaster}>
          <header><span className="eyebrow">FAQ master detail</span><h3>{selectedMaster?.fm_subject ?? "새 FAQ 분류"}</h3><p>상·하단 HTML의 빈 값과 PC·모바일 구분을 그대로 보존합니다.</p></header>
          <fieldset disabled={busy}>
            <TextField label="FAQ 분류 제목" value={masterDraft.fm_subject} onChange={(value) => setMasterDraft({ ...masterDraft, fm_subject: value })} />
            <TextField label="분류 정렬 순서" type="number" value={masterDraft.fm_order} onChange={(value) => setMasterDraft({ ...masterDraft, fm_order: value })} />
            <TextArea label="PC 상단 HTML" value={masterDraft.fm_head_html} onChange={(value) => setMasterDraft({ ...masterDraft, fm_head_html: value })} />
            <TextArea label="PC 하단 HTML" value={masterDraft.fm_tail_html} onChange={(value) => setMasterDraft({ ...masterDraft, fm_tail_html: value })} />
            <div className="form-grid-two">
              <TextArea label="모바일 상단 HTML" value={masterDraft.fm_mobile_head_html} onChange={(value) => setMasterDraft({ ...masterDraft, fm_mobile_head_html: value })} />
              <TextArea label="모바일 하단 HTML" value={masterDraft.fm_mobile_tail_html} onChange={(value) => setMasterDraft({ ...masterDraft, fm_mobile_tail_html: value })} />
            </div>
            {selectedMaster ? (
              <div className="faq-image-grid">
                <FaqImagePanel label="상단 이미지" image={selectedMaster.header_image} busy={busy} onDelete={() => void removeImage("header")} onFile={(file) => void changeImage("header", file)} />
                <FaqImagePanel label="하단 이미지" image={selectedMaster.footer_image} busy={busy} onDelete={() => void removeImage("footer")} onFile={(file) => void changeImage("footer", file)} />
              </div>
            ) : null}
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy}>저장·재조회</button>
            <button type="button" disabled={busy} onClick={newMaster}>새 분류</button>
            {selectedMaster ? <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteMasterOpen(true)}>분류 삭제</button> : null}
          </div>
        </form>
      </div>

      <div className="member-workspace faq-items-workspace">
        <div className="member-list-panel">
          <header className="workspace-panel-heading"><h3>FAQ 문항</h3><span>{selectedMaster?.fm_subject ?? "분류 선택 필요"}</span></header>
          <AdminDataTable
            columns={[
              { header: "질문", render: (item: AdminFaqItem) => <><strong>{item.fa_subject}</strong><small>fa_id {item.fa_id} · order {item.fa_order}</small></> },
              { header: "답변", render: (item: AdminFaqItem) => item.fa_content.slice(0, 80) },
            ]}
            emptyMessage={selectedMaster ? "등록된 FAQ 문항이 없습니다." : "먼저 FAQ 분류를 선택하십시오."}
            getRowKey={(item: AdminFaqItem) => String(item.fa_id)}
            onRowClick={(item: AdminFaqItem) => void getAdminFaq(siteId, item.fa_id).then((detail) => { setSelectedFaq(detail); setFaqDraft(faqToDraft(detail)); }).catch((caught) => setError(errorMessage(caught, "FAQ 상세를 읽지 못했습니다.")))}
            rows={faqs}
            selectedKey={selectedFaq ? String(selectedFaq.fa_id) : undefined}
          />
          <Pagination page={faqPage} lastPage={faqLastPage} busy={busy || !selectedMaster} setPage={setFaqPage} />
        </div>

        <form className="member-editor" onSubmit={saveFaq}>
          <header><span className="eyebrow">FAQ item detail</span><h3>{selectedFaq?.fa_subject ?? "새 FAQ 문항"}</h3><p>선택한 FAQ 분류에 속한 질문·답변을 관리합니다.</p></header>
          <fieldset disabled={busy || !selectedMaster}>
            <label>FAQ 분류<select aria-label="FAQ 분류" value={faqDraft.fm_id} onChange={(event) => setFaqDraft({ ...faqDraft, fm_id: event.currentTarget.value })}>{masters.map((master) => <option key={master.fm_id} value={master.fm_id}>{master.fm_subject}</option>)}</select></label>
            <TextField label="질문 제목" value={faqDraft.fa_subject} onChange={(value) => setFaqDraft({ ...faqDraft, fa_subject: value })} />
            <TextField label="문항 정렬 순서" type="number" value={faqDraft.fa_order} onChange={(value) => setFaqDraft({ ...faqDraft, fa_order: value })} />
            <TextArea label="답변 내용" rows={10} value={faqDraft.fa_content} onChange={(value) => setFaqDraft({ ...faqDraft, fa_content: value })} />
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy || !selectedMaster}>저장·재조회</button>
            <button type="button" disabled={busy || !selectedMaster} onClick={newFaq}>새 문항</button>
            {selectedFaq ? <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteFaqOpen(true)}>문항 삭제</button> : null}
          </div>
        </form>
      </div>

      <ConfirmActionDialog busy={busy} open={deleteMasterOpen} title="FAQ 분류를 삭제하시겠습니까?" description={`${selectedMaster?.fm_subject ?? "선택 분류"}와 속한 문항이 함께 영향을 받습니다.`} onCancel={() => setDeleteMasterOpen(false)} onConfirm={() => void removeMaster()} />
      <ConfirmActionDialog busy={busy} open={deleteFaqOpen} title="FAQ 문항을 삭제하시겠습니까?" description={selectedFaq?.fa_subject ?? "선택 문항"} onCancel={() => setDeleteFaqOpen(false)} onConfirm={() => void removeFaq()} />
    </section>
  );
}

function Pagination(props: { page: number; lastPage: number; busy: boolean; setPage: (value: number | ((current: number) => number)) => void }) {
  return <div className="member-pagination"><span>{props.page} / {props.lastPage}</span><button type="button" disabled={props.busy || props.page <= 1} onClick={() => props.setPage((value) => Math.max(1, value - 1))}>이전</button><button type="button" disabled={props.busy || props.page >= props.lastPage} onClick={() => props.setPage((value) => value + 1)}>다음</button></div>;
}

function TextField(props: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return <label>{props.label}<input aria-label={props.label} type={props.type} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function TextArea(props: { label: string; value: string; rows?: number; onChange: (value: string) => void }) {
  return <label>{props.label}<textarea aria-label={props.label} rows={props.rows ?? 4} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function FaqImagePanel(props: { label: string; image: AdminFaqImage; busy: boolean; onFile: (file: File) => void; onDelete: () => void }) {
  return <div className="faq-image-panel"><strong>{props.label}</strong><small>{props.image.exists ? `${props.image.width ?? "-"}×${props.image.height ?? "-"} · ${props.image.size ?? 0} bytes` : "등록된 이미지가 없습니다."}</small>{props.image.exists && props.image.url ? <img src={props.image.url} alt={`${props.label} 미리보기`} /> : null}<input aria-label={`${props.label} 파일`} type="file" accept="image/png,image/jpeg,image/gif" disabled={props.busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) props.onFile(file); }} /><button type="button" className="danger-action" disabled={props.busy || !props.image.exists} onClick={props.onDelete}>이미지 삭제</button></div>;
}

async function fileUpload(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { file_name: file.name, mime_type: file.type || null, bytes_base64: btoa(binary) };
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
