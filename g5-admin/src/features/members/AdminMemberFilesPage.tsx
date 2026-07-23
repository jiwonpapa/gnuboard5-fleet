import { useQuery } from "@tanstack/react-query";
import { FileText, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  exportAdminMembersExcel,
  type CommandError,
} from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { AdminMemberListResponse } from "../../types/AdminMemberListResponse";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { InfoField } from "../admin/shared/AdminFormFields";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";

const memberSearchFieldOptions = [
  { label: "전체", value: "all" },
  { label: "아이디", value: "mb_id" },
  { label: "이름", value: "mb_name" },
  { label: "닉네임", value: "mb_nick" },
  { label: "이메일", value: "mb_email" },
] as const;

export function AdminMemberFilesPage() {
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("all");

  const query = useQuery<AdminMemberListResponse, CommandError>({
    queryKey: ["admin", "members", "excel", searchField, search],
    queryFn: () =>
      exportAdminMembersExcel({
        per_page: 100,
        search: search.length > 0 ? search : null,
        search_field: searchField,
      }),
    retry: false,
  });

  const members = query.data?.members ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Member Export"
          title="회원관리파일"
          description="`/admin/members/excel`를 route-native 화면으로 분리했습니다. 엑셀 export 대상 회원 목록을 검색 필드와 함께 바로 점검합니다."
          icon={FileText}
          metrics={[
            {
              hint: "현재 검색 필드",
              icon: Search,
              label: "검색 필드",
              value: searchField,
            },
            {
              hint: "현재 검색어",
              icon: Search,
              label: "검색어",
              value: search.length > 0 ? search : "없음",
            },
            {
              hint: "현재 export 대상 total rows",
              icon: ShieldCheck,
              label: "대상 건수",
              value: String(query.data?.pagination.total ?? 0),
            },
          ]}
        />

        {query.error ? <ErrorBanner error={query.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>엑셀 대상 검색</CardTitle>
            <CardDescription>
              현재 API는 실제 파일 스트림이 아니라 export 대상 JSON 목록을 반환합니다. 그래서
              Rust 어드민에서는 대상 행을 먼저 점검하는 작업면으로 붙였습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                setSearch(String(formData.get("search") ?? "").trim());
                setSearchField(String(formData.get("search_field") ?? "all"));
              }}
            >
              <select
                name="search_field"
                defaultValue={searchField}
                className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {memberSearchFieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                name="search"
                defaultValue={search}
                placeholder="회원 검색어"
                className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={query.isFetching}>
                  {query.isFetching ? "조회 중..." : "조회"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => {
                    setSearch("");
                    setSearchField("all");
                  }}
                >
                  초기화
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>엑셀 export 대상 목록</CardTitle>
            <CardDescription>
              레벨, 포인트, 가입일, 오늘 로그인 시각까지 한 번에 확인할 수 있게 정리했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminDataTable
              columns={[
                {
                  header: "회원",
                  render: (member) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {member.mb_id}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {member.mb_name ?? member.mb_nick ?? "-"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "연락처",
                  render: (member) => (
                    <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
                      <p className="break-words">{member.mb_email ?? "-"}</p>
                      <p>level {member.mb_level ?? "-"}</p>
                    </div>
                  ),
                },
                {
                  header: "상태",
                  render: (member) => (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>point {member.mb_point ?? 0}</p>
                      <p>join {member.mb_datetime ?? "-"}</p>
                      <p>today {member.mb_today_login ?? "-"}</p>
                    </div>
                  ),
                },
              ]}
              emptyMessage="조회된 export 대상 회원이 없습니다."
              getRowKey={(member) => member.mb_id}
              rows={members}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-6 xl:self-start">
        <CardHeader>
          <CardTitle>요약</CardTitle>
          <CardDescription>
            현재 export 조건과 응답 메타를 우측에 고정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoField label="search_field" value={searchField} />
          <InfoField label="search" value={search} />
          <InfoField label="total" value={query.data?.pagination.total} />
          <InfoField label="request_id" value={query.data?.request_id} />
          <InfoField label="correlation_id" value={query.data?.correlation_id} />
        </CardContent>
      </Card>
    </div>
  );
}
