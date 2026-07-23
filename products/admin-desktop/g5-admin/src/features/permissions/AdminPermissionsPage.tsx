import { ShieldCheck, UserRoundSearch, Waypoints } from "lucide-react";
import { Badge } from "../../components/ui/badge";
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
import { PermissionsWorkspace } from "./PermissionsWorkspace";
import { composePermissionKey } from "./admin-permissions-form";
import { useAdminPermissionsPage } from "./useAdminPermissionsPage";

export function AdminPermissionsPage() {
  const page = useAdminPermissionsPage();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Permissions"
          title="권한 관리"
          description="`/admin/system/auths` 목록 조회, 단건 저장, 단건 삭제를 route-native 페이지로 전환했습니다. 검색 조건과 페이지 상태는 화면에서 유지하고, 선택된 권한은 우측 작업면에서 바로 수정합니다."
          icon={ShieldCheck}
          metrics={[
            {
              hint: "현재 목록 기준 total permissions",
              icon: Waypoints,
              label: "조회 건수",
              value: String(page.pagination?.total ?? 0),
            },
            {
              hint: "mb_id 기반 권한 조회 필터",
              icon: UserRoundSearch,
              label: "현재 필터",
              value: page.submittedFilter ?? "전체",
            },
            {
              hint: "선택된 권한의 회원 ID / 메뉴 코드",
              icon: ShieldCheck,
              label: "선택 항목",
              value:
                page.selectedPermission === null
                  ? "없음"
                  : `${page.selectedPermission.mb_id} / ${page.selectedPermission.au_menu}`,
            },
          ]}
        />

        {page.error ? <ErrorBanner error={page.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>권한 목록</CardTitle>
            <CardDescription>
              `(mb_id, au_menu)` 조합을 기준으로 현재 페이지 결과를 조회합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                page.submitFilter();
              }}
            >
              <TextInputField
                className="flex-1"
                label="회원 ID 필터"
                onChange={(event) => page.setFilterInput(event.currentTarget.value)}
                placeholder="admin"
                value={page.filterInput}
              />
              <div className="flex gap-2 self-end">
                <Button type="submit" disabled={page.isBusy}>
                  검색
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page.isBusy && page.submittedFilter === null}
                  onClick={() => {
                    page.setFilterInput("");
                    page.setSubmittedFilter(null);
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
                  header: "회원",
                  render: (permission) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {permission.mb_id}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {permission.mb_nick ?? permission.mb_name ?? "회원 정보 없음"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "메뉴 코드",
                  render: (permission) => permission.au_menu,
                },
                {
                  header: "권한",
                  render: (permission) => (
                    <Badge variant="outline" className="w-fit">
                      {permission.au_auth}
                    </Badge>
                  ),
                },
              ]}
              emptyMessage="조회된 권한이 없습니다."
              getRowKey={(permission) =>
                composePermissionKey(permission.mb_id, permission.au_menu)
              }
              onRowClick={page.syncSelection}
              rows={page.permissions}
              selectedKey={page.selectedKey}
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

      <PermissionsWorkspace
        deleteMutation={page.deleteMutation}
        deleteTarget={page.deleteTarget}
        form={page.form}
        isBusy={page.isBusy}
        onDeleteTargetChange={page.setDeleteTarget}
        onResetToBlank={page.resetToBlank}
        onResetToSelected={page.resetToSelected}
        saveMutation={page.saveMutation}
        savePayload={page.savePayload}
        selectedPermission={page.selectedPermission}
      />
    </div>
  );
}
