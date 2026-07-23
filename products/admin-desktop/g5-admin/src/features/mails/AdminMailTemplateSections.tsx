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
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  TextAreaInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminMailDetail } from "../../types/AdminMailDetail";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminMailTemplate } from "../../types/AdminMailTemplate";
import {
  getFieldDescription,
  getFieldLabel,
} from "../schema/useAdminFieldSchema";
import type {
  AdminMailTemplateFormValues,
} from "./admin-mails-form";
import {
  formatLastOption,
  summarizePreviewHtml,
} from "./admin-mails-page-helpers";
import { Pager, SummaryField } from "./admin-mails-section-shared";

export function MailTemplatesSection(props: {
  currentPage: number;
  disabled: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSelectTemplate: (templateId: number) => void;
  selectedTemplateId: number | null;
  templates: AdminMailTemplate[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>템플릿 목록</CardTitle>
        <CardDescription>
          `/admin/mails` 기준 템플릿 목록입니다. 행을 누르면 우측 편집기와 발송 카드가
          즉시 같은 템플릿을 참조합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminDataTable
          columns={[
            {
              header: "템플릿",
              render: (mail) => (
                <div className="min-w-0 space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {mail.ma_subject ?? "(제목 없음)"}
                  </strong>
                  <span className="block text-xs text-muted-foreground">
                    #{mail.ma_id}
                  </span>
                </div>
              ),
            },
            {
              header: "최근 저장",
              render: (mail) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{mail.ma_time ?? "-"}</p>
                  <p className="break-all">{mail.ma_ip ?? "-"}</p>
                </div>
              ),
            },
            {
              header: "본문 미리",
              render: (mail) => (
                <p className="line-clamp-3 text-xs leading-6 text-muted-foreground">
                  {mail.ma_content ?? "-"}
                </p>
              ),
            },
          ]}
          emptyMessage="등록된 메일 템플릿이 없습니다."
          getRowKey={(mail) => String(mail.ma_id)}
          onRowClick={(mail) => props.onSelectTemplate(mail.ma_id)}
          rows={props.templates}
          selectedKey={
            props.selectedTemplateId === null
              ? null
              : String(props.selectedTemplateId)
          }
        />

        <Pager
          currentPage={props.currentPage}
          disabled={props.disabled}
          hasNext={props.hasNext}
          hasPrev={props.hasPrev}
          onNext={props.onNextPage}
          onPrev={props.onPrevPage}
        />
      </CardContent>
    </Card>
  );
}

export function MailTemplateEditorSection(props: {
  createPending: boolean;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  onCopyTemplateToCompose: () => void;
  onDeleteTemplate: () => void;
  onResetTemplate: () => void;
  onSubmit: () => void;
  selectedTemplate: AdminMailDetail | null;
  selectedTemplateId: number | null;
  templateForm: UseFormReturn<AdminMailTemplateFormValues>;
  updatePending: boolean;
}) {
  const subjectLabel = getFieldLabel(props.fieldSchema, "ma_subject", "메일 제목");
  const contentLabel = getFieldLabel(props.fieldSchema, "ma_content", "메일 본문");
  const subjectDescription = getFieldDescription(props.fieldSchema, "ma_subject");
  const contentDescription = getFieldDescription(props.fieldSchema, "ma_content");

  return (
    <Card className="xl:sticky xl:top-6 xl:self-start">
      <CardHeader>
        <CardTitle>템플릿 편집</CardTitle>
        <CardDescription>
          새 템플릿을 만들거나 현재 선택한 템플릿을 수정합니다. 발송 카드에서 `선택
          템플릿 사용`을 켜면 이 템플릿 ID가 그대로 전달됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={props.templateForm.handleSubmit(() => props.onSubmit())}
        >
          <TextInputControlField
            control={props.templateForm.control}
            description={subjectDescription}
            disabled={props.isBusy}
            label={subjectLabel}
            name="ma_subject"
            placeholder="운영 공지 제목"
          />
          <TextAreaInputControlField
            control={props.templateForm.control}
            description={contentDescription}
            disabled={props.isBusy}
            label={contentLabel}
            name="ma_content"
            placeholder="안녕하세요 {이름}"
            rows={10}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={props.isBusy}>
              {props.selectedTemplateId === null
                ? props.createPending
                  ? "생성 중..."
                  : "템플릿 생성"
                : props.updatePending
                  ? "수정 중..."
                  : "템플릿 수정"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy}
              onClick={props.onResetTemplate}
            >
              새 템플릿
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.selectedTemplate === null || props.isBusy}
              onClick={props.onCopyTemplateToCompose}
            >
              발송 카드로 복사
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={props.selectedTemplateId === null || props.isBusy}
              onClick={props.onDeleteTemplate}
            >
              템플릿 삭제
            </Button>
          </div>
        </form>

        {props.selectedTemplate ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">선택 템플릿 #{props.selectedTemplate.ma_id}</Badge>
              <Badge variant="outline">
                저장 {props.selectedTemplate.ma_time ?? "-"}
              </Badge>
            </div>

            <div className="grid gap-3">
              <SummaryField
                label="last_option"
                value={formatLastOption(props.selectedTemplate.last_option)}
              />
              <SummaryField
                label="preview_html"
                monospace={false}
                value={summarizePreviewHtml(props.selectedTemplate.preview_html)}
              />
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            템플릿을 선택하면 마지막 발송 옵션과 preview_html 요약을 함께 확인할 수
            있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
