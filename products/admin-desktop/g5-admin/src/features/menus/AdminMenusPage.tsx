import { GripVertical, Link2, PanelsTopLeft, Route } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { MenuWorkspace } from "./MenuWorkspace";
import { useAdminMenusPage } from "./useAdminMenusPage";

export function AdminMenusPage() {
  const page = useAdminMenusPage();
  const menuSchemaQuery = useAdminFieldSchema("menus");
  const topError = page.error;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Menus"
          title="메뉴설정"
          description="`/admin/menus` CRUD와 순서 재정렬을 route-native 작업면으로 연결했습니다. 메뉴 코드, 링크, 노출 여부, 순서를 한 화면에서 확인하고 바로 반영합니다."
          icon={PanelsTopLeft}
          metrics={[
            {
              hint: "현재 서버에 등록된 메뉴 총수",
              icon: PanelsTopLeft,
              label: "메뉴 수",
              value: String(page.total),
            },
            {
              hint: "선택한 메뉴 코드",
              icon: Route,
              label: "선택 메뉴",
              value: page.selectedMenu?.me_code ?? "없음",
            },
            {
              hint: "서버 순서와 다른 draft row 수",
              icon: GripVertical,
              label: "정렬 변경",
              value: String(page.pendingOrderChanges),
            },
          ]}
        />

        {topError ? <ErrorBanner error={topError} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>메뉴 목록</CardTitle>
            <CardDescription>
              순서 입력값을 바꾸면 목록 정렬이 즉시 재배치되고, `정렬 저장`을 눌렀을 때만
              `/admin/menus` `PATCH`가 호출됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={page.isBusy || page.reorderPayload === null}
                onClick={page.saveOrderDrafts}
              >
                정렬 저장
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page.isBusy || page.reorderPayload === null}
                onClick={page.resetOrderDrafts}
              >
                서버 순서 복원
              </Button>
            </div>

            <AdminDataTable
              columns={[
                {
                  header: "메뉴",
                  render: (menu) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {menu.me_name}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {menu.me_code}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "링크",
                  render: (menu) => (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 text-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        <span className="break-all">{menu.me_link}</span>
                      </div>
                      <p>{menu.me_target ?? "_self"}</p>
                    </div>
                  ),
                },
                {
                  header: "노출",
                  render: (menu) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={menu.me_use === 1 ? "secondary" : "outline"}
                        className={
                          menu.me_use === 1
                            ? "bg-emerald-100 text-emerald-900"
                            : undefined
                        }
                      >
                        PC {menu.me_use === 1 ? "ON" : "OFF"}
                      </Badge>
                      <Badge
                        variant={menu.me_mobile_use === 1 ? "secondary" : "outline"}
                        className={
                          menu.me_mobile_use === 1
                            ? "bg-sky-100 text-sky-900"
                            : undefined
                        }
                      >
                        Mobile {menu.me_mobile_use === 1 ? "ON" : "OFF"}
                      </Badge>
                    </div>
                  ),
                },
                {
                  header: "순서",
                  render: (menu) => (
                    <div className="max-w-[7rem]" onClick={(event) => event.stopPropagation()}>
                      <Input
                        className="h-9"
                        inputMode="numeric"
                        value={page.orderDraftFor(menu.me_id)}
                        onChange={(event) =>
                          page.setMenuOrderDraft(menu.me_id, event.currentTarget.value)
                        }
                      />
                    </div>
                  ),
                },
              ]}
              emptyMessage="등록된 메뉴가 없습니다."
              getRowKey={(menu) => String(menu.me_id)}
              onRowClick={(menu) => page.setSelectedMenuId(menu.me_id)}
              rows={page.menus}
              selectedKey={page.selectedMenuId === null ? null : String(page.selectedMenuId)}
            />
          </CardContent>
        </Card>
      </div>

      <MenuWorkspace
        createForm={page.createForm}
        createMutation={page.createMutation}
        createPayload={page.createPayload}
        deleteMutation={page.deleteMutation}
        deleteTarget={page.deleteTarget}
        detailLoading={page.detailLoading}
        editForm={page.editForm}
        fieldSchema={menuSchemaQuery.data?.schema ?? null}
        isBusy={page.isBusy}
        onDeleteTargetChange={page.setDeleteTarget}
        onResetEdit={page.resetEdit}
        schemaError={menuSchemaQuery.error ?? null}
        schemaLoading={menuSchemaQuery.isLoading || menuSchemaQuery.isFetching}
        selectedMenu={page.selectedMenu}
        updateMutation={page.updateMutation}
        updatePayload={page.updatePayload}
      />
    </div>
  );
}
