import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  BooleanChoiceControl,
  ChoiceControl,
  TextAreaControl,
  TextControl,
} from "./MemberDetailControls";
import type {
  FieldDescriptionResolver,
  FieldLabelResolver,
  MemberForm,
} from "./member-detail-shared";

export function MemberProfileSection(props: {
  canSaveProfile: boolean;
  certifyOptions: Array<{ label: string; value: string }>;
  fieldDescription: FieldDescriptionResolver;
  fieldLabel: FieldLabelResolver;
  fieldOptions: (name: string) => Array<{ label: string; value: string }>;
  form: MemberForm;
  isProfileBlocked: boolean;
  isProfilePending: boolean;
  isTopAdminSelected: boolean;
  onSubmitProfile: () => void;
}) {
  const isDisabled = props.isProfilePending || props.isProfileBlocked;
  const extraFieldNames = [
    "mb_1",
    "mb_2",
    "mb_3",
    "mb_4",
    "mb_5",
    "mb_6",
    "mb_7",
    "mb_8",
    "mb_9",
    "mb_10",
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>프로필 수정</CardTitle>
        <CardDescription>
          변경된 필드만 Rust command 경계에서 PATCH payload로 전송합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <input type="hidden" {...props.form.register("mb_addr_jibeon")} />

        <div className="grid gap-4 md:grid-cols-2">
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_name")}
            label={props.fieldLabel("mb_name", "이름")}
            name="mb_name"
            placeholder="회원 이름"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_nick")}
            label={props.fieldLabel("mb_nick", "닉네임")}
            name="mb_nick"
            placeholder="닉네임"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_email")}
            label={props.fieldLabel("mb_email", "이메일")}
            name="mb_email"
            placeholder="member@example.com"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_homepage")}
            label={props.fieldLabel("mb_homepage", "홈페이지")}
            name="mb_homepage"
            placeholder="https://example.com"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_hp")}
            label={props.fieldLabel("mb_hp", "휴대폰")}
            name="mb_hp"
            placeholder="01012345678"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_tel")}
            label={props.fieldLabel("mb_tel", "전화번호")}
            name="mb_tel"
            placeholder="0212345678"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_zip")}
            label={props.fieldLabel("mb_zip", "우편번호")}
            name="mb_zip"
            placeholder="12345"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_intercept_date")}
            label={props.fieldLabel("mb_intercept_date", "차단일(YYYYMMDD)")}
            name="mb_intercept_date"
            placeholder="20260307"
            disabled={isDisabled || props.isTopAdminSelected}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_addr1")}
            label={props.fieldLabel("mb_addr1", "주소 1")}
            name="mb_addr1"
            placeholder="기본 주소"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_addr2")}
            label={props.fieldLabel("mb_addr2", "주소 2")}
            name="mb_addr2"
            placeholder="상세 주소"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_addr3")}
            label={props.fieldLabel("mb_addr3", "건물명")}
            name="mb_addr3"
            placeholder="빌딩명"
            disabled={isDisabled}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_leave_date")}
            label={props.fieldLabel("mb_leave_date", "탈퇴일(YYYYMMDD)")}
            name="mb_leave_date"
            placeholder="20260308"
            disabled={isDisabled || props.isTopAdminSelected}
          />
          <TextControl
            control={props.form}
            description={props.fieldDescription("mb_password")}
            label={props.fieldLabel("mb_password", "새 비밀번호")}
            name="mb_password"
            placeholder="변경 시에만 입력"
            disabled={isDisabled || props.isTopAdminSelected}
          />
          <ChoiceControl
            control={props.form}
            disabled={isDisabled}
            description={props.fieldDescription("mb_certify")}
            label={props.fieldLabel("mb_certify", "본인확인방법")}
            name="mb_certify"
            options={
              props.certifyOptions.length > 0
                ? props.certifyOptions
                : [
                    { label: "간편인증", value: "simple" },
                    { label: "휴대폰", value: "hp" },
                    { label: "아이핀", value: "ipin" },
                  ]
            }
            presentation="radio"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TextAreaControl
            control={props.form}
            disabled={isDisabled}
            description={props.fieldDescription("mb_memo")}
            label={props.fieldLabel("mb_memo", "관리자 메모")}
            name="mb_memo"
            placeholder="관리자 메모"
          />
          <TextAreaControl
            control={props.form}
            disabled={isDisabled}
            description={props.fieldDescription("mb_profile")}
            label={props.fieldLabel("mb_profile", "자기소개")}
            name="mb_profile"
            placeholder="프로필"
          />
          <TextAreaControl
            control={props.form}
            disabled={isDisabled}
            description={props.fieldDescription("mb_signature")}
            label={props.fieldLabel("mb_signature", "서명")}
            name="mb_signature"
            placeholder="서명"
          />
        </div>

        <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-3">
          <BooleanChoiceControl
            control={props.form}
            description={props.fieldDescription("mb_mailling")}
            label={props.fieldLabel("mb_mailling", "광고 메일 수신")}
            name="mb_mailling"
            disabled={isDisabled}
            options={props.fieldOptions("mb_mailling")}
          />
          <BooleanChoiceControl
            control={props.form}
            description={props.fieldDescription("mb_sms")}
            label={props.fieldLabel("mb_sms", "문자 수신")}
            name="mb_sms"
            disabled={isDisabled}
            options={props.fieldOptions("mb_sms")}
          />
          <BooleanChoiceControl
            control={props.form}
            description={props.fieldDescription("mb_marketing_agree")}
            label={props.fieldLabel("mb_marketing_agree", "마케팅 동의")}
            name="mb_marketing_agree"
            disabled={isDisabled}
            options={props.fieldOptions("mb_marketing_agree")}
          />
          <BooleanChoiceControl
            control={props.form}
            description={props.fieldDescription("mb_thirdparty_agree")}
            label={props.fieldLabel("mb_thirdparty_agree", "제3자 동의")}
            name="mb_thirdparty_agree"
            disabled={isDisabled}
            options={props.fieldOptions("mb_thirdparty_agree")}
          />
          <BooleanChoiceControl
            control={props.form}
            description={props.fieldDescription("mb_adult")}
            label={props.fieldLabel("mb_adult", "성인인증")}
            name="mb_adult"
            disabled={isDisabled}
            options={props.fieldOptions("mb_adult")}
          />
          <BooleanChoiceControl
            control={props.form}
            description={props.fieldDescription("mb_open")}
            label={props.fieldLabel("mb_open", "정보공개")}
            name="mb_open"
            disabled={isDisabled}
            options={props.fieldOptions("mb_open")}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">여분필드</h4>
            <p className="text-xs text-muted-foreground">
              레거시 회원 확장 필드를 계약 순서대로 수정합니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {extraFieldNames.map((fieldName) => (
              <TextControl
                key={fieldName}
                control={props.form}
                description={props.fieldDescription(fieldName)}
                disabled={isDisabled}
                label={props.fieldLabel(fieldName, fieldName.replace("mb_", "여분필드 "))}
                name={fieldName}
                placeholder={props.fieldLabel(fieldName, fieldName)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            이메일 형식과 차단일 형식은 프론트에서 먼저 검증합니다.
          </p>
          <Button
            type="button"
            onClick={props.onSubmitProfile}
            disabled={!props.canSaveProfile || props.isProfilePending}
          >
            프로필 저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
