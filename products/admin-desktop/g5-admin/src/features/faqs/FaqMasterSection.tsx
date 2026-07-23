import { Image, Upload } from "lucide-react";
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
import type { AdminFaqMasterDetail } from "../../types/AdminFaqMasterDetail";
import type { AdminFaqMasterSummary } from "../../types/AdminFaqMasterSummary";
import type { Pagination } from "../../types/Pagination";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminFaqMasterFormValues } from "./admin-faqs-form";

export function FaqMasterSection(props: {
  hasSchemaState: boolean;
  imageActionsBusy: boolean;
  isBusy: boolean;
  masterForm: UseFormReturn<AdminFaqMasterFormValues>;
  masterPage: number;
  masters: AdminFaqMasterSummary[];
  onDeleteFooterImage: () => void;
  onDeleteHeaderImage: () => void;
  onDeleteMaster: () => void;
  onMasterDeleteDialogOpen: () => void;
  onMasterPageNext: () => void;
  onMasterPagePrev: () => void;
  onMasterReset: () => void;
  onMasterSelect: (masterId: number) => void;
  onMasterSubmit: () => void;
  onSelectFooterImage: (file: File) => void;
  onSelectHeaderImage: (file: File) => void;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  schemaNoun: string;
  schema: AdminSchemaDetail | null;
  selectedMaster: AdminFaqMasterDetail | null;
  selectedMasterId: number | null;
  masterPagination: Pagination | null;
  fieldDescription: (name: string) => string | undefined;
  fieldLabel: (name: string, fallback: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ 마스터</CardTitle>
        <CardDescription>
          FAQ 묶음, 정렬 순서, PC/모바일 상하단 HTML, 이미지 아티팩트를 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminDataTable
          columns={[
            {
              header: "마스터",
              render: (row) => (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{row.fm_subject}</p>
                  <p className="text-xs text-muted-foreground">
                    fm_id {row.fm_id} · order {row.fm_order}
                  </p>
                </div>
              ),
            },
            {
              header: "문항/이미지",
              render: (row) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>faq {row.faq_count}</p>
                  <p>
                    head {row.header_image.exists ? "있음" : "없음"} · foot{" "}
                    {row.footer_image.exists ? "있음" : "없음"}
                  </p>
                </div>
              ),
            },
          ]}
          emptyMessage="등록된 FAQ 마스터가 없습니다."
          getRowKey={(row) => String(row.fm_id)}
          onRowClick={(row) => props.onMasterSelect(row.fm_id)}
          rows={props.masters}
          selectedKey={props.selectedMasterId ? String(props.selectedMasterId) : null}
        />

        <ListPagination
          hasNext={props.masterPagination?.has_next ?? false}
          hasPrev={props.masterPagination?.has_prev ?? false}
          isBusy={props.isBusy}
          onNext={props.onMasterPageNext}
          onPrev={props.onMasterPagePrev}
          page={props.masterPagination?.page ?? props.masterPage}
          total={props.masterPagination?.total ?? 0}
          totalPages={props.masterPagination?.last_page ?? 1}
        />

        {props.hasSchemaState ? (
          <div className="border-t border-border pt-4">
            <FieldSchemaStatePanel
              error={props.schemaError}
              hiddenTargetLabel="FAQ 마스터 폼"
              loading={props.schemaLoading}
              noun={props.schemaNoun}
              schema={props.schema}
            />
          </div>
        ) : (
          <form
            className="space-y-4 border-t border-border pt-4"
            onSubmit={props.masterForm.handleSubmit(() => props.onMasterSubmit())}
          >
            <TextInputControlField
              control={props.masterForm.control}
              description={props.fieldDescription("fm_subject")}
              disabled={props.isBusy}
              label={props.fieldLabel("fm_subject", "마스터 제목")}
              name="fm_subject"
            />
            <TextInputControlField
              control={props.masterForm.control}
              description={props.fieldDescription("fm_order")}
              disabled={props.isBusy}
              label={props.fieldLabel("fm_order", "정렬 순서")}
              name="fm_order"
              type="number"
            />
            <TextAreaInputControlField
              control={props.masterForm.control}
              description={props.fieldDescription("fm_head_html")}
              disabled={props.isBusy}
              label={props.fieldLabel("fm_head_html", "상단 HTML")}
              name="fm_head_html"
              rows={4}
            />
            <TextAreaInputControlField
              control={props.masterForm.control}
              description={props.fieldDescription("fm_tail_html")}
              disabled={props.isBusy}
              label={props.fieldLabel("fm_tail_html", "하단 HTML")}
              name="fm_tail_html"
              rows={4}
            />
            <TextAreaInputControlField
              control={props.masterForm.control}
              description={props.fieldDescription("fm_mobile_head_html")}
              disabled={props.isBusy}
              label={props.fieldLabel("fm_mobile_head_html", "모바일 상단 HTML")}
              name="fm_mobile_head_html"
              rows={3}
            />
            <TextAreaInputControlField
              control={props.masterForm.control}
              description={props.fieldDescription("fm_mobile_tail_html")}
              disabled={props.isBusy}
              label={props.fieldLabel("fm_mobile_tail_html", "모바일 하단 HTML")}
              name="fm_mobile_tail_html"
              rows={3}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <FaqImageCard
                busy={props.imageActionsBusy}
                image={props.selectedMaster?.header_image ?? null}
                inputId="faq-header-image"
                label={props.fieldLabel("fm_himg", "헤더 이미지")}
                onDelete={props.onDeleteHeaderImage}
                onSelect={props.onSelectHeaderImage}
              />
              <FaqImageCard
                busy={props.imageActionsBusy}
                image={props.selectedMaster?.footer_image ?? null}
                inputId="faq-footer-image"
                label={props.fieldLabel("fm_timg", "푸터 이미지")}
                onDelete={props.onDeleteFooterImage}
                onSelect={props.onSelectFooterImage}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={props.isBusy}>
                {props.selectedMasterId !== null ? "마스터 수정" : "마스터 생성"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.isBusy}
                onClick={props.onMasterReset}
              >
                새 마스터
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={props.isBusy || props.selectedMasterId === null}
                onClick={props.onMasterDeleteDialogOpen}
              >
                마스터 삭제
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function FaqImageCard(props: {
  busy: boolean;
  image: {
    exists: boolean;
    url: string;
    size: number | null;
    width: number | null;
    height: number | null;
  } | null;
  inputId: string;
  label: string;
  onDelete: () => void;
  onSelect: (file: File) => void;
}) {
  const imageExists = props.image?.exists === true;
  const imageUrl = props.image?.url ?? "";

  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{props.label}</p>
          <p className="text-xs text-muted-foreground">
            {props.image?.exists
              ? `${props.image.width ?? "-"}x${props.image.height ?? "-"} · ${props.image.size ?? 0} bytes`
              : "등록된 이미지가 없습니다."}
          </p>
        </div>
        <Image className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          id={props.inputId}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/gif"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) {
              return;
            }
            props.onSelect(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={props.busy}
          onClick={() => {
            document.getElementById(props.inputId)?.click();
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          업로드
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={props.busy || !imageExists}
          onClick={props.onDelete}
        >
          삭제
        </Button>
      </div>
      {imageExists ? (
        <p className="mt-3 break-all text-xs text-muted-foreground">{imageUrl}</p>
      ) : null}
    </div>
  );
}
