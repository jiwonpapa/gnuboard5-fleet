import { Bell, Blocks, LayoutTemplate, MonitorSmartphone } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { PageIntro } from "../layout/PageIntro";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { ErrorBanner } from "../shared/ErrorBanner";
import { ListPagination } from "../shared/ListPagination";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { PopupWorkspace } from "./PopupWorkspace";
import { useAdminPopupsPage } from "./useAdminPopupsPage";

export function AdminPopupsPage() {
  const page = useAdminPopupsPage();
  const popupSchemaQuery = useAdminFieldSchema("popups");
  const topError = page.error;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Popups"
          title="팝업 관리"
          description="운영 팝업 목록과 상세를 route-native 페이지로 분리했습니다. 구분, 디바이스, 시각, 위치, 크기와 본문까지 같은 작업면에서 조정합니다."
          icon={Bell}
          metrics={[
            {
              hint: "현재 페이지 기준 total popups",
              icon: LayoutTemplate,
              label: "조회 건수",
              value: String(page.pagination?.total ?? 0),
            },
            {
              hint: "현재 선택된 팝업 ID",
              icon: Blocks,
              label: "선택 팝업",
              value: page.selectedPopup ? String(page.selectedPopup.nw_id) : "없음",
            },
            {
              hint: "현재 선택된 디바이스 타겟",
              icon: MonitorSmartphone,
              label: "디바이스",
              value: page.selectedPopup?.nw_device ?? "선택 대기",
            },
          ]}
        />

        {topError ? <ErrorBanner error={topError} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>팝업 목록</CardTitle>
            <CardDescription>
              목록에서 선택한 팝업의 상세와 수정 패널을 우측에 고정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminDataTable
              columns={[
                {
                  header: "ID",
                  render: (popup) => (
                    <Badge variant="outline" className="w-fit">
                      #{popup.nw_id}
                    </Badge>
                  ),
                },
                {
                  header: "제목",
                  render: (popup) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {popup.nw_subject ?? "-"}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {popup.nw_begin_time ?? "시작 시각 없음"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "타겟",
                  render: (popup) => (
                    <div className="space-y-1">
                      <Badge variant="outline" className="w-fit">
                        {popup.nw_division ?? "-"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {popup.nw_device ?? "-"}
                      </p>
                    </div>
                  ),
                },
              ]}
              emptyMessage="조회된 팝업이 없습니다."
              getRowKey={(popup) => String(popup.nw_id)}
              onRowClick={(popup) => page.setSelectedPopupId(popup.nw_id)}
              rows={page.popups}
              selectedKey={page.selectedPopupId === null ? null : String(page.selectedPopupId)}
            />

            <ListPagination
              hasNext={page.pagination?.has_next ?? false}
              hasPrev={page.pagination?.has_prev ?? page.page > 1}
              isBusy={page.isBusy}
              onNext={() => page.setPage((current) => current + 1)}
              onPrev={() => page.setPage((current) => Math.max(1, current - 1))}
              page={page.pagination?.page ?? page.page}
              total={page.pagination?.total ?? 0}
              totalPages={page.pagination?.last_page ?? 1}
            />
          </CardContent>
        </Card>
      </div>

      <PopupWorkspace
        createForm={page.createForm}
        createMutation={page.createMutation}
        createPayload={page.createPayload}
        deleteMutation={page.deleteMutation}
        deleteTarget={page.deleteTarget}
        detailLoading={page.detailLoading}
        editForm={page.editForm}
        fieldSchema={popupSchemaQuery.data?.schema ?? null}
        isBusy={page.isBusy}
        onDeleteTargetChange={page.setDeleteTarget}
        onResetEdit={page.resetEdit}
        schemaError={popupSchemaQuery.error ?? null}
        schemaLoading={popupSchemaQuery.isLoading || popupSchemaQuery.isFetching}
        selectedPopup={page.selectedPopup}
        updateMutation={page.updateMutation}
        updatePayload={page.updatePayload}
      />
    </div>
  );
}
