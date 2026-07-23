import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FolderOpen, KeyRound, LoaderCircle, LockKeyhole, Server } from "lucide-react";
import type { CommandError } from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { Label } from "../../components/ui/label";
import type { SshAuthType } from "../../types/SshAuthType";
import type { SshProfile } from "../../types/SshProfile";
import { ErrorBanner } from "../shared/ErrorBanner";
import { selectSshPrivateKeyPath } from "./site-ssh-profile-helpers";

type DialogMode = "create" | "edit";

type FormState = {
  authType: SshAuthType;
  clearKeyPassphrase: boolean;
  clearPassword: boolean;
  host: string;
  keyPassphrase: string;
  keyPath: string;
  name: string;
  password: string;
  port: string;
  username: string;
};

function createFormState(profile?: SshProfile | null): FormState {
  return {
    authType: profile?.auth_type ?? "key",
    clearKeyPassphrase: false,
    clearPassword: false,
    host: profile?.host ?? "",
    keyPassphrase: "",
    keyPath: profile?.key_path ?? "",
    name: profile?.name ?? "",
    password: "",
    port: String(profile?.port ?? 22),
    username: profile?.username ?? "",
  };
}

export function SiteSshProfileDialog(props: {
  error: CommandError | null;
  isPending: boolean;
  mode: DialogMode;
  onCancel: () => void;
  onSubmit: (input: {
    auth_type: SshAuthType;
    clear_key_passphrase: boolean;
    clear_password: boolean;
    host: string;
    key_passphrase: string | null;
    key_path: string | null;
    name: string;
    password: string | null;
    port: number;
    username: string;
  }) => void;
  open: boolean;
  profile?: SshProfile | null;
  siteName: string;
}) {
  const { onCancel, open } = props;
  const [form, setForm] = useState<FormState>(() => createFormState(props.profile));

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel, open]);

  const isEdit = props.mode === "edit";
  const keyMode = form.authType === "key";
  const passwordMode = form.authType === "password";
  const agentMode = form.authType === "agent";
  const requiresPassword = !isEdit && passwordMode;
  const canSubmit = useMemo(() => {
    if (
      form.name.trim().length < 2 ||
      form.host.trim().length < 2 ||
      form.username.trim().length < 1
    ) {
      return false;
    }

    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return false;
    }

    if (agentMode) {
      return false;
    }

    if (keyMode && form.keyPath.trim().length === 0) {
      return false;
    }

    if (requiresPassword && form.password.trim().length === 0) {
      return false;
    }

    return true;
  }, [agentMode, form, keyMode, requiresPassword]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSubmit({
      auth_type: form.authType,
      clear_key_passphrase: form.clearKeyPassphrase,
      clear_password: form.clearPassword,
      host: form.host.trim(),
      key_passphrase: form.keyPassphrase.trim() || null,
      key_path: form.keyPath.trim() || null,
      name: form.name.trim(),
      password: form.password.trim() || null,
      port: Number(form.port),
      username: form.username.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={props.onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ssh-profile-dialog-title"
        className="w-full max-w-2xl rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Site Server Profiles
          </p>
          <h2
            id="ssh-profile-dialog-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            {isEdit ? "SSH 프로필 수정" : "SSH 프로필 추가"}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {props.siteName} 사이트에 연결할 SSH 프로필을 로컬 암호화 저장소에 저장합니다.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {props.error ? <ErrorBanner error={props.error} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="프로필 이름">
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  value={form.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((current) => ({ ...current, name: value }));
                  }}
                  placeholder="예: 운영서버"
                />
              </InputGroup>
            </Field>
            <Field label="인증 방식">
              <select
                className="flex h-12 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={form.authType}
                onChange={(event) => {
                  const value = event.currentTarget.value as SshAuthType;
                  setForm((current) => ({
                    ...current,
                    authType: value,
                    clearKeyPassphrase: false,
                    clearPassword: false,
                  }));
                }}
              >
                <option value="key">키 파일</option>
                <option value="password">비밀번호</option>
                <option value="agent" disabled>
                  SSH Agent (준비 중)
                </option>
              </select>
            </Field>
            <Field label="호스트">
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  value={form.host}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((current) => ({ ...current, host: value }));
                  }}
                  placeholder="ssh.example.com"
                />
              </InputGroup>
            </Field>
            <Field label="포트">
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  inputMode="numeric"
                  value={form.port}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((current) => ({ ...current, port: value }));
                  }}
                  placeholder="22"
                />
              </InputGroup>
            </Field>
            <Field label="계정">
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  value={form.username}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((current) => ({ ...current, username: value }));
                  }}
                  placeholder="deploy"
                />
              </InputGroup>
            </Field>
            {keyMode ? (
              <Field label="개인키 경로" className="md:col-span-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <InputGroup className="h-12 flex-1 rounded-sm border-border/70">
                    <InputGroupAddon className="pl-3 pr-0">
                      <InputGroupText>
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      value={form.keyPath}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setForm((current) => ({ ...current, keyPath: value }));
                      }}
                      placeholder="~/.ssh/id_ed25519"
                    />
                  </InputGroup>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 shrink-0"
                    onClick={() => {
                      void selectSshPrivateKeyPath().then((selectedPath) => {
                        if (!selectedPath) {
                          return;
                        }
                        setForm((current) => ({ ...current, keyPath: selectedPath }));
                      });
                    }}
                  >
                    <FolderOpen className="h-4 w-4" />
                    파일 선택
                  </Button>
                </div>
              </Field>
            ) : null}
            {passwordMode ? (
              <Field label={isEdit ? "새 비밀번호" : "SSH 비밀번호"} className="md:col-span-2">
                <InputGroup className="h-12 rounded-sm border-border/70">
                  <InputGroupAddon className="pl-3 pr-0">
                    <InputGroupText>
                      <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="password"
                    value={form.password}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setForm((current) => ({
                        ...current,
                        clearPassword: false,
                        password: value,
                      }));
                    }}
                    placeholder={isEdit ? "비워 두면 기존 비밀번호 유지" : "비밀번호 입력"}
                  />
                </InputGroup>
              </Field>
            ) : null}
            {keyMode ? (
              <Field
                label={isEdit ? "새 키 passphrase" : "키 passphrase"}
                className="md:col-span-2"
              >
                <InputGroup className="h-12 rounded-sm border-border/70">
                  <InputGroupAddon className="pl-3 pr-0">
                    <InputGroupText>
                      <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="password"
                    value={form.keyPassphrase}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setForm((current) => ({
                        ...current,
                        clearKeyPassphrase: false,
                        keyPassphrase: value,
                      }));
                    }}
                    placeholder={
                      isEdit ? "비워 두면 기존 passphrase 유지" : "없으면 비워 두십시오."
                    }
                  />
                </InputGroup>
              </Field>
            ) : null}
          </div>

          {agentMode ? (
            <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-950 dark:text-amber-100">
              SSH Agent 인증은 아직 구현 전입니다. 현재는 키 파일 또는 비밀번호 프로필만
              저장할 수 있습니다.
            </div>
          ) : null}

          {isEdit && passwordMode && props.profile?.has_password ? (
            <label className="flex items-center gap-3 rounded-sm border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.clearPassword}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setForm((current) => ({
                    ...current,
                    clearPassword: checked,
                    password: "",
                  }));
                }}
              />
              저장된 비밀번호를 삭제합니다.
            </label>
          ) : null}

          {isEdit && keyMode && props.profile?.has_key_passphrase ? (
            <label className="flex items-center gap-3 rounded-sm border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.clearKeyPassphrase}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setForm((current) => ({
                    ...current,
                    clearKeyPassphrase: checked,
                    keyPassphrase: "",
                  }));
                }}
              />
              저장된 key passphrase를 삭제합니다.
            </label>
          ) : null}

          <div className="rounded-sm border border-primary/15 bg-primary/[0.04] px-4 py-3 text-xs leading-5 text-muted-foreground">
            프로필 본문과 SSH 비밀값은 SQLCipher 로컬 DB 안에 저장됩니다.
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={props.onCancel}>
              취소
            </Button>
            <Button type="submit" disabled={props.isPending || !canSubmit}>
              {props.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "프로필 저장" : "프로필 추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field(props: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`grid gap-2 ${props.className ?? ""}`}>
      <Label>{props.label}</Label>
      {props.children}
    </label>
  );
}
