import type { UseFormReturn } from "react-hook-form";
import { TextInputControlField } from "../admin/shared/AdminFormFields";
import type { PermissionFormValues } from "./admin-permissions-form";

export function PermissionFormFields(props: {
  disabled: boolean;
  form: UseFormReturn<PermissionFormValues>;
}) {
  return (
    <div className="space-y-4">
      <TextInputControlField
        control={props.form.control}
        disabled={props.disabled}
        label="mb_id"
        name="mb_id"
        placeholder="admin"
      />
      <TextInputControlField
        control={props.form.control}
        disabled={props.disabled}
        label="au_menu"
        name="au_menu"
        placeholder="100100"
      />
      <TextInputControlField
        control={props.form.control}
        description="`r`, `w`, `d` 조합만 허용합니다. 공백/쉼표는 자동 정리됩니다."
        disabled={props.disabled}
        label="au_auth"
        name="au_auth"
        placeholder="rwd"
      />
    </div>
  );
}
