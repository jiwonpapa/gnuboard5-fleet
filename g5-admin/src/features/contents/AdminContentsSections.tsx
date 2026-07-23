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
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { ListPagination } from "../shared/ListPagination";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminContentItem } from "../../types/AdminContentItem";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { Pagination } from "../../types/Pagination";
import type { AdminContentFormValues } from "./admin-contents-form";

export function AdminContentsListSection(props: {
  contents: AdminContentItem[];
  isBusy: boolean;
  onPageNext: () => void;
  onPagePrev: () => void;
  onResetSearch: () => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectContent: (contentId: string) => void;
  page: number;
  pagination: Pagination | null;
  search: string;
  selectedContentId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>목록 조회</CardTitle>
        <CardDescription>
          `co_id` 또는 제목으로 빠르게 찾고 바로 우측 편집기로 연결합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSearchSubmit();
          }}
        >
          <input
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
            value={props.search}
            placeholder="co_id 또는 제목 검색"
            onChange={(event) => props.onSearchChange(event.currentTarget.value)}
          />
          <Button type="submit" disabled={props.isBusy}>
            조회
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={props.isBusy}
            onClick={props.onResetSearch}
          >
            초기화
          </Button>
        </form>

        <AdminDataTable
          columns={[
            {
              header: "내용 ID",
              render: (row) => (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{row.co_id}</p>
                  <p className="text-xs text-muted-foreground">
                    HTML {row.co_html > 0 ? "사용" : "미사용"}
                  </p>
                </div>
              ),
            },
            {
              header: "제목/본문",
              render: (row) => (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{row.co_subject}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {row.co_content}
                  </p>
                </div>
              ),
            },
            {
              header: "모바일",
              render: (row) => (
                <p className="text-sm text-muted-foreground">
                  {row.co_mobile_content.trim().length > 0
                    ? "모바일 본문 있음"
                    : "공통 본문 사용"}
                </p>
              ),
            },
          ]}
          emptyMessage="조회 조건에 맞는 내용 페이지가 없습니다."
          getRowKey={(row) => row.co_id}
          onRowClick={(row) => props.onSelectContent(row.co_id)}
          rows={props.contents}
          selectedKey={props.selectedContentId}
        />

        <ListPagination
          hasNext={props.pagination?.has_next ?? false}
          hasPrev={props.pagination?.has_prev ?? false}
          isBusy={props.isBusy}
          onNext={props.onPageNext}
          onPrev={props.onPagePrev}
          page={props.pagination?.page ?? props.page}
          total={props.pagination?.total ?? 0}
          totalPages={props.pagination?.last_page ?? 1}
        />
      </CardContent>
    </Card>
  );
}

export function AdminContentsEditorSection(props: {
  contentFieldDescription: (name: string) => string | undefined;
  contentFieldLabel: (name: string, fallback: string) => string;
  contentFieldSchema: AdminSchemaDetail | null;
  contentSchemaError: CommandError | null;
  contentSchemaLoading: boolean;
  form: UseFormReturn<AdminContentFormValues>;
  hasContentSchemaState: boolean;
  isBusy: boolean;
  isEditing: boolean;
  onOpenDeleteDialog: () => void;
  onResetContent: () => void;
  onSubmit: () => void;
  selectedContent: AdminContentItem | null;
  selectedContentId: string | null;
}) {
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>{props.isEditing ? "내용 수정" : "새 내용 생성"}</CardTitle>
        <CardDescription>
          `co_id`는 생성 후 변경하지 않습니다. 모바일 본문을 비우면 공통 본문을 그대로
          사용합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.hasContentSchemaState ? (
          <FieldSchemaStatePanel
            error={props.contentSchemaError}
            hiddenTargetLabel={props.isEditing ? "내용 수정 폼" : "내용 생성 폼"}
            loading={props.contentSchemaLoading}
            noun="내용"
            schema={props.contentFieldSchema}
          />
        ) : (
          <>
            {!props.isEditing && props.selectedContentId === null ? null : props.selectedContent ? null : (
              <SelectionPlaceholder description="좌측 목록에서 내용 항목을 고르거나, 아래 초기화 버튼으로 새 항목 입력을 시작해 주십시오." />
            )}

            <form
              className="space-y-4"
              onSubmit={props.form.handleSubmit(() => props.onSubmit())}
            >
              <TextInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_id")}
                disabled={props.isBusy || props.isEditing}
                label={props.contentFieldLabel("co_id", "내용 ID")}
                name="co_id"
                placeholder="about_us"
              />
              <TextInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_subject")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_subject", "제목")}
                name="co_subject"
                placeholder="회사 소개"
              />
              <ToggleControlField
                control={props.form.control}
                description={
                  props.contentFieldDescription("co_html") ??
                  "본문을 HTML 편집 기준으로 저장할 때 켜십시오."
                }
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_html", "HTML 사용")}
                name="co_html"
              />
              <TextAreaInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_content")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_content", "공통 본문")}
                name="co_content"
                rows={8}
              />
              <TextAreaInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_mobile_content")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_mobile_content", "모바일 본문")}
                name="co_mobile_content"
                rows={6}
              />
              <TextInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_include_head")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_include_head", "상단 파일 경로")}
                name="co_include_head"
                placeholder="./head.php"
              />
              <TextInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_include_tail")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_include_tail", "하단 파일 경로")}
                name="co_include_tail"
                placeholder="./tail.php"
              />
              <TextInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_skin")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_skin", "PC 스킨")}
                name="co_skin"
                placeholder="basic"
              />
              <TextInputControlField
                control={props.form.control}
                description={props.contentFieldDescription("co_mobile_skin")}
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_mobile_skin", "모바일 스킨")}
                name="co_mobile_skin"
                placeholder="basic"
              />
              <ToggleControlField
                control={props.form.control}
                description={
                  props.contentFieldDescription("co_tag_filter_use") ??
                  "iframe 등 HTML 확장 태그를 막으려면 켜 두십시오."
                }
                disabled={props.isBusy}
                label={props.contentFieldLabel("co_tag_filter_use", "태그 필터 사용")}
                name="co_tag_filter_use"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={props.isBusy}>
                  {props.isEditing ? "내용 수정" : "내용 생성"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isBusy}
                  onClick={props.onResetContent}
                >
                  새 항목
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={props.isBusy || !props.isEditing}
                  onClick={props.onOpenDeleteDialog}
                >
                  삭제
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
