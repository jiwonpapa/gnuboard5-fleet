import { render, screen, within } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { MemberProfile } from "../../types/MemberProfile";
import type { AdminMemberDetail } from "../../types/AdminMemberDetail";
import type { AdminFieldSchema } from "../../types/AdminFieldSchema";
import {
  toAdminMemberFormValues,
  type AdminMemberFormValues,
} from "./admin-members-form";
import { MemberDetailCard } from "./MemberDetailCard";

const currentMember: MemberProfile = {
  mb_id: "admin1",
  mb_name: "Admin",
  mb_nick: "admin",
  mb_email: "admin@example.com",
  mb_level: 10,
  mb_point: 0,
};

const member: AdminMemberDetail = {
  mb_id: "neo",
  mb_1: "여분값1",
  mb_2: null,
  mb_3: null,
  mb_4: null,
  mb_5: null,
  mb_6: null,
  mb_7: null,
  mb_8: null,
  mb_9: null,
  mb_10: "여분값10",
  mb_name: "네오",
  mb_nick: "neo",
  mb_email: "neo@example.com",
  mb_level: 5,
  mb_point: 320,
  mb_mailling: 1,
  mb_sms: 1,
  mb_marketing_agree: 1,
  mb_thirdparty_agree: 0,
  mb_agree_log: "log",
  mb_homepage: "https://example.com",
  mb_hp: "01012345678",
  mb_tel: "0212345678",
  mb_zip: "12345",
  mb_addr1: "서울",
  mb_addr2: "강남",
  mb_addr3: "빌딩",
  mb_addr_jibeon: "역삼동",
  mb_memo: "메모",
  mb_profile: "프로필",
  mb_signature: "서명",
  mb_adult: 1,
  mb_certify: "simple",
  mb_open: 1,
  mb_datetime: "2026-03-08 10:00:00",
  mb_today_login: "2026-03-08 10:10:00",
  mb_leave_date: "",
  mb_intercept_date: "",
};

function TestHarness() {
  const form = useForm<AdminMemberFormValues>({
    defaultValues: toAdminMemberFormValues(member),
  });

  return (
    <MemberDetailCard
      canDeleteMember
      canSaveProfile
      currentMember={currentMember}
      detailError={null}
      detailLoading={false}
      form={form}
      fieldSchema={{
        domain: "members",
        fields_by_name: {
          mb_hp: buildFieldSchema("mb_hp", "휴대폰"),
          mb_tel: buildFieldSchema("mb_tel", "전화번호"),
          mb_password: buildFieldSchema("mb_password", "새 비밀번호"),
          mb_certify: buildFieldSchema("mb_certify", "본인확인방법", "radio", [
            { label: "간편인증", value: "simple" },
            { label: "휴대폰", value: "hp" },
            { label: "아이핀", value: "ipin" },
          ]),
          mb_memo: buildFieldSchema("mb_memo", "관리자 메모"),
          mb_adult: buildFieldSchema("mb_adult", "성인인증"),
          mb_open: buildFieldSchema("mb_open", "정보공개"),
          mb_1: buildFieldSchema("mb_1", "여분필드 1"),
          mb_10: buildFieldSchema("mb_10", "여분필드 10"),
          mb_icon: buildFieldSchema("mb_icon", "아이콘"),
          mb_img: buildFieldSchema("mb_img", "프로필 이미지"),
        },
        field_count: 11,
        generated_at: "2026-03-09T00:00:00Z",
        layout: null,
        legacy_form: "adm/member_form.php",
        section_count: 0,
        sections: [],
        title: "회원",
      }}
      isDeletePending={false}
      isProfilePending={false}
      isRefetching={false}
      isSubmitting={false}
      isTopAdminSelected={false}
      iconDeleteResult={null}
      iconUploadResult={null}
      imageDeleteResult={null}
      imageUploadResult={null}
      maxAssignableLevel={10}
      member={member}
      onDelete={vi.fn()}
      onDeleteIcon={vi.fn()}
      onDeleteImage={vi.fn()}
      onRefresh={vi.fn()}
      onSubmitLevel={vi.fn()}
      onSubmitProfile={vi.fn()}
      onUploadIcon={vi.fn()}
      onUploadImage={vi.fn()}
      schemaError={null}
      schemaLoading={false}
      selectedMemberId={member.mb_id}
    />
  );
}

