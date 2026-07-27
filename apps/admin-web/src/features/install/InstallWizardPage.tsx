import { useState, type FormEvent } from "react";

import {
  completeInstall,
  startInstallChallenge,
  type InstallChallenge,
} from "../../api/fleet";

type InstallStep = "administrator" | "recovery" | "totp";

export function InstallWizardPage(props: { onInstalled: () => void }) {
  const [step, setStep] = useState<InstallStep>("administrator");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [challenge, setChallenge] = useState<InstallChallenge | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function begin(event: FormEvent) {
    event.preventDefault();
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    await run(async () => {
      setChallenge(await startInstallChallenge(loginName.trim()));
      setStep("totp");
    });
  }

  async function complete(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    await run(async () => {
      const result = await completeInstall({
        setup_token: challenge.setup_token,
        login_name: loginName.trim(),
        password,
        totp_code: totpCode,
      });
      setPassword("");
      setPasswordConfirm("");
      setTotpCode("");
      setRecoveryCodes(result.recovery_codes);
      setStep("recovery");
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "설치 요청에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="entry-screen">
      <section className="entry-card install-wizard" aria-labelledby="install-title">
        <span className="eyebrow">First-run security</span>
        <h1 id="install-title">G5 Fleet 설치</h1>
        <p>
          최초 관리자와 OTP를 함께 설정해야 운영 화면이 열립니다. 데이터베이스는
          서버 설치 단계에서 명시적으로 생성되어 있어야 합니다.
        </p>
        <ol className="install-progress" aria-label="설치 진행 단계">
          <li data-active={step === "administrator"}>1. 관리자</li>
          <li data-active={step === "totp"}>2. OTP</li>
          <li data-active={step === "recovery"}>3. 복구 코드</li>
        </ol>

        {error && <p className="flow-error" role="alert">{error}</p>}

        {step === "administrator" && (
          <form className="entry-form" onSubmit={(event) => void begin(event)}>
            <label>
              <span>마스터 아이디</span>
              <input
                required
                minLength={3}
                maxLength={64}
                autoComplete="username"
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
              />
            </label>
            <label>
              <span>마스터 비밀번호</span>
              <input
                required
                minLength={12}
                maxLength={128}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              <span>비밀번호 확인</span>
              <input
                required
                minLength={12}
                maxLength={128}
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </label>
            <button className="primary-action" disabled={busy} type="submit">
              OTP 설정 시작
            </button>
          </form>
        )}

        {step === "totp" && challenge && (
          <form className="entry-form" onSubmit={(event) => void complete(event)}>
            <div className="security-callout">
              <strong>인증 앱에 다음 키를 등록하십시오.</strong>
              <code>{challenge.manual_entry_key}</code>
              <a href={challenge.otpauth_uri}>인증 앱으로 열기</a>
              <small>
                challenge 만료 시 관리자 단계부터 다시 시작하십시오.
              </small>
            </div>
            <label>
              <span>6자리 OTP</span>
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value)}
              />
            </label>
            <button className="primary-action" disabled={busy} type="submit">
              관리자·OTP 원자 저장
            </button>
          </form>
        )}

        {step === "recovery" && (
          <section className="recovery-panel" aria-labelledby="recovery-title">
            <h2 id="recovery-title">복구 코드는 지금 한 번만 표시됩니다.</h2>
            <p>암호화되지 않은 원문은 서버에 저장되지 않습니다.</p>
            <ul>
              {recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}
            </ul>
            <label className="check-label">
              <input
                type="checkbox"
                checked={recoveryAcknowledged}
                onChange={(event) =>
                  setRecoveryAcknowledged(event.target.checked)}
              />
              <span>복구 코드를 안전한 곳에 저장했습니다.</span>
            </label>
            <button
              className="primary-action"
              disabled={!recoveryAcknowledged}
              type="button"
              onClick={props.onInstalled}
            >
              로그인으로 이동
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
