import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  deleteAdminVisits,
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
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { InfoField, TextInputControlField } from "../admin/shared/AdminFormFields";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { AdminVisitDeleteResponse } from "../../types/AdminVisitDeleteResponse";
import {
  adminVisitDeleteFormSchema,
  buildAdminVisitDeleteInput,
  emptyAdminVisitDeleteFormValues,
  type AdminVisitDeleteFormValues,
} from "./admin-visits-form";

export function AdminVisitDeletePage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<AdminVisitDeleteFormValues | null>(null);

  const form = useForm<AdminVisitDeleteFormValues>({
    defaultValues: emptyAdminVisitDeleteFormValues,
    resolver: zodResolver(adminVisitDeleteFormSchema),
  });

  const mutation = useMutation<
    AdminVisitDeleteResponse,
    CommandError,
    AdminVisitDeleteFormValues
  >({
    mutationFn: async (values) => deleteAdminVisits(buildAdminVisitDeleteInput(values)!),
    onSuccess: (response) => {
      toast.success(
        `접속 로그 ${response.result.deleted_rows.toLocaleString()}건을 삭제했습니다.`,
      );
      setConfirmOpen(false);
      setPendingValues(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const latestResult = mutation.data?.result ?? null;
  const pendingSummary = useMemo(() => {
    if (!pendingValues) {
      return "삭제 조건을 아직 제출하지 않았습니다.";
    }

    const parts = [
      pendingValues.before.trim().length > 0 ? `before=${pendingValues.before.trim()}` : null,
      pendingValues.date_from.trim().length > 0
        ? `date_from=${pendingValues.date_from.trim()}`
        : null,
      pendingValues.date_to.trim().length > 0 ? `date_to=${pendingValues.date_to.trim()}` : null,
      pendingValues.ip.trim().length > 0 ? `ip=${pendingValues.ip.trim()}` : null,
    ].filter((value): value is string => value !== null);

    return parts.join(" | ");
  }, [pendingValues]);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <PageIntro
            kicker="Admin Visit Delete"
            title="접속자로그삭제"
            description="`DELETE /admin/visits`를 route-native 화면으로 분리했습니다. 실수로 전체 삭제하지 않도록 before/date/ip 중 하나 이상 입력해야만 삭제를 허용합니다."
            icon={Trash2}
            metrics={[
              {
                hint: "마지막 삭제 실행 건수",
                icon: Trash2,
                label: "최근 삭제",
                value: latestResult ? String(latestResult.deleted_rows) : "0",
              },
              {
                hint: "before 삭제 기준일",
                icon: ShieldAlert,
                label: "before",
                value: latestResult?.before ?? "없음",
              },
              {
                hint: "현재 제출 예정 조건 요약",
                icon: AlertTriangle,
                label: "예정 조건",
                value: pendingSummary,
              },
            ]}
          />

          {mutation.error ? <ErrorBanner error={mutation.error} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>삭제 조건</CardTitle>
              <CardDescription>
                `before`를 쓰면 해당 날짜 이전 로그를 한 번에 삭제합니다. 날짜 범위나 IP는
                더 좁은 삭제에 사용합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={form.handleSubmit((values) => {
                  const input = buildAdminVisitDeleteInput(values);
                  if (!input) {
                    toast.error("삭제 조건을 하나 이상 입력해 주십시오.");
                    return;
                  }

                  setPendingValues(values);
                  setConfirmOpen(true);
                })}
              >
                <TextInputControlField
                  control={form.control}
                  disabled={mutation.isPending}
                  label="before"
                  name="before"
                  placeholder="2026-03-01"
                  description="이 날짜보다 이전 로그를 삭제합니다."
                />
                <TextInputControlField
                  control={form.control}
                  disabled={mutation.isPending}
                  label="IP"
                  name="ip"
                  placeholder="127.0.0.1"
                  description="특정 IP만 삭제할 때 사용합니다."
                />
                <TextInputControlField
                  control={form.control}
                  disabled={mutation.isPending}
                  label="시작일"
                  name="date_from"
                  placeholder="2026-03-01"
                />
                <TextInputControlField
                  control={form.control}
                  disabled={mutation.isPending}
                  label="종료일"
                  name="date_to"
                  placeholder="2026-03-08"
                />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <Button type="submit" variant="destructive" disabled={mutation.isPending}>
                    삭제 확인
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => {
                      form.reset(emptyAdminVisitDeleteFormValues);
                      setPendingValues(null);
                    }}
                  >
                    초기화
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-6 xl:self-start">
          <CardHeader>
            <CardTitle>최근 삭제 결과</CardTitle>
            <CardDescription>
              마지막 삭제 응답 기준으로 실제 반영된 조건과 삭제 건수를 표시합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoField label="deleted_rows" value={latestResult?.deleted_rows} />
            <InfoField label="before" value={latestResult?.before} />
            <InfoField label="date_from" value={latestResult?.date_from} />
            <InfoField label="date_to" value={latestResult?.date_to} />
            <InfoField label="ip" value={latestResult?.ip} />
            <InfoField label="request_id" value={mutation.data?.request_id} />
            <InfoField label="correlation_id" value={mutation.data?.correlation_id} />
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        confirmLabel="접속 로그 삭제"
        description={`다음 조건으로 접속 로그를 삭제합니다. ${pendingSummary}`}
        isPending={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (pendingValues) {
            mutation.mutate(pendingValues);
          }
        }}
        open={confirmOpen}
        title="접속 로그 삭제 실행"
        variant="destructive"
      />
    </>
  );
}
