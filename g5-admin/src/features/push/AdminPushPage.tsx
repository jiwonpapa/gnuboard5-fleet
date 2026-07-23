import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BellRing, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { createAdminPushMessage, type CommandError } from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";

export function AdminPushPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pushType, setPushType] = useState("manual");
  const [targetMode, setTargetMode] = useState<"all" | "manual">("manual");
  const [memberIdsText, setMemberIdsText] = useState("");

  const memberIds = useMemo(
    () =>
      memberIdsText
        .split(/[,\n]/)
        .map((memberId) => memberId.trim())
        .filter(Boolean),
    [memberIdsText],
  );

  const sendMutation = useMutation({
    mutationFn: createAdminPushMessage,
    onSuccess: () => {
      toast.success("푸시 발송 큐를 등록했습니다.");
      if (targetMode === "manual") {
        setMemberIdsText("");
      }
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Push"
          title="푸시 발송"
          description="`/admin/push/messages`를 route-native 작업면으로 연결했습니다. 전체 발송 또는 대상 회원 지정 발송을 즉시 큐잉합니다."
          icon={BellRing}
          metrics={[
            {
              hint: "현재 타깃 방식",
              icon: Users,
              label: "타깃",
              value: targetMode === "all" ? "전체" : "수동 선택",
            },
            {
              hint: "수동 입력 대상 수",
              icon: Users,
              label: "대상 수",
              value: String(targetMode === "all" ? 0 : memberIds.length),
            },
            {
              hint: "최근 큐 등록 결과",
              icon: Send,
              label: "Queued",
              value: String(sendMutation.data?.result.queued ?? 0),
            },
          ]}
        />

        {sendMutation.error ? <ErrorBanner error={sendMutation.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>푸시 메시지 작성</CardTitle>
            <CardDescription>
              대상이 `all`이면 전체 회원을, `manual`이면 입력한 회원 ID만 큐잉합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="제목">
              <Input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
            </Field>
            <Field label="본문">
              <Textarea rows={8} value={body} onChange={(event) => setBody(event.currentTarget.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="타입">
                <Input value={pushType} onChange={(event) => setPushType(event.currentTarget.value)} />
              </Field>
              <Field label="대상">
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={targetMode}
                  onChange={(event) =>
                    setTargetMode(event.currentTarget.value === "all" ? "all" : "manual")
                  }
                >
                  <option value="manual">수동 선택</option>
                  <option value="all">전체 회원</option>
                </select>
              </Field>
            </div>
            <Field label="회원 ID 목록 (콤마/줄바꿈)">
              <Textarea
                rows={6}
                value={memberIdsText}
                onChange={(event) => setMemberIdsText(event.currentTarget.value)}
                disabled={targetMode === "all"}
              />
            </Field>
            <Button
              type="button"
              disabled={
                sendMutation.isPending ||
                title.trim().length === 0 ||
                body.trim().length === 0 ||
                (targetMode === "manual" && memberIds.length === 0)
              }
              onClick={() =>
                sendMutation.mutate({
                  title: title.trim(),
                  body: body.trim(),
                  type: pushType.trim() || null,
                  target: targetMode === "all" ? "all" : null,
                  member_ids: targetMode === "all" ? null : memberIds,
                })
              }
            >
              {sendMutation.isPending ? "큐 등록 중..." : "푸시 큐 등록"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>최근 결과</CardTitle>
            <CardDescription>서버 응답 기준 큐 등록 결과와 실패 건수를 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ResultRow label="requested_by" value={sendMutation.data?.result.requested_by ?? "-"} />
            <ResultRow label="target_count" value={String(sendMutation.data?.result.target_count ?? 0)} />
            <ResultRow label="queued" value={String(sendMutation.data?.result.queued ?? 0)} />
            <ResultRow label="failed" value={String(sendMutation.data?.result.failed ?? 0)} />
            <ResultRow label="request_id" value={sendMutation.data?.request_id ?? "-"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field(props: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function ResultRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 px-3 py-2">
      <span className="text-muted-foreground">{props.label}</span>
      <strong className="text-right text-foreground">{props.value}</strong>
    </div>
  );
}
