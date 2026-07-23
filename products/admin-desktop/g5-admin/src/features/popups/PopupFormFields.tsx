import {
  SelectInputControlField,
  TextAreaInputControlField,
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { UseFormReturn } from "react-hook-form";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import {
  popupDeviceOptions,
  popupDivisionOptions,
  type PopupFormValues,
} from "./admin-popups-form";

export function PopupFormFields(props: {
  disabled: boolean;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<PopupFormValues>;
}) {
  const divisionOptions =
    getFieldOptions(props.fieldSchema, "nw_division").length > 0
      ? getFieldOptions(props.fieldSchema, "nw_division")
      : [...popupDivisionOptions];
  const deviceOptions =
    getFieldOptions(props.fieldSchema, "nw_device").length > 0
      ? getFieldOptions(props.fieldSchema, "nw_device")
      : [...popupDeviceOptions];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_division")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_division", "구분")}
          name="nw_division"
          options={divisionOptions}
        />
        <SelectInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_device")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_device", "디바이스")}
          name="nw_device"
          options={deviceOptions}
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_begin_time")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_begin_time", "시작 시각")}
          name="nw_begin_time"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_end_time")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_end_time", "종료 시각")}
          name="nw_end_time"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_disable_hours")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_disable_hours", "비활성 시간")}
          name="nw_disable_hours"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_left")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_left", "좌측")}
          name="nw_left"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_top")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_top", "상단")}
          name="nw_top"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_height")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_height", "높이")}
          name="nw_height"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_width")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_width", "너비")}
          name="nw_width"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "nw_subject")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "nw_subject", "제목")}
          name="nw_subject"
        />
      </div>
      <TextAreaInputControlField
        control={props.form.control}
        description={getFieldDescription(props.fieldSchema, "nw_content")}
        disabled={props.disabled}
        label={getFieldLabel(props.fieldSchema, "nw_content", "본문")}
        name="nw_content"
        rows={6}
      />
      <ToggleControlField
        control={props.form.control}
        description={getFieldDescription(props.fieldSchema, "nw_content_html")}
        disabled={props.disabled}
        label={getFieldLabel(props.fieldSchema, "nw_content_html", "HTML 본문")}
        name="nw_content_html"
      />
    </div>
  );
}
