import { useEffect, useState, type FormEvent } from "react";

import {
  changeFleetPassword,
  enableTotp,
  getFleetSession,
  getSecuritySettings,
  regenerateRecoveryCodes,
  startTotpEnrollment,
  stepUp,
  updateIdleTimeout,
  type SecuritySettings,
  type TotpChallenge,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";

export function SecuritySettingsPage() {
  const {
    idleTimeoutMinutes,
    logout,
    session,
    updateIdleTimeout: updateIdleGuard,
    updateSession,
  } = useAuthSession();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [idleMinutes, setIdleMinutes] = useState(idleTimeoutMinutes);
  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getSecuritySettings()
      .then((value) => {
        if (active) {
          setSettings(value);
          setIdleMinutes(value.session_idle_timeout_minutes);
        }
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveIdleTimeout(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await updateIdleTimeout(idleMinutes, session.csrf_token);
      updateIdleGuard(idleMinutes);
      setSettings((current) =>
        current
          ? { ...current, session_idle_timeout_minutes: idleMinutes }
          : current
      );
      setNotice("자동 로그아웃 시간이 저장되었습니다.");
    });
  }

  async function verifyRecentAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(async () => {
      await stepUp(
        String(form.get("current_password") ?? ""),
        session.csrf_token,
        { totpCode: String(form.get("totp_code") ?? "") },
      );
      updateSession(await getFleetSession());
      formElement.reset();
      setNotice("최근 본인 확인을 완료했습니다. 보호된 변경 작업을 진행할 수 있습니다.");
    });
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextPassword = String(form.get("new_password") ?? "");
    if (nextPassword !== String(form.get("password_confirm") ?? "")) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    await run(async () => {
      await changeFleetPassword(
        {
          current_password: String(form.get("current_password") ?? ""),
          new_password: nextPassword,
          totp_code: String(form.get("totp_code") ?? ""),
        },
        session.csrf_token,
      );
      formElement.reset();
      setNotice("비밀번호가 변경되었습니다.");
    });
  }

  async function beginTotpReplacement() {
    await run(async () => {
      setChallenge(await startTotpEnrollment(session.csrf_token));
      setRecoveryCodes([]);
      setNotice("새 OTP 키가 발급되었습니다. 인증 전까지 기존 OTP가 유지됩니다.");
    });
  }

  async function confirmTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const result = await enableTotp(
        String(form.get("totp_code") ?? ""),
        session.csrf_token,
      );
      setSettings((current) => current ? { ...current, totp_enabled: true } : current);
      setChallenge(null);
      setRecoveryCodes(result.recovery_codes);
      setNotice("OTP와 복구 코드가 교체되었습니다.");
    });
  }

  async function replaceRecoveryCodes() {
    await run(async () => {
      const result = await regenerateRecoveryCodes(session.csrf_token);
      setRecoveryCodes(result.recovery_codes);
      setNotice("기존 복구 코드를 폐기하고 새 코드를 발급했습니다.");
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page" aria-labelledby="security-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Security / master access</span>
          <h2 id="security-title">보안 설정</h2>
          <p>OTP를 필수로 유지하며 비밀번호·복구 코드·유휴 세션을 관리합니다.</p>
        </div>
        <button
          className="secondary-action"
          type="button"
          disabled={busy}
          onClick={() => void logout()}
        >
          로그아웃
        </button>
      </div>

      {error && <p className="flow-error" role="alert">{error}</p>}
      {notice && <p className="flow-notice" role="status">{notice}</p>}

      <div className="security-grid">
        <SecurityPanel
          title="최근 본인 확인"
          status={session.step_up_active ? "확인됨" : "필요"}
        >
          <p>사이트 비밀·설정·삭제 작업 전에 비밀번호와 OTP를 다시 확인합니다.</p>
          <form className="security-form" onSubmit={(event) => void verifyRecentAccess(event)}>
            <label>
              <span>현재 비밀번호</span>
              <input required name="current_password" type="password" autoComplete="current-password" />
            </label>
            <label>
              <span>현재 OTP</span>
              <input required name="totp_code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" />
            </label>
            <button className="primary-action" disabled={busy} type="submit">
              본인 확인
            </button>
          </form>
        </SecurityPanel>

        <SecurityPanel title="자동 로그아웃" status={`${idleMinutes}분`}>
          <form className="security-form" onSubmit={(event) => void saveIdleTimeout(event)}>
            <label>
              <span>유휴 시간 (5–1440분)</span>
              <input
                required
                min={5}
                max={1440}
                type="number"
                value={idleMinutes}
                onChange={(event) => setIdleMinutes(Number(event.target.value))}
              />
            </label>
            <button className="primary-action" disabled={busy} type="submit">
              시간 저장
            </button>
          </form>
        </SecurityPanel>

        <SecurityPanel
          title="OTP 인증"
          status={settings?.totp_enabled ? "필수 · 활성" : "확인 중"}
        >
          <p>OTP는 비활성화할 수 없습니다. 교체 시 새 코드 검증 전까지 기존 키가 유지됩니다.</p>
          <button
            className="secondary-action"
            disabled={busy}
            type="button"
            onClick={() => void beginTotpReplacement()}
          >
            OTP 교체 시작
          </button>
          {challenge && (
            <form className="security-form" onSubmit={(event) => void confirmTotp(event)}>
              <div className="security-callout">
                <strong>새 키</strong>
                <code>{challenge.manual_entry_key}</code>
                <a href={challenge.otpauth_uri}>인증 앱으로 열기</a>
              </div>
              <label>
                <span>새 OTP 6자리</span>
                <input
                  required
                  name="totp_code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                />
              </label>
              <button className="primary-action" disabled={busy} type="submit">
                새 OTP 검증·교체
              </button>
            </form>
          )}
        </SecurityPanel>

        <SecurityPanel title="비밀번호" status="OTP 재확인">
          <form className="security-form" onSubmit={(event) => void changePassword(event)}>
            <label>
              <span>현재 비밀번호</span>
              <input required name="current_password" type="password" autoComplete="current-password" />
            </label>
            <label>
              <span>현재 OTP</span>
              <input required name="totp_code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" />
            </label>
            <label>
              <span>새 비밀번호</span>
              <input required minLength={12} maxLength={128} name="new_password" type="password" autoComplete="new-password" />
            </label>
            <label>
              <span>새 비밀번호 확인</span>
              <input required minLength={12} maxLength={128} name="password_confirm" type="password" autoComplete="new-password" />
            </label>
            <button className="primary-action" disabled={busy} type="submit">
              비밀번호 변경
            </button>
          </form>
        </SecurityPanel>

        <SecurityPanel title="복구 코드" status="일회성">
          <p>재발급하면 기존 코드는 즉시 폐기됩니다. 새 원문은 이 화면에 한 번만 표시됩니다.</p>
          <button
            className="secondary-action"
            disabled={busy}
            type="button"
            onClick={() => void replaceRecoveryCodes()}
          >
            복구 코드 재발급
          </button>
          {recoveryCodes.length > 0 && <RecoveryCodeList codes={recoveryCodes} />}
        </SecurityPanel>
      </div>
    </section>
  );
}

function SecurityPanel(props: {
  children: React.ReactNode;
  status: string;
  title: string;
}) {
  return (
    <article className="security-panel">
      <header>
        <h3>{props.title}</h3>
        <span>{props.status}</span>
      </header>
      {props.children}
    </article>
  );
}

function RecoveryCodeList({ codes }: { codes: string[] }) {
  return (
    <div className="recovery-code-list" aria-label="새 복구 코드">
      {codes.map((code) => <code key={code}>{code}</code>)}
    </div>
  );
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "보안 요청에 실패했습니다.";
}
