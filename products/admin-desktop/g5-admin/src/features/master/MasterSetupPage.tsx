import { useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
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
import {
  resolveMasterGatePath,
  resolvePostMasterAuthPath,
} from "./master-flow";
import { useMasterLock } from "./use-master-lock";

export function MasterSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const masterLock = useMasterLock();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const nextPath = searchParams.get("next");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void masterLock
      .setup({
        password,
        password_confirm: passwordConfirm,
      })
      .then(() => {
        void navigate(resolvePostMasterAuthPath(nextPath), { replace: true });
      })
      .catch(() => undefined);
  }

  if (masterLock.isLoading) {
    return <MasterStatusLoadingCard />;
  }

  if (masterLock.status?.is_configured && !masterLock.status.is_unlocked) {
    return (
      <Navigate
        to={resolveMasterGatePath(masterLock.status, nextPath) ?? "/"}
        replace
      />
    );
  }

  if (masterLock.status?.is_unlocked) {
    return <Navigate to={resolvePostMasterAuthPath(nextPath)} replace />;
  }

  const canSubmit =
    password.trim().length > 0 &&
    passwordConfirm.trim().length > 0 &&
    password === passwordConfirm;

  return (
    <EntryScreen
      title="앱 잠금을 설정해 주십시오."
      description="처음 한 번만 설정하면 됩니다. 사이트 관리자 비밀번호와는 별개입니다."
    >
        <Card className="border-border/70 bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-[1.55rem]">마스터 잠금 설정</CardTitle>
          <CardDescription className="text-[1rem] leading-7">
            앱을 열 때 사용할 비밀번호를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {masterLock.setupError ? (
            <ErrorBanner error={masterLock.setupError} />
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="master-password">마스터 비밀번호</Label>
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="master-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  autoComplete="new-password"
                  disabled={masterLock.setupPending}
                />
              </InputGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="master-password-confirm">비밀번호 확인</Label>
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="master-password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) =>
                    setPasswordConfirm(event.currentTarget.value)
                  }
                  autoComplete="new-password"
                  disabled={masterLock.setupPending}
                />
              </InputGroup>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!canSubmit || masterLock.setupPending}
              >
                {masterLock.setupPending ? "설정 중..." : "잠금 생성"}
              </Button>
            </div>
          </form>
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
            로컬 마스터 잠금과 첫 진입 경로를 점검하고 있습니다.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
