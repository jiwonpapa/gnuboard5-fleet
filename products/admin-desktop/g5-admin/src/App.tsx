import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  LayoutDashboard,
  LogIn,
  Waypoints,
} from "lucide-react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { getMasterLockStatus, type CommandError } from "./api/client";
import { router } from "./app/router";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { APP_DISPLAY_NAME } from "./features/layout/branding";
import { useDesktopDevtoolsHotkey } from "./debug/devtools";
import { MasterIdleGuard } from "./features/master/MasterIdleGuard";
import { masterLockKey } from "./features/master/use-master-lock";
import { DevBootstrapCard } from "./features/dev/DevBootstrapCard";
import { ErrorBanner } from "./features/shared/ErrorBanner";

const secureStorageGateSessionKey = "g5-admin-secure-storage-gate";

function App() {
  const queryClient = useQueryClient();
  useDesktopDevtoolsHotkey(true);
  const [ready, setReady] = useState(false);
  const [bootPending, setBootPending] = useState(false);
  const [bootError, setBootError] = useState<CommandError | null>(null);
  const [gateAcknowledged, setGateAcknowledged] = useState(() => readSecureStorageGateState());
  const autoBootAttemptedRef = useRef(false);

  const bootRouter = useCallback(() => {
    if (bootPending) {
      return;
    }

    setBootPending(true);
    setBootError(null);
    void getMasterLockStatus()
      .then((status) => {
        queryClient.setQueryData(masterLockKey, status);
        setReady(true);
      })
      .catch((error: CommandError) => {
        setBootError(error);
      })
      .finally(() => {
        setBootPending(false);
      });
  }, [bootPending, queryClient]);

  useEffect(() => {
    if (
      !gateAcknowledged ||
      ready ||
      bootPending ||
      autoBootAttemptedRef.current
    ) {
      return;
    }

    autoBootAttemptedRef.current = true;
    const timerId = window.setTimeout(() => {
      bootRouter();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [bootPending, bootRouter, gateAcknowledged, ready]);

  function handleContinue() {
    writeSecureStorageGateState(true);
    autoBootAttemptedRef.current = true;
    setGateAcknowledged(true);
    bootRouter();
  }

  return (
    <>
      {ready ? (
        <>
          <MasterIdleGuard />
          <RouterProvider router={router} />
        </>
      ) : (
        <SecureStorageGate
          error={bootError}
          pending={bootPending}
          onContinue={handleContinue}
        />
      )}
      <Toaster richColors position="top-right" />
    </>
  );
}

function readSecureStorageGateState() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(secureStorageGateSessionKey) === "accepted";
  } catch {
    return false;
  }
}

function writeSecureStorageGateState(accepted: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      secureStorageGateSessionKey,
      accepted ? "accepted" : "pending",
    );
  } catch {
    // Ignore restricted session storage environments.
  }
}

export default App;

function SecureStorageGate(props: {
  error: CommandError | null;
  onContinue: () => void;
  pending: boolean;
}) {
  const introSteps = [
    {
      description: "운영 중인 그누보드 사이트를 하나의 흐름으로 묶습니다.",
      icon: Waypoints,
      title: "사이트 연결",
    },
    {
      description: "관리자 로그인 이후 작업 맥락을 이어서 유지합니다.",
      icon: LogIn,
      title: "관리자 로그인",
    },
    {
      description: "대시보드와 작업 탭으로 바로 진입해 운영을 시작합니다.",
      icon: LayoutDashboard,
      title: "운영 시작",
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 transition-colors">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)]">
          <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-card px-6 py-7 shadow-sm md:px-8 md:py-9">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-primary/10 via-transparent to-emerald-500/10" />
            <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  {APP_DISPLAY_NAME}
                </Badge>
                <div className="space-y-3">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Multi-site admin flow
                  </p>
                  <h1 className="max-w-3xl text-[2.4rem] font-semibold leading-[1.06] tracking-tight text-foreground md:text-[3.2rem]">
                    여러 그누보드 사이트를
                    <br />
                    한 흐름으로 운영하십시오.
                  </h1>
                  <p className="max-w-2xl text-[1.05rem] leading-7 text-muted-foreground md:text-[1.12rem]">
                    사이트 전환, 관리자 로그인, 운영 작업을 하나의 앱 맥락 안에서
                    자연스럽게 이어갑니다.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {introSteps.map((step) => {
                  const Icon = step.icon;

                  return (
                    <article
                      key={step.title}
                      className="rounded-2xl border border-border/80 bg-background/90 p-4 shadow-sm backdrop-blur-sm"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-[1rem] font-semibold tracking-tight text-foreground">
                          {step.title}
                        </h2>
                        <p className="text-[0.92rem] leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-muted/30 px-4 py-3.5">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Workflow
                  </p>
                  <p className="mt-2 text-[1rem] font-medium leading-7 text-foreground">
                    첫 사이트를 연결한 뒤 바로 로그인하고, 상단 작업 탭에서 필요한
                    운영 화면으로 이어집니다.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/30 px-4 py-3.5">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Focus
                  </p>
                  <p className="mt-2 text-[1rem] font-medium leading-7 text-foreground">
                    여러 사이트를 오가더라도 현재 작업 흐름을 잃지 않도록 화면 전환을
                    정리합니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader className="space-y-3 pb-5">
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                Intro
              </Badge>
              <div className="space-y-2">
                <CardTitle className="text-[1.7rem] tracking-tight">
                  시작할 준비가 되었습니다
                </CardTitle>
                <CardDescription className="text-[1rem] leading-7">
                  계속하기를 누르면 첫 연결 준비 후 사이트 등록 또는 로그인 단계로
                  이어집니다.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {props.error ? <ErrorBanner error={props.error} /> : null}

              <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-[0.96rem] leading-6 text-foreground">
                    처음 한 번만 흐름을 시작하면 현재 세션에서는 바로 다음 단계로
                    넘어갑니다.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-[0.96rem] leading-6 text-foreground">
                    사이트를 등록한 뒤 관리자 로그인과 운영 화면 진입이 한 번에
                    이어집니다.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <DevBootstrapCard onApplied={props.onContinue} />
                <Button
                  type="button"
                  size="lg"
                  className="w-full justify-between rounded-2xl px-4"
                  onClick={props.onContinue}
                  disabled={props.pending}
                >
                  {props.pending ? "준비 중..." : "계속하기"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-center text-[0.84rem] leading-6 text-muted-foreground">
                  준비가 끝나면 바로 첫 사이트 등록 또는 로그인 화면으로 이동합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
