import type { UseFormReturn } from "react-hook-form";
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
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminSmsContactGroup } from "../../types/AdminSmsContactGroup";
import type { AdminSmsContactItem } from "../../types/AdminSmsContactItem";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import type { AdminSmsContactFormValues } from "./admin-sms-contacts-form";

export function AdminSmsContactEditorSection(props: {
  contactForm: UseFormReturn<AdminSmsContactFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  groups: AdminSmsContactGroup[];
  isBusy: boolean;
  onResetContactForm: () => void;
  onSubmitContact: () => void;
  onToggleDeleteContact: () => void;
  selectedContact: AdminSmsContactItem | null;
}) {
  const groupOptions = resolveGroupOptions(props.fieldSchema, props.groups);
  const fieldLabel = (
    name: keyof AdminSmsContactFormValues,
    fallback: string,
  ) => getFieldLabel(props.fieldSchema, name, fallback);
  const fieldDescription = (name: keyof AdminSmsContactFormValues) =>
    getFieldDescription(props.fieldSchema, name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>연락처 편집</CardTitle>
        <CardDescription>개별 연락처 생성/수정/삭제와 그룹 변경을 처리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4"
          onSubmit={props.contactForm.handleSubmit(() => props.onSubmitContact())}
        >
          <SelectInputControlField
            control={props.contactForm.control}
            description={fieldDescription("bg_no")}
            label={fieldLabel("bg_no", "소속 그룹")}
            name="bg_no"
            options={groupOptions}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputControlField
              control={props.contactForm.control}
              description={fieldDescription("mb_id")}
              label={fieldLabel("mb_id", "회원 아이디")}
              name="mb_id"
            />
            <TextInputControlField
              control={props.contactForm.control}
              description={fieldDescription("bk_name")}
              label={fieldLabel("bk_name", "이름")}
              name="bk_name"
            />
          </div>
          <TextInputControlField
            control={props.contactForm.control}
            description={fieldDescription("bk_hp")}
            label={fieldLabel("bk_hp", "휴대폰번호")}
            name="bk_hp"
          />
          <ToggleControlField
            control={props.contactForm.control}
            description={fieldDescription("bk_receipt")}
            label={fieldLabel("bk_receipt", "수신 동의")}
            name="bk_receipt"
          />
          <TextAreaInputControlField
            control={props.contactForm.control}
            description={fieldDescription("bk_memo")}
            label={fieldLabel("bk_memo", "메모")}
            name="bk_memo"
            rows={4}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={props.isBusy}>
              {props.selectedContact ? "연락처 수정" : "연락처 생성"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy}
              onClick={props.onResetContactForm}
            >
              새 연락처 폼
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={props.isBusy || props.selectedContact === null}
              onClick={props.onToggleDeleteContact}
            >
              연락처 삭제
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function resolveGroupOptions(
  fieldSchema: AdminSchemaDetail | null,
  groups: AdminSmsContactGroup[],
) {
  const options = getFieldOptions(fieldSchema, "bg_no");
  return options.length > 0
    ? options
    : groups.map((group) => ({
        label: `${group.bg_name} (#${group.bg_no})`,
        value: String(group.bg_no),
      }));
}
