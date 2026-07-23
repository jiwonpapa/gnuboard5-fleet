import { type UseFormReturn } from "react-hook-form";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import {
  TextAreaInputControlField,
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminMailDetail } from "../../types/AdminMailDetail";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { Pagination } from "../../types/Pagination";
import {
  getFieldDescription,
  getFieldLabel,
} from "../schema/useAdminFieldSchema";
import type { AdminMailComposeFormValues } from "./admin-mails-form";
import { renderTargetType } from "./admin-mails-page-helpers";
import { SummaryField } from "./admin-mails-section-shared";

export function MailSendSection(props: {
  composeForm: UseFormReturn<AdminMailComposeFormValues>;
  dryRun: boolean;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  latestSendSummary: string;
  latestTargetsSummary: string;
  onSubmit: () => void;
  recipientPagination: Pagination | null;
  selectedRecipientIds: string[];
  selectedTemplate: AdminMailDetail | null;
  sendPending: boolean;
  targetType: AdminMailComposeFormValues["target_type"];
  useSelectedTemplate: boolean;
}) {
  const fieldLabel = (
    name: "content" | "dry_run" | "subject" | "use_selected_template",
    fallback: string,
  ) => getFieldLabel(props.fieldSchema, name, fallback);
  const fieldDescription = (
    name: "content" | "dry_run" | "subject" | "use_selected_template",
  ) => getFieldDescription(props.fieldSchema, name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원 메일 발송</CardTitle>
        <CardDescription>
          기본값은 `직접 선택 회원 + 드라이런`입니다. 실제 발송 전에는 반드시
          미리보기로 대상 수를 확인해 주십시오.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={props.composeForm.handleSubmit(() => props.onSubmit())}
        >
          <ToggleControlField
            control={props.composeForm.control}
            description={fieldDescription("use_selected_template")}
            disabled={props.isBusy}
            label={fieldLabel("use_selected_template", "선택 템플릿 사용")}
            name="use_selected_template"
          />
          <ToggleControlField
            control={props.composeForm.control}
            description={fieldDescription("dry_run")}
            disabled={props.isBusy}
            label={fieldLabel("dry_run", "드라이런")}
            name="dry_run"
          />
          <TextInputControlField
            control={props.composeForm.control}
            description={fieldDescription("subject")}
            disabled={props.isBusy}
            label={fieldLabel("subject", "메일 제목")}
            name="subject"
            placeholder={
              props.useSelectedTemplate && props.selectedTemplate !== null
                ? "비워두면 선택 템플릿 제목 사용"
                : "직접 입력 제목"
            }
          />
          <TextAreaInputControlField
            control={props.composeForm.control}
            description={fieldDescription("content")}
            disabled={props.isBusy}
            label={fieldLabel("content", "메일 본문")}
            name="content"
            placeholder={
              props.useSelectedTemplate && props.selectedTemplate !== null
                ? "비워두면 선택 템플릿 본문 사용"
                : "직접 입력 본문"
            }
            rows={10}
          />

          <div className="flex flex-wrap gap-2">
            {props.useSelectedTemplate && props.selectedTemplate ? (
              <Badge variant="outline">
                템플릿 #{props.selectedTemplate.ma_id} 사용
              </Badge>
            ) : (
              <Badge variant="outline">직접 입력 발송</Badge>
            )}
            <Badge variant="outline">
              {props.targetType === "member"
                ? `선택 회원 ${props.selectedRecipientIds.length}명`
                : `최근 미리보기 ${props.recipientPagination?.total ?? 0}명`}
            </Badge>
          </div>

          <Button type="submit" disabled={props.isBusy}>
            {props.sendPending
              ? "처리 중..."
              : props.dryRun
                ? "드라이런 실행"
                : "메일 발송"}
          </Button>
        </form>

        <div className="grid gap-3">
          <SummaryField label="대상 방식" value={renderTargetType(props.targetType)} />
          <SummaryField label="최근 결과" value={props.latestSendSummary} />
          <SummaryField label="최근 대상" value={props.latestTargetsSummary} />
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminMailDeleteDialog(props: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  selectedTemplateId: number | null;
}) {
  return (
    <ConfirmActionDialog
      confirmLabel="삭제"
      description={`메일 템플릿 #${props.selectedTemplateId ?? "-"}를 삭제합니다. 되돌릴 수 없습니다.`}
      isPending={props.isPending}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
      open={props.open}
      title="메일 템플릿 삭제"
      variant="destructive"
    />
  );
}
