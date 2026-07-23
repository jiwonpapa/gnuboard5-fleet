import { useMemo, useState } from "react";
import { Download, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { CommandError } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { SshProfile } from "../../types/SshProfile";
import { SiteSshProfileDialog } from "../server-profiles/SiteSshProfileDialog";
import {
  parseSshProfilesJson,
  serializeSshProfilesToJson,
} from "../server-profiles/site-ssh-profile-json";
import {
  exportSshProfilesJsonFile,
  importSshProfilesJsonFile,
} from "../server-profiles/site-ssh-profile-json-file";
import { useSiteSshProfiles } from "../server-profiles/use-site-ssh-profiles";
import { SiteSshProfileJsonDialog } from "./SiteSshProfileJsonDialog";
import { SiteSshProfileRecordCard } from "./SiteSshProfileRecordCard";
import { useSiteSshHostVerification } from "./use-site-ssh-host-verification";
import { useSiteSshShell } from "./use-site-ssh-shell";
import { useSiteSshSession } from "./use-site-ssh-session";

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; profile: SshProfile }
  | null;
type JsonDialogState = "export" | "import" | null;

export function SiteSshProfilesModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string | null;
  siteName: string;
}) {
  if (!props.open || !props.siteId) {
    return null;
  }

  return <SiteSshProfilesModalBody {...props} siteId={props.siteId} />;
}

