import {
  ReadOnlyField,
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { UseFormReturn } from "react-hook-form";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import {
  getFieldDescription,
  getFieldLabel,
} from "../schema/useAdminFieldSchema";
import { pollTextFields, type PollFormValues } from "./admin-polls-form";

export function PollFormFields(props: {
  disabled: boolean;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<PollFormValues>;
  includeCreateOnlyFields: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {pollTextFields.map((field) => (
          <TextInputControlField
            key={field}
            control={props.form.control}
            description={getFieldDescription(props.fieldSchema, field)}
            disabled={props.disabled}
            label={pollFieldLabel(props.fieldSchema, field)}
            name={field}
          />
        ))}
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "po_level")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "po_level", "참여 레벨")}
          name="po_level"
          type="number"
        />
        {props.includeCreateOnlyFields ? (
          <TextInputControlField
            control={props.form.control}
            description={getFieldDescription(props.fieldSchema, "po_date")}
            disabled={props.disabled}
            label={getFieldLabel(props.fieldSchema, "po_date", "투표일")}
            name="po_date"
            type="date"
          />
        ) : (
          <ReadOnlyField
            description={getFieldDescription(props.fieldSchema, "po_date")}
            label={getFieldLabel(props.fieldSchema, "po_date", "투표일")}
            value={props.form.getValues("po_date")}
          />
        )}
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "po_point")}
          disabled={props.disabled}
          label={getFieldLabel(props.fieldSchema, "po_point", "포인트")}
          name="po_point"
          type="number"
        />
      </div>
      <ToggleControlField
        control={props.form.control}
        description={getFieldDescription(props.fieldSchema, "po_use")}
        disabled={props.disabled}
        label={getFieldLabel(props.fieldSchema, "po_use", "사용 여부")}
        name="po_use"
      />
    </div>
  );
}

function pollFieldLabel(
  schema: AdminSchemaDetail | null,
  field: (typeof pollTextFields)[number],
) {
  const labels: Record<(typeof pollTextFields)[number], string> = {
    po_etc: "기타의견",
    po_poll1: "항목 1",
    po_poll2: "항목 2",
    po_poll3: "항목 3",
    po_poll4: "항목 4",
    po_poll5: "항목 5",
    po_poll6: "항목 6",
    po_poll7: "항목 7",
    po_poll8: "항목 8",
    po_poll9: "항목 9",
    po_subject: "투표 제목",
  };

  return getFieldLabel(schema, field, labels[field]);
}
