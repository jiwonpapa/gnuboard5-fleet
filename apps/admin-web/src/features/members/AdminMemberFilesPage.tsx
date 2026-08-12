import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { exportAdminMembers, type AdminMember } from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { membersToCsv } from "./adminMemberForm";

export function AdminMemberFilesPage() {
  const { siteId = "" } = useParams();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await exportAdminMembers(siteId, {
        search: String(data.get("search") ?? "").trim() || undefined,
        search_field: String(data.get("search_field") ?? "all"),
      });
      setMembers(response.items);
      setTotal(response.pagination.total ?? response.items.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "내보내기 대상을 읽지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([membersToCsv(members)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `g5-members-${siteId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page members-page" aria-labelledby="member-files-title">
      <div className="page-heading"><div><span className="eyebrow">Sites / {siteId} / Member export</span><h2 id="member-files-title">회원관리파일</h2><p>서버에서 내보내기 대상을 조회한 뒤 브라우저에서 UTF-8 CSV로 저장합니다.</p></div><Link to={`/sites/${encodeURIComponent(siteId)}/admin/members`}>회원 관리로 돌아가기</Link></div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <form className="member-export-form" onSubmit={inspect}>
        <select name="search_field" aria-label="내보내기 검색 필드"><option value="all">전체</option><option value="mb_id">아이디</option><option value="mb_name">이름</option><option value="mb_nick">닉네임</option><option value="mb_email">이메일</option></select>
        <input name="search" placeholder="내보내기 검색어" />
        <button type="submit" disabled={busy}>{busy ? "조회 중" : "대상 조회"}</button>
        <button type="button" disabled={!members.length || busy} onClick={download}>CSV 다운로드</button>
      </form>
      <p className="member-export-count">내보내기 대상 {total}명</p>
      <AdminDataTable columns={[{ header: "아이디", render: (member) => member.mb_id }, { header: "이름", render: (member) => member.mb_name || "—" }, { header: "이메일", render: (member) => member.mb_email || "—" }, { header: "레벨", render: (member) => member.mb_level ?? "—" }]} emptyMessage="대상 조회를 실행하십시오." getRowKey={(member) => member.mb_id} rows={members} />
    </section>
  );
}
