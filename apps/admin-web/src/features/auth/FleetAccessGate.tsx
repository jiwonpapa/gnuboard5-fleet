import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  getFleetSession,
  getInstallStatus,
  getSecuritySettings,
  loginFleet,
  logoutFleet,
  type FleetSession,
} from "../../api/fleet";
import { TransportError } from "../../transport/contracts";
import { InstallWizardPage } from "../install/InstallWizardPage";
import { MasterIdleGuard } from "../master/MasterIdleGuard";
import { AuthSessionProvider } from "./AuthSessionContext";
import { resolveAccessView } from "./accessFlow";
import { LoginPage, type FleetLoginInput } from "./LoginPage";

export function FleetAccessGate({ children }: { children: ReactNode }) {
  const [installState, setInstallState] = useState<
    "complete" | "setup_required" | null
  >(null);
  const [session, setSession] = useState<FleetSession | null>(null);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getInstallStatus()
      .then(async (status) => {
        if (!active) return;
        setInstallState(status.state);
        if (status.state === "complete") {
          try {
            const current = await getFleetSession();
            const settings = await getSecuritySettings();
            if (active) {
              setSession(current);
              setIdleTimeoutMinutes(settings.session_idle_timeout_minutes);
            }
          } catch (caught) {
            if (
              active &&
              !(caught instanceof TransportError && caught.status === 401)
            ) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "세션 상태를 확인하지 못했습니다.",
              );
            }
          }
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "설치 상태를 확인하지 못했습니다.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(async (input: FleetLoginInput) => {
    await loginFleet(input.loginName, input.password, {
      totpCode: input.totpCode || undefined,
      recoveryCode: input.recoveryCode || undefined,
    });
    const [current, settings] = await Promise.all([
      getFleetSession(),
      getSecuritySettings(),
    ]);
    setSession(current);
    setIdleTimeoutMinutes(settings.session_idle_timeout_minutes);
  }, []);

  const logout = useCallback(async () => {
    if (session) {
      await logoutFleet(session.csrf_token);
    }
    setSession(null);
  }, [session]);

  const view = resolveAccessView({
    installState,
    sessionReady: session !== null,
  });
  if (error) {
    return (
      <main className="entry-screen">
        <section className="entry-card" role="alert">
          <span className="eyebrow">Fleet access</span>
          <h1>서버 보안 상태를 확인하지 못했습니다.</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }
  if (view === "checking") {
    return <AccessLoading />;
  }
  if (view === "install") {
    return (
      <InstallWizardPage
        onInstalled={() => {
          setInstallState("complete");
          setSession(null);
        }}
      />
    );
  }
  if (view === "login") {
    return <LoginPage onLogin={authenticate} />;
  }

  return (
    <AuthSessionProvider
      value={{
        idleTimeoutMinutes,
        logout,
        session: session!,
        updateIdleTimeout: setIdleTimeoutMinutes,
        updateSession: setSession,
      }}
    >
      <MasterIdleGuard
        onIdle={() => void logout()}
        timeoutMinutes={idleTimeoutMinutes}
      >
        {children}
      </MasterIdleGuard>
    </AuthSessionProvider>
  );
}

function AccessLoading() {
  return (
    <main className="entry-screen">
      <section className="entry-card">
        <span className="eyebrow">Fleet access</span>
        <h1>설치·세션 상태를 확인하고 있습니다.</h1>
        <p>서버의 명시적 설치 상태와 보안 세션을 읽는 중입니다.</p>
      </section>
    </main>
  );
}
