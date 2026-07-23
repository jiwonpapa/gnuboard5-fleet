import { Layers3, PackagePlus, Settings2 } from "lucide-react";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import { normalizeOptionalInteger } from "./admin-layouts-page-helpers";
import {
  LayoutEditorPanel,
  LayoutListSection,
  LayoutSelectionPlaceholder,
  NewLayoutSection,
} from "./AdminLayoutsSections";
import { useAdminLayoutsWorkspace } from "./use-admin-layouts-workspace";

export function AdminLayoutsWorkspace() {
  const model = useAdminLayoutsWorkspace();
  const selectedLayout = model.selectedLayout;
  const activeDraft = model.activeDraft;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Layouts"
          title="레이아웃 관리"
          description="`/admin/layouts` 계열을 route-native로 연결했습니다. 레이아웃 저장, 위젯 추가/수정/삭제, 순서 재배치를 한 작업면에서 처리합니다."
          icon={Layers3}
          metrics={[
            {
              hint: "현재 페이지 기준 레이아웃 수",
              icon: Layers3,
              label: "조회 건수",
              value: String(model.listQuery.data?.pagination.total ?? 0),
            },
            {
              hint: "현재 선택된 page_id",
              icon: Settings2,
              label: "선택 레이아웃",
              value: selectedLayout?.sl_page_id ?? "없음",
            },
            {
              hint: "현재 draft 기준 위젯 수",
              icon: PackagePlus,
              label: "위젯 수",
              value: String(model.widgets.length),
            },
          ]}
        />

        {model.topError ? <ErrorBanner error={model.topError} /> : null}

        <LayoutListSection
          isBusy={model.isBusy}
          layouts={model.listQuery.data?.layouts ?? []}
          onNextPage={() => model.setPage((current) => current + 1)}
          onPrevPage={() => model.setPage((current) => Math.max(1, current - 1))}
          onSelectPage={model.setRequestedPageId}
          page={model.page}
          pagination={model.listQuery.data?.pagination ?? null}
          selectedPageId={model.selectedPageId}
        />

        <NewLayoutSection
          isBusy={model.isBusy}
          newPageId={model.newPageId}
          newTitle={model.newTitle}
          newWidgetsJson={model.newWidgetsJson}
          onNewPageIdChange={model.setNewPageId}
          onNewTitleChange={model.setNewTitle}
          onNewWidgetsJsonChange={model.setNewWidgetsJson}
          onSave={() =>
            model.saveMutation.mutate({
              page_id: model.newPageId.trim(),
              title: model.newTitle.trim() || null,
              widgets_json: model.newWidgetsJson,
            })
          }
        />
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        {!selectedLayout || !activeDraft ? (
          <LayoutSelectionPlaceholder />
        ) : (
          <LayoutEditorPanel
            activeDraft={activeDraft}
            addWidgetJson={model.addWidgetJson}
            deleteWidgetId={model.deleteWidgetId}
            isBusy={model.isBusy}
            onAddWidgetJsonChange={model.setAddWidgetJson}
            onAddWidgetSave={() =>
              model.addWidgetMutation.mutate({
                page_id: selectedLayout.sl_page_id,
                widget_json: model.addWidgetJson,
              })
            }
            onDeleteWidgetIdChange={model.setDeleteWidgetId}
            onDeleteWidgetSave={() =>
              model.deleteWidgetMutation.mutate({
                page_id: selectedLayout.sl_page_id,
                widget_id: model.deleteWidgetId.trim(),
              })
            }
            onDraftTitleChange={(value) => model.updateActiveDraft({ title: value })}
            onDraftWidgetsJsonChange={(value) =>
              model.updateActiveDraft({ widgetsJson: value })
            }
            onReorderSave={() =>
              model.reorderMutation.mutate({
                page_id: selectedLayout.sl_page_id,
                widget_ids: activeDraft.reorderWidgetIds
                  .split(/\r?\n/)
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            onReorderWidgetIdsChange={(value) =>
              model.updateActiveDraft({ reorderWidgetIds: value })
            }
            onSaveLayout={() =>
              model.saveMutation.mutate({
                page_id: selectedLayout.sl_page_id,
                title: activeDraft.title,
                widgets_json: activeDraft.widgetsJson,
              })
            }
            onWidgetConfigJsonChange={model.setWidgetConfigJson}
            onWidgetIdChange={model.setWidgetId}
            onWidgetOrderChange={model.setWidgetOrder}
            onWidgetStyleJsonChange={model.setWidgetStyleJson}
            onWidgetTitleChange={model.setWidgetTitle}
            onWidgetTypeChange={model.setWidgetType}
            onWidgetUpdateSave={() =>
              model.updateWidgetMutation.mutate({
                page_id: selectedLayout.sl_page_id,
                widget_id: model.widgetId.trim(),
                type: model.widgetType.trim() || null,
                title: model.widgetTitle.trim() || null,
                order: normalizeOptionalInteger(model.widgetOrder),
                config_json: model.widgetConfigJson.trim() || null,
                style_json: model.widgetStyleJson.trim() || null,
              })
            }
            selectedLayout={selectedLayout}
            widgetConfigJson={model.widgetConfigJson}
            widgetId={model.widgetId}
            widgetOrder={model.widgetOrder}
            widgetStyleJson={model.widgetStyleJson}
            widgetTitle={model.widgetTitle}
            widgetType={model.widgetType}
            widgets={model.widgets}
          />
        )}
      </div>
    </div>
  );
}
