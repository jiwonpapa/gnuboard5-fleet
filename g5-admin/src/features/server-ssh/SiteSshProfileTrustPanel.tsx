import { ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";
import type { CommandError } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { SshHostVerificationResponse } from "../../types/SshHostVerificationResponse";
import { ErrorBanner } from "../shared/ErrorBanner";

type SiteSshProfileTrustPanelProps = {
  error: CommandError | null;
  inspectPending: boolean;
  response: SshHostVerificationResponse | null;
  trustPending: boolean;
  onInspect: () => void;
  onTrust: () => void;
};

export function SiteSshProfileTrustPanel({
  error,
  inspectPending,
  response,
  trustPending,
  onInspect,
  onTrust,
}: SiteSshProfileTrustPanelProps) {
  const trustState = response?.trust_state ?? null;

  return (
    <div className="space-y-3 rounded-sm border border-border/70 bg-card/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm font-semibold text-foreground">
          서버 신뢰 상태
        </strong>
        {trustState ? (
          <Badge variant="outline">
            {trustState === "trusted"
              ? "trusted"
              : trustState === "missing"
                ? "missing"
                : "changed"}
          </Badge>
        ) : null}
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        터미널로 빠져나가지 않고 여기서 서버 지문을 확인하고 `~/.ssh/known_hosts`
        신뢰를 등록합니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={inspectPending || trustPending}
          onClick={onInspect}
        >
          서버 지문 확인
        </Button>
        <Button
          type="button"
          disabled={response?.trust_state !== "missing" || inspectPending || trustPending}
          onClick={onTrust}
        >
          이 서버 신뢰
        </Button>
      </div>

      {response ? (
        <div className="space-y-2 rounded-sm border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground">
          <p className="font-medium text-foreground">
            {response.username}@{response.host}:{response.port}
          </p>
          <p>알고리즘: {response.server_key_algorithm}</p>
          <p className="break-all">지문: {response.server_key_fingerprint}</p>
          {response.trust_state === "trusted" ? (
            <p className="flex items-start gap-2 text-foreground">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0" />
              이 서버는 현재 앱 신뢰 목록에 등록되어 있습니다.
            </p>
          ) : null}
          {response.trust_state === "missing" ? (
            <p className="flex items-start gap-2 text-foreground">
              <ShieldQuestion className="mt-1 h-4 w-4 shrink-0" />
              아직 신뢰되지 않은 서버입니다. 지문을 확인한 뒤 `이 서버 신뢰`를 눌러
              앱에서 바로 등록해 주십시오.
            </p>
          ) : null}
          {response.trust_state === "changed" ? (
            <p className="flex items-start gap-2 text-destructive">
              <ShieldX className="mt-1 h-4 w-4 shrink-0" />
              기존 known_hosts와 서버 키가 다릅니다. 자동 덮어쓰기는 막아두었습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <ErrorBanner error={error} /> : null}
    </div>
  );
}
