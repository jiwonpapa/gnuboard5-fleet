import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  SelectInputControlField,
  TextAreaInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminSmsContactExportItem } from "../../types/AdminSmsContactExportItem";
import type { AdminSmsContactGroup } from "../../types/AdminSmsContactGroup";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import type { AdminSmsContactImportFormValues } from "./admin-sms-contacts-form";

export function AdminSmsContactImportExportCard(props: {
  exportRows: AdminSmsContactExportItem[];
  exportTotal: number | null;
  fieldSchema: AdminSchemaDetail | null;
  groups: AdminSmsContactGroup[];
  importFileName: string | null;
  importForm: UseFormReturn<AdminSmsContactImportFormValues>;
  importResultDescription: string | null;
  isBusy: boolean;
  onExportPreview: () => void;
  onImportFileChange: (file: File | null) => void;
  onSubmitImport: () => void;
}) {
  const groupOptions = resolveGroupOptions(props.fieldSchema, props.groups);
  const fieldLabel = (
    name: keyof AdminSmsContactImportFormValues,
    fallback: string,
  ) => getFieldLabel(props.fieldSchema, name, fallback);
  const fieldDescription = (name: keyof AdminSmsContactImportFormValues) =>
    getFieldDescription(props.fieldSchema, name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>파일 가져오기 / 내보내기</CardTitle>
        <CardDescription>
          CSV/XLSX 업로드와 텍스트 입력을 모두 지원합니다. 내보내기는 상위 20건 미리보기를 함께 제공합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4"
          onSubmit={props.importForm.handleSubmit(() => props.onSubmitImport())}
        >
          <SelectInputControlField
            control={props.importForm.control}
            description={fieldDescription("bg_no")}
            label={fieldLabel("bg_no", "대상 그룹")}
            name="bg_no"
            options={groupOptions}
          />
          <TextAreaInputControlField
            control={props.importForm.control}
            description={
              fieldDescription("contacts_text") ??
              "한 줄에 `이름,번호` 또는 `이름<TAB>번호` 형식으로 입력하십시오."
            }
            label={fieldLabel("contacts_text", "텍스트 가져오기")}
            name="contacts_text"
            rows={6}
          />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">파일 업로드</span>
            <Input
              accept=".csv,.xls,.xlsx"
              type="file"
              onChange={(event) => {
                props.onImportFileChange(event.currentTarget.files?.[0] ?? null);
              }}
            />
            {props.importFileName ? (
              <span className="text-xs text-muted-foreground">{props.importFileName}</span>
            ) : null}
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <ToggleControlField
              control={props.importForm.control}
              description={fieldDescription("dry_run")}
              label={fieldLabel("dry_run", "드라이런")}
              name="dry_run"
            />
            <ToggleControlField
              control={props.importForm.control}
              description={fieldDescription("include_no_phone")}
              label={fieldLabel("include_no_phone", "번호 없는 항목 포함")}
              name="include_no_phone"
            />
            <ToggleControlField
              control={props.importForm.control}
              description={fieldDescription("with_hyphen")}
              label={fieldLabel("with_hyphen", "하이픈 포함 내보내기")}
              name="with_hyphen"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={props.isBusy}>
              가져오기 실행
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy}
              onClick={props.onExportPreview}
            >
              내보내기 미리보기
            </Button>
          </div>
        </form>

        {props.importResultDescription ? (
          <SelectionPlaceholder description={props.importResultDescription} />
        ) : null}

        {props.exportTotal !== null ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              내보내기 미리보기 {props.exportTotal}건 중 상위 {props.exportRows.length}건
            </p>
            <AdminDataTable
              columns={[
                {
                  header: "이름",
                  render: (item) => <span>{item.bk_name}</span>,
                },
                {
                  header: "번호",
                  render: (item) => <span>{item.bk_hp}</span>,
                },
                {
                  header: "그룹/회원",
                  render: (item) => (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>bg_no {item.bg_no}</p>
                      <p>{item.mb_id ?? "비회원"}</p>
                    </div>
                  ),
                },
              ]}
              emptyMessage="내보내기 미리보기 항목이 없습니다."
              getRowKey={(item) => `${item.bg_no}-${item.bk_name}-${item.bk_hp}`}
              rows={props.exportRows}
            />
          </div>
        ) : null}
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
