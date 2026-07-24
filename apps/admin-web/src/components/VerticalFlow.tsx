import { type FormEvent, useState } from "react";

import {
  type BasicConfig,
  type ConnectorHealth,
  type Site,
  type SiteOverview,
  bootstrapAdmin,
  connectorHealth,
  connectorLogin,
  createSite,
  getBasicConfig,
  getSiteOverview,
  listSites,
  loginFleet,
  stepUp,
  updateBasicConfig,
} from "../api/fleet";

export function VerticalFlow() {
  const [csrf, setCsrf] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [overview, setOverview] = useState<SiteOverview | null>(null);
  const [config, setConfig] = useState<BasicConfig | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function authenticate(
    loginName: string,
    password: string,
    bootstrap: boolean,
  ) {
    await run(async () => {
      if (bootstrap) {
        await bootstrapAdmin(loginName, password);
      }
      const session = await loginFleet(loginName, password);
      await stepUp(password, session.csrf_token);
      setCsrf(session.csrf_token);
      const ownedSites = await listSites();
      setSites(ownedSites);
      setSite(ownedSites[0] ?? null);
    });
  }

  async function registerSite(input: {
    site_id: string;
    display_name: string;
    base_url: string;
  }) {
    await run(async () => {
      await createSite(input, csrf);
      const ownedSites = await listSites();
      setSites(ownedSites);
      setSite(ownedSites.find((item) => item.site_id === input.site_id) ?? null);
    });
  }

  async function verifyConnector() {
    if (!site) return;
    await run(async () => setHealth(await connectorHealth(site.site_id)));
  }

  async function loginConnector(mbId: string, mbPassword: string) {
    if (!site) return;
    await run(async () => {
      await connectorLogin(
        site.site_id,
        { mb_id: mbId, mb_password: mbPassword },
        csrf,
      );
      const [nextOverview, nextConfig] = await Promise.all([
        getSiteOverview(site.site_id),
        getBasicConfig(site.site_id),
      ]);
      setOverview(nextOverview);
      setConfig(nextConfig);
      setBaseline(nextConfig.cf_10 ?? "");
    });
  }

  async function saveCf10(value: string) {
    if (!site) return;
    await run(async () => {
      await updateBasicConfig(site.site_id, value, csrf);
      setConfig(await getBasicConfig(site.site_id));
    });
  }

  async function rollbackCf10() {
    if (!site || baseline === null) return;
    await run(async () => {
      await updateBasicConfig(site.site_id, baseline, csrf);
      setConfig(await getBasicConfig(site.site_id));
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="vertical-flow" aria-label="최초 사이트 연결 흐름">
      <FlowStep index="01" title="Fleet 로그인" done={Boolean(csrf)}>
        <FleetLoginForm disabled={busy} onSubmit={authenticate} />
      </FlowStep>

      <FlowStep index="02" title="사이트 등록" done={Boolean(site)}>
        {csrf
          ? (
            <>
              <SiteForm disabled={busy} onSubmit={registerSite} />
              {sites.length > 0 && (
                <div className="site-pills" aria-label="등록 사이트">
                  {sites.map((item) => (
                    <button
                      key={item.site_id}
                      type="button"
                      data-active={site?.site_id === item.site_id}
                      onClick={() => setSite(item)}
                    >
                      {item.display_name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )
          : <StepHint>먼저 Fleet 관리자 로그인이 필요합니다.</StepHint>}
      </FlowStep>

      <FlowStep index="03" title="Connector 확인·로그인" done={Boolean(config)}>
        {site
          ? (
            <div className="connector-grid">
              <button
                className="secondary-action"
                type="button"
                disabled={busy}
                onClick={() => void verifyConnector()}
              >
                Connector health 확인
              </button>
              <span className="inline-status">
                {health
                  ? `${health.status} · ${health.version}`
                  : "아직 확인하지 않음"}
              </span>
              <ConnectorLoginForm
                disabled={busy}
                onSubmit={loginConnector}
              />
            </div>
          )
          : <StepHint>관리할 사이트를 등록하거나 선택하십시오.</StepHint>}
      </FlowStep>

      <FlowStep index="04" title="조회·수정·재조회·원복" done={false}>
        {site && config
          ? (
            <ConfigRoundtrip
              site={site}
              overview={overview}
              config={config}
              baseline={baseline ?? ""}
              disabled={busy}
              onSave={saveCf10}
              onRollback={rollbackCf10}
            />
          )
          : <StepHint>Connector 로그인 뒤 안전 필드가 열립니다.</StepHint>}
      </FlowStep>

      {error && <p className="flow-error" role="alert">{error}</p>}
    </section>
  );
}

function FlowStep(props: {
  index: string;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="flow-step" data-done={props.done}>
      <header>
        <span>{props.index}</span>
        <h3>{props.title}</h3>
        <strong>{props.done ? "완료" : "대기"}</strong>
      </header>
      <div className="flow-step-body">{props.children}</div>
    </article>
  );
}

function FleetLoginForm(props: {
  disabled: boolean;
  onSubmit: (
    loginName: string,
    password: string,
    bootstrap: boolean,
  ) => Promise<void>;
}) {
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrap, setBootstrap] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await props.onSubmit(loginName, password, bootstrap);
    setPassword("");
  }
  return (
    <form className="flow-form" onSubmit={(event) => void submit(event)}>
      <label>
        <span>Fleet 아이디</span>
        <input
          required
          autoComplete="username"
          value={loginName}
          onChange={(event) => setLoginName(event.target.value)}
        />
      </label>
      <label>
        <span>Fleet 비밀번호</span>
        <input
          required
          minLength={12}
          type="password"
          autoComplete={bootstrap ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={bootstrap}
          onChange={(event) => setBootstrap(event.target.checked)}
        />
        <span>최초 관리자 생성</span>
      </label>
      <button className="primary-action" disabled={props.disabled} type="submit">
        {bootstrap ? "관리자 생성 후 로그인" : "Fleet 로그인"}
      </button>
    </form>
  );
}

function SiteForm(props: {
  disabled: boolean;
  onSubmit: (input: {
    site_id: string;
    display_name: string;
    base_url: string;
  }) => Promise<void>;
}) {
  const [siteId, setSiteId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    await props.onSubmit({
      site_id: siteId,
      display_name: displayName,
      base_url: baseUrl,
    });
  }
  return (
    <form className="flow-form three" onSubmit={(event) => void submit(event)}>
      <label>
        <span>site_id</span>
        <input
          required
          pattern="[A-Za-z0-9_-]+"
          value={siteId}
          onChange={(event) => setSiteId(event.target.value)}
        />
      </label>
      <label>
        <span>표시 이름</span>
        <input
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>
      <label>
        <span>G5 사이트 URL</span>
        <input
          required
          type="url"
          placeholder="https://example.com"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
        />
      </label>
      <button className="primary-action" disabled={props.disabled} type="submit">
        사이트 등록
      </button>
    </form>
  );
}

function ConnectorLoginForm(props: {
  disabled: boolean;
  onSubmit: (mbId: string, mbPassword: string) => Promise<void>;
}) {
  const [mbId, setMbId] = useState("");
  const [mbPassword, setMbPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    await props.onSubmit(mbId, mbPassword);
    setMbPassword("");
  }
  return (
    <form className="flow-form" onSubmit={(event) => void submit(event)}>
      <label>
        <span>G5 관리자 아이디</span>
        <input
          required
          autoComplete="off"
          value={mbId}
          onChange={(event) => setMbId(event.target.value)}
        />
      </label>
      <label>
        <span>G5 관리자 비밀번호</span>
        <input
          required
          type="password"
          autoComplete="off"
          value={mbPassword}
          onChange={(event) => setMbPassword(event.target.value)}
        />
      </label>
      <button className="primary-action" disabled={props.disabled} type="submit">
        Connector 로그인
      </button>
    </form>
  );
}

function ConfigRoundtrip(props: {
  site: Site;
  overview: SiteOverview | null;
  config: BasicConfig;
  baseline: string;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
  onRollback: () => Promise<void>;
}) {
  const [value, setValue] = useState(props.config.cf_10 ?? "");
  return (
    <div className="config-roundtrip">
      <dl>
        <div><dt>사이트</dt><dd>{props.overview?.site_title ?? props.site.display_name}</dd></div>
        <div><dt>Connector</dt><dd>{props.overview?.connector_version ?? "확인 중"}</dd></div>
        <div><dt>관리자</dt><dd>{props.overview?.administrator_id ?? "—"}</dd></div>
      </dl>
      <label>
        <span>안전 검증 필드 · cf_10</span>
        <input
          maxLength={255}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <p>
        저장 후 서버가 다시 조회한 값: <strong>{props.config.cf_10 ?? ""}</strong>
      </p>
      <div className="button-row">
        <button
          className="primary-action"
          type="button"
          disabled={props.disabled}
          onClick={() => void props.onSave(value)}
        >
          저장·재조회
        </button>
        <button
          className="secondary-action"
          type="button"
          disabled={props.disabled}
          onClick={() => {
            setValue(props.baseline);
            void props.onRollback();
          }}
        >
          기준값 원복
        </button>
      </div>
    </div>
  );
}

function StepHint({ children }: { children: React.ReactNode }) {
  return <p className="step-hint">{children}</p>;
}
