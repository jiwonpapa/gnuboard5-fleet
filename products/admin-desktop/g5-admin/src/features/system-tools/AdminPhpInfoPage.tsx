import { useQuery } from "@tanstack/react-query";
import { FileCode2, Info, Puzzle } from "lucide-react";
import { getAdminPhpInfo, type CommandError } from "../../api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { InfoField } from "../admin/shared/AdminFormFields";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { AdminPhpInfoResponse } from "../../types/AdminPhpInfoResponse";

const phpInfoQueryKey = ["admin", "system-tools", "phpinfo"] as const;

export function AdminPhpInfoPage() {
  const query = useQuery<AdminPhpInfoResponse, CommandError>({
    queryKey: phpInfoQueryKey,
    queryFn: getAdminPhpInfo,
  });

  const info = query.data?.info ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin PHP Info"
          title="phpinfo()"
          description="`/admin/system/phpinfo` 결과를 route-native 화면으로 그대로 노출합니다. PHP 버전, SAPI, ini 경로, 확장 모듈 수를 먼저 요약하고, 하단 iframe에서 원문 HTML을 확인합니다."
          icon={Info}
          metrics={[
            {
              hint: "현재 관리자 API 런타임 PHP 버전",
              icon: Info,
              label: "PHP 버전",
              value: info?.php_version ?? "loading...",
            },
            {
              hint: "현재 서버 SAPI",
              icon: FileCode2,
              label: "SAPI",
              value: info?.sapi ?? "loading...",
            },
            {
              hint: "로드된 확장 모듈 수",
              icon: Puzzle,
              label: "확장 모듈",
              value: info ? String(info.extension_count) : "loading...",
            },
          ]}
        />

        {query.error ? <ErrorBanner error={query.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>런타임 요약</CardTitle>
            <CardDescription>
              phpinfo 원문을 열기 전에 현재 서버 핵심 정보만 바로 확인할 수 있게 따로
              정리했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoField label="php_version" value={info?.php_version} />
            <InfoField label="sapi" value={info?.sapi} />
            <InfoField label="extension_count" value={info?.extension_count} />
            <InfoField label="loaded_ini" value={info?.loaded_ini} />
            <InfoField label="scanned_ini" value={info?.scanned_ini} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>phpinfo HTML 원문</CardTitle>
            <CardDescription>
              레거시 `adm/phpinfo.php`와 같은 수준으로 전체 정보를 확인할 수 있게 원문
              HTML을 iframe으로 그대로 렌더링합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-white">
              <iframe
                title="phpinfo"
                className="h-[960px] w-full"
                sandbox=""
                srcDoc={info?.html ?? buildLoadingHtml()}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-6 xl:self-start">
        <CardHeader>
          <CardTitle>확인 포인트</CardTitle>
          <CardDescription>
            phpinfo 화면에서 형님이 바로 보는 항목만 별도로 모아뒀습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoField label="loaded_ini" value={info?.loaded_ini} />
          <InfoField label="scanned_ini" value={info?.scanned_ini} />
          <InfoField
            label="html_status"
            value={info?.html ? "loaded" : query.isPending ? "loading" : "empty"}
          />
          <InfoField label="request_id" value={query.data?.request_id} />
          <InfoField label="correlation_id" value={query.data?.correlation_id} />
          <InfoField
            label="server_request_id"
            value={query.data?.server_request_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function buildLoadingHtml() {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>phpinfo loading</title>
    <style>
      body { font-family: sans-serif; padding: 24px; color: #334155; }
    </style>
  </head>
  <body>
    <p>phpinfo 결과를 불러오는 중입니다.</p>
  </body>
</html>`;
}
