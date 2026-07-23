import type { UseFormReturn } from "react-hook-form";
import {
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import {
  getFieldDescription,
  getFieldLabel,
} from "../schema/useAdminFieldSchema";
import type { MenuFormValues } from "./admin-menus-form";

export function MenuFormFields(props: {
  disabled?: boolean;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<MenuFormValues>;
}) {
  return (
    <div className="grid gap-4">
      <TextInputControlField
        control={props.form.control}
        description={getFieldDescription(props.fieldSchema, "me_code")}
        disabled={props.disabled}
        label={getFieldLabel(props.fieldSchema, "me_code", "메뉴 코드")}
        name="me_code"
        placeholder="예: 200100"
      />
      <TextInputControlField
        control={props.form.control}
        description={getFieldDescription(props.fieldSchema, "me_name")}
        disabled={props.disabled}
        label={getFieldLabel(props.fieldSchema, "me_name", "메뉴 이름")}
        name="me_name"
        placeholder="예: 회원관리"
      />
      <TextInputControlField
        control={props.form.control}
        description={getFieldDescription(props.fieldSchema, "me_link")}
        disabled={props.disabled}
        label={getFieldLabel(props.fieldSchema, "me_link", "메뉴 링크")}
        name="me_link"
        placeholder="예: /bbs/member_list.php"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "me_target")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "me_target", "링크 target")}
          name="me_target"
          placeholder="_self"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "me_order")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "me_order", "표시 순서")}
          name="me_order"
          placeholder="0"
          type="number"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "me_use")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "me_use", "PC 노출")}
          name="me_use"
        />
        <ToggleControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "me_mobile_use")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "me_mobile_use", "모바일 노출")}
          name="me_mobile_use"
        />
      </div>
    </div>
  );
}
