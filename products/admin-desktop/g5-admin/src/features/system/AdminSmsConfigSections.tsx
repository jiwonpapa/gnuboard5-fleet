import type { FormEventHandler } from "react";
import { Info, Save, Undo2 } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import type { CommandError } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminSmsConfig } from "../../types/AdminSmsConfig";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { AdminSmsConfigFormValues } from "./admin-sms-config-form";

export function AdminSmsConfigFeatureUnavailableCard(props: {
  configError: CommandError | null;
  devMode: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS 기능을 사용할 수 없습니다.</CardTitle>
        <CardDescription>
          현재 서버에서 SMS 관리 API를 제공하지 않거나 비활성화했습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCallout>
          SMS 메뉴를 사용하려면 서버에 SMS REST API와 저장소 구성이 함께 준비되어야
          합니다.
        </InfoCallout>
        {props.devMode && props.configError ? (
          <ErrorBanner error={props.configError} />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminSmsConfigContent(props: {
  baseline: AdminSmsConfig | null;
  canSyncMembers: boolean;
  configError: CommandError | null;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<AdminSmsConfigFormValues>;
  hasChanges: boolean;
  isBusy: boolean;
  mutationError: CommandError | null;
  onReset: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSyncMembers: () => void;
  syncPending: boolean;
  updatePending: boolean;
}) {
  const saveLabel = props.updatePending ? "저장 중..." : "SMS 설정 저장";
  const smsUseOptions = resolveSelectOptions(
    props.fieldSchema,
    "cf_sms_use",
    [
      { label: "사용 안 함", value: "" },
      { label: "icode", value: "icode" },
    ],
  );
  const smsTypeOptions = resolveSelectOptions(
    props.fieldSchema,
    "cf_sms_type",
    [
      { label: "기본 SMS", value: "" },
      { label: "LMS", value: "LMS" },
    ],
  );
  const fieldLabel = (name: keyof AdminSmsConfigFormValues, fallback: string) =>
    getFieldLabel(props.fieldSchema, name, fallback);
  const fieldDescription = (name: keyof AdminSmsConfigFormValues) =>
    getFieldDescription(props.fieldSchema, name);

  return (
    <>
      {props.mutationError ? <ErrorBanner error={props.mutationError} /> : null}
      {props.configError ? <ErrorBanner error={props.configError} /> : null}

      <form className="space-y-5" onSubmit={props.onSubmit}>
        <ActionBar
          isBusy={props.isBusy}
          onReset={props.onReset}
          saveDisabled={!props.baseline || !props.hasChanges}
          saveLabel={saveLabel}
          sticky
        />

        <Card>
          <CardHeader>
            <CardTitle>공급자 연결</CardTitle>
            <CardDescription>
              사용 모드, 전송 타입, 인증 방식과 회신번호를 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                control={props.form}
                description={fieldDescription("cf_sms_use")}
                label={fieldLabel("cf_sms_use", "SMS 사용")}
                name="cf_sms_use"
                options={smsUseOptions}
              />
              <SelectField
                control={props.form}
                description={fieldDescription("cf_sms_type")}
                label={fieldLabel("cf_sms_type", "전송 타입")}
                name="cf_sms_type"
                options={smsTypeOptions}
              />
              <TextField
                control={props.form}
                description={fieldDescription("cf_icode_id")}
                error={props.form.formState.errors.cf_icode_id?.message}
                label={fieldLabel("cf_icode_id", "icode ID")}
                name="cf_icode_id"
                placeholder="icode-user"
              />
              <TextField
                control={props.form}
                description={fieldDescription("cf_icode_pw")}
                error={props.form.formState.errors.cf_icode_pw?.message}
                label={fieldLabel("cf_icode_pw", "icode 비밀번호")}
                name="cf_icode_pw"
                placeholder="secret"
                type="password"
              />
              <TextField
                control={props.form}
                description={fieldDescription("cf_icode_token_key")}
                error={props.form.formState.errors.cf_icode_token_key?.message}
                label={fieldLabel("cf_icode_token_key", "토큰 키")}
                name="cf_icode_token_key"
                placeholder="token-key"
              />
              <TextField
                control={props.form}
                description={fieldDescription("cf_icode_server_ip")}
                error={props.form.formState.errors.cf_icode_server_ip?.message}
                label={fieldLabel("cf_icode_server_ip", "서버 IP")}
                name="cf_icode_server_ip"
                placeholder="121.78.96.124"
              />
              <TextField
                control={props.form}
                description={fieldDescription("cf_icode_server_port")}
                error={props.form.formState.errors.cf_icode_server_port?.message}
                label={fieldLabel("cf_icode_server_port", "서버 포트")}
                name="cf_icode_server_port"
                placeholder="7295"
              />
              <TextField
                control={props.form}
                description={fieldDescription("cf_phone")}
                error={props.form.formState.errors.cf_phone?.message}
                label={fieldLabel("cf_phone", "회신번호")}
                name="cf_phone"
                placeholder="0212345678"
              />
            </div>

            <InfoCallout>
              설정 설명과 입력 폼을 분리해 표시합니다. 저장 시에는 변경된 필드만
              전송합니다.
            </InfoCallout>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>회원 연락처 동기화</CardTitle>
            <CardDescription>
              SMS 사용 모드가 활성일 때만 회원 연락처를 SMS 저장소로 동기화합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label="Provider"
                value={props.baseline?.provider_ready ?? false}
              />
              <StatusBadge
                label="Storage"
                value={props.baseline?.storage_ready ?? false}
              />
              <StatusBadge
                label="Token"
                value={props.baseline?.uses_token_key ?? false}
              />
              <StatusBadge
                label="Legacy"
                value={props.baseline?.uses_legacy_credentials ?? false}
              />
            </div>

            <InfoCallout>
              저장소가 준비되지 않았거나 SMS 사용이 꺼져 있으면 동기화를 실행하지
              않습니다.
            </InfoCallout>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={props.onSyncMembers}
                disabled={!props.canSyncMembers}
              >
                {props.syncPending ? "동기화 중..." : "회원 연락처 동기화"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ActionBar
          isBusy={props.isBusy}
          onReset={props.onReset}
          saveDisabled={!props.baseline || !props.hasChanges}
          saveLabel={saveLabel}
        />
      </form>
    </>
  );
}

function TextField(props: {
  control: UseFormReturn<AdminSmsConfigFormValues>;
  description?: string;
  error?: string;
  label: string;
  name: keyof AdminSmsConfigFormValues;
  placeholder?: string;
  type?: "password" | "text";
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{props.label}</Label>
          <Input
            id={field.name}
            type={props.type ?? "text"}
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
            placeholder={props.placeholder}
            ref={field.ref}
          />
          {props.description ? (
            <p className="text-xs text-muted-foreground">{props.description}</p>
          ) : null}
          {props.error ? (
            <p className="text-xs text-destructive">{props.error}</p>
          ) : null}
        </div>
      )}
    />
  );
}

function SelectField(props: {
  control: UseFormReturn<AdminSmsConfigFormValues>;
  description?: string;
  label: string;
  name: keyof AdminSmsConfigFormValues;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{props.label}</Label>
          <select
            id={field.name}
            className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
          >
            {props.options.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {props.description ? (
            <p className="text-xs text-muted-foreground">{props.description}</p>
          ) : null}
        </div>
      )}
    />
  );
}

function resolveSelectOptions(
  fieldSchema: AdminSchemaDetail | null,
  name: keyof AdminSmsConfigFormValues,
  fallback: Array<{ label: string; value: string }>,
) {
  const options = getFieldOptions(fieldSchema, name);
  return options.length > 0 ? options : fallback;
}

function ActionBar(props: {
  isBusy: boolean;
  onReset: () => void;
  saveDisabled: boolean;
  saveLabel: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 rounded-sm border border-border bg-card px-3 py-3",
        props.sticky && "xl:sticky xl:top-[6.45rem] xl:z-20",
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={props.onReset}
        disabled={props.isBusy}
      >
        <Undo2 className="h-4 w-4" />
        서버 값으로 되돌리기
      </Button>
      <Button type="submit" disabled={props.isBusy || props.saveDisabled}>
        <Save className="h-4 w-4" />
        {props.saveLabel}
      </Button>
    </div>
  );
}

function InfoCallout(props: { children: string }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm leading-6 text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{props.children}</span>
    </div>
  );
}

function StatusBadge(props: { label: string; value: boolean }) {
  return (
    <Badge variant={props.value ? "secondary" : "outline"}>
      {props.label}: {props.value ? "준비됨" : "대기"}
    </Badge>
  );
}
