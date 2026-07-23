import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ErrorBanner } from "../shared/ErrorBanner";
import { StepUpAuthDialog } from "./StepUpAuthDialog";
import {
  FastUnlockCard,
  IdleTimeoutCard,
  PasswordChangeCard,
  SecurityStatusCard,
  SecurityStorageSummaryCard,
  TotpCard,
  TotpEnrollmentDialog,
} from "./SecuritySettingsSections";
import { useSecuritySettingsWorkspace } from "./use-security-settings-workspace";

export function SecuritySettingsWorkspace() {
  const model = useSecuritySettingsWorkspace();
  const {
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
    idleTimeoutOptions,
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
  } = model;

  if (security.isLoading) {
    return (
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>보안 설정을 불러오는 중입니다.</CardTitle>
          <CardDescription>로컬 앱 잠금 정책과 OTP 상태를 확인하고 있습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!security.settings) {
    return (
      <div className="space-y-6">
        {security.settingsError ? <ErrorBanner error={security.settingsError} /> : null}
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>보안 설정을 불러오지 못했습니다.</CardTitle>
            <CardDescription>잠시 후 다시 시도해 주십시오.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => void security.refetchSettings()}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className={
          showFastUnlockCard ? "grid gap-4 xl:grid-cols-[1.1fr_0.9fr]" : undefined
        }
      >
        <SecurityStatusCard settings={security.settings} />
        {showFastUnlockCard ? (
          <FastUnlockCard
            disablePending={fastUnlock.disablePending}
            enablePending={fastUnlock.enablePending}
            isLoading={fastUnlock.isLoading}
            onDisable={() => openFastUnlockDialog("disable")}
            onEnable={() => openFastUnlockDialog("enable")}
            status={fastUnlock.status}
            statusError={fastUnlock.statusError}
          />
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PasswordChangeCard
          changePasswordError={security.changePasswordError}
          changePasswordPending={security.changePasswordPending}
          currentPassword={passwordForm.current_password}
          currentTotpCode={passwordForm.current_totp_code}
          newPassword={passwordForm.new_password}
          newPasswordConfirm={passwordForm.new_password_confirm}
          onCurrentPasswordChange={(value) =>
            setPasswordForm((current) => ({ ...current, current_password: value }))
          }
          onCurrentTotpCodeChange={(value) =>
            setPasswordForm((current) => ({ ...current, current_totp_code: value }))
          }
          onNewPasswordChange={(value) =>
            setPasswordForm((current) => ({ ...current, new_password: value }))
          }
          onNewPasswordConfirmChange={(value) =>
            setPasswordForm((current) => ({ ...current, new_password_confirm: value }))
          }
          onSubmit={handlePasswordSubmit}
          requiresTotp={requiresTotp}
        />

        <IdleTimeoutCard
          onSelect={openIdleTimeoutDialog}
          options={idleTimeoutOptions}
          settings={security.settings}
          updateIdleTimeoutError={security.updateIdleTimeoutError}
          updateIdleTimeoutPending={security.updateIdleTimeoutPending}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TotpCard
          disableCode={totpDisableCode}
          disablePassword={totpDisablePassword}
          disableTotpError={security.disableTotpError}
          disableTotpPending={security.disableTotpPending}
          enableTotpError={security.enableTotpError}
          onDisableCodeChange={setTotpDisableCode}
          onDisablePasswordChange={setTotpDisablePassword}
          onDisableSubmit={(event) => {
            event.preventDefault();
            handleDisableTotp();
          }}
          onStartPasswordChange={setTotpStartPassword}
          onStartSubmit={handleStartTotp}
          settings={security.settings}
          startPassword={totpStartPassword}
          startTotpEnrollmentError={security.startTotpEnrollmentError}
          startTotpEnrollmentPending={security.startTotpEnrollmentPending}
        />

        <SecurityStorageSummaryCard />
      </section>

      <TotpEnrollmentDialog
        challenge={security.totpChallenge}
        code={totpCode}
        enableError={security.enableTotpError}
        isPending={security.enableTotpPending}
        onCancel={() => {
          setTotpCode("");
          security.clearTotpChallenge();
        }}
        onCodeChange={setTotpCode}
        onConfirm={handleEnableTotp}
      />
      <StepUpAuthDialog
        open={idleTimeoutDialogOpen}
        title="자동 잠금 시간을 변경하시겠습니까?"
        description="보안 정책 변경은 현재 마스터 비밀번호로 다시 확인합니다. Google OTP가 활성화된 경우 현재 OTP 코드도 함께 입력해 주십시오."
        confirmLabel="변경 적용"
        password={idleTimeoutAuth.current_password}
        totpCode={idleTimeoutAuth.current_totp_code}
        requiresTotp={requiresTotp}
        error={idleTimeoutStepUpError}
        isPending={security.updateIdleTimeoutPending}
        onPasswordChange={(value) =>
          setIdleTimeoutAuth((current) => ({ ...current, current_password: value }))
        }
        onTotpCodeChange={(value) =>
          setIdleTimeoutAuth((current) => ({ ...current, current_totp_code: value }))
        }
        onCancel={closeIdleTimeoutDialog}
        onConfirm={handleIdleTimeoutStepUpConfirm}
      />
      <StepUpAuthDialog
        open={fastUnlockDialogMode !== null}
        title={
          fastUnlockDialogMode === "disable"
            ? `${fastUnlock.status?.label ?? "빠른 잠금 해제"}를 폐기하시겠습니까?`
            : `${fastUnlock.status?.label ?? "빠른 잠금 해제"}를 등록하시겠습니까?`
        }
        description={
          fastUnlockDialogMode === "disable"
            ? "빠른 잠금 해제를 해제하면 이후에는 마스터 비밀번호로만 1차 잠금 해제를 진행합니다. 현재 비밀번호로 다시 확인해 주십시오."
            : "현재 비밀번호 확인 후 OS 인증창이 열리고, 성공하면 이 기기에 빠른 잠금 해제가 등록됩니다."
        }
        confirmLabel={fastUnlockDialogMode === "disable" ? "등록 폐기" : "등록 계속"}
        password={fastUnlockAuth.current_password}
        totpCode={fastUnlockAuth.current_totp_code}
        requiresTotp={requiresTotp}
        error={fastUnlockStepUpError ?? fastUnlock.enableError ?? fastUnlock.disableError}
        isPending={fastUnlock.enablePending || fastUnlock.disablePending}
        onPasswordChange={(value) =>
          setFastUnlockAuth((current) => ({ ...current, current_password: value }))
        }
        onTotpCodeChange={(value) =>
          setFastUnlockAuth((current) => ({ ...current, current_totp_code: value }))
        }
        onCancel={closeFastUnlockDialog}
        onConfirm={handleFastUnlockConfirm}
      />
    </div>
  );
}
