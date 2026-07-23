import {
  type CommandContextBuilder,
  numberFromPayload,
  numberFromRecord,
  stringFromPayload,
  stringFromRecord,
} from "./shared";

export const mailMenuThemeCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_mail_test_send": (payload) => ({
    area: "Admin Mail Test",
    localTarget: stringFromRecord(payload?.input, "to") ?? "mail-test",
    operation: "테스트 메일 발송",
  }),

  "cmd_admin_system_mail_get_list": (payload) => ({
    area: "Admin System Mails",
    localTarget: String(numberFromRecord(payload?.query, "page") ?? 1),
    operation: "시스템 메일 템플릿 목록 조회",
  }),

  "cmd_admin_system_mail_recipients_get": (payload) => ({
    area: "Admin System Mails",
    localTarget:
      stringFromRecord(payload?.query, "search") ?? "system-mail.recipients",
    operation: "시스템 메일 수신자 목록 조회",
  }),

  "cmd_admin_system_mail_send": (payload) => ({
    area: "Admin System Mails",
    localTarget:
      String(numberFromRecord(payload?.input, "ma_id") ?? "selected-members"),
    operation: "시스템 회원 메일 발송",
  }),

  "cmd_admin_mail_test_send_legacy_mails": (payload) => ({
    area: "Admin Mail Test",
    localTarget: stringFromRecord(payload?.input, "to") ?? "mail-test",
    operation: "테스트 메일 발송 (/admin/mails/test)",
  }),

  "cmd_admin_mail_test_send_legacy_mail_tests": (payload) => ({
    area: "Admin Mail Test",
    localTarget: stringFromRecord(payload?.input, "to") ?? "mail-test",
    operation: "테스트 메일 발송 (/admin/mail-tests)",
  }),

  "cmd_admin_mail_get_list": (payload) => ({
    area: "Admin Mails",
    localTarget: String(numberFromRecord(payload?.query, "page") ?? 1),
    operation: "메일 템플릿 목록 조회",
  }),

  "cmd_admin_mail_get": (payload) => ({
    area: "Admin Mails",
    localTarget: String(numberFromPayload(payload, "maId") ?? "-"),
    operation: "메일 템플릿 상세 조회",
  }),

  "cmd_admin_mail_create": (payload) => ({
    area: "Admin Mails",
    localTarget: stringFromRecord(payload?.input, "ma_subject"),
    operation: "메일 템플릿 생성",
  }),

  "cmd_admin_mail_update": (payload) => ({
    area: "Admin Mails",
    localTarget: String(numberFromRecord(payload?.input, "ma_id") ?? "-"),
    operation: "메일 템플릿 수정",
  }),

  "cmd_admin_mail_delete": (payload) => ({
    area: "Admin Mails",
    localTarget: String(numberFromRecord(payload?.input, "ma_id") ?? "-"),
    operation: "메일 템플릿 삭제",
  }),

  "cmd_admin_mail_recipients_get": (payload) => ({
    area: "Admin Mails",
    localTarget:
      stringFromRecord(payload?.query, "search") ??
      stringFromRecord(payload?.query, "gr_id") ??
      "mail.recipients",
    operation: "메일 수신자 미리보기 조회",
  }),

  "cmd_admin_mail_send": (payload) => ({
    area: "Admin Mails",
    localTarget:
      stringFromRecord(payload?.input, "target_type") ??
      String(numberFromRecord(payload?.input, "ma_id") ?? "-"),
    operation: "회원 메일 발송",
  }),

  "cmd_admin_maintenance_purge_session_files": () => ({
    area: "Admin Maintenance",
    localTarget: "session-files",
    operation: "세션 파일 일괄 삭제",
  }),

  "cmd_admin_maintenance_purge_cache_files": () => ({
    area: "Admin Maintenance",
    localTarget: "cache-files",
    operation: "캐시 파일 일괄 삭제",
  }),

  "cmd_admin_maintenance_purge_captcha_files": () => ({
    area: "Admin Maintenance",
    localTarget: "captcha-files",
    operation: "캡챠 파일 일괄 삭제",
  }),

  "cmd_admin_maintenance_purge_thumbnail_files": () => ({
    area: "Admin Maintenance",
    localTarget: "thumbnail-files",
    operation: "썸네일 파일 일괄 삭제",
  }),

  "cmd_admin_maintenance_purge_member_list_files": () => ({
    area: "Admin Maintenance",
    localTarget: "member-list-files",
    operation: "회원관리 파일 일괄 삭제",
  }),

  "cmd_admin_menu_get_list": () => ({
    area: "Admin Menus",
    localTarget: "menus.list",
    operation: "메뉴 목록 조회",
  }),

  "cmd_admin_menu_get": (payload) => ({
    area: "Admin Menus",
    localTarget: String(numberFromPayload(payload, "meId") ?? "-"),
    operation: "메뉴 상세 조회",
  }),

  "cmd_admin_menu_create": (payload) => ({
    area: "Admin Menus",
    localTarget: stringFromRecord(payload?.input, "me_code"),
    operation: "메뉴 생성",
  }),

  "cmd_admin_menu_update": (payload) => ({
    area: "Admin Menus",
    localTarget: String(numberFromRecord(payload?.input, "me_id") ?? "-"),
    operation: "메뉴 수정",
  }),

  "cmd_admin_menu_delete": (payload) => ({
    area: "Admin Menus",
    localTarget: String(numberFromRecord(payload?.input, "me_id") ?? "-"),
    operation: "메뉴 삭제",
  }),

  "cmd_admin_menu_reorder": () => ({
    area: "Admin Menus",
    localTarget: "menus.order",
    operation: "메뉴 순서 재정렬",
  }),

  "cmd_admin_menu_reorder_legacy": () => ({
    area: "Admin Menus",
    localTarget: "menus.order",
    operation: "메뉴 순서 재정렬 (/admin/menus/reorder)",
  }),

  "cmd_admin_theme_config_get": () => ({
    area: "Admin Theme",
    localTarget: "theme-config",
    operation: "테마 설정 조회",
  }),

  "cmd_admin_theme_config_update": (payload) => ({
    area: "Admin Theme",
    localTarget:
      stringFromRecord(payload?.input, "cf_theme") ??
      stringFromRecord(payload?.input, "cf_mobile_theme") ??
      "theme-config",
    operation: "테마 설정 수정",
  }),

  "cmd_admin_theme_get_list": () => ({
    area: "Admin Theme",
    localTarget: "themes.list",
    operation: "설치 테마 목록 조회",
  }),

  "cmd_admin_theme_get": (payload) => ({
    area: "Admin Theme",
    localTarget: stringFromPayload(payload, "theme"),
    operation: "테마 상세 조회",
  }),
};
