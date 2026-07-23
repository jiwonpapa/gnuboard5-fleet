import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { Label } from "../../components/ui/label";
import { ErrorBanner } from "../shared/ErrorBanner";
import { EntryScreen } from "../layout/EntryScreen";
import { DevBootstrapCard } from "../dev/DevBootstrapCard";
import { buildMasterSetupRoute } from "../layout/navigation";
import { useFastUnlock } from "../security/use-fast-unlock";
import { resolvePostMasterAuthPath } from "./master-flow";
import { useMasterLock } from "./use-master-lock";

export function MasterUnlockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const masterLock = useMasterLock();
  const fastUnlock = useFastUnlock({
    enabled: masterLock.status?.passkey_enabled === true,
  });
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [nowEpoch, setNowEpoch] = useState(() => Math.floor(Date.now() / 1000));
  const nextPath = searchParams.get("next");
  const requiresTotp = masterLock.status?.requires_totp === true;
  const refetchMasterStatus = masterLock.refetchStatus;
  const unlockLockedUntilEpoch =
    masterLock.status?.unlock_locked_until_epoch === null ||
    masterLock.status?.unlock_locked_until_epoch === undefined
      ? null
      : Number(masterLock.status.unlock_locked_until_epoch);
  const unlockRetryAfterSeconds = unlockLockedUntilEpoch
    ? Math.max(0, unlockLockedUntilEpoch - nowEpoch)
    : 0;
  const unlockBlocked = !requiresTotp && unlockRetryAfterSeconds > 0;

  useEffect(() => {
    if (!unlockLockedUntilEpoch) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNowEpoch(Math.floor(Date.now() / 1000));
    }, 1_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [unlockLockedUntilEpoch]);

  useEffect(() => {
    if (!unlockLockedUntilEpoch || unlockRetryAfterSeconds > 0) {
      return;
    }

    void refetchMasterStatus();
  }, [refetchMasterStatus, unlockLockedUntilEpoch, unlockRetryAfterSeconds]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void masterLock
      .unlock({ password })
      .then((status) => {
        setPassword("");
        if (status.is_unlocked) {
          void navigate(resolvePostMasterAuthPath(nextPath), { replace: true });
        }
      })
      .catch(() => undefined);
  }

  function handleVerifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void masterLock
      .verifyTotp({ code: totpCode })
      .then((status) => {
        setTotpCode("");
        if (status.is_unlocked) {
          void navigate(resolvePostMasterAuthPath(nextPath), { replace: true });
        }
      })
      .catch(() => undefined);
  }

  function handleFastUnlock() {
    void masterLock
      .unlockFast()
      .then((status) => {
        if (status.is_unlocked) {
          void navigate(resolvePostMasterAuthPath(nextPath), { replace: true });
        }
      })
      .catch(() => undefined);
  }

  if (masterLock.isLoading) {
    return <MasterStatusLoadingCard />;
  }

  if (!masterLock.status?.is_configured) {
    return <Navigate to={buildMasterSetupRoute(nextPath)} replace />;
  }

  if (masterLock.status.is_unlocked) {
    return <Navigate to={resolvePostMasterAuthPath(nextPath)} replace />;
  }

  return (
    <EntryScreen
      title="앱 잠금을 해제해 주십시오."
      description="잠금을 해제하면 사이트 선택과 로그인으로 이어집니다."
    >
        <Card className="border-border/70 bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-[1.45rem]">
            {requiresTotp ? "OTP 확인" : "마스터 잠금 해제"}
          </CardTitle>
          <CardDescription className="text-[1rem] leading-7">
            {requiresTotp
              ? "등록된 OTP 6자리 코드를 입력해 주십시오."
              : "설정한 비밀번호를 입력해 주십시오."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {requiresTotp && masterLock.verifyTotpError ? (
            <ErrorBanner error={masterLock.verifyTotpError} />
          ) : null}
          {!requiresTotp && masterLock.unlockFastError ? (
            <ErrorBanner error={masterLock.unlockFastError} />
          ) : null}
          {!requiresTotp && masterLock.unlockError ? (
            <ErrorBanner error={masterLock.unlockError} />
          ) : null}

          {requiresTotp ? (
            <form className="space-y-5" onSubmit={handleVerifyTotp}>
              <div className="space-y-2">
                <Label htmlFor="master-unlock-totp">OTP 6자리 코드</Label>
                <InputGroup className="h-12 rounded-sm border-border/70">
                  <InputGroupAddon className="pl-3 pr-0">
                    <InputGroupText>
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="master-unlock-totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.currentTarget.value)}
                    disabled={masterLock.verifyTotpPending}
                  />
                </InputGroup>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    totpCode.trim().length !== 6 || masterLock.verifyTotpPending
                  }
                >
                  {masterLock.verifyTotpPending ? "확인 중..." : "OTP 확인"}
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="master-unlock-password">마스터 비밀번호</Label>
                <InputGroup className="h-12 rounded-sm border-border/70">
                  <InputGroupAddon className="pl-3 pr-0">
                    <InputGroupText>
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="master-unlock-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    autoComplete="current-password"
                    disabled={masterLock.unlockPending || unlockBlocked}
                  />
                </InputGroup>
              </div>

              <p className="text-[1rem] leading-7 text-muted-foreground">
                {unlockBlocked
                  ? `보안을 위해 잠금 해제를 일시 차단했습니다. ${formatRetryAfter(
                      unlockRetryAfterSeconds,
                    )} 후 다시 시도할 수 있습니다.`
                  : masterLock.status?.totp_enabled
                    ? "비밀번호 확인 후 OTP를 한 번 더 확인합니다."
                    : fastUnlock.status?.enabled
                      ? `${fastUnlock.status.label}로 빠르게 해제할 수 있습니다.`
                      : "빠른 잠금 해제는 보안 설정에서 추가할 수 있습니다."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    unlockBlocked ||
                    !fastUnlock.status?.enabled ||
                    !fastUnlock.status.available ||
                    masterLock.unlockFastPending
                  }
                  onClick={handleFastUnlock}
                >
                  {masterLock.unlockFastPending
                    ? "확인 중..."
                    : `${fastUnlock.status?.label ?? "빠른 잠금 해제"}`}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    unlockBlocked ||
                    password.trim().length === 0 ||
                    masterLock.unlockPending
                  }
                >
                  {masterLock.unlockPending ? "해제 중..." : "계속"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        </Card>
        <DevBootstrapCard
          onApplied={async () => {
            await masterLock.refetchStatus();
            await navigate(resolvePostMasterAuthPath(nextPath), { replace: true });
          }}
        />
    </EntryScreen>
  );
}

function MasterStatusLoadingCard() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <Card className="w-full border-border/70 bg-card">
          <CardHeader>
            <CardTitle>앱 잠금 상태를 확인하는 중입니다.</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            로컬 마스터 잠금과 다음 진입 경로를 점검하고 있습니다.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatRetryAfter(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0 && remainingSeconds > 0) {
    return `${minutes}분 ${remainingSeconds}초`;
  }

  if (minutes > 0) {
    return `${minutes}분`;
  }

  return `${remainingSeconds}초`;
}
