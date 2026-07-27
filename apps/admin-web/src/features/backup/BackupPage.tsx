import { type ChangeEvent, type FormEvent, useState } from "react";

import {
  exportPortableBackup,
  importPortableBackup,
  type PortableBackupEnvelope,
  type PortableBackupImportSummary,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";

export function BackupPage() {
  const { session } = useAuthSession();
  const [envelope, setEnvelope] = useState<PortableBackupEnvelope | null>(null);
  const [summary, setSummary] = useState<PortableBackupImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function exportBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setBusy(true);
    setError("");
    try {
      const backup = await exportPortableBackup(password, session.csrf_token);
      downloadEnvelope(backup);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "백업을 내보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      setEnvelope(JSON.parse(await file.text()) as PortableBackupEnvelope);
      setSummary(null);
      setError("");
    } catch {
      setEnvelope(null);
      setError("백업 파일이 올바른 JSON이 아닙니다.");
    }
  }

  async function importBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!envelope) {
      setError("가져올 백업 파일을 먼저 선택하십시오.");
      return;
    }
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setBusy(true);
    setError("");
    try {
      setSummary(await importPortableBackup(envelope, password, session.csrf_token));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "백업을 가져오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page" aria-labelledby="backup-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">System / Backup</span>
          <h2 id="backup-title">암호화 사이트 백업</h2>
          <p>사이트 카탈로그를 Argon2id + AES-256-GCM 휴대용 파일로 내보냅니다.</p>
        </div>
      </div>
      <div className="two-column-grid">
        <form className="settings-card stacked-form" onSubmit={exportBackup}>
          <h3>내보내기</h3>
          <p>12자 이상 별도 백업 암호를 사용하십시오.</p>
          <label>백업 암호<input name="password" type="password" minLength={12} required /></label>
          <button className="primary-action" disabled={busy} type="submit">암호화 파일 받기</button>
        </form>
        <form className="settings-card stacked-form" onSubmit={importBackup}>
          <h3>가져오기</h3>
          <p>반영 전에 서버가 현재 DB의 checksum 백업과 실제 restore readback을 검증합니다.</p>
          <label>백업 파일<input accept="application/json,.json,.g5fleet" type="file" onChange={(event) => void selectBackup(event)} required /></label>
          <label>백업 암호<input name="password" type="password" minLength={12} required /></label>
          <button className="primary-action" disabled={busy || !envelope} type="submit">검증 후 병합</button>
          {summary ? <p className="success-message" role="status">신규 {summary.imported_site_count}개 · 갱신 {summary.reused_site_count}개</p> : null}
        </form>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
  );
}

function downloadEnvelope(envelope: PortableBackupEnvelope) {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `g5-fleet-sites-${new Date().toISOString().slice(0, 10)}.g5fleet`;
  anchor.click();
  URL.revokeObjectURL(url);
}