function SiteSshProfilesModalBody(props: {
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName: string;
}) {
  const sshProfiles = useSiteSshProfiles(props.siteId);
  const sshSession = useSiteSshSession(props.siteId);
  const sshShell = useSiteSshShell();
  const hostVerification = useSiteSshHostVerification();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<SshProfile | null>(null);
  const [hostVerificationProfileId, setHostVerificationProfileId] = useState<string | null>(
    null,
  );
  const [jsonDialogState, setJsonDialogState] = useState<JsonDialogState>(null);
  const [jsonPending, setJsonPending] = useState(false);
  const exportJson = useMemo(
    () => serializeSshProfilesToJson(sshProfiles.profiles),
    [sshProfiles.profiles],
  );

  function handleCloseModal() {
    hostVerification.reset();
    props.onOpenChange(false);
  }

  const activeProfileId = sshSession.response?.active_profile?.ssh_profile_id ?? null;
  const activeHostVerificationResponse =
    hostVerificationProfileId !== null &&
    hostVerification.response?.ssh_profile_id === hostVerificationProfileId
      ? hostVerification.response
      : null;

  async function handleConnect(sshProfileId: string) {
    try {
      hostVerification.reset();
      setHostVerificationProfileId(null);
      const response = await sshSession.connect({
        site_id: props.siteId,
        ssh_profile_id: sshProfileId,
      });
      if (!response.shell_open) {
        await sshShell.openShell({
          site_id: props.siteId,
        });
      }
      toast.success(`${response.active_profile?.name ?? "SSH 프로필"} 연결 완료`);
      handleCloseModal();
    } catch (error) {
      const commandError = error as CommandError;
      if (commandError.code === "ssh_host_verification_error") {
        sshSession.resetConnectError();
        await handleInspectHost(sshProfileId);
      }
    }
  }

  async function handleInspectHost(sshProfileId: string) {
    hostVerification.reset();
    setHostVerificationProfileId(sshProfileId);

    try {
      await hostVerification.inspect({
        site_id: props.siteId,
        ssh_profile_id: sshProfileId,
      });
    } catch {
      // ErrorBanner renders payload details.
    }
  }

  async function handleTrustHost(sshProfileId: string) {
    const currentResponse =
      activeHostVerificationResponse?.ssh_profile_id === sshProfileId
        ? activeHostVerificationResponse
        : null;
    if (!currentResponse) {
      return;
    }

    try {
      await hostVerification.trust({
        site_id: props.siteId,
        ssh_profile_id: sshProfileId,
        expected_fingerprint: currentResponse.server_key_fingerprint,
      });
      toast.success("SSH 서버 신뢰를 등록했습니다.");
      await handleConnect(sshProfileId);
    } catch {
      // ErrorBanner renders payload details.
    }
  }

  async function handleDisconnect() {
    try {
      await sshSession.disconnect({ site_id: props.siteId });
      toast.success("SSH 연결을 해제했습니다.");
    } catch {
      // ErrorBanner renders payload details.
    }
  }

  async function handleSubmit(input: {
    auth_type: "agent" | "key" | "password";
    clear_key_passphrase: boolean;
    clear_password: boolean;
    host: string;
    key_passphrase: string | null;
    key_path: string | null;
    name: string;
    password: string | null;
    port: number;
    username: string;
  }) {
    try {
      if (dialogState?.kind === "edit") {
        await sshProfiles.updateProfile({
          ...input,
          port: input.port,
          site_id: props.siteId,
          ssh_profile_id: dialogState.profile.id,
        });
        toast.success("SSH 프로필을 저장했습니다.");
      } else {
        await sshProfiles.addProfile({
          ...input,
          port: input.port,
          site_id: props.siteId,
        });
        toast.success("SSH 프로필을 추가했습니다.");
      }
      setDialogState(null);
    } catch {
      // ErrorBanner renders payload details.
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    try {
      await sshProfiles.deleteProfile({
        site_id: props.siteId,
        ssh_profile_id: deleteTarget.id,
      });
      toast.success("SSH 프로필을 삭제했습니다.");
      setDeleteTarget(null);
    } catch {
      // ErrorBanner renders payload details.
    }
  }

  async function handleCopyJson(value: string) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("clipboard-unavailable");
      }
      toast.success("SSH 프로필 JSON을 클립보드에 복사했습니다.");
      setJsonDialogState(null);
    } catch {
      toast.error("클립보드 복사에 실패했습니다. 텍스트를 직접 복사해 주십시오.");
    }
  }

  async function handleImportJson(source: string) {
    setJsonPending(true);
    try {
      const importedProfiles = parseSshProfilesJson(source);
      for (const imported of importedProfiles) {
        const existingProfile =
          sshProfiles.profiles.find((profile) => profile.id === imported.id) ??
          sshProfiles.profiles.find(
            (profile) =>
              profile.name === imported.name &&
              profile.host === imported.host &&
              profile.port === imported.port &&
              profile.username === imported.username,
          ) ??
          null;

        if (existingProfile) {
          await sshProfiles.updateProfile({
            auth_type: imported.auth_type,
            clear_key_passphrase: false,
            clear_password: false,
            host: imported.host,
            key_passphrase: null,
            key_path: imported.key_path,
            name: imported.name,
            password: null,
            port: imported.port,
            site_id: props.siteId,
            ssh_profile_id: existingProfile.id,
            username: imported.username,
          });
          continue;
        }

        await sshProfiles.addProfile({
          auth_type: imported.auth_type,
          host: imported.host,
          key_passphrase: null,
          key_path: imported.key_path,
          name: imported.name,
          password: null,
          port: imported.port,
          site_id: props.siteId,
          username: imported.username,
        });
      }

      toast.success(`SSH 프로필 ${importedProfiles.length}건을 가져왔습니다.`);
      setJsonDialogState(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SSH 프로필 JSON을 가져오지 못했습니다.";
      toast.error(message);
    } finally {
      setJsonPending(false);
    }
  }

  async function handleExportJsonFile(value: string) {
    setJsonPending(true);
    try {
      const savedPath = await exportSshProfilesJsonFile({
        siteName: props.siteName,
        source: value,
      });
      if (!savedPath) {
        return;
      }
      toast.success("SSH 프로필 JSON 파일을 저장했습니다.");
      setJsonDialogState(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SSH 프로필 JSON 파일 저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setJsonPending(false);
    }
  }

  async function handleLoadJsonFile() {
    setJsonPending(true);
    try {
      const source = await importSshProfilesJsonFile();
      if (source === null) {
        return;
      }
      await handleImportJson(source);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SSH 프로필 JSON 파일을 읽지 못했습니다.";
      toast.error(message);
    } finally {
      setJsonPending(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
        role="presentation"
        onClick={handleCloseModal}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ssh-profiles-modal-title"
          className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Site SSH
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="ssh-profiles-modal-title"
                  className="text-2xl font-semibold tracking-tight text-foreground"
                >
                  SSH 프로필 및 연결
                </h2>
                <Badge variant="outline">{props.siteName}</Badge>
                {sshSession.response?.connected ? (
                  <Badge variant="outline">connected</Badge>
                ) : (
                  <Badge variant="outline">disconnected</Badge>
                )}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                앱 안에서 SSH 프로필을 관리하고, 현재 연결할 서버를 선택합니다. 연결에
                성공하면 모달을 닫고 바로 SSH 터미널로 이어집니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setJsonDialogState("export")}
              >
                <Download className="h-4 w-4" />
                JSON 내보내기
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setJsonDialogState("import")}
              >
                <Upload className="h-4 w-4" />
                JSON 가져오기
              </Button>
              <Button
                type="button"
                onClick={() => setDialogState({ kind: "create" })}
              >
                <Plus className="h-4 w-4" />
                프로필 추가
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                <X className="h-4 w-4" />
                닫기
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {sshSession.responseError ? <ErrorBanner error={sshSession.responseError} /> : null}
              {sshSession.connectError ? <ErrorBanner error={sshSession.connectError} /> : null}
              {sshSession.disconnectError ? (
                <ErrorBanner error={sshSession.disconnectError} />
              ) : null}
              {sshShell.openShellError ? <ErrorBanner error={sshShell.openShellError} /> : null}
              {sshProfiles.responseError ? <ErrorBanner error={sshProfiles.responseError} /> : null}

              {sshProfiles.isLoading ? (
                <div className="rounded-sm border border-border/70 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
                  SSH 프로필을 불러오는 중입니다.
                </div>
              ) : sshProfiles.profiles.length === 0 ? (
                <div className="rounded-sm border border-dashed border-border/70 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
                  아직 등록된 SSH 프로필이 없습니다. 먼저 프로필을 추가해 주십시오.
                </div>
              ) : (
                sshProfiles.profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId;
                  const showHostVerification = hostVerificationProfileId === profile.id;
                  const trustState =
                    showHostVerification && activeHostVerificationResponse
                      ? activeHostVerificationResponse.trust_state
                      : null;

                  return (
                    <SiteSshProfileRecordCard
                      key={profile.id}
                      connectPending={sshSession.connectPending}
                      disconnectPending={sshSession.disconnectPending}
                      hostVerificationError={hostVerification.error}
                      hostVerificationResponse={activeHostVerificationResponse}
                      inspectPending={hostVerification.inspectPending}
                      isActive={isActive}
                      profile={profile}
                      showHostVerification={showHostVerification}
                      trustPending={hostVerification.trustPending}
                      trustState={trustState}
                      onConnect={() => {
                        void handleConnect(profile.id);
                      }}
                      onDelete={() => setDeleteTarget(profile)}
                      onDisconnect={() => {
                        void handleDisconnect();
                      }}
                      onEdit={() => setDialogState({ kind: "edit", profile })}
                      onInspectHost={() => {
                        void handleInspectHost(profile.id);
                      }}
                      onTrustHost={() => {
                        void handleTrustHost(profile.id);
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <SiteSshProfileDialog
        key={
          dialogState?.kind === "edit"
            ? `edit-${dialogState.profile.id}`
            : dialogState?.kind === "create"
              ? "create"
              : "closed"
        }
        error={sshProfiles.addProfileError ?? sshProfiles.updateProfileError}
        isPending={sshProfiles.addProfilePending || sshProfiles.updateProfilePending}
        mode={dialogState?.kind === "edit" ? "edit" : "create"}
        open={dialogState !== null}
        profile={dialogState?.kind === "edit" ? dialogState.profile : null}
        siteName={props.siteName}
        onCancel={() => setDialogState(null)}
        onSubmit={(input) => {
          void handleSubmit(input);
        }}
      />

      <SiteSshProfileJsonDialog
        key={`${jsonDialogState ?? "closed"}-${sshProfiles.profiles.length}`}
        description={
          jsonDialogState === "export"
            ? "현재 사이트에 등록된 SSH 프로필 메타데이터를 JSON으로 복사합니다. 비밀번호와 키 passphrase는 포함하지 않습니다."
            : "내보낸 JSON을 붙여 넣으면 현재 사이트의 SSH 프로필로 병합합니다. 기존 프로필과 같으면 갱신하고, 없으면 새로 추가합니다."
        }
        initialValue={jsonDialogState === "export" ? exportJson : ""}
        mode={jsonDialogState === "export" ? "export" : "import"}
        open={jsonDialogState !== null}
        pending={jsonPending}
        onCancel={() => setJsonDialogState(null)}
        onImportFromFile={() => handleLoadJsonFile()}
        onConfirm={(value) => {
          if (jsonDialogState === "export") {
            return handleCopyJson(value);
          }
          return handleImportJson(value);
        }}
        onSaveToFile={(value) => handleExportJsonFile(value)}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        title="SSH 프로필 삭제"
        description={
          deleteTarget
            ? `${deleteTarget.name} 프로필과 저장된 로컬 비밀값을 함께 삭제합니다.`
            : ""
        }
        confirmLabel="삭제"
        variant="destructive"
        isPending={sshProfiles.deleteProfilePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
      {sshProfiles.deleteProfileError && deleteTarget ? (
        <div className="fixed bottom-6 right-6 z-[95] w-full max-w-md">
          <ErrorBanner error={sshProfiles.deleteProfileError} />
        </div>
      ) : null}
    </>
  );
}
