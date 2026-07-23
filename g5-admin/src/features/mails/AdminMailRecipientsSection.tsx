import { type Dispatch, type SetStateAction } from "react";
import { type UseFormReturn } from "react-hook-form";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  SelectInputControlField,
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import type { AdminMailRecipient } from "../../types/AdminMailRecipient";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { Pagination } from "../../types/Pagination";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import type { AdminMailComposeFormValues } from "./admin-mails-form";
import {
  renderTargetType,
  targetTypeOptions,
  toggleRecipientSelection,
} from "./admin-mails-page-helpers";
import { Pager } from "./admin-mails-section-shared";

export function MailRecipientsSection(props: {
  composeForm: UseFormReturn<AdminMailComposeFormValues>;
  currentPage: number;
  disabled: boolean;
  fieldSchema: AdminSchemaDetail | null;
  hasNext: boolean;
  hasPrev: boolean;
  isBusy: boolean;
  onApplyPreview: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  recipientPagination: Pagination | null;
  recipients: AdminMailRecipient[];
  selectedRecipientIds: string[];
  setSelectedRecipientIds: Dispatch<SetStateAction<string[]>>;
  targetType: AdminMailComposeFormValues["target_type"];
  visibleRecipientIds: string[];
}) {
  const targetTypeOptions = resolveOptions(props.fieldSchema, "target_type");
  const fieldLabel = (name: keyof AdminMailComposeFormValues, fallback: string) =>
    getFieldLabel(props.fieldSchema, name, fallback);
  const fieldDescription = (name: keyof AdminMailComposeFormValues) =>
    getFieldDescription(props.fieldSchema, name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>수신자 미리보기</CardTitle>
        <CardDescription>
          발송에 실제 반영되는 필터만 기준으로 후보를 확인합니다. `직접 선택 회원`
          모드일 때만 검색어로 후보를 좁히고, 실제 발송 대상은 선택한 회원 ID로만
          고정됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (props.composeForm.getValues("target_type") !== "member") {
              props.setSelectedRecipientIds([]);
            }
            props.onApplyPreview();
          }}
        >
          <SelectInputControlField
            control={props.composeForm.control}
            description={fieldDescription("target_type")}
            disabled={props.isBusy}
            label={fieldLabel("target_type", "대상 방식")}
            name="target_type"
            options={targetTypeOptions}
          />
          <ToggleControlField
            control={props.composeForm.control}
            description={fieldDescription("mailling_only")}
            disabled={props.isBusy}
            label={fieldLabel("mailling_only", "메일 수신 동의만 포함")}
            name="mailling_only"
          />

          {props.targetType === "level" ? (
            <>
              <TextInputControlField
                control={props.composeForm.control}
                description={fieldDescription("level_min")}
                disabled={props.isBusy}
                label={fieldLabel("level_min", "최소 레벨")}
                name="level_min"
                placeholder="1"
                type="number"
              />
              <TextInputControlField
                control={props.composeForm.control}
                description={fieldDescription("level_max")}
                disabled={props.isBusy}
                label={fieldLabel("level_max", "최대 레벨")}
                name="level_max"
                placeholder="10"
                type="number"
              />
            </>
          ) : null}

          {props.targetType === "group" ? (
            <TextInputControlField
              className="md:col-span-2"
              control={props.composeForm.control}
              description={fieldDescription("gr_id")}
              disabled={props.isBusy}
              label={fieldLabel("gr_id", "그룹 ID")}
              name="gr_id"
              placeholder="staff"
            />
          ) : null}

          <TextInputControlField
            control={props.composeForm.control}
            description={fieldDescription("member_id_from")}
            disabled={props.isBusy}
            label={fieldLabel("member_id_from", "회원 ID 시작")}
            name="member_id_from"
            placeholder="alpha"
          />
          <TextInputControlField
            control={props.composeForm.control}
            description={fieldDescription("member_id_to")}
            disabled={props.isBusy}
            label={fieldLabel("member_id_to", "회원 ID 끝")}
            name="member_id_to"
            placeholder="omega"
          />
          <TextInputControlField
            control={props.composeForm.control}
            description={fieldDescription("email_contains")}
            disabled={props.isBusy}
            label={fieldLabel("email_contains", "이메일 포함 문자열")}
            name="email_contains"
            placeholder="@example.com"
          />
          {props.targetType === "member" ? (
            <TextInputControlField
              control={props.composeForm.control}
              description={fieldDescription("search")}
              disabled={props.isBusy}
              label={fieldLabel("search", "후보 검색")}
              name="search"
              placeholder="회원ID/이름/닉네임/이메일"
            />
          ) : null}

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={props.isBusy || props.disabled}>
              {props.disabled ? "미리보기 갱신 중..." : "미리보기 갱신"}
            </Button>
            {props.targetType === "member" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.visibleRecipientIds.length === 0 || props.isBusy}
                  onClick={() =>
                    props.setSelectedRecipientIds((current) =>
                      Array.from(new Set([...current, ...props.visibleRecipientIds]))
                    )
                  }
                >
                  현재 페이지 전체 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.visibleRecipientIds.length === 0 || props.isBusy}
                  onClick={() =>
                    props.setSelectedRecipientIds((current) =>
                      current.filter(
                        (memberId) => !props.visibleRecipientIds.includes(memberId)
                      )
                    )
                  }
                >
                  현재 페이지 선택 해제
                </Button>
              </>
            ) : null}
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            최근 미리보기 총 {props.recipientPagination?.total ?? 0}명
          </Badge>
          <Badge variant="outline">
            직접 선택 {props.selectedRecipientIds.length}명
          </Badge>
          <Badge variant="outline">
            대상 방식 {renderTargetType(props.targetType)}
          </Badge>
        </div>

        <AdminDataTable
          columns={[
            {
              header: "선택",
              cellClassName: "w-[7rem]",
              render: (recipient) => {
                const isSelected = props.selectedRecipientIds.includes(recipient.mb_id);
                return props.targetType === "member" ? (
                  <Button
                    size="sm"
                    type="button"
                    variant={isSelected ? "secondary" : "outline"}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleRecipientSelection(
                        recipient.mb_id,
                        props.setSelectedRecipientIds
                      );
                    }}
                  >
                    {isSelected ? "제외" : "선택"}
                  </Button>
                ) : (
                  <Badge variant="outline">미리보기</Badge>
                );
              },
            },
            {
              header: "회원",
              render: (recipient) => (
                <div className="min-w-0 space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {recipient.mb_id}
                  </strong>
                  <p className="text-xs text-muted-foreground">
                    {(recipient.mb_name ?? "-") + " / " + (recipient.mb_nick ?? "-")}
                  </p>
                </div>
              ),
            },
            {
              header: "연락 정보",
              render: (recipient) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="break-all">{recipient.mb_email ?? "-"}</p>
                  <p>레벨 {recipient.mb_level ?? "-"}</p>
                </div>
              ),
            },
            {
              header: "상태",
              render: (recipient) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>메일수신 {(recipient.mb_mailling ?? 0) === 1 ? "ON" : "OFF"}</p>
                  <p>{recipient.mb_datetime ?? "-"}</p>
                </div>
              ),
            },
          ]}
          emptyMessage="조건에 맞는 수신자가 없습니다."
          getRowKey={(recipient) => recipient.mb_id}
          onRowClick={
            props.targetType === "member"
              ? (recipient) =>
                  toggleRecipientSelection(
                    recipient.mb_id,
                    props.setSelectedRecipientIds
                  )
              : undefined
          }
          rows={props.recipients}
        />

        <Pager
          currentPage={props.currentPage}
          disabled={props.disabled}
          hasNext={props.hasNext}
          hasPrev={props.hasPrev}
          onNext={props.onNextPage}
          onPrev={props.onPrevPage}
        />
      </CardContent>
    </Card>
  );
}

function resolveOptions(
  fieldSchema: AdminSchemaDetail | null,
  name: "target_type",
) {
  const options = getFieldOptions(fieldSchema, name);
  return options.length > 0 ? options : targetTypeOptions;
}
