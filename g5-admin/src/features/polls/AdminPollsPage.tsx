import { BarChart3, BellRing, Gauge, Vote } from "lucide-react";
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
import { PollWorkspace } from "./PollWorkspace";
import { useAdminPollsPage } from "./useAdminPollsPage";

export function AdminPollsPage() {
  const page = useAdminPollsPage();
  const pollSchemaQuery = useAdminFieldSchema("polls");
  const topError = page.error;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Polls"
          title="투표 관리"
          description="목록, 상세, 생성, 수정, 삭제를 route-native 화면에서 처리합니다. 좌측 목록과 우측 작업면을 분리해서 운영 액션과 확인 정보를 같은 레이아웃 안에 묶었습니다."
          icon={BellRing}
          metrics={[
            {
              hint: "현재 페이지 기준 total polls",
              icon: Vote,
              label: "조회 건수",
              value: String(page.pagination?.total ?? 0),
            },
            {
              hint: "선택된 투표 ID",
              icon: Gauge,
              label: "선택 투표",
              value: page.selectedPoll ? String(page.selectedPoll.po_id) : "없음",
            },
            {
              hint: "현재 선택된 투표 제목",
              icon: BarChart3,
              label: "제목",
              value: page.selectedPoll?.po_subject ?? "선택 대기",
            },
          ]}
        />

        {topError ? <ErrorBanner error={topError} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>투표 목록</CardTitle>
            <CardDescription>
              목록 결과가 바뀌면 현재 선택이 사라진 경우 첫 번째 항목으로 자동 재선택합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminDataTable
              columns={[
                {
                  header: "ID",
                  render: (poll) => (
                    <Badge variant="outline" className="w-fit">
                      #{poll.po_id}
                    </Badge>
                  ),
                },
                {
                  header: "제목",
                  render: (poll) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {poll.po_subject ?? "-"}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {poll.po_date ?? "등록일 없음"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "상태",
                  render: (poll) => (
                    <Badge variant={poll.po_use === 1 ? "secondary" : "outline"}>
                      {poll.po_use === 1 ? "사용" : "비사용"}
                    </Badge>
                  ),
                },
              ]}
              emptyMessage="조회된 투표가 없습니다."
              getRowKey={(poll) => String(poll.po_id)}
              onRowClick={(poll) => page.setSelectedPollId(poll.po_id)}
              rows={page.polls}
              selectedKey={page.selectedPollId === null ? null : String(page.selectedPollId)}
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

      <PollWorkspace
        createForm={page.createForm}
        createMutation={page.createMutation}
        createPayload={page.createPayload}
        deleteMutation={page.deleteMutation}
        deleteTarget={page.deleteTarget}
        detailLoading={page.detailLoading}
        editForm={page.editForm}
        fieldSchema={pollSchemaQuery.data?.schema ?? null}
        isBusy={page.isBusy}
        onDeleteTargetChange={page.setDeleteTarget}
        onResetEdit={page.resetEdit}
        schemaError={pollSchemaQuery.error ?? null}
        schemaLoading={pollSchemaQuery.isLoading || pollSchemaQuery.isFetching}
        selectedPoll={page.selectedPoll}
        updateMutation={page.updateMutation}
        updatePayload={page.updatePayload}
      />
    </div>
  );
}
