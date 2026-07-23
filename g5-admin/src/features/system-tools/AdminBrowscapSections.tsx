import type { UseFormReturn } from "react-hook-form";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { cn } from "../../lib/utils";
import type { AdminBrowscapConvertResult } from "../../types/AdminBrowscapConvertResult";
import type { AdminBrowscapStatus } from "../../types/AdminBrowscapStatus";
import { InfoField, TextInputControlField } from "../admin/shared/AdminFormFields";
import type {
  AdminBrowscapConvertFormValues,
} from "./admin-browscap-form";

export function AdminBrowscapStatusSection(props: {
  emphasized: boolean;
  isBusy: boolean;
  onRefresh: () => void;
  onUpdate: () => void;
  status: AdminBrowscapStatus | null;
  updatePending: boolean;
}) {
  return (
    <Card
      className={cn(
        props.emphasized ? "border-primary/40 bg-primary/5" : "border-border/70",
      )}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={props.emphasized ? "secondary" : "outline"}>
            {props.emphasized ? "현재 메뉴" : "도구"}
          </Badge>
          <CardTitle>Browscap 상태 및 업데이트</CardTitle>
        </div>
        <CardDescription>
          플러그인 경로, 캐시 파일, PHP 버전, pending 방문 수를 먼저 확인하고 필요할 때
          캐시 업데이트를 실행합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoField label="available" value={props.status ? String(props.status.available) : "loading"} />
          <InfoField
            label="cache_exists"
            value={props.status ? String(props.status.cache_exists) : "loading"}
          />
          <InfoField
            label="pending_visit_count"
            value={props.status?.pending_visit_count}
          />
          <InfoField label="cache_mtime" value={props.status?.cache_mtime} />
          <InfoField label="php_version" value={props.status?.php_version} />
          <InfoField
            label="updated"
            value={
              props.status?.updated === undefined || props.status?.updated === null
                ? "-"
                : String(props.status.updated)
            }
          />
        </div>

        <div className="grid gap-3">
          <InfoField label="plugin_path" value={props.status?.plugin_path} />
          <InfoField label="cache_directory" value={props.status?.cache_directory} />
          <InfoField label="cache_file" value={props.status?.cache_file} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={props.isBusy} onClick={props.onUpdate}>
            {props.updatePending ? "업데이트 중..." : "Browscap 업데이트"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={props.isBusy}
            onClick={props.onRefresh}
          >
            상태 새로고침
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminBrowscapConvertSection(props: {
  convertPending: boolean;
  emphasized: boolean;
  form: UseFormReturn<AdminBrowscapConvertFormValues>;
  isBusy: boolean;
  onReset: () => void;
  onSubmit: (values: AdminBrowscapConvertFormValues) => void;
  status: AdminBrowscapStatus | null;
}) {
  return (
    <Card
      className={cn(
        props.emphasized ? "border-primary/40 bg-primary/5" : "border-border/70",
      )}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={props.emphasized ? "secondary" : "outline"}>
            {props.emphasized ? "현재 메뉴" : "도구"}
          </Badge>
          <CardTitle>접속로그 변환 실행</CardTitle>
        </div>
        <CardDescription>
          지정한 건수만큼 pending 방문 로그를 읽어 Browscap 정보를 채웁니다. 현재 메뉴가
          `접속로그 변환`이면 이 카드가 우선 강조됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={props.form.handleSubmit(props.onSubmit)}
        >
          <TextInputControlField
            control={props.form.control}
            disabled={props.isBusy || !props.status?.available || !props.status?.cache_exists}
            label="변환 건수"
            name="rows"
            placeholder="100"
            type="number"
            description="한 번에 처리할 방문 로그 수입니다."
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={props.isBusy || !props.status?.available || !props.status?.cache_exists}
            >
              {props.convertPending ? "변환 중..." : "접속로그 변환 실행"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy}
              onClick={props.onReset}
            >
              기본값 복원
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminBrowscapLatestConvertSection(props: {
  correlationId: string | null;
  focusRoute: string;
  latestConvert: AdminBrowscapConvertResult | null;
  requestId: string | null;
  serverRequestId: string | null;
}) {
  return (
    <Card className="xl:sticky xl:top-6 xl:self-start">
      <CardHeader>
        <CardTitle>최근 변환 결과</CardTitle>
        <CardDescription>
          마지막 변환 실행 기준으로 batch 결과를 그대로 표시합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoField label="focus" value={props.focusRoute} />
        <InfoField label="rows" value={props.latestConvert?.rows} />
        <InfoField
          label="total_pending_before"
          value={props.latestConvert?.total_pending_before}
        />
        <InfoField
          label="processed_count"
          value={props.latestConvert?.processed_count}
        />
        <InfoField
          label="remaining_count"
          value={props.latestConvert?.remaining_count}
        />
        <InfoField
          label="completed"
          value={
            props.latestConvert?.completed === undefined
              ? undefined
              : String(props.latestConvert.completed)
          }
        />
        <InfoField label="request_id" value={props.requestId} />
        <InfoField label="correlation_id" value={props.correlationId} />
        <InfoField label="server_request_id" value={props.serverRequestId} />
      </CardContent>
    </Card>
  );
}
