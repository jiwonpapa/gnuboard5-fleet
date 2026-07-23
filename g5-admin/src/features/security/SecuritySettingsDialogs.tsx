import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { Label } from "../../components/ui/label";
import type { CommandError } from "../../api/client";
import type { TotpEnrollmentChallenge } from "../../types/TotpEnrollmentChallenge";
import { ErrorBanner } from "../shared/ErrorBanner";

export function TotpEnrollmentDialog(props: {
  challenge: TotpEnrollmentChallenge | undefined;
  code: string;
  enableError: CommandError | null;
  isPending: boolean;
  onCancel: () => void;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
}) {
  if (!props.challenge) {
    return null;
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
        aria-labelledby="totp-enrollment-dialog-title"
        className="w-full max-w-xl rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Google OTP Enrollment
          </p>
          <h2
            id="totp-enrollment-dialog-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            OTP 앱에 QR 코드를 등록해 주십시오.
          </h2>
          <p className="text-sm leading-6 break-words text-muted-foreground">
            QR을 스캔한 뒤 6자리 코드를 입력하면 로컬 마스터 잠금에 OTP 2차 인증이
            활성화됩니다.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="flex items-center justify-center rounded-[1.5rem] border border-border/70 bg-background p-4">
            <QRCodeSVG value={props.challenge.otpauth_uri} size={180} />
          </div>

          <div className="space-y-4">
            <div className="rounded-[1rem] border border-border/70 bg-muted/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                수동 입력 키
              </p>
              <code className="mt-2 block break-all text-sm text-foreground">
                {props.challenge.manual_entry_key}
              </code>
            </div>

            {props.enableError ? <ErrorBanner error={props.enableError} /> : null}

            <div className="space-y-2">
              <Label htmlFor="security-totp-code">OTP 6자리 코드</Label>
              <InputGroup className="h-12 rounded-[1rem] border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="security-totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={props.code}
                  onChange={(event) => props.onCodeChange(event.currentTarget.value)}
                  disabled={props.isPending}
                />
              </InputGroup>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onCancel}>
            닫기
          </Button>
          <Button
            type="button"
            disabled={props.isPending || props.code.trim().length !== 6}
            onClick={props.onConfirm}
          >
            {props.isPending ? "활성화 중..." : "OTP 활성화"}
          </Button>
        </div>
      </div>
    </div>
  );
}
