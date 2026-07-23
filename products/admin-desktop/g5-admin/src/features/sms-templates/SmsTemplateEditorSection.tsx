import type { UseFormReturn } from "react-hook-form";
import { MessageSquareMore } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  SelectInputControlField,
  TextAreaInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import type { AdminSmsTemplateFormValues } from "./admin-sms-templates-form";

export function SmsTemplateEditorSection(props: {
  activeGroupId: number | null;
  fieldSchema: AdminSchemaDetail | null;
  groupOptions: Array<{ label: string; value: string }>;
  isBusy: boolean;
  onDeleteTemplateDialogOpen: () => void;
  onTemplateReset: () => void;
  onTemplateSubmit: (values: AdminSmsTemplateFormValues) => void;
  selectedTemplateId: number | null;
  templateForm: UseFormReturn<AdminSmsTemplateFormValues>;
}) {
  const groupOptions = resolveGroupOptions(props.fieldSchema, props.groupOptions);
  const fieldLabel = (
    name: keyof AdminSmsTemplateFormValues,
    fallback: string,
  ) => getFieldLabel(props.fieldSchema, name, fallback);
  const fieldDescription = (name: keyof AdminSmsTemplateFormValues) =>
    getFieldDescription(props.fieldSchema, name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>템플릿 편집</CardTitle>
        <CardDescription>
          그룹, 제목, 내용을 수정합니다. 새 템플릿은 선택된 그룹을 기본값으로
          사용합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4"
          onSubmit={props.templateForm.handleSubmit(props.onTemplateSubmit)}
        >
          <SelectInputControlField
            control={props.templateForm.control}
            description={fieldDescription("fg_no")}
            label={fieldLabel("fg_no", "소속 그룹")}
            name="fg_no"
            options={groupOptions}
          />
          <TextInputControlField
            control={props.templateForm.control}
            description={fieldDescription("fo_name")}
            label={fieldLabel("fo_name", "템플릿 이름")}
            name="fo_name"
          />
          <TextAreaInputControlField
            control={props.templateForm.control}
            description={fieldDescription("fo_content")}
            label={fieldLabel("fo_content", "템플릿 내용")}
            name="fo_content"
            rows={7}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={props.isBusy}>
              {props.selectedTemplateId === null ? "템플릿 생성" : "템플릿 수정"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy}
              onClick={props.onTemplateReset}
            >
              새 템플릿 폼
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={props.isBusy || props.selectedTemplateId === null}
              onClick={props.onDeleteTemplateDialogOpen}
            >
              템플릿 삭제
            </Button>
          </div>
        </form>

        {props.selectedTemplateId === null ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <MessageSquareMore className="mt-0.5 size-4 shrink-0" />
              <p>
                기존 템플릿을 선택하면 수정 모드로 전환됩니다. 현재는 그룹{" "}
                {props.activeGroupId === null ? "기본값" : `#${props.activeGroupId}`} 기준의
                새 템플릿을 작성합니다.
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function resolveGroupOptions(
  fieldSchema: AdminSchemaDetail | null,
  fallback: Array<{ label: string; value: string }>,
) {
  const options = getFieldOptions(fieldSchema, "fg_no");
  return options.length > 0 ? options : fallback;
}
