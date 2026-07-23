import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import type { AdminMemberDetail } from "../../types/AdminMemberDetail";
import type { MemberProfile } from "../../types/MemberProfile";
import type { FieldLabelResolver } from "./member-detail-shared";

export { MemberMediaSection } from "./MemberDetailMediaSection";
export { MemberProfileSection } from "./MemberDetailProfileSection";

export function MemberOverviewSection(props: {
  fieldLabel: FieldLabelResolver;
  member: AdminMemberDetail;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit rounded-sm">
              Member Detail
            </Badge>
            <div>
              <CardTitle className="text-[1.24rem]">{props.member.mb_id}</CardTitle>
              <CardDescription>
                {props.member.mb_nick ?? props.member.mb_name ?? "닉네임 없음"} ·{" "}
                {props.member.mb_email ?? "이메일 없음"}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Lv.{props.member.mb_level ?? "-"}</Badge>
            <Badge variant="outline">Point {props.member.mb_point ?? 0}</Badge>
            {props.member.mb_intercept_date ? <Badge variant="secondary">차단</Badge> : null}
            {props.member.mb_leave_date ? <Badge variant="outline">탈퇴</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-[0.82rem] text-muted-foreground md:grid-cols-2">
        <InfoRow label={props.fieldLabel("mb_name", "회원 이름")} value={props.member.mb_name} />
        <InfoRow label="오늘 로그인" value={props.member.mb_today_login} />
        <InfoRow label="가입일" value={props.member.mb_datetime} />
        <InfoRow label="약관 로그" value={props.member.mb_agree_log} />
        <InfoRow label={props.fieldLabel("mb_hp", "휴대폰")} value={props.member.mb_hp} />
        <InfoRow label={props.fieldLabel("mb_tel", "전화번호")} value={props.member.mb_tel} />
        <InfoRow
          label={props.fieldLabel("mb_certify", "본인확인")}
          value={props.member.mb_certify}
        />
        <InfoRow
          label={props.fieldLabel("mb_adult", "성인인증")}
          value={(props.member.mb_adult ?? 0) === 1 ? "예" : "아니오"}
        />
      </CardContent>
    </Card>
  );
}

export function MemberLevelSection(props: {
  currentMember: MemberProfile | null;
  isHigherLevelSelected: boolean;
  isSelfSelected: boolean;
  isSubmitting: boolean;
  isTopAdminSelected: boolean;
  maxAssignableLevel: number;
  memberId: string;
  memberLevel: number | null | undefined;
  onSubmitLevel: (level: number) => void;
}) {
  const [pendingLevel, setPendingLevel] = useState(String(props.memberLevel ?? 1));
  const currentMemberLevel = props.currentMember?.mb_level ?? 10;
  const parsedPendingLevel = Number(pendingLevel);
  const canSubmitLevel =
    Number.isInteger(parsedPendingLevel) &&
    parsedPendingLevel >= 1 &&
    parsedPendingLevel <= props.maxAssignableLevel &&
    parsedPendingLevel !== (props.memberLevel ?? 0) &&
    !props.isSelfSelected &&
    !props.isTopAdminSelected &&
    !props.isHigherLevelSelected;

  return (
    <Card>
      <CardHeader>
        <CardTitle>레벨 조정</CardTitle>
        <CardDescription>
          본인보다 높은 레벨, 자기 자신, 최고관리자 계정은 프론트에서 즉시 차단합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="sm:w-48">
            <Label htmlFor="member-level">새 레벨</Label>
            <select
              id={`member-level-${props.memberId}`}
              value={pendingLevel}
              onChange={(event) => setPendingLevel(event.currentTarget.value)}
              disabled={props.isSubmitting || props.isSelfSelected || props.isTopAdminSelected}
              className="mt-2 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Array.from({ length: props.maxAssignableLevel }, (_, index) => {
                const value = String(index + 1);
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => props.onSubmitLevel(parsedPendingLevel)}
              disabled={!canSubmitLevel || props.isSubmitting}
            >
              레벨 저장
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          현재 사용자 레벨: {currentMemberLevel} · 대상 회원 레벨: {props.memberLevel ?? "-"}
        </p>
        {props.isSelfSelected ? (
          <p className="text-sm text-amber-700">자기 자신의 레벨은 변경할 수 없습니다.</p>
        ) : null}
        {props.isTopAdminSelected ? (
          <p className="text-sm text-amber-700">
            최고관리자 계정은 레벨 변경 대상에서 제외됩니다.
          </p>
        ) : null}
        {props.isHigherLevelSelected ? (
          <p className="text-sm text-amber-700">
            현재 세션보다 높은 레벨의 회원은 수정할 수 없습니다.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function MemberDangerZoneSection(props: {
  canDeleteMember: boolean;
  isDeletePending: boolean;
  memberId: string;
  onDelete: () => void;
}) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
        <CardDescription>
          삭제는 확인 후 수행되며, 자기 자신과 최고관리자는 프론트에서 차단합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">현재 대상: {props.memberId}</p>
        <Button
          type="button"
          variant="destructive"
          onClick={props.onDelete}
          disabled={!props.canDeleteMember || props.isDeletePending}
        >
          회원 삭제
        </Button>
      </CardContent>
    </Card>
  );
}

function InfoRow(props: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {props.label}
      </p>
      <p className="break-words text-sm text-foreground">{props.value || "-"}</p>
    </div>
  );
}
