import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { Link2Off, PlugZap, ServerCog } from "lucide-react";
import type { SshSessionProfileSummary } from "../../types/SshSessionProfileSummary";
import type { SshSessionStatusResponse } from "../../types/SshSessionStatusResponse";

type SiteSshCurrentConnectionCardProps = {
  activeProfile: SshSessionProfileSummary | null;
  disconnectPending: boolean;
  isLoading: boolean;
  onManageProfiles: () => void;
  response: SshSessionStatusResponse | undefined;
  onDisconnect: () => void;
};

export function SiteSshCurrentConnectionCard({
  activeProfile,
  disconnectPending,
  isLoading,
  onManageProfiles,
  response,
  onDisconnect,
}: SiteSshCurrentConnectionCardProps) {
  const connected = response?.connected && activeProfile;

  return (
    <section className="rounded-[1rem] border border-border/70 bg-card/95 px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border",
            connected
              ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
              : "border-border/70 bg-background text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {connected ? <PlugZap className="size-4" /> : <Link2Off className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">SSH</span>
              <span>연결 상태를 확인하는 중입니다.</span>
            </div>
          ) : connected ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <strong className="truncate text-sm font-semibold text-foreground">
                {activeProfile.name}
              </strong>
              <Badge variant="outline" className="h-6 rounded-full px-2 text-[11px]">
                connected
              </Badge>
              <Badge variant="outline" className="h-6 rounded-full px-2 text-[11px]">
                {activeProfile.auth_type}
              </Badge>
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {activeProfile.username}@{activeProfile.host}:{activeProfile.port}
              </span>
              {response.server_key_algorithm ? (
                <span className="text-xs text-muted-foreground/90">
                  · {response.server_key_algorithm}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
              <strong className="font-semibold text-foreground">SSH</strong>
              <span className="text-muted-foreground">연결 없음</span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="shrink-0"
            title="SSH 프로필 및 연결 관리"
            aria-label="SSH 프로필 및 연결 관리"
            onClick={onManageProfiles}
          >
            <ServerCog className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="shrink-0"
            title="SSH 연결 해제"
            aria-label="SSH 연결 해제"
            disabled={!connected || disconnectPending}
            onClick={onDisconnect}
          >
            <Link2Off className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
