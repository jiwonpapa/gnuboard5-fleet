import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { CommandError } from "../../api/client";
import { useTheme } from "../layout/theme";
import type { IdleTimeoutOption } from "./SecuritySettingsSections";
import { useFastUnlock } from "./use-fast-unlock";
import { useSecuritySettings } from "./use-security-settings";

const IDLE_TIMEOUT_OPTIONS: IdleTimeoutOption[] = [
  { label: "5분", value: 5 },
  { label: "15분", value: 15 },
  { label: "30분", value: 30 },
  { label: "60분", value: 60 },
  { label: "사용 안 함", value: null },
];

export function useSecuritySettingsWorkspace() {
  const { devMode } = useTheme();
  const security = useSecuritySettings();
  const fastUnlock = useFastUnlock();
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    current_totp_code: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [totpStartPassword, setTotpStartPassword] = useState("");
  const [totpDisablePassword, setTotpDisablePassword] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [idleTimeoutDialogOpen, setIdleTimeoutDialogOpen] = useState(false);
  const [pendingIdleTimeoutValue, setPendingIdleTimeoutValue] = useState<number | null>(null);
  const [pendingIdleTimeoutLabel, setPendingIdleTimeoutLabel] = useState("");
  const [idleTimeoutAuth, setIdleTimeoutAuth] = useState({
    current_password: "",
    current_totp_code: "",
  });
  const [idleTimeoutStepUpError, setIdleTimeoutStepUpError] = useState<CommandError | null>(
    null,
  );
  const [fastUnlockDialogMode, setFastUnlockDialogMode] = useState<
    "disable" | "enable" | null
  >(null);
  const [fastUnlockAuth, setFastUnlockAuth] = useState({
    current_password: "",
    current_totp_code: "",
  });
  const [fastUnlockStepUpError, setFastUnlockStepUpError] = useState<CommandError | null>(
    null,
  );
  const requiresTotp = security.settings?.totp_enabled ?? false;
  const showFastUnlockCard =
    devMode ||
    fastUnlock.status?.available === true ||
    fastUnlock.status?.enabled === true ||
    fastUnlock.statusError !== null;

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void security
      .changePassword({
        ...passwordForm,
        current_totp_code: toOptionalString(passwordForm.current_totp_code),
      })
      .then(() => {
        setPasswordForm({
          current_password: "",
          current_totp_code: "",
          new_password: "",
          new_password_confirm: "",
        });
        toast.success("마스터 비밀번호를 변경했습니다.");
      })
      .catch(() => undefined);
  }

  function handleStartTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void security
      .startTotpEnrollment({
        current_password: totpStartPassword,
        current_totp_code: null,
      })
      .then(() => {
        setTotpStartPassword("");
        setTotpCode("");
      })
      .catch(() => undefined);
  }

  function handleEnableTotp() {
    void security
      .enableTotp({ code: totpCode })
      .then(() => {
        setTotpCode("");
        security.clearTotpChallenge();
        toast.success("Google OTP를 활성화했습니다.");
      })
      .catch(() => undefined);
  }

  function handleDisableTotp() {
    void security
      .disableTotp({
        current_password: totpDisablePassword,
        current_totp_code: toOptionalString(totpDisableCode),
      })
      .then(() => {
        setTotpDisablePassword("");
        setTotpDisableCode("");
        toast.success("Google OTP를 비활성화했습니다.");
      })
      .catch(() => undefined);
  }

  function openIdleTimeoutDialog(option: IdleTimeoutOption) {
    setPendingIdleTimeoutValue(option.value);
    setPendingIdleTimeoutLabel(option.label);
    setIdleTimeoutAuth({
      current_password: "",
      current_totp_code: "",
    });
    setIdleTimeoutStepUpError(null);
    setIdleTimeoutDialogOpen(true);
  }

  function closeIdleTimeoutDialog() {
    setIdleTimeoutDialogOpen(false);
    setIdleTimeoutStepUpError(null);
    setIdleTimeoutAuth({
      current_password: "",
      current_totp_code: "",
    });
  }

  function handleIdleTimeoutStepUpConfirm() {
    void security
      .updateIdleTimeout({
        idle_timeout_minutes: pendingIdleTimeoutValue,
        auth: {
          current_password: idleTimeoutAuth.current_password,
          current_totp_code: toOptionalString(idleTimeoutAuth.current_totp_code),
        },
      })
      .then(() => {
        toast.success(`자동 잠금 시간을 ${pendingIdleTimeoutLabel}로 적용했습니다.`);
        closeIdleTimeoutDialog();
      })
      .catch((error) => {
        setIdleTimeoutStepUpError(toCommandError(error));
      });
  }

  function openFastUnlockDialog(mode: "disable" | "enable") {
    setFastUnlockDialogMode(mode);
    setFastUnlockAuth({
      current_password: "",
      current_totp_code: "",
    });
    setFastUnlockStepUpError(null);
  }

  function closeFastUnlockDialog() {
    setFastUnlockDialogMode(null);
    setFastUnlockStepUpError(null);
    setFastUnlockAuth({
      current_password: "",
      current_totp_code: "",
    });
  }

  function handleFastUnlockConfirm() {
    const input = {
      current_password: fastUnlockAuth.current_password,
      current_totp_code: toOptionalString(fastUnlockAuth.current_totp_code),
    };
    const action =
      fastUnlockDialogMode === "disable" ? fastUnlock.disable(input) : fastUnlock.enable(input);
    void action
      .then((status) => {
        const completedMode = fastUnlockDialogMode;
        closeFastUnlockDialog();
        toast.success(
          completedMode === "disable"
            ? `${status.label} 빠른 잠금 해제를 해제했습니다.`
            : `${status.label} 빠른 잠금 해제를 등록했습니다.`,
        );
      })
      .catch((error) => {
        setFastUnlockStepUpError(toCommandError(error));
      });
  }

  return {
    fastUnlock,
    fastUnlockAuth,
    fastUnlockDialogMode,
    fastUnlockStepUpError,
    handleDisableTotp,
    handleEnableTotp,
    handleFastUnlockConfirm,
    handlePasswordSubmit,
    handleStartTotp,
    idleTimeoutAuth,
    idleTimeoutDialogOpen,
    idleTimeoutOptions: IDLE_TIMEOUT_OPTIONS,
    idleTimeoutStepUpError,
    openFastUnlockDialog,
    openIdleTimeoutDialog,
    passwordForm,
    requiresTotp,
    security,
    setFastUnlockAuth,
    setIdleTimeoutAuth,
    setPasswordForm,
    setTotpCode,
    setTotpDisableCode,
    setTotpDisablePassword,
    setTotpStartPassword,
    showFastUnlockCard,
    totpCode,
    totpDisableCode,
    totpDisablePassword,
    totpStartPassword,
    closeFastUnlockDialog,
    closeIdleTimeoutDialog,
    handleIdleTimeoutStepUpConfirm,
  };
}

function toCommandError(error: unknown): CommandError | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "request_id" in error
  ) {
    return error as CommandError;
  }

  return null;
}

function toOptionalString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
