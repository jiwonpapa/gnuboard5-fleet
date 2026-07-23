import type { ReactNode } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { ListPagination } from "../shared/ListPagination";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminLayoutDetail } from "../../types/AdminLayoutDetail";
import type { AdminLayoutSummary } from "../../types/AdminLayoutSummary";
import type { LayoutDraft } from "./admin-layouts-page-helpers";

export function LayoutListSection(props: {
  isBusy: boolean;
  layouts: AdminLayoutSummary[];
  onNextPage: () => void;
  onPrevPage: () => void;
  onSelectPage: (pageId: string) => void;
  page: number;
  pagination: {
    total: number;
    page: number;
    last_page: number;
    has_next: boolean;
    has_prev: boolean;
  } | null;
  selectedPageId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>레이아웃 목록</CardTitle>
        <CardDescription>
          `sdui_layout` 기준 page_id, 제목, 최근 수정 시각을 조회합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminDataTable<AdminLayoutSummary>
          columns={[
            {
              header: "page_id",
              render: (row) => (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{row.sl_page_id}</p>
                  <p className="text-xs text-muted-foreground">{row.sl_title ?? "제목 없음"}</p>
                </div>
              ),
            },
            {
              header: "상태",
              render: (row) => ((row.sl_active ?? 0) === 1 ? "활성" : "비활성"),
            },
            {
              header: "업데이트",
              render: (row) => row.sl_updated ?? row.sl_datetime ?? "-",
            },
          ]}
          emptyMessage="등록된 레이아웃이 없습니다."
          getRowKey={(row) => row.sl_page_id}
          onRowClick={(row) => props.onSelectPage(row.sl_page_id)}
          rows={props.layouts}
          selectedKey={props.selectedPageId}
        />

        <ListPagination
          hasNext={props.pagination?.has_next ?? false}
          hasPrev={props.pagination?.has_prev ?? props.page > 1}
          isBusy={props.isBusy}
          onNext={props.onNextPage}
          onPrev={props.onPrevPage}
          page={props.pagination?.page ?? props.page}
          total={props.pagination?.total ?? 0}
          totalPages={props.pagination?.last_page ?? 1}
        />
      </CardContent>
    </Card>
  );
}

export function NewLayoutSection(props: {
  isBusy: boolean;
  newPageId: string;
  newTitle: string;
  newWidgetsJson: string;
  onNewPageIdChange: (value: string) => void;
  onNewTitleChange: (value: string) => void;
  onNewWidgetsJsonChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>새 레이아웃 저장</CardTitle>
        <CardDescription>
          <code>PUT /admin/layouts/{"{page_id}"}</code>는 upsert이므로 새 page_id를 넣으면 신규 레이아웃을 만들 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="신규 page_id">
          <Input value={props.newPageId} onChange={(event) => props.onNewPageIdChange(event.currentTarget.value)} />
        </Field>
        <Field label="신규 제목">
          <Input value={props.newTitle} onChange={(event) => props.onNewTitleChange(event.currentTarget.value)} />
        </Field>
        <Field label="widgets JSON">
          <Textarea
            rows={10}
            value={props.newWidgetsJson}
            onChange={(event) => props.onNewWidgetsJsonChange(event.currentTarget.value)}
          />
        </Field>
        <Button
          type="button"
          disabled={props.isBusy || props.newPageId.trim().length === 0}
          onClick={props.onSave}
        >
          신규 레이아웃 저장
        </Button>
      </CardContent>
    </Card>
  );
}

