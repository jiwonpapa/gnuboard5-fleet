import type { AdminFieldOption } from "../../types/AdminFieldOption";

type AdminConfigLegacyFieldOverride = {
  compact?: boolean;
  description?: string;
  forceWritable?: boolean;
  inputType?: string;
  label?: string;
  options?: AdminFieldOption[];
  required?: boolean;
  suffix?: string;
};

const levelOptions: AdminFieldOption[] = Array.from({ length: 9 }, (_, index) => {
  const value = String(index + 1);
  return { label: value, value };
});

const adminConfigLegacyFieldOverrides: Record<string, AdminConfigLegacyFieldOverride> = {
  cf_admin: {
    forceWritable: true,
    inputType: "select",
    required: true,
  },
  cf_bbs_rewrite: {
    description: "게시판과 컨텐츠 페이지에 짧은 URL을 사용합니다.",
    forceWritable: true,
    inputType: "radio",
    label: "짧은 URL 사용",
    options: [
      { label: "사용 안함", value: "0" },
      { label: "숫자", value: "1" },
      { label: "글 이름", value: "2" },
    ],
  },
  cf_cert_hp: {
    inputType: "select",
    options: [
      { label: "사용안함", value: "" },
      { label: "코리아크레딧뷰로(KCB) 휴대폰 본인확인", value: "kcb" },
      { label: "NHN KCP 휴대폰 본인확인", value: "kcp" },
    ],
  },
  cf_cert_ipin: {
    inputType: "select",
    options: [
      { label: "사용안함", value: "" },
      { label: "코리아크레딧뷰로(KCB) 아이핀", value: "kcb" },
    ],
  },
  cf_cert_simple: {
    description:
      "KG이니시스 통합인증(간편인증+전자서명) 중 전자서명을 제외한 간편인증 서비스를 선택합니다.",
    inputType: "select",
    options: [
      { label: "사용안함", value: "" },
      { label: "KG이니시스 통합인증(간편인증)", value: "inicis" },
    ],
  },
  cf_cert_use: {
    compact: true,
    description: "회원가입 시 본인확인 수단을 사용안함, 테스트, 실서비스 중에서 선택합니다.",
    forceWritable: true,
    inputType: "select",
    label: "본인확인",
    options: [
      { label: "사용안함", value: "0" },
      { label: "테스트", value: "1" },
      { label: "실서비스", value: "2" },
    ],
  },
  cf_cert_use_seed: {
    description: "KG이니시스 통합인증서비스 암호화 적용 여부를 선택합니다.",
    inputType: "select",
    options: [
      { label: "사용안함", value: "0" },
      { label: "사용함", value: "1" },
    ],
  },
  cf_icon_level: {
    compact: true,
    description: "선택한 권한 이상부터 회원 아이콘과 회원 이미지를 업로드할 수 있습니다.",
    forceWritable: true,
    inputType: "select",
    label: "회원 아이콘, 이미지 업로드 권한",
    options: levelOptions,
    suffix: "이상",
  },
  cf_member_icon_size: {
    compact: true,
    description: "회원아이콘 최대 업로드 용량입니다.",
    inputType: "number",
    suffix: "바이트 이하",
  },
  cf_member_img_size: {
    compact: true,
    description: "회원이미지 최대 업로드 용량입니다.",
    inputType: "number",
    suffix: "바이트 이하",
  },
  cf_nick_modify: {
    compact: true,
    description: "수정하면 설정한 일수 동안 닉네임을 바꿀 수 없습니다.",
    inputType: "number",
    suffix: "일 동안 바꿀 수 없음",
  },
  cf_open_modify: {
    compact: true,
    description: "수정하면 설정한 일수 동안 정보공개를 다시 바꿀 수 없습니다.",
    inputType: "number",
    suffix: "일 동안 바꿀 수 없음",
  },
  cf_req_addr: {
    description: "회원가입 시 주소를 필수 입력으로 받습니다.",
    label: "주소 입력 필수",
    required: false,
  },
  cf_req_homepage: {
    description: "회원가입 시 홈페이지를 필수 입력으로 받습니다.",
    label: "홈페이지 입력 필수",
    required: false,
  },
  cf_req_hp: {
    description: "회원가입 시 휴대폰번호를 필수 입력으로 받습니다.",
    label: "휴대폰번호 입력 필수",
    required: false,
  },
  cf_req_profile: {
    description: "회원가입 시 자기소개를 필수 입력으로 받습니다.",
    label: "자기소개 입력 필수",
    required: false,
  },
  cf_req_signature: {
    description: "회원가입 시 서명을 필수 입력으로 받습니다.",
    label: "서명 입력 필수",
    required: false,
  },
  cf_req_tel: {
    description: "회원가입 시 전화번호를 필수 입력으로 받습니다.",
    label: "전화번호 입력 필수",
    required: false,
  },
  cf_social_login_use: {
    description: "소셜로그인을 사용합니다.",
    forceWritable: true,
    label: "소셜 로그인 사용",
    required: false,
  },
  cf_use_addr: {
    label: "주소 입력 표시",
    required: false,
  },
  cf_use_homepage: {
    label: "홈페이지 입력 표시",
    required: false,
  },
  cf_use_hp: {
    label: "휴대폰번호 입력 표시",
    required: false,
  },
  cf_use_member_icon: {
    compact: true,
    description: "게시물에 게시자 닉네임 대신 아이콘을 사용합니다.",
    forceWritable: true,
    inputType: "select",
    label: "회원아이콘 사용",
    options: [
      { label: "미사용", value: "0" },
      { label: "아이콘만 표시", value: "1" },
      { label: "아이콘+이름 표시", value: "2" },
    ],
  },
  cf_use_profile: {
    label: "자기소개 입력 표시",
    required: false,
  },
  cf_use_signature: {
    label: "서명 입력 표시",
    required: false,
  },
  cf_use_tel: {
    label: "전화번호 입력 표시",
    required: false,
  },
};

export function getAdminConfigLegacyFieldOverride(name: string) {
  return adminConfigLegacyFieldOverrides[name];
}
