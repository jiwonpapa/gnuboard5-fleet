import { useState, type FormEvent } from "react";

export interface FleetLoginInput {
  loginName: string;
  password: string;
  recoveryCode: string;
  totpCode: string;
}

export function LoginPage(props: {
  onLogin: (input: FleetLoginInput) => Promise<void>;
}) {
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await props.onLogin({
        loginName: loginName.trim(),
        password,
        totpCode: useRecovery ? "" : totpCode,
        recoveryCode: useRecovery ? recoveryCode : "",
      });
      setPassword("");
      setTotpCode("");
      setRecoveryCode("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "로그인에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="entry-screen">
      <section className="entry-card" aria-labelledby="login-title">
        <span className="eyebrow">Secure access</span>
        <h1 id="login-title">Fleet 관리자 로그인</h1>
        <p>비밀번호와 OTP 또는 일회성 복구 코드가 모두 필요합니다.</p>
        {error && <p className="flow-error" role="alert">{error}</p>}
        <form className="entry-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>아이디</span>
            <input
              required
              autoComplete="username"
              value={loginName}
              onChange={(event) => setLoginName(event.target.value)}
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {useRecovery
            ? (
              <label>
                <span>복구 코드</span>
                <input
                  required
                  autoComplete="one-time-code"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                />
              </label>
            )
            : (
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
            )}
          <button
            className="text-action"
            type="button"
            onClick={() => setUseRecovery((value) => !value)}
          >
            {useRecovery ? "OTP로 로그인" : "복구 코드 사용"}
          </button>
          <button className="primary-action" disabled={busy} type="submit">
            {busy ? "검증 중…" : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}
