import type { UseFormReturn } from "react-hook-form";
import type { CommandError } from "../../api/client";
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
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { ListPagination } from "../shared/ListPagination";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminFaqItem } from "../../types/AdminFaqItem";
import type { Pagination } from "../../types/Pagination";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminFaqFormValues } from "./admin-faqs-form";

export function FaqItemsSection(props: {
  faqForm: UseFormReturn<AdminFaqFormValues>;
  faqPage: number;
  faqs: AdminFaqItem[];
  faqPagination: Pagination | null;
  hasSchemaState: boolean;
  isBusy: boolean;
  onFaqDeleteDialogOpen: () => void;
  onFaqPageNext: () => void;
  onFaqPagePrev: () => void;
  onFaqReset: () => void;
  onFaqSelect: (faqId: number) => void;
  onFaqSubmit: () => void;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  schemaNoun: string;
  schema: AdminSchemaDetail | null;
  selectedFaqId: number | null;
  selectedMasterId: number | null;
  fieldDescription: (name: string) => string | undefined;
  fieldLabel: (name: string, fallback: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ 문항</CardTitle>
        <CardDescription>
          선택한 FAQ 마스터에 속한 질문/답변과 정렬 순서를 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.selectedMasterId === null ? (
          <SelectionPlaceholder description="먼저 좌측에서 FAQ 마스터를 선택해 주십시오. 선택된 마스터를 기준으로 문항 목록과 생성 폼이 열립니다." />
        ) : (
          <>
            <AdminDataTable
              columns={[
                {
                  header: "질문",
                  render: (row) => (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{row.fa_subject}</p>
                      <p className="text-xs text-muted-foreground">
                        fa_id {row.fa_id} · order {row.fa_order}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "답변",
                  render: (row) => (
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {row.fa_content}
                    </p>
                  ),
                },
              ]}
              emptyMessage="선택한 마스터에 FAQ 문항이 없습니다."
              getRowKey={(row) => String(row.fa_id)}
              onRowClick={(row) => props.onFaqSelect(row.fa_id)}
              rows={props.faqs}
              selectedKey={props.selectedFaqId ? String(props.selectedFaqId) : null}
            />

            <ListPagination
              hasNext={props.faqPagination?.has_next ?? false}
              hasPrev={props.faqPagination?.has_prev ?? false}
              isBusy={props.isBusy}
              onNext={props.onFaqPageNext}
              onPrev={props.onFaqPagePrev}
              page={props.faqPagination?.page ?? props.faqPage}
              total={props.faqPagination?.total ?? 0}
              totalPages={props.faqPagination?.last_page ?? 1}
            />

            {props.hasSchemaState ? (
              <div className="border-t border-border pt-4">
                <FieldSchemaStatePanel
                  error={props.schemaError}
                  hiddenTargetLabel="FAQ 문항 폼"
                  loading={props.schemaLoading}
                  noun={props.schemaNoun}
                  schema={props.schema}
                />
              </div>
            ) : (
              <form
                className="space-y-4 border-t border-border pt-4"
                onSubmit={props.faqForm.handleSubmit(() => props.onFaqSubmit())}
              >
                <TextInputControlField
                  control={props.faqForm.control}
                  description={props.fieldDescription("fm_id")}
                  disabled={props.isBusy}
                  label={props.fieldLabel("fm_id", "FAQ 마스터 ID")}
                  name="fm_id"
                  type="number"
                />
                <TextInputControlField
                  control={props.faqForm.control}
                  description={props.fieldDescription("fa_subject")}
                  disabled={props.isBusy}
                  label={props.fieldLabel("fa_subject", "질문 제목")}
                  name="fa_subject"
                />
                <TextInputControlField
                  control={props.faqForm.control}
                  description={props.fieldDescription("fa_order")}
                  disabled={props.isBusy}
                  label={props.fieldLabel("fa_order", "정렬 순서")}
                  name="fa_order"
                  type="number"
                />
                <TextAreaInputControlField
                  control={props.faqForm.control}
                  description={props.fieldDescription("fa_content")}
                  disabled={props.isBusy}
                  label={props.fieldLabel("fa_content", "답변 내용")}
                  name="fa_content"
                  rows={9}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={props.isBusy}>
                    {props.selectedFaqId !== null ? "FAQ 수정" : "FAQ 생성"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={props.isBusy}
                    onClick={props.onFaqReset}
                  >
                    새 문항
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={props.isBusy || props.selectedFaqId === null}
                    onClick={props.onFaqDeleteDialogOpen}
                  >
                    문항 삭제
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