export function LayoutEditorPanel(props: {
  activeDraft: LayoutDraft;
  addWidgetJson: string;
  deleteWidgetId: string;
  isBusy: boolean;
  onAddWidgetJsonChange: (value: string) => void;
  onAddWidgetSave: () => void;
  onDeleteWidgetIdChange: (value: string) => void;
  onDeleteWidgetSave: () => void;
  onDraftTitleChange: (value: string) => void;
  onDraftWidgetsJsonChange: (value: string) => void;
  onReorderSave: () => void;
  onReorderWidgetIdsChange: (value: string) => void;
  onSaveLayout: () => void;
  onWidgetConfigJsonChange: (value: string) => void;
  onWidgetIdChange: (value: string) => void;
  onWidgetOrderChange: (value: string) => void;
  onWidgetStyleJsonChange: (value: string) => void;
  onWidgetTitleChange: (value: string) => void;
  onWidgetTypeChange: (value: string) => void;
  onWidgetUpdateSave: () => void;
  selectedLayout: AdminLayoutDetail;
  widgetConfigJson: string;
  widgetId: string;
  widgetOrder: string;
  widgetStyleJson: string;
  widgetTitle: string;
  widgetType: string;
  widgets: Array<Record<string, unknown>>;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>레이아웃 저장</CardTitle>
          <CardDescription>
            <code>sl_schema</code>에서 <code>widgets</code> 배열만 편집 대상으로 씁니다. 저장 시 전체 widgets 배열이 덮어써집니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="page_id">
            <Input value={props.selectedLayout.sl_page_id} disabled />
          </Field>
          <Field label="제목">
            <Input
              value={props.activeDraft.title}
              onChange={(event) => props.onDraftTitleChange(event.currentTarget.value)}
            />
          </Field>
          <Field label="widgets JSON">
            <Textarea
              rows={14}
              value={props.activeDraft.widgetsJson}
              onChange={(event) => props.onDraftWidgetsJsonChange(event.currentTarget.value)}
            />
          </Field>
          <Button type="button" disabled={props.isBusy} onClick={props.onSaveLayout}>
            레이아웃 저장
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>위젯 작업</CardTitle>
          <CardDescription>
            단건 추가/수정/삭제와 순서 재배치를 별도 payload로 실행합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="현재 위젯">
            <div className="whitespace-pre-wrap rounded-2xl border border-border/70 p-3 text-xs text-muted-foreground">
              {props.widgets.length === 0
                ? "위젯 없음"
                : props.widgets
                    .map((widget) => `${widget.widget_id ?? "-"} · ${widget.type ?? "-"}`)
                    .join("\n")}
            </div>
          </Field>

          <Field label="위젯 JSON 추가">
            <Textarea
              rows={8}
              value={props.addWidgetJson}
              onChange={(event) => props.onAddWidgetJsonChange(event.currentTarget.value)}
            />
          </Field>
          <Button type="button" disabled={props.isBusy} onClick={props.onAddWidgetSave}>
            위젯 추가
          </Button>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="widget_id">
              <Input value={props.widgetId} onChange={(event) => props.onWidgetIdChange(event.currentTarget.value)} />
            </Field>
            <Field label="type">
              <Input value={props.widgetType} onChange={(event) => props.onWidgetTypeChange(event.currentTarget.value)} />
            </Field>
            <Field label="title">
              <Input value={props.widgetTitle} onChange={(event) => props.onWidgetTitleChange(event.currentTarget.value)} />
            </Field>
            <Field label="order">
              <Input value={props.widgetOrder} onChange={(event) => props.onWidgetOrderChange(event.currentTarget.value)} />
            </Field>
          </div>
          <Field label="config JSON">
            <Textarea
              rows={5}
              value={props.widgetConfigJson}
              onChange={(event) => props.onWidgetConfigJsonChange(event.currentTarget.value)}
            />
          </Field>
          <Field label="style JSON">
            <Textarea
              rows={5}
              value={props.widgetStyleJson}
              onChange={(event) => props.onWidgetStyleJsonChange(event.currentTarget.value)}
            />
          </Field>
          <Button
            type="button"
            disabled={props.isBusy || props.widgetId.trim().length === 0}
            onClick={props.onWidgetUpdateSave}
          >
            위젯 수정
          </Button>

          <Field label="재배치 widget_ids (줄바꿈)">
            <Textarea
              rows={5}
              value={props.activeDraft.reorderWidgetIds}
              onChange={(event) => props.onReorderWidgetIdsChange(event.currentTarget.value)}
            />
          </Field>
          <Button type="button" variant="outline" disabled={props.isBusy} onClick={props.onReorderSave}>
            순서 저장
          </Button>

          <Field label="삭제 widget_id">
            <Input
              value={props.deleteWidgetId}
              onChange={(event) => props.onDeleteWidgetIdChange(event.currentTarget.value)}
            />
          </Field>
          <Button
            type="button"
            variant="destructive"
            disabled={props.isBusy || props.deleteWidgetId.trim().length === 0}
            onClick={props.onDeleteWidgetSave}
          >
            위젯 삭제
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export function LayoutSelectionPlaceholder() {
  return (
    <SelectionPlaceholder description="레이아웃을 선택하면 우측에서 schema 저장과 위젯 조작을 진행합니다." />
  );
}

function Field(props: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}
