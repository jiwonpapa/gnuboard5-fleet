import type { FormEventHandler } from "react";
import { ShieldCheck, TimerReset, Vault } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { CommandError } from "../../api/client";
import type { FastUnlockStatus } from "../../types/FastUnlockStatus";
import type { SecuritySettings } from "../../types/SecuritySettings";
import { ErrorBanner } from "../shared/ErrorBanner";
import { OtpField, PasswordField, StatusPill } from "./SecuritySettingsFields";

export type IdleTimeoutOption = { label: string; value: number | null };

export function SecurityStatusCard(props: { settings: SecuritySettings }) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          로컬 앱 보안
        </Badge>
        <CardTitle className="text-2xl">로컬 앱 보안 설정</CardTitle>
        <CardDescription>
          마스터 비밀번호는 verifier만 저장하고, DB 암호화 키와 OTP 비밀은 로컬
          암호화 저장소 기준으로 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <StatusPill icon={Vault} title="DB 암호화" description="SQLCipher + file key" />
        <StatusPill
          icon={ShieldCheck}
          title="2차 인증"
          description={props.settings.totp_enabled ? "Google OTP 활성" : "선택형"}
        />
        <StatusPill
          icon={TimerReset}
          title="자동 잠금"
          description={
            props.settings.idle_timeout_minutes
              ? `${props.settings.idle_timeout_minutes}분`
              : "사용 안 함"
          }
        />
      </CardContent>
    </Card>
  );
}

export function FastUnlockCard(props: {
  disablePending: boolean;
  enablePending: boolean;
  isLoading: boolean;
  onDisable: () => void;
  onEnable: () => void;
  status: FastUnlockStatus | undefined;
  statusError: CommandError | null;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>빠른 잠금 해제</CardTitle>
        <CardDescription>
          등록 후에는 현재 비밀번호 대신 {props.status?.label ?? "빠른 잠금 해제"}로
          로컬 마스터 잠금의 1차 해제를 진행할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.statusError ? <ErrorBanner error={props.statusError} /> : null}
        <div className="rounded-sm border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
          {props.isLoading
            ? "기기 생체 인증 지원 상태를 확인하고 있습니다."
            : props.status?.available
              ? props.status.enabled
                ? `${props.status.label} 빠른 잠금 해제가 이 기기에 등록되어 있습니다. 잠금 해제 화면에서 1차 인증으로 사용할 수 있습니다.`
                : `${props.status.label} 빠른 잠금 해제를 등록할 수 있습니다. 등록 시 OS 인증창이 나타납니다.`
              : props.status?.error ?? "이 기기에서는 빠른 잠금 해제를 사용할 수 없습니다."}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={
              props.isLoading ||
              !props.status?.available ||
              props.status.enabled ||
              props.enablePending ||
              props.disablePending
            }
            onClick={props.onEnable}
          >
            {props.enablePending
              ? "등록 중..."
              : `${props.status?.label ?? "빠른 잠금 해제"} 등록`}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              props.isLoading ||
              !props.status?.enabled ||
              props.enablePending ||
              props.disablePending
            }
            onClick={props.onDisable}
          >
            {props.disablePending ? "해제 중..." : "등록 폐기"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PasswordChangeCard(props: {
  changePasswordError: CommandError | null;
  changePasswordPending: boolean;
  currentPassword: string;
  currentTotpCode: string;
  newPassword: string;
  newPasswordConfirm: string;
  onCurrentPasswordChange: (value: string) => void;
  onCurrentTotpCodeChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewPasswordConfirmChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  requiresTotp: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>마스터 비밀번호 변경</CardTitle>
        <CardDescription>
          현재 비밀번호를 확인한 뒤 새 비밀번호로 verifier를 다시 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {props.changePasswordError ? <ErrorBanner error={props.changePasswordError} /> : null}

        <form className="space-y-4" onSubmit={props.onSubmit}>
          <PasswordField
            id="security-current-password"
            label="현재 비밀번호"
            value={props.currentPassword}
            onChange={props.onCurrentPasswordChange}
            disabled={props.changePasswordPending}
            autoComplete="current-password"
          />
          <PasswordField
            id="security-next-password"
            label="새 비밀번호"
            value={props.newPassword}
            onChange={props.onNewPasswordChange}
            disabled={props.changePasswordPending}
            autoComplete="new-password"
          />
          <PasswordField
            id="security-next-password-confirm"
            label="새 비밀번호 확인"
            value={props.newPasswordConfirm}
            onChange={props.onNewPasswordConfirmChange}
            disabled={props.changePasswordPending}
            autoComplete="new-password"
          />
          {props.requiresTotp ? (
            <OtpField
              id="security-current-totp"
              label="현재 OTP 6자리 코드"
              value={props.currentTotpCode}
              onChange={props.onCurrentTotpCodeChange}
              disabled={props.changePasswordPending}
            />
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                props.changePasswordPending ||
                props.currentPassword.trim().length === 0 ||
                props.newPassword.trim().length === 0 ||
                props.newPasswordConfirm.trim().length === 0 ||
                (props.requiresTotp && props.currentTotpCode.trim().length !== 6)
              }
            >
              {props.changePasswordPending ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function IdleTimeoutCard(props: {
  onSelect: (option: IdleTimeoutOption) => void;
  options: IdleTimeoutOption[];
  settings: SecuritySettings;
  updateIdleTimeoutError: CommandError | null;
  updateIdleTimeoutPending: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>자동 잠금 시간</CardTitle>
        <CardDescription>
          idle 감지 후 앱 잠금을 다시 걸고 메모리 세션을 비웁니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.updateIdleTimeoutError ? <ErrorBanner error={props.updateIdleTimeoutError} /> : null}

        <div className="flex flex-wrap gap-2">
          {props.options.map((option) => {
            const selected =
              option.value === null
                ? props.settings.idle_timeout_minutes === null
                : props.settings.idle_timeout_minutes === option.value;
            return (
              <Button
                key={option.label}
                type="button"
                variant={selected ? "default" : "outline"}
                disabled={props.updateIdleTimeoutPending}
                onClick={() => props.onSelect(option)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        <div className="rounded-sm border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
          권장값은 15분입니다. 비활성화하면 장시간 열린 세션이 그대로 유지됩니다.
        </div>
      </CardContent>
    </Card>
  );
}
