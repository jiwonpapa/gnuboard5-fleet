import { ShieldCheck, Users, Waypoints } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import type { AdminMemberListItem } from "../../types/AdminMemberListItem";
import type { Pagination } from "../../types/Pagination";
import { PageIntro } from "../layout/PageIntro";
import { MEMBER_MANAGE_ROUTE } from "../layout/navigation";
import { MembersDataTable } from "./MembersDataTable";
import { normalizeSearch } from "./admin-members-page-helpers";

export function AdminMembersListSection(props: {
  currentMember: { mb_id?: string; mb_level?: number | null } | null;
  listBusy: boolean;
  members: AdminMemberListItem[];
  mutationBusy: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onResetSearch: () => void;
  onSearch: (search: string | null) => void;
  onSelectMember: (mbId: string) => void;
  page: number;
  pagination: Pagination | undefined;
  search: string | null;
  selectedMemberId: string | null;
  totalMembers: number;
}) {
  const isBusy = props.listBusy || props.mutationBusy;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin Members"
        title="회원 관리"
        description="회원 목록과 상세를 route 기반으로 분리하고, 우측 상세 작업면에서 레벨 변경, 프로필 수정, 삭제를 한 번에 처리합니다. 검색과 pagination은 URL query string으로 유지합니다."
        icon={Users}
        actions={
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-sm border border-border bg-background/90 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                현재 선택
              </p>
              <strong className="mt-1 block text-[0.9rem] font-semibold text-foreground">
                {props.selectedMemberId ?? "없음"}
              </strong>
            </div>
            <div className="rounded-sm border border-border bg-background/90 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                현재 페이지
              </p>
              <strong className="mt-1 block text-[0.9rem] font-semibold text-foreground">
                {props.pagination?.page ?? props.page} / {props.pagination?.last_page ?? 1}
              </strong>
            </div>
          </div>
        }
        metrics={[
          {
            hint: "현재 로그인한 관리자 계정",
            icon: ShieldCheck,
            label: "현재 세션",
            value: props.currentMember?.mb_id ?? "anonymous",
          },
          {
            hint: "권한 판단과 수정 가능 범위 기준",
            icon: ShieldCheck,
            label: "현재 레벨",
            value: String(props.currentMember?.mb_level ?? "-"),
          },
          {
            hint: "현재 검색 조건 기준 total members",
            icon: Waypoints,
            label: "조회 건수",
            value: String(props.totalMembers),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>회원 목록</CardTitle>
          <CardDescription>
            검색/페이지 이동은 query string으로 유지하고, 상세는
            `{`${MEMBER_MANAGE_ROUTE}/:mbId`}` route로 분리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onSearch(normalizeSearch(String(formData.get("search") ?? "")));
            }}
          >
            <Input
              key={props.search ?? ""}
              className="text-[0.84rem]"
              defaultValue={props.search ?? ""}
              disabled={isBusy}
              name="search"
              placeholder="아이디, 닉네임, 이메일 검색"
            />
            <div className="flex gap-2 self-end">
              <Button type="submit" disabled={isBusy}>
                검색
              </Button>
              <Button type="button" variant="outline" disabled={isBusy} onClick={props.onResetSearch}>
                초기화
              </Button>
            </div>
          </form>

          {props.listBusy ? (
            <div className="rounded-sm border border-dashed border-border bg-background/70 px-5 py-8 text-center text-[0.82rem] text-muted-foreground">
              회원 목록을 불러오는 중입니다.
            </div>
          ) : (
            <MembersDataTable
              isBusy={isBusy}
              members={props.members}
              onSelectMember={props.onSelectMember}
              selectedMemberId={props.selectedMemberId}
            />
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.82rem] text-muted-foreground">
              page {props.pagination?.page ?? props.page} / {props.pagination?.last_page ?? 1} ·
              total {props.pagination?.total ?? 0}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={props.listBusy || !(props.pagination?.has_prev ?? props.page > 1)}
                onClick={props.onPrevPage}
              >
                이전
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.listBusy || !(props.pagination?.has_next ?? false)}
                onClick={props.onNextPage}
              >
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
