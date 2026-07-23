import { Blocks, PanelsTopLeft, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { PageIntro } from "../layout/PageIntro";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { TextInputField } from "../admin/shared/AdminFormFields";
import { ErrorBanner } from "../shared/ErrorBanner";
import { ListPagination } from "../shared/ListPagination";
import { BoardWorkspace } from "./BoardWorkspace";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { useAdminBoardsPage } from "./useAdminBoardsPage";

export function AdminBoardsPage() {
  const page = useAdminBoardsPage();
  const boardSchemaQuery = useAdminFieldSchema("boards");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Boards"
          title="게시판 관리"
          description="목록/상세/생성/수정/삭제를 모두 route-native 화면으로 분리했습니다. 검색, 페이지 이동, 상세 편집, 삭제를 한 화면에서 처리합니다."
          icon={PanelsTopLeft}
          actions={
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-sm border border-border bg-background/90 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  현재 페이지
                </p>
                <strong className="mt-1 block text-[0.9rem] font-semibold text-foreground">
                  {page.pagination?.page ?? page.page} / {page.pagination?.last_page ?? 1}
                </strong>
              </div>
              <div className="rounded-sm border border-border bg-background/90 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  선택 게시판
                </p>
                <strong className="mt-1 block text-[0.9rem] font-semibold text-foreground">
                  {page.selectedBoard?.bo_table ?? "없음"}
                </strong>
              </div>
            </div>
          }
          metrics={[
            {
              hint: "현재 검색 조건 기준 total boards",
              icon: PanelsTopLeft,
              label: "조회 건수",
              value: String(page.pagination?.total ?? 0),
            },
            {
              hint: "현재 검색어",
              icon: Search,
              label: "검색어",
              value: page.submittedSearch ?? "전체",
            },
            {
              hint: "현재 선택된 게시판 코드",
              icon: Blocks,
              label: "선택 게시판",
              value: page.selectedBoard?.bo_table ?? "없음",
            },
          ]}
        />

        {page.error ? <ErrorBanner error={page.error} /> : null}
        {boardSchemaQuery.error ? <ErrorBanner error={boardSchemaQuery.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>게시판 목록</CardTitle>
            <CardDescription>
              코드 또는 제목 검색 결과에서 게시판을 선택하면 우측 작업면이 hydrate 됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                page.submitSearch();
              }}
            >
              <TextInputField
                className="flex-1"
                icon={Search}
                label="게시판 검색"
                onChange={(event) => page.setSearchInput(event.currentTarget.value)}
                placeholder="bo_table 또는 bo_subject"
                value={page.searchInput}
              />
              <div className="flex gap-2 self-end">
                <Button type="submit" disabled={page.isBusy}>
                  검색
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page.isBusy && page.submittedSearch === null}
                  onClick={() => {
                    page.setSearchInput("");
                    page.setSubmittedSearch(null);
                    page.setPage(1);
                  }}
                >
                  초기화
                </Button>
              </div>
            </form>

            <AdminDataTable
              columns={[
                {
                  header: "게시판",
                  render: (board) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {board.bo_table}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {board.bo_subject ?? "제목 없음"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "그룹",
                  render: (board) => board.gr_id ?? "-",
                },
                {
                  header: "운영 정보",
                  render: (board) => (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>posts {board.bo_count_write ?? 0}</p>
                      <p>comments {board.bo_count_comment ?? 0}</p>
                    </div>
                  ),
                },
              ]}
              emptyMessage="조회된 게시판이 없습니다."
              getRowKey={(board) => board.bo_table}
              onRowClick={(board) => page.setSelectedBoardTable(board.bo_table)}
              rows={page.boards}
              selectedKey={page.selectedBoardTable}
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

      <BoardWorkspace
        createForm={page.createForm}
        createMutation={page.createMutation}
        createPayload={page.createPayload}
        copyMutation={page.copyMutation}
        copyTargetSubject={page.copyTargetSubject}
        copyTargetTable={page.copyTargetTable}
        deleteMutation={page.deleteMutation}
        deleteTarget={page.deleteTarget}
        detailLoading={page.boardDetailQuery.isLoading}
        editForm={page.editForm}
        fieldSchema={boardSchemaQuery.data?.schema ?? null}
        isBusy={page.isBusy}
        newPostIdsText={page.newPostIdsText}
        newPostsDeleteMutation={page.newPostsDeleteMutation}
        onCopyTargetSubjectChange={page.setCopyTargetSubject}
        onCopyTargetTableChange={page.setCopyTargetTable}
        onDeleteTargetChange={page.setDeleteTarget}
        onNewPostIdsTextChange={page.setNewPostIdsText}
        onResetEdit={page.resetEdit}
        selectedBoard={page.selectedBoard}
        schemaError={boardSchemaQuery.error ?? null}
        schemaLoading={boardSchemaQuery.isLoading || boardSchemaQuery.isFetching}
        updateMutation={page.updateMutation}
        updatePayload={page.updatePayload}
      />
    </div>
  );
}
