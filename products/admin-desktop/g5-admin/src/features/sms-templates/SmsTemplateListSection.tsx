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
import { ListPagination } from "../shared/ListPagination";
import type { AdminSmsTemplateGroup } from "../../types/AdminSmsTemplateGroup";
import type { AdminSmsTemplateItem } from "../../types/AdminSmsTemplateItem";
import type { Pagination } from "../../types/Pagination";

export function SmsTemplateListSection(props: {
  batchMoveTarget: string;
  groups: AdminSmsTemplateGroup[];
  isBusy: boolean;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchMoveTargetChange: (value: string) => void;
  onResetFilters: () => void;
  onSearchChange: (value: string) => void;
  onSearchFieldChange: (value: string) => void;
  onTemplatePageNext: () => void;
  onTemplatePagePrev: () => void;
  onTemplateSelect: (templateId: number) => void;
  onTemplateToggle: (templateId: number, checked: boolean) => void;
  search: string;
  searchField: string;
  searchFieldOptions: Array<{ label: string; value: string }>;
  selectedTemplateId: number | null;
  selectedTemplateIds: number[];
  templatePagination: Pagination | null;
  templates: AdminSmsTemplateItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>템플릿 목록</CardTitle>
        <CardDescription>
          그룹 필터, 검색, 일괄 이동/삭제를 지원합니다. 체크박스로 대상 템플릿을
          고른 뒤 일괄 액션을 실행하십시오.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">검색 기준</span>
            <select
              value={props.searchField}
              onChange={(event) => props.onSearchFieldChange(event.currentTarget.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {props.searchFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">검색어</span>
            <Input
              value={props.search}
              onChange={(event) => props.onSearchChange(event.currentTarget.value)}
              placeholder="이름 또는 내용 검색"
            />
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={props.onResetFilters}>
              필터 초기화
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">일괄 이동 대상 그룹</span>
            <select
              value={props.batchMoveTarget}
              onChange={(event) => props.onBatchMoveTargetChange(event.currentTarget.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">대상 그룹 선택</option>
              {props.groups.map((group) => (
                <option key={group.fg_no} value={String(group.fg_no)}>
                  {group.fg_name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={
                props.isBusy ||
                props.selectedTemplateIds.length === 0 ||
                props.batchMoveTarget === ""
              }
              onClick={props.onBatchMove}
            >
              선택 이동
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy || props.selectedTemplateIds.length === 0}
              onClick={props.onBatchDelete}
            >
              선택 삭제
            </Button>
          </div>
        </div>

        <AdminDataTable<AdminSmsTemplateItem>
          columns={[
            {
              cellClassName: "w-16",
              header: "선택",
              render: (template) => (
                <input
                  type="checkbox"
                  checked={props.selectedTemplateIds.includes(template.fo_no)}
                  onChange={(event) => {
                    event.stopPropagation();
                    props.onTemplateToggle(template.fo_no, event.currentTarget.checked);
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              ),
            },
            {
              header: "템플릿",
              render: (template) => (
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {template.fo_name}
                  </strong>
                  <span className="block text-xs text-muted-foreground">
                    fo_no {template.fo_no}
                  </span>
                </div>
              ),
            },
            {
              header: "그룹",
              render: (template) => (
                <div className="text-sm text-muted-foreground">
                  {template.fg_name ?? `기본 그룹 ${template.fg_no}`}
                </div>
              ),
            },
            {
              header: "내용",
              render: (template) => (
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {template.fo_content}
                </p>
              ),
            },
          ]}
          emptyMessage="등록된 이모티콘 템플릿이 없습니다."
          getRowKey={(template) => String(template.fo_no)}
          onRowClick={(template) => props.onTemplateSelect(template.fo_no)}
          rows={props.templates}
          selectedKey={
            props.selectedTemplateId === null ? null : String(props.selectedTemplateId)
          }
        />

        {props.templatePagination ? (
          <ListPagination
            hasNext={props.templatePagination.has_next}
            hasPrev={props.templatePagination.has_prev}
            isBusy={props.isBusy}
            onNext={props.onTemplatePageNext}
            onPrev={props.onTemplatePagePrev}
            page={props.templatePagination.page}
            total={props.templatePagination.total}
            totalPages={props.templatePagination.last_page}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
