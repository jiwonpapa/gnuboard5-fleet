import { useState } from "react";
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
import type { CommandError } from "../../api/client";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { AdminMemberDetail } from "../../types/AdminMemberDetail";
import type { AdminMemberMediaResult } from "../../types/AdminMemberMediaResult";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { MemberProfile } from "../../types/MemberProfile";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import type { AdminMemberFormValues } from "./admin-members-form";
import {
  MemberDangerZoneSection,
  MemberLevelSection,
  MemberMediaSection,
  MemberOverviewSection,
  MemberProfileSection,
} from "./MemberDetailSections";

export function MemberDetailCard(props: {
  canDeleteMember: boolean;
  canSaveProfile: boolean;
  currentMember: MemberProfile | null;
  detailError: CommandError | null;
  detailLoading: boolean;
  form: UseFormReturn<AdminMemberFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  isDeletePending: boolean;
  isProfilePending: boolean;
  isRefetching: boolean;
  isSubmitting: boolean;
  isTopAdminSelected: boolean;
  iconDeleteResult: AdminMemberMediaResult | null;
  iconUploadResult: AdminMemberMediaResult | null;
  imageDeleteResult: AdminMemberMediaResult | null;
  imageUploadResult: AdminMemberMediaResult | null;
  maxAssignableLevel: number;
  member: AdminMemberDetail | null;
  onDelete: () => void;
  onDeleteIcon: () => void;
  onDeleteImage: () => void;
  onRefresh: () => void;
  onSubmitLevel: (level: number) => void;
  onSubmitProfile: () => void;
  onUploadIcon: (payload: {
    bytes: number[];
    file_name: string;
    mime_type: string | null;
  }) => void;
  onUploadImage: (payload: {
    bytes: number[];
    file_name: string;
    mime_type: string | null;
  }) => void;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  selectedMemberId: string | null;
}) {
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const schema = props.fieldSchema;
  const fieldLabel = (name: string, fallback: string) =>
    getFieldLabel(schema, name, fallback);
  const fieldDescription = (name: string) => getFieldDescription(schema, name);
  const fieldOptions = (name: string) => getFieldOptions(schema, name);
  const certifyOptions = getFieldOptions(schema, "mb_certify");

  if (!props.selectedMemberId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <Badge variant="outline" className="w-fit rounded-sm">
            Member Detail
          </Badge>
          <CardTitle>회원 상세를 선택하세요</CardTitle>
          <CardDescription>
            좌측 목록에서 회원을 선택하면 상세 조회, 레벨 수정, 프로필 저장, 삭제를
            이 작업면에서 처리합니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (props.detailLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>회원 상세 조회 중</CardTitle>
          <CardDescription>{"/admin/members/{mb_id} 경로에서 상세 데이터를 가져오고 있습니다."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (props.detailError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>회원 상세 조회 실패</CardTitle>
          <CardDescription>
            선택한 회원 상세 조회에서 오류가 발생했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ErrorBanner error={props.detailError} />
          <Button
            type="button"
            variant="outline"
            onClick={props.onRefresh}
            disabled={props.isRefetching}
          >
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!props.member) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>상세 데이터 없음</CardTitle>
          <CardDescription>
            서버에서 상세 응답을 반환하지 않았습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (
    hasFieldSchemaState({
      error: props.schemaError,
      loading: props.schemaLoading,
      schema: props.fieldSchema,
    })
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>회원 스키마 대기</CardTitle>
          <CardDescription>
            회원 필드 메타데이터가 준비되면 상세 작업면을 schema 라벨 기준으로
            다시 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSchemaStatePanel
            error={props.schemaError}
            hiddenTargetLabel="회원 상세 작업면"
            loading={props.schemaLoading}
            noun="회원"
            schema={props.fieldSchema}
          />
        </CardContent>
      </Card>
    );
  }

  const currentMemberLevel = props.currentMember?.mb_level ?? 10;
  const isSelfSelected = props.currentMember?.mb_id === props.member.mb_id;
  const isHigherLevelSelected = (props.member.mb_level ?? 0) > currentMemberLevel;
  const isProfileBlocked = isHigherLevelSelected;

  return (
    <div className="space-y-6">
      <MemberOverviewSection fieldLabel={fieldLabel} member={props.member} />

      <MemberMediaSection
        fieldLabel={fieldLabel}
        iconDeleteResult={props.iconDeleteResult}
        iconFile={iconFile}
        iconUploadResult={props.iconUploadResult}
        imageDeleteResult={props.imageDeleteResult}
        imageFile={imageFile}
        imageUploadResult={props.imageUploadResult}
        onDeleteIcon={props.onDeleteIcon}
        onDeleteImage={props.onDeleteImage}
        onIconFileChange={setIconFile}
        onImageFileChange={setImageFile}
        onUploadIcon={props.onUploadIcon}
        onUploadImage={props.onUploadImage}
      />

      <MemberLevelSection
        key={props.member.mb_id}
        currentMember={props.currentMember}
        isHigherLevelSelected={isHigherLevelSelected}
        isSelfSelected={isSelfSelected}
        isSubmitting={props.isSubmitting}
        isTopAdminSelected={props.isTopAdminSelected}
        maxAssignableLevel={props.maxAssignableLevel}
        memberId={props.member.mb_id}
        memberLevel={props.member.mb_level}
        onSubmitLevel={props.onSubmitLevel}
      />

      <MemberProfileSection
        canSaveProfile={props.canSaveProfile}
        certifyOptions={certifyOptions}
        fieldDescription={fieldDescription}
        fieldLabel={fieldLabel}
        fieldOptions={fieldOptions}
        form={props.form}
        isProfileBlocked={isProfileBlocked}
        isProfilePending={props.isProfilePending}
        isTopAdminSelected={props.isTopAdminSelected}
        onSubmitProfile={props.onSubmitProfile}
      />

      <MemberDangerZoneSection
        canDeleteMember={props.canDeleteMember}
        isDeletePending={props.isDeletePending}
        memberId={props.member.mb_id}
        onDelete={props.onDelete}
      />
    </div>
  );
}
