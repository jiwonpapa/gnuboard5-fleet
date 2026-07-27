import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createSite } from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";

export function SiteOnboardingPage() {
  const { session } = useAuthSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const siteId = String(data.get("site_id") ?? "").trim();
    setBusy(true);
    setError("");
    try {
      await createSite(
        {
          site_id: siteId,
          display_name: String(data.get("display_name") ?? "").trim(),
          base_url: String(data.get("base_url") ?? "").trim(),
        },
        session.csrf_token,
      );
      navigate(`/sites/${encodeURIComponent(siteId)}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "사이트를 등록하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page narrow-page" aria-labelledby="site-onboarding-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / Onboarding</span>
          <h2 id="site-onboarding-title">G5 사이트 등록</h2>
          <p>사이트 식별자와 공개 HTTPS API 기준 주소를 입력하십시오.</p>
        </div>
      </div>
      <form className="settings-card stacked-form" onSubmit={submit}>
        <label>
          사이트 식별자
          <input name="site_id" required minLength={1} maxLength={128} placeholder="g5-staging" />
        </label>
        <label>
          표시 이름
          <input name="display_name" required maxLength={200} placeholder="G5 스테이징" />
        </label>
        <label>
          기준 주소
          <input name="base_url" type="url" required placeholder="https://g5-staging.example.com" />
        </label>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="primary-action" disabled={busy} type="submit">
          {busy ? "등록 중" : "사이트 등록"}
        </button>
      </form>
    </section>
  );
}