describe("MemberDetailCard", () => {
  it("renders legacy parity controls for member profile editing", () => {
    render(<TestHarness />);

    expect(screen.getByText("01012345678")).toBeInTheDocument();
    expect(screen.getByText("simple")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "휴대폰" }),
    ).toHaveValue("01012345678");
    expect(
      screen.getByRole("textbox", { name: "전화번호" }),
    ).toHaveValue("0212345678");
    expect(screen.getByLabelText("새 비밀번호")).toHaveValue("");
    const certifyGroup = screen.getByRole("group", { name: "본인확인방법" });
    expect(certifyGroup).toBeInTheDocument();
    expect(
      within(certifyGroup).getByRole("radio", { name: "간편인증" }),
    ).toBeChecked();
    expect(screen.getByLabelText("관리자 메모")).toHaveValue("메모");
    expect(screen.queryByLabelText("지번주소")).not.toBeInTheDocument();
    expect(screen.getByLabelText("여분필드 1")).toHaveValue("여분값1");
    expect(screen.getByLabelText("여분필드 10")).toHaveValue("여분값10");
    const adultGroup = screen.getByRole("group", { name: "성인인증" });
    expect(adultGroup).toBeInTheDocument();
    expect(within(adultGroup).getByRole("radio", { name: "예" })).toBeChecked();
    const openGroup = screen.getByRole("group", { name: "정보공개" });
    expect(openGroup).toBeInTheDocument();
    expect(within(openGroup).getByRole("radio", { name: "예" })).toBeChecked();
    expect(screen.getByText("아이콘/프로필 이미지")).toBeInTheDocument();
  });

  it("hides the detail workspace until member schema is ready", () => {
    function SchemaPendingHarness() {
      const form = useForm<AdminMemberFormValues>({
        defaultValues: toAdminMemberFormValues(member),
      });

      return (
        <MemberDetailCard
          canDeleteMember
          canSaveProfile
          currentMember={currentMember}
          detailError={null}
          detailLoading={false}
          form={form}
          fieldSchema={null}
          isDeletePending={false}
          isProfilePending={false}
          isRefetching={false}
          isSubmitting={false}
          isTopAdminSelected={false}
          iconDeleteResult={null}
          iconUploadResult={null}
          imageDeleteResult={null}
          imageUploadResult={null}
          maxAssignableLevel={10}
          member={member}
          onDelete={vi.fn()}
          onDeleteIcon={vi.fn()}
          onDeleteImage={vi.fn()}
          onRefresh={vi.fn()}
          onSubmitLevel={vi.fn()}
          onSubmitProfile={vi.fn()}
          onUploadIcon={vi.fn()}
          onUploadImage={vi.fn()}
          schemaError={null}
          schemaLoading
          selectedMemberId={member.mb_id}
        />
      );
    }

    render(<SchemaPendingHarness />);

    expect(screen.getByText("회원 스키마 대기")).toBeInTheDocument();
    expect(screen.queryByText("아이콘/프로필 이미지")).not.toBeInTheDocument();
  });
});

function buildFieldSchema(
  name: string,
  label: string,
  inputType = "text",
  options: Array<{ label: string; value: string }> = [],
): AdminFieldSchema {
  return {
    create_only: false,
    data_type: "string",
    default_value: null,
    description: null,
    input_type: inputType,
    label,
    name,
    options,
    readonly_on_update: false,
    required: false,
  };
}
