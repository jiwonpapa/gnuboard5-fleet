import {
  composeCompositeTarget,
  type CommandContextBuilder,
  numberFromPayload,
  numberFromRecord,
  stringFromRecord,
} from "./shared";

export const smsDebugCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_sms_config_get": () => ({
    area: "Admin SMS Config",
    localTarget: "sms-config",
    operation: "SMS 설정 조회",
  }),

  "cmd_admin_sms_config_update": () => ({
    area: "Admin SMS Config",
    localTarget: "sms-config",
    operation: "SMS 설정 수정",
  }),

  "cmd_admin_sms_member_sync": () => ({
    area: "Admin SMS Config",
    localTarget: "sms-member-sync",
    operation: "SMS 회원 동기화",
  }),

  "cmd_admin_sms_template_group_get_list": () => ({
    area: "Admin SMS Templates",
    localTarget: "template-groups",
    operation: "이모티콘 그룹 목록 조회",
  }),

  "cmd_admin_sms_template_group_get": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromPayload(payload, "fg_no") ?? "-"),
    operation: "이모티콘 그룹 상세 조회",
  }),

  "cmd_admin_sms_template_group_create": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: stringFromRecord(payload?.input, "fg_name"),
    operation: "이모티콘 그룹 생성",
  }),

  "cmd_admin_sms_template_group_update": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromRecord(payload?.input, "fg_no") ?? "-"),
    operation: "이모티콘 그룹 수정",
  }),

  "cmd_admin_sms_template_group_delete": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromRecord(payload?.input, "fg_no") ?? "-"),
    operation: "이모티콘 그룹 삭제",
  }),

  "cmd_admin_sms_template_group_move": (payload) => ({
    area: "Admin SMS Templates",
    localTarget:
      composeCompositeTarget(payload?.input, ["fg_no", "target_fg_no"]) ??
      "group-move",
    operation: "이모티콘 그룹 이동",
  }),

  "cmd_admin_sms_template_group_clear": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromPayload(payload, "fg_no") ?? "-"),
    operation: "이모티콘 그룹 비우기",
  }),

  "cmd_admin_sms_template_get_list": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: stringFromRecord(payload?.query, "search") ?? "templates.list",
    operation: "이모티콘 목록 조회",
  }),

  "cmd_admin_sms_template_get": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromPayload(payload, "fo_no") ?? "-"),
    operation: "이모티콘 상세 조회",
  }),

  "cmd_admin_sms_template_create": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: stringFromRecord(payload?.input, "fo_name"),
    operation: "이모티콘 생성",
  }),

  "cmd_admin_sms_template_update": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromRecord(payload?.input, "fo_no") ?? "-"),
    operation: "이모티콘 수정",
  }),

  "cmd_admin_sms_template_delete": (payload) => ({
    area: "Admin SMS Templates",
    localTarget: String(numberFromRecord(payload?.input, "fo_no") ?? "-"),
    operation: "이모티콘 삭제",
  }),

  "cmd_admin_sms_template_batch": (payload) => ({
    area: "Admin SMS Templates",
    localTarget:
      stringFromRecord(payload?.input, "action") ?? "template-batch",
    operation: "이모티콘 일괄 처리",
  }),

  "cmd_admin_sms_contact_group_get_list": () => ({
    area: "Admin SMS Contacts",
    localTarget: "contact-groups",
    operation: "휴대폰번호 그룹 목록 조회",
  }),

  "cmd_admin_sms_contact_group_get": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromPayload(payload, "bg_no") ?? "-"),
    operation: "휴대폰번호 그룹 상세 조회",
  }),

  "cmd_admin_sms_contact_group_create": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: stringFromRecord(payload?.input, "bg_name"),
    operation: "휴대폰번호 그룹 생성",
  }),

  "cmd_admin_sms_contact_group_update": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromRecord(payload?.input, "bg_no") ?? "-"),
    operation: "휴대폰번호 그룹 수정",
  }),

  "cmd_admin_sms_contact_group_delete": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromRecord(payload?.input, "bg_no") ?? "-"),
    operation: "휴대폰번호 그룹 삭제",
  }),

  "cmd_admin_sms_contact_group_move": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget:
      composeCompositeTarget(payload?.input, ["bg_no", "target_bg_no"]) ??
      "group-move",
    operation: "휴대폰번호 그룹 이동",
  }),

  "cmd_admin_sms_contact_group_clear": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromPayload(payload, "bg_no") ?? "-"),
    operation: "휴대폰번호 그룹 비우기",
  }),

  "cmd_admin_sms_contact_get_list": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: stringFromRecord(payload?.query, "search") ?? "contacts.list",
    operation: "휴대폰번호 목록 조회",
  }),

  "cmd_admin_sms_contact_get": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromPayload(payload, "bk_no") ?? "-"),
    operation: "휴대폰번호 상세 조회",
  }),

  "cmd_admin_sms_contact_create": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: stringFromRecord(payload?.input, "bk_name"),
    operation: "휴대폰번호 생성",
  }),

  "cmd_admin_sms_contact_update": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromRecord(payload?.input, "bk_no") ?? "-"),
    operation: "휴대폰번호 수정",
  }),

  "cmd_admin_sms_contact_delete": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromRecord(payload?.input, "bk_no") ?? "-"),
    operation: "휴대폰번호 삭제",
  }),

  "cmd_admin_sms_contact_batch": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: stringFromRecord(payload?.input, "action") ?? "contact-batch",
    operation: "휴대폰번호 일괄 처리",
  }),

  "cmd_admin_sms_contact_import": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromRecord(payload?.input, "bg_no") ?? "-"),
    operation: "휴대폰번호 가져오기",
  }),

  "cmd_admin_sms_contact_export": (payload) => ({
    area: "Admin SMS Contacts",
    localTarget: String(numberFromRecord(payload?.query, "bg_no") ?? 0),
    operation: "휴대폰번호 내보내기",
  }),

  "cmd_admin_sms_message_batch_get_list": (payload) => ({
    area: "Admin SMS History",
    localTarget: stringFromRecord(payload?.query, "search") ?? "batches.list",
    operation: "SMS 전송 배치 목록 조회",
  }),

  "cmd_admin_sms_message_batch_get": (payload) => ({
    area: "Admin SMS History",
    localTarget: String(numberFromRecord(payload?.query, "wr_no") ?? "-"),
    operation: "SMS 전송 배치 상세 조회",
  }),

  "cmd_admin_sms_delivery_get_list": (payload) => ({
    area: "Admin SMS History",
    localTarget:
      stringFromRecord(payload?.query, "search") ?? "deliveries.list",
    operation: "SMS 번호별 이력 조회",
  }),

  "cmd_admin_sms_message_batch_resend_failures": (payload) => ({
    area: "Admin SMS History",
    localTarget: String(numberFromRecord(payload?.input, "wr_no") ?? "-"),
    operation: "SMS 실패건 재전송",
  }),

  "cmd_admin_sms_message_batch_resend_all": (payload) => ({
    area: "Admin SMS History",
    localTarget: String(numberFromRecord(payload?.input, "wr_no") ?? "-"),
    operation: "SMS 전체 재전송",
  }),

  "cmd_admin_sms_message_send": (payload) => ({
    area: "Admin SMS Messages",
    localTarget:
      stringFromRecord(payload?.input, "message") ??
      String(numberFromRecord(payload?.input, "template_id") ?? 0),
    operation: "SMS 발송",
  }),

  "cmd_debug_runtime_info": () => ({
    area: "Debug",
    localTarget: "runtime-info",
    operation: "디버그 런타임 정보 조회",
  }),

  "cmd_debug_dev_bootstrap_status": () => ({
    area: "Debug",
    localTarget: "dev-bootstrap",
    operation: "개발용 bootstrap 상태 조회",
  }),

  "cmd_debug_dev_bootstrap_apply": () => ({
    area: "Debug",
    localTarget: "dev-bootstrap",
    operation: "개발용 bootstrap 적용",
  }),

  "cmd_debug_log_tail": () => ({
    area: "Debug",
    localTarget: "local-log-file",
    operation: "디버그 로그 tail 조회",
  }),

  "cmd_debug_open_devtools": () => ({
    area: "Debug",
    localTarget: "webview-devtools",
    operation: "DOM 검사 열기",
  }),
};
