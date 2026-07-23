import { useWatch, type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  ReadOnlyField,
  SelectInputControlField,
  TextAreaInputControlField,
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminBoard } from "../../types/AdminBoard";
import type { BoardFormValues } from "./admin-boards-form";
import {
  boardExtraFlagFieldNames,
  boardExtraSections,
  boardExtraTextFieldNames,
  getBoardFieldFallbackLabel,
  type BoardExtraFlagFieldName,
  type BoardExtraTextFieldName,
  isBoardExtraFlagFieldName,
  isBoardExtraTextFieldName,
} from "./board-field-meta";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";

const boardExtraFieldNameSet = new Set<string>([
  ...boardExtraTextFieldNames,
  ...boardExtraFlagFieldNames,
]);

export function BoardFormFields(props: {
  disabled: boolean;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<BoardFormValues>;
  includeTableField: boolean;
  readOnlyBoard?: AdminBoard | null;
}) {
  const boTable = useWatch({
    control: props.form.control,
    name: "bo_table",
  });
  const extraSections = resolveBoardExtraSections(props.fieldSchema);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {props.includeTableField ? (
          <TextInputControlField
            control={props.form.control}
            description={getFieldDescription(props.fieldSchema, "bo_table")}
            disabled={props.disabled}
            label={getFieldLabel(
              props.fieldSchema,
              "bo_table",
              getBoardFieldFallbackLabel("bo_table"),
            )}
            name="bo_table"
          />
        ) : (
          <ReadOnlyField
            description="게시판 코드는 생성 후 변경하지 않습니다."
            label={getFieldLabel(
              props.fieldSchema,
              "bo_table",
              getBoardFieldFallbackLabel("bo_table"),
            )}
            value={boTable}
          />
        )}
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_subject")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_subject",
            getBoardFieldFallbackLabel("bo_subject"),
          )}
          name="bo_subject"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "gr_id")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "gr_id",
            getBoardFieldFallbackLabel("gr_id"),
          )}
          name="gr_id"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_category_list")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_category_list",
            getBoardFieldFallbackLabel("bo_category_list"),
          )}
          name="bo_category_list"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_read_level")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_read_level",
            getBoardFieldFallbackLabel("bo_read_level"),
          )}
          name="bo_read_level"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_write_level")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_write_level",
            getBoardFieldFallbackLabel("bo_write_level"),
          )}
          name="bo_write_level"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_comment_level")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_comment_level",
            getBoardFieldFallbackLabel("bo_comment_level"),
          )}
          name="bo_comment_level"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_download_level")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_download_level",
            getBoardFieldFallbackLabel("bo_download_level"),
          )}
          name="bo_download_level"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_upload_count")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_upload_count",
            getBoardFieldFallbackLabel("bo_upload_count"),
          )}
          name="bo_upload_count"
          type="number"
        />
        <TextInputControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_upload_size")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_upload_size",
            getBoardFieldFallbackLabel("bo_upload_size"),
          )}
          name="bo_upload_size"
          type="number"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_use_category")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_use_category",
            getBoardFieldFallbackLabel("bo_use_category"),
          )}
          name="bo_use_category"
        />
        <ToggleControlField
          control={props.form.control}
          description={getFieldDescription(props.fieldSchema, "bo_use_secret")}
          disabled={props.disabled}
          label={getFieldLabel(
            props.fieldSchema,
            "bo_use_secret",
            getBoardFieldFallbackLabel("bo_use_secret"),
          )}
          name="bo_use_secret"
        />
      </div>

      {props.readOnlyBoard ? (
        <div className="grid gap-4 md:grid-cols-3">
          <ReadOnlyField
            description={getFieldDescription(props.fieldSchema, "bo_count_write")}
            label={getFieldLabel(props.fieldSchema, "bo_count_write", "원글 수")}
            value={props.readOnlyBoard.bo_count_write}
          />
          <ReadOnlyField
            description={getFieldDescription(props.fieldSchema, "bo_count_comment")}
            label={getFieldLabel(props.fieldSchema, "bo_count_comment", "댓글 수")}
            value={props.readOnlyBoard.bo_count_comment}
          />
          <ReadOnlyField
            description={getFieldDescription(props.fieldSchema, "bo_notice")}
            label={getFieldLabel(props.fieldSchema, "bo_notice", "공지글 ID 목록")}
            value={props.readOnlyBoard.extra.bo_notice}
          />
        </div>
      ) : null}

      {extraSections.map((section) => (
        <Card key={section.id} className="border border-border/70 bg-muted/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description ? (
              <CardDescription>{section.description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {section.fields
                .filter(isBoardExtraTextFieldName)
                .map((field) =>
                  renderBoardExtraTextField(field, props.form, props.disabled, props.fieldSchema),
                )}
            </div>
            {section.fields.some(isBoardExtraFlagFieldName) ? (
              <div className="grid gap-3 md:grid-cols-2">
                {section.fields
                  .filter(isBoardExtraFlagFieldName)
                  .map((field) => (
                    <ToggleControlField
                      key={field}
                      control={props.form.control}
                      description={getFieldDescription(props.fieldSchema, field)}
                      disabled={props.disabled}
                      label={getFieldLabel(
                        props.fieldSchema,
                        field,
                        getBoardFieldFallbackLabel(field),
                      )}
                      name={`extraFlags.${field}` as const}
                    />
                  ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function resolveBoardExtraSections(schema: AdminSchemaDetail | null) {
  if (!schema) {
    return boardExtraSections;
  }

  return schema.sections
    .map((section) => ({
      id: section.key,
      title: section.label,
      description: section.description ?? "",
      fields: section.fields
        .map((field) => field.name)
        .filter(
          (
            field,
          ): field is
            | BoardExtraTextFieldName
            | BoardExtraFlagFieldName =>
            boardExtraFieldNameSet.has(field),
        ),
    }))
    .filter((section) => section.fields.length > 0);
}

function renderBoardExtraTextField(
  field: BoardExtraTextFieldName,
  form: UseFormReturn<BoardFormValues>,
  disabled: boolean,
  schema: AdminSchemaDetail | null,
) {
  const label = getFieldLabel(schema, field, getBoardFieldFallbackLabel(field));
  const description = getFieldDescription(schema, field);
  const options = getFieldOptions(schema, field);
  const fieldSchema = schema?.fields_by_name?.[field] ?? null;

  if (fieldSchema?.input_type === "textarea") {
    return (
      <TextAreaInputControlField
        key={field}
        control={form.control}
        description={description}
        disabled={disabled}
        label={label}
        name={`extraTexts.${field}` as const}
      />
    );
  }

  if (fieldSchema?.input_type === "select" && options.length > 0) {
    return (
      <SelectInputControlField
        key={field}
        control={form.control}
        description={description}
        disabled={disabled}
        label={label}
        name={`extraTexts.${field}` as const}
        options={options}
      />
    );
  }

  return (
    <TextInputControlField
      key={field}
      control={form.control}
      description={description}
      disabled={disabled}
      label={label}
      name={`extraTexts.${field}` as const}
      type={fieldSchema?.data_type === "integer" ? "number" : undefined}
    />
  );
}
