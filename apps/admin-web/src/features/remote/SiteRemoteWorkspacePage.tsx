import { Navigate, useParams } from "react-router-dom";

import { RemoteWorkspace } from "../../components/RemoteWorkspace";
import { useAuthSession } from "../auth/useAuthSession";

export function SiteRemoteWorkspacePage() {
  const { siteId } = useParams();
  const { session } = useAuthSession();

  if (!siteId) {
    return <Navigate replace to="/sites" />;
  }

  return (
    <section className="page" aria-labelledby="remote-workspace-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Remote</span>
          <h2 id="remote-workspace-title">원격 서버 관리</h2>
          <p>
            SSH 개인키는 서버의 암호화 저장소에만 보관하고, 터미널과
            SFTP는 현재 site_id에 귀속합니다.
          </p>
        </div>
      </div>
      <RemoteWorkspace siteId={siteId} csrfToken={session.csrf_token} />
    </section>
  );
}
