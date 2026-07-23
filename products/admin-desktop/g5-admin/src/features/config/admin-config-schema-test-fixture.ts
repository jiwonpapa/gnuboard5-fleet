import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";

export function createSchemaResponse(params?: {
  adminOptions?: Array<{ label: string; value: string }>;
}) {
  const fieldNames = [
    "cf_title",
    "cf_admin",
    "cf_admin_email",
    "cf_admin_email_name",
    "cf_bbs_rewrite",
    "cf_register_level",
    "cf_register_point",
    "cf_login_point",
    "cf_use_point",
    "cf_write_point",
    "cf_comment_point",
    "cf_download_point",
    "cf_read_point",
    "cf_memo_send_point",
    "cf_use_email_certify",
    "cf_use_homepage",
    "cf_req_homepage",
    "cf_use_tel",
    "cf_req_tel",
    "cf_use_hp",
    "cf_req_hp",
    "cf_use_addr",
    "cf_req_addr",
    "cf_new_skin",
    "cf_search_skin",
    "cf_connect_skin",
    "cf_faq_skin",
    "cf_editor",
    "cf_member_skin",
    "cf_mobile_member_skin",
    "cf_captcha",
    "cf_social_login_use",
    "cf_social_servicelist",
    "cf_use_member_icon",
    "cf_icon_level",
    "cf_member_icon_size",
    "cf_member_img_size",
    "cf_open_modify",
    "cf_email_use",
    "cf_email_wr_super_admin",
    "cf_email_mb_super_admin",
    "cf_email_po_super_admin",
    "cf_cert_use",
    "cf_add_script",
    "cf_sms_use",
    "cf_1_subj",
    "cf_1",
  ];
  const fieldLabelMap: Record<string, string> = {
    cf_admin: "최고관리자",
    cf_admin_email: "관리자 메일 주소",
    cf_admin_email_name: "관리자 메일 발송이름",
    cf_add_script: "추가 스크립트",
    cf_bbs_rewrite: "짧은 URL 사용",
    cf_cert_use: "본인확인",
    cf_connect_skin: "접속자 스킨",
    cf_email_mb_super_admin: "가입메일 최고관리자 발송",
    cf_email_po_super_admin: "투표메일 최고관리자 발송",
    cf_email_use: "메일발송 사용",
    cf_email_wr_super_admin: "글작성메일 최고관리자 발송",
    cf_editor: "에디터 선택",
    cf_faq_skin: "FAQ 스킨",
    cf_1: "여분필드 1",
    cf_1_subj: "여분필드 1 제목",
    cf_icon_level: "회원 아이콘, 이미지 업로드 권한",
    cf_login_point: "로그인 포인트",
    cf_member_icon_size: "회원아이콘 용량",
    cf_member_img_size: "회원이미지 용량",
    cf_member_skin: "회원 스킨",
    cf_mobile_member_skin: "모바일 회원 스킨",
    cf_new_skin: "최근게시물 스킨",
    cf_open_modify: "정보공개 수정",
    cf_read_point: "글읽기 포인트",
    cf_register_level: "회원가입시 권한",
    cf_search_skin: "검색 스킨",
    cf_social_login_use: "소셜 로그인 사용",
    cf_sms_use: "SMS 사용",
    cf_title: "홈페이지 제목",
    cf_use_member_icon: "회원아이콘 사용",
    cf_write_point: "글쓰기 포인트",
    cf_comment_point: "댓글쓰기 포인트",
    cf_download_point: "다운로드 포인트",
    cf_memo_send_point: "쪽지 발송 포인트",
    cf_req_homepage: "홈페이지 입력 필수",
    cf_req_tel: "전화번호 입력 필수",
    cf_req_hp: "휴대폰번호 입력 필수",
    cf_req_addr: "주소 입력 필수",
  };
  const integerFields = new Set([
    "cf_bbs_rewrite",
    "cf_register_level",
    "cf_register_point",
    "cf_login_point",
    "cf_write_point",
    "cf_comment_point",
    "cf_download_point",
    "cf_read_point",
    "cf_memo_send_point",
    "cf_icon_level",
    "cf_member_icon_size",
    "cf_member_img_size",
    "cf_open_modify",
  ]);
  const requiredFields = new Set([
    "cf_title",
    "cf_admin",
    "cf_admin_email",
    "cf_admin_email_name",
    "cf_login_point",
    "cf_write_point",
    "cf_comment_point",
    "cf_download_point",
    "cf_read_point",
    "cf_memo_send_point",
    "cf_new_skin",
    "cf_search_skin",
    "cf_connect_skin",
    "cf_faq_skin",
    "cf_member_skin",
    "cf_mobile_member_skin",
    "cf_captcha",
  ]);
  const fieldsByName = Object.fromEntries(
    fieldNames.map((field) => [
      field,
      {
        name: field,
        label: fieldLabelMap[field] ?? field,
        input_type:
          field === "cf_bbs_rewrite"
            ? "radio"
            : field === "cf_social_servicelist"
              ? "checkbox"
              : [
                  "cf_admin",
                  "cf_new_skin",
                  "cf_search_skin",
                  "cf_connect_skin",
                  "cf_faq_skin",
                  "cf_editor",
                  "cf_member_skin",
                  "cf_mobile_member_skin",
                  "cf_use_member_icon",
                  "cf_icon_level",
                  "cf_cert_use",
                  "cf_register_level",
                  "cf_sms_use",
                ].includes(field)
                ? "select"
                : field === "cf_email_use"
                    || field === "cf_email_wr_super_admin"
                    || field === "cf_email_mb_super_admin"
                    || field === "cf_email_po_super_admin"
                    || field === "cf_social_login_use"
                  ? "checkbox"
                  : "text",
        data_type:
          field === "cf_social_servicelist"
            ? "string"
            : integerFields.has(field)
              ? "integer"
              : "string",
        required: requiredFields.has(field),
        create_only: false,
        readonly_on_update: field === "cf_bbs_rewrite",
        description: null,
        options:
          field === "cf_bbs_rewrite"
            ? [
                { label: "사용 안함", value: "0" },
                { label: "숫자", value: "1" },
                { label: "글 이름", value: "2" },
              ]
            : field === "cf_admin"
              ? (params?.adminOptions ?? [])
              : field === "cf_social_servicelist"
                ? [
                    { label: "네이버 로그인을 사용합니다", value: "naver" },
                    { label: "카카오 로그인을 사용합니다", value: "kakao" },
                    { label: "페이코 로그인을 사용합니다", value: "payco" },
                  ]
                : field === "cf_use_member_icon"
                  ? [
                      { label: "미사용", value: "0" },
                      { label: "아이콘만 표시", value: "1" },
                      { label: "아이콘+이름 표시", value: "2" },
                    ]
                  : field === "cf_icon_level"
                    ? Array.from({ length: 9 }, (_, index) => ({
                        label: String(index + 1),
                        value: String(index + 1),
                      }))
                    : field === "cf_cert_use"
                      ? [
                          { label: "사용안함", value: "0" },
                          { label: "테스트", value: "1" },
                          { label: "실서비스", value: "2" },
                        ]
                      : [],
      },
    ]),
  );

  return completeAdminSchemaResponseForTest("config", {
    schema: {
      domain: "config",
      title: "기본환경설정",
      legacy_form: "config_form.php",
      field_count: fieldNames.length,
      section_count: 13,
      generated_at: "2026-03-13T00:00:00Z",
      layout: {
        desktop: "tabs",
        mobile: "accordion",
        single_open: true,
      },
      sections: [
        {
          key: "anc_cf_basic",
          label: "홈페이지 기본환경 설정",
          order: 1,
          description: "기본 사이트 정보를 관리합니다.",
          fields: [
            fieldsByName.cf_title,
            fieldsByName.cf_admin,
            fieldsByName.cf_admin_email,
            fieldsByName.cf_admin_email_name,
            fieldsByName.cf_use_point,
            fieldsByName.cf_login_point,
            fieldsByName.cf_memo_send_point,
            fieldsByName.cf_new_skin,
            fieldsByName.cf_search_skin,
            fieldsByName.cf_connect_skin,
            fieldsByName.cf_faq_skin,
            fieldsByName.cf_editor,
            fieldsByName.cf_captcha,
            fieldsByName.cf_open_modify,
          ],
        },
        {
          key: "anc_cf_board",
          label: "게시판 기본 설정",
          order: 2,
          description: "게시판 공통 기본값을 관리합니다.",
          fields: [
            fieldsByName.cf_register_point,
            fieldsByName.cf_write_point,
            fieldsByName.cf_comment_point,
            fieldsByName.cf_download_point,
            fieldsByName.cf_read_point,
          ],
        },
        {
          key: "anc_cf_join",
          label: "회원가입 설정",
          order: 3,
          description: "회원가입 관련 기본값을 관리합니다.",
          fields: [
            fieldsByName.cf_member_skin,
            fieldsByName.cf_mobile_member_skin,
            fieldsByName.cf_register_level,
            fieldsByName.cf_use_member_icon,
            fieldsByName.cf_icon_level,
            fieldsByName.cf_member_icon_size,
            fieldsByName.cf_member_img_size,
            fieldsByName.cf_req_homepage,
            fieldsByName.cf_req_tel,
            fieldsByName.cf_req_hp,
            fieldsByName.cf_req_addr,
          ],
        },
        {
          key: "anc_cf_cert",
          label: "본인확인 설정",
          order: 4,
          description: "본인확인 사용 여부를 관리합니다.",
          fields: [fieldsByName.cf_cert_use],
        },
        {
          key: "anc_cf_url",
          label: "짧은주소",
          order: 5,
          description: "짧은 URL 설정을 관리합니다.",
          fields: [fieldsByName.cf_bbs_rewrite],
        },
        {
          key: "anc_cf_mail",
          label: "기본 메일 환경 설정",
          order: 6,
          description: "기본 메일 발송 정책을 관리합니다.",
          fields: [fieldsByName.cf_email_use],
        },
        {
          key: "anc_cf_article_mail",
          label: "게시판 글 작성 시 메일 설정",
          order: 7,
          description: "글 작성 알림 수신 대상을 관리합니다.",
          fields: [fieldsByName.cf_email_wr_super_admin],
        },
        {
          key: "anc_cf_join_mail",
          label: "회원가입 시 메일 설정",
          order: 8,
          description: "회원가입 메일 수신 대상을 관리합니다.",
          fields: [fieldsByName.cf_email_mb_super_admin],
        },
        {
          key: "anc_cf_vote_mail",
          label: "투표 기타의견 작성 시 메일 설정",
          order: 9,
          description: "투표 기타의견 메일 수신 대상을 관리합니다.",
          fields: [fieldsByName.cf_email_po_super_admin],
        },
        {
          key: "anc_cf_sns",
          label: "소셜네트워크서비스",
          order: 10,
          description: "소셜 로그인 공급자를 선택합니다.",
          fields: [fieldsByName.cf_social_login_use, fieldsByName.cf_social_servicelist],
        },
        {
          key: "anc_cf_lay",
          label: "레이아웃 추가설정",
          order: 11,
          description: "레이아웃 보조 스크립트를 관리합니다.",
          fields: [fieldsByName.cf_add_script],
        },
        {
          key: "anc_cf_sms",
          label: "SMS",
          order: 12,
          description: "SMS 공급자 구성을 관리합니다.",
          fields: [fieldsByName.cf_sms_use],
        },
        {
          key: "anc_cf_extra",
          label: "여분필드 기본 설정",
          order: 13,
          description: "여분필드 제목과 값을 관리합니다.",
          fields: [fieldsByName.cf_1_subj, fieldsByName.cf_1],
        },
      ],
      fields_by_name: fieldsByName,
    },
    request_id: "req-config-schema",
    correlation_id: "corr-config-schema",
    server_request_id: null,
  });
}
