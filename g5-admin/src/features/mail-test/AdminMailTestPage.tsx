import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Send, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { sendAdminMailTest, type CommandError } from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  TextAreaInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminMailTestResponse } from "../../types/AdminMailTestResponse";
import {
  adminMailTestFormSchema,
  buildAdminMailTestInput,
  emptyAdminMailTestFormValues,
  type AdminMailTestFormValues,
} from "./admin-mail-test-form";

export function AdminMailTestPage() {
  const form = useForm<AdminMailTestFormValues>({
    defaultValues: emptyAdminMailTestFormValues,
    resolver: zodResolver(adminMailTestFormSchema),
  });

  const mutation = useMutation<AdminMailTestResponse, CommandError, AdminMailTestFormValues>({
    mutationFn: async (values) => sendAdminMailTest(buildAdminMailTestInput(values)!),
    onSuccess: (response) => {
      toast.success(`${response.result.to}로 테스트 메일을 전송했습니다.`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const latestResult = mutation.data?.result ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Mail Test"
          title="메일 테스트"
          description="비deprecated 시스템 경로 `/admin/system/mails/test` 기준으로 테스트 메일을 발송합니다. 발송 결과와 로그 ID는 즉시 우측 요약 카드에 반영합니다."
          icon={Mail}
          metrics={[
            {
              hint: "가장 최근 테스트 메일 수신 주소",
              icon: Send,
              label: "최근 수신자",
              value: latestResult?.to ?? "없음",
            },
            {
              hint: "가장 최근 생성된 메일 로그 ID",
              icon: ShieldCheck,
              label: "로그 ID",
              value:
                latestResult?.mail_log_id !== null &&
                latestResult?.mail_log_id !== undefined
                  ? String(latestResult.mail_log_id)
                  : "없음",
            },
            {
              hint: "최근 발송 성공 여부",
              icon: Mail,
              label: "발송 상태",
              value: latestResult ? (latestResult.sent ? "성공" : "실패") : "대기",
            },
          ]}
        />

        {mutation.error ? <ErrorBanner error={mutation.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>테스트 메일 발송</CardTitle>
            <CardDescription>
              수신 주소, 제목, 본문을 입력하면 서버가 메일 로그를 남기고 테스트 메일을
              전송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                const payload = buildAdminMailTestInput(values);
                if (!payload) {
                  toast.error("메일 테스트 입력값을 다시 확인해 주십시오.");
                  return;
                }

                mutation.mutate(values);
              })}
            >
              <TextInputControlField
                control={form.control}
                disabled={mutation.isPending}
                label="수신 이메일"
                name="to"
                placeholder="tester@example.com"
              />
              <TextInputControlField
                control={form.control}
                disabled={mutation.isPending}
                label="메일 제목"
                name="subject"
                placeholder="테스트 메일 제목"
              />
              <TextAreaInputControlField
                control={form.control}
                disabled={mutation.isPending}
                label="메일 본문"
                name="content"
                placeholder="테스트 본문"
                rows={10}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "전송 중..." : "테스트 메일 보내기"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => form.reset(emptyAdminMailTestFormValues)}
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
          <CardTitle>최근 발송 결과</CardTitle>
          <CardDescription>
            마지막 성공 응답 기준으로 메일 로그와 수신 주소를 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResultField label="수신자" value={latestResult?.to ?? "없음"} />
          <ResultField
            label="mail_log_id"
            value={
              latestResult?.mail_log_id !== null &&
              latestResult?.mail_log_id !== undefined
                ? String(latestResult.mail_log_id)
                : "없음"
            }
          />
          <ResultField
            label="sent"
            value={latestResult ? (latestResult.sent ? "true" : "false") : "대기"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ResultField(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-foreground">{props.value}</p>
    </div>
  );
}
