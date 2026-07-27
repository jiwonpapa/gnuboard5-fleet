import { useEffect, useState } from "react";

import { getSshProfile, type SshProfileSummary } from "../api/fleet";
import { SiteSftpBrowserPage } from "../features/server-files/SiteSftpBrowserPage";
import { SiteSshSessionPage } from "../features/server-ssh/SiteSshSessionPage";

type RemoteSection = "ssh" | "sftp";

export function RemoteWorkspace(props: {
  siteId: string;
  csrfToken: string;
}) {
  const [section, setSection] = useState<RemoteSection>("ssh");
  const [profile, setProfile] = useState<SshProfileSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getSshProfile(props.siteId)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [props.siteId]);

  return (
    <section className="remote-workspace" aria-labelledby="remote-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Remote / server-owned transport</span>
          <h3 id="remote-title">SSH 터미널·SFTP</h3>
          <p>
            기존 데스크톱 작업면을 서버 소유 OpenSSH와 반응형 웹으로
            이관했습니다. 개인키는 암호화 저장 후 브라우저로 반환하지
            않습니다.
          </p>
        </div>
        <span className="registry-state">
          {profile
            ? `${profile.username}@${profile.host}:${profile.port}`
            : "SSH profile 미설정"}
        </span>
      </div>

      <nav className="remote-tabs" aria-label="원격 서버 작업">
        <button
          type="button"
          aria-current={section === "ssh" ? "page" : undefined}
          onClick={() => setSection("ssh")}
        >
          SSH
        </button>
        <button
          type="button"
          aria-current={section === "sftp" ? "page" : undefined}
          onClick={() => setSection("sftp")}
        >
          SFTP
        </button>
      </nav>

      {section === "ssh" ? (
        <SiteSshSessionPage
          csrfToken={props.csrfToken}
          profile={profile}
          siteId={props.siteId}
          onError={setError}
          onProfileChange={setProfile}
        />
      ) : (
        <SiteSftpBrowserPage
          csrfToken={props.csrfToken}
          profileReady={profile !== null}
          siteId={props.siteId}
          onError={setError}
        />
      )}

      {error && (
        <p className="flow-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
