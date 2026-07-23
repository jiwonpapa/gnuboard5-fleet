import {
  type CommandContextBuilder,
  numberFromPayload,
  numberFromRecord,
  stringFromPayload,
  stringFromRecord,
} from "./shared";

export const contentFaqSystemCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_config_get": () => ({
    area: "Admin Config",
    localTarget: "config.general",
    operation: "기본 설정 조회",
  }),

  "cmd_admin_config_update": () => ({
    area: "Admin Config",
    localTarget: "config.general",
    operation: "기본 설정 수정",
  }),

  "cmd_admin_schema_get_catalog": () => ({
    area: "Admin Field Schema",
    localTarget: "catalog",
    operation: "필드 스키마 목록 조회",
  }),

  "cmd_admin_schema_get": (payload) => ({
    area: "Admin Field Schema",
    localTarget: stringFromPayload(payload, "domain"),
    operation: "필드 스키마 상세 조회",
  }),

  "cmd_admin_content_get_list": (payload) => ({
    area: "Admin Contents",
    localTarget: stringFromRecord(payload?.query, "search") ?? "contents.list",
    operation: "내용 목록 조회",
  }),

  "cmd_admin_content_get": (payload) => ({
    area: "Admin Contents",
    localTarget: stringFromPayload(payload, "co_id"),
    operation: "내용 상세 조회",
  }),

  "cmd_admin_content_create": (payload) => ({
    area: "Admin Contents",
    localTarget: stringFromRecord(payload?.input, "co_id"),
    operation: "내용 생성",
  }),

  "cmd_admin_content_update": (payload) => ({
    area: "Admin Contents",
    localTarget: stringFromRecord(payload?.input, "co_id"),
    operation: "내용 수정",
  }),

  "cmd_admin_content_delete": (payload) => ({
    area: "Admin Contents",
    localTarget: stringFromRecord(payload?.input, "co_id"),
    operation: "내용 삭제",
  }),

  "cmd_admin_faq_master_get_list": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.query, "page") ?? 1),
    operation: "FAQ 마스터 목록 조회",
  }),

  "cmd_admin_faq_master_get": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromPayload(payload, "fm_id") ?? "-"),
    operation: "FAQ 마스터 상세 조회",
  }),

  "cmd_admin_faq_master_create": (payload) => ({
    area: "Admin FAQs",
    localTarget: stringFromRecord(payload?.input, "fm_subject"),
    operation: "FAQ 마스터 생성",
  }),

  "cmd_admin_faq_master_update": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.input, "fm_id") ?? "-"),
    operation: "FAQ 마스터 수정",
  }),

  "cmd_admin_faq_master_delete": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.input, "fm_id") ?? "-"),
    operation: "FAQ 마스터 삭제",
  }),

  "cmd_admin_faq_master_header_image_upload": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.input, "fm_id") ?? "-"),
    operation: "FAQ 헤더 이미지 업로드",
  }),

  "cmd_admin_faq_master_header_image_delete": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromPayload(payload, "fm_id") ?? "-"),
    operation: "FAQ 헤더 이미지 삭제",
  }),

  "cmd_admin_faq_master_footer_image_upload": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.input, "fm_id") ?? "-"),
    operation: "FAQ 푸터 이미지 업로드",
  }),

  "cmd_admin_faq_master_footer_image_delete": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromPayload(payload, "fm_id") ?? "-"),
    operation: "FAQ 푸터 이미지 삭제",
  }),

  "cmd_admin_faq_get_list": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.query, "fm_id") ?? 0),
    operation: "FAQ 문항 목록 조회",
  }),

  "cmd_admin_faq_get": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromPayload(payload, "fa_id") ?? "-"),
    operation: "FAQ 문항 상세 조회",
  }),

  "cmd_admin_faq_create": (payload) => ({
    area: "Admin FAQs",
    localTarget:
      stringFromRecord(payload?.input, "fa_subject") ??
      String(numberFromRecord(payload?.input, "fm_id") ?? "-"),
    operation: "FAQ 문항 생성",
  }),

  "cmd_admin_faq_update": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.input, "fa_id") ?? "-"),
    operation: "FAQ 문항 수정",
  }),

  "cmd_admin_faq_delete": (payload) => ({
    area: "Admin FAQs",
    localTarget: String(numberFromRecord(payload?.input, "fa_id") ?? "-"),
    operation: "FAQ 문항 삭제",
  }),

  "cmd_admin_write_count_stats_get": (payload) => ({
    area: "Admin Write Count",
    localTarget:
      stringFromRecord(payload?.query, "bo_table") ??
      stringFromRecord(payload?.query, "period") ??
      "write-count",
    operation: "글/댓글 집계 조회",
  }),

  "cmd_admin_phpinfo_get": () => ({
    area: "Admin System Tools",
    localTarget: "phpinfo",
    operation: "PHP 런타임 정보 조회",
  }),

  "cmd_admin_browscap_status_get": () => ({
    area: "Admin System Tools",
    localTarget: "browscap.status",
    operation: "Browscap 상태 조회",
  }),

  "cmd_admin_browscap_update": () => ({
    area: "Admin System Tools",
    localTarget: "browscap.update",
    operation: "Browscap 캐시 업데이트",
  }),

  "cmd_admin_browscap_convert": (payload) => ({
    area: "Admin System Tools",
    localTarget:
      numberFromRecord(payload?.input, "rows") !== undefined
        ? String(numberFromRecord(payload?.input, "rows"))
        : "browscap.convert",
    operation: "접속로그 Browscap 변환",
  }),

  "cmd_admin_visit_stats_get": (payload) => ({
    area: "Admin Visits",
    localTarget: stringFromRecord(payload?.query, "type") ?? "date",
    operation: "접속자 통계 조회",
  }),

  "cmd_admin_visit_search": (payload) => ({
    area: "Admin Visits",
    localTarget: String(numberFromRecord(payload?.query, "page") ?? 1),
    operation: "접속자 로그 검색",
  }),

  "cmd_admin_visit_delete": (payload) => ({
    area: "Admin Visits",
    localTarget:
      stringFromRecord(payload?.input, "before") ??
      stringFromRecord(payload?.input, "ip") ??
      "visit.delete",
    operation: "접속자 로그 삭제",
  }),
};
