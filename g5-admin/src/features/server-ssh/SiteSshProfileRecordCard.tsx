import { KeyRound, Server, ShieldCheck } from "lucide-react";
import type { CommandError } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { SshProfile } from "../../types/SshProfile";
import type { SshHostVerificationResponse } from "../../types/SshHostVerificationResponse";
import { SiteSshProfileTrustPanel } from "./SiteSshProfileTrustPanel";

export function SiteSshProfileRecordCard(props: {
  connectPending: boolean;
  disconnectPending: boolean;
  hostVerificationError: CommandError | null;
  hostVerificationResponse: SshHostVerificationResponse | null;
  inspectPending: boolean;
  isActive: boolean;
  profile: SshProfile;
  showHostVerification: boolean;
  trustPending: boolean;
  trustState: SshHostVerificationResponse["trust_state"] | null;
  onConnect: () => void;
  onDelete: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onInspectHost: () => void;
  onTrustHost: () => void;
}) {
  const {
    connectPending,
    disconnectPending,
    hostVerificationError,
    hostVerificationResponse,
    inspectPending,
    isActive,
    profile,
    showHostVerification,
    trustPending,
    trustState,
    onConnect,
    onDelete,
    onDisconnect,
    onEdit,
    onInspectHost,
    onTrustHost,
  } = props;

  return (
    <div
      className={`space-y-4 rounded-[1.25rem] border p-5 ${
        isActive
          ? "border-primary/35 bg-primary/[0.05]"
          : "border-border/70 bg-background"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-lg font-semibold text-foreground">{profile.name}</strong>
            <Badge variant="outline">{profile.auth_type}</Badge>
            {isActive ? <Badge variant="outline">현재 연결</Badge> : null}
            {trustState === "trusted" ? (
              <Badge variant="outline">known_hosts trusted</Badge>
            ) : null}
            {profile.has_password ? (
              <Badge variant="outline">비밀번호 저장됨</Badge>
            ) : null}
            {profile.has_key_passphrase ? (
              <Badge variant="outline">passphrase 저장됨</Badge>
            ) : null}
          </div>
          <div className="space-y-1 text-sm leading-6 text-muted-foreground">
            <p className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              {profile.username}@{profile.host}:{profile.port}
            </p>
            {profile.key_path ? (
              <p className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {profile.key_path}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <Button
              type="button"
              variant="outline"
              disabled={disconnectPending}
              onClick={onDisconnect}
            >
              연결 해제
            </Button>
          ) : (
            <Button type="button" disabled={connectPending} onClick={onConnect}>
              연결
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={inspectPending || trustPending}
            onClick={onInspectHost}
          >
            <ShieldCheck className="h-4 w-4" />
            서버 지문 확인
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            수정
          </Button>
          <Button type="button" variant="outline" onClick={onDelete}>
            삭제
          </Button>
        </div>
      </div>

      {showHostVerification ? (
        <SiteSshProfileTrustPanel
          error={hostVerificationError}
          inspectPending={inspectPending}
          response={hostVerificationResponse}
          trustPending={trustPending}
          onInspect={onInspectHost}
          onTrust={onTrustHost}
        />
      ) : null}
    </div>
  );
}
