import type { FormEventHandler } from "react";
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
import type { SecuritySettings } from "../../types/SecuritySettings";
import { ErrorBanner } from "../shared/ErrorBanner";
import { OtpField, PasswordField, SecuritySummaryRow } from "./SecuritySettingsFields";

export function TotpCard(props: {
  disableTotpError: CommandError | null;
  disableTotpPending: boolean;
  enableTotpError: CommandError | null;
  onDisableCodeChange: (value: string) => void;
  onDisablePasswordChange: (value: string) => void;
  onDisableSubmit: FormEventHandler<HTMLFormElement>;
  onStartPasswordChange: (value: string) => void;
  onStartSubmit: FormEventHandler<HTMLFormElement>;
  settings: SecuritySettings;
  startPassword: string;
  startTotpEnrollmentError: CommandError | null;
  startTotpEnrollmentPending: boolean;
  disableCode: string;
  disablePassword: string;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Google OTP</CardTitle>
        <CardDescription>
          활성화하면 마스터 비밀번호 다음 단계로 6자리 OTP를 추가 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {props.startTotpEnrollmentError ? (
          <ErrorBanner error={props.startTotpEnrollmentError} />
        ) : null}
        {props.enableTotpError ? <ErrorBanner error={props.enableTotpError} /> : null}
        {props.disableTotpError ? <ErrorBanner error={props.disableTotpError} /> : null}

        <div className="flex items-center gap-3">
          <Badge variant={props.settings.totp_enabled ? "secondary" : "outline"}>
            {props.settings.totp_enabled ? "활성" : "비활성"}
          </Badge>
          <p className="text-sm text-muted-foreground">
            RFC 6238 기준 `otpauth://` QR로 등록합니다.
          </p>
        </div>

        {!props.settings.totp_enabled ? (
          <form className="space-y-4" onSubmit={props.onStartSubmit}>
            <PasswordField
              id="security-totp-start-password"
              label="현재 마스터 비밀번호"
              value={props.startPassword}
              onChange={props.onStartPasswordChange}
              disabled={props.startTotpEnrollmentPending}
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={props.startTotpEnrollmentPending || props.startPassword.trim().length === 0}
              >
                {props.startTotpEnrollmentPending ? "준비 중..." : "Google OTP 등록 시작"}
              </Button>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={props.onDisableSubmit}>
            <PasswordField
              id="security-totp-disable-password"
              label="현재 마스터 비밀번호"
              value={props.disablePassword}
              onChange={props.onDisablePasswordChange}
              disabled={props.disableTotpPending}
              autoComplete="current-password"
            />
            <OtpField
              id="security-totp-disable-code"
              label="현재 OTP 6자리 코드"
              value={props.disableCode}
              onChange={props.onDisableCodeChange}
              disabled={props.disableTotpPending}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  props.disableTotpPending ||
                  props.disablePassword.trim().length === 0 ||
                  props.disableCode.trim().length !== 6
                }
              >
                {props.disableTotpPending ? "해제 중..." : "Google OTP 비활성화"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function SecurityStorageSummaryCard() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>보안 저장소 요약</CardTitle>
        <CardDescription>현재 로컬 앱이 비밀을 저장하는 방식입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
        <SecuritySummaryRow title="마스터 비밀번호" value="Argon2 verifier만 SQLite 저장" />
        <SecuritySummaryRow title="DB 암호화 키" value="로컬 file 저장" />
        <SecuritySummaryRow title="OTP 비밀" value="SQLCipher 로컬 DB 저장" />
        <SecuritySummaryRow title="JWT 세션" value="로컬 file 저장" />
        <SecuritySummaryRow
          title="사이트 메타데이터"
          value="SQLCipher AES-256 DB 안에 저장"
        />
      </CardContent>
    </Card>
  );
}
