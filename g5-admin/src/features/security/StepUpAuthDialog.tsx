import { useEffect, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import type { CommandError } from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { Label } from "../../components/ui/label";
import { ErrorBanner } from "../shared/ErrorBanner";

export function StepUpAuthDialog(props: {
  backupPassword?: string;
  backupPasswordConfirm?: string;
  backupPasswordConfirmLabel?: string;
  backupPasswordDescription?: string;
  backupPasswordLabel?: string;
  confirmLabel: string;
  description: string;
  error: CommandError | null;
  isPending: boolean;
  onBackupPasswordChange?: (value: string) => void;
  onBackupPasswordConfirmChange?: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onPasswordChange: (value: string) => void;
  onTotpCodeChange: (value: string) => void;
  open: boolean;
  password: string;
  requiresBackupPassword?: boolean;
  requiresTotp: boolean;
  title: string;
  totpCode: string;
}) {
  const { onCancel, open } = props;
  const backupPassword = props.backupPassword ?? "";
  const backupPasswordConfirm = props.backupPasswordConfirm ?? "";
  const requiresBackupPassword = props.requiresBackupPassword ?? false;
  const requiresBackupPasswordConfirm =
    requiresBackupPassword && props.onBackupPasswordConfirmChange !== undefined;
  const backupPasswordMismatch =
    requiresBackupPasswordConfirm && backupPassword !== backupPasswordConfirm;

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

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={props.onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-up-auth-dialog-title"
        className="w-full max-w-xl rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sensitive Action Re-auth
          </p>
          <h2
            id="step-up-auth-dialog-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            {props.title}
          </h2>
          <p className="text-sm leading-6 break-words text-muted-foreground">
            {props.description}
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {props.error ? <ErrorBanner error={props.error} /> : null}

          <div className="space-y-2">
            <Label htmlFor="step-up-current-password">
              현재 마스터 비밀번호
            </Label>
            <InputGroup className="h-12 rounded-[1rem] border-border/70">
              <InputGroupAddon className="pl-3 pr-0">
                <InputGroupText>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="step-up-current-password"
                type="password"
                autoComplete="current-password"
                value={props.password}
                onChange={(event) =>
                  props.onPasswordChange(event.currentTarget.value)
                }
                disabled={props.isPending}
              />
            </InputGroup>
          </div>

          {props.requiresTotp ? (
            <div className="space-y-2">
              <Label htmlFor="step-up-current-totp">현재 OTP 6자리 코드</Label>
              <InputGroup className="h-12 rounded-[1rem] border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="step-up-current-totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={props.totpCode}
                  onChange={(event) =>
                    props.onTotpCodeChange(event.currentTarget.value)
                  }
                  disabled={props.isPending}
                />
              </InputGroup>
            </div>
          ) : null}

          {requiresBackupPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="step-up-backup-password">
                  {props.backupPasswordLabel ?? "백업 암호"}
                </Label>
                <InputGroup className="h-12 rounded-[1rem] border-border/70">
                  <InputGroupAddon className="pl-3 pr-0">
                    <InputGroupText>
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="step-up-backup-password"
                    type="password"
                    autoComplete="new-password"
                    value={backupPassword}
                    onChange={(event) =>
                      props.onBackupPasswordChange?.(event.currentTarget.value)
                    }
                    disabled={props.isPending}
                  />
                </InputGroup>
                {props.backupPasswordDescription ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    {props.backupPasswordDescription}
                  </p>
                ) : null}
              </div>

              {requiresBackupPasswordConfirm ? (
                <div className="space-y-2">
                  <Label htmlFor="step-up-backup-password-confirm">
                    {props.backupPasswordConfirmLabel ?? "백업 암호 확인"}
                  </Label>
                  <InputGroup className="h-12 rounded-[1rem] border-border/70">
                    <InputGroupAddon className="pl-3 pr-0">
                      <InputGroupText>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="step-up-backup-password-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={backupPasswordConfirm}
                      onChange={(event) =>
                        props.onBackupPasswordConfirmChange?.(
                          event.currentTarget.value
                        )
                      }
                      disabled={props.isPending}
                    />
                  </InputGroup>
                  {backupPasswordMismatch ? (
                    <p className="text-xs leading-5 text-rose-600">
                      백업 암호 확인이 일치하지 않습니다.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={props.onCancel}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                props.isPending ||
                props.password.trim().length === 0 ||
                (props.requiresTotp && props.totpCode.trim().length !== 6) ||
                (requiresBackupPassword &&
                  backupPassword.trim().length === 0) ||
                backupPasswordMismatch
              }
            >
              {props.isPending ? "확인 중..." : props.confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
