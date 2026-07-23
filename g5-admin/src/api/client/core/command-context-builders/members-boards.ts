import {
  composeCompositeTarget,
  type CommandContextBuilder,
  numberFromRecord,
  stringFromPayload,
  stringFromRecord,
} from "./shared";

export const membersBoardsCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_member_get_list": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromRecord(payload?.query, "search") ?? "members.list",
    operation: "회원 목록 조회",
  }),

  "cmd_admin_member_export_excel": (payload) => ({
    area: "Admin Members",
    localTarget:
      stringFromRecord(payload?.query, "search_field") ?? "members.excel",
    operation: "회원 엑셀용 목록 조회",
  }),

  "cmd_admin_member_get": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromPayload(payload, "mbId"),
    operation: "회원 상세 조회",
  }),

  "cmd_admin_member_update_level": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "회원 레벨 수정",
  }),

  "cmd_admin_member_update": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "회원 정보 수정",
  }),

  "cmd_admin_member_icon_upload": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "회원 아이콘 업로드",
  }),

  "cmd_admin_member_icon_delete": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromPayload(payload, "mbId"),
    operation: "회원 아이콘 삭제",
  }),

  "cmd_admin_member_image_upload": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "회원 이미지 업로드",
  }),

  "cmd_admin_member_image_delete": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromPayload(payload, "mbId"),
    operation: "회원 이미지 삭제",
  }),

  "cmd_admin_member_delete": (payload) => ({
    area: "Admin Members",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "회원 삭제",
  }),

  "cmd_admin_board_group_get_list": () => ({
    area: "Admin Board Groups",
    localTarget: "board-groups.list",
    operation: "게시판 그룹 목록 조회",
  }),

  "cmd_admin_board_group_get": (payload) => ({
    area: "Admin Board Groups",
    localTarget: stringFromPayload(payload, "gr_id"),
    operation: "게시판 그룹 상세 조회",
  }),

  "cmd_admin_board_group_create": (payload) => ({
    area: "Admin Board Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 생성",
  }),

  "cmd_admin_board_group_update": (payload) => ({
    area: "Admin Board Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 수정",
  }),

  "cmd_admin_board_group_patch": (payload) => ({
    area: "Admin Board Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 부분 수정",
  }),

  "cmd_admin_board_group_delete": (payload) => ({
    area: "Admin Board Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 삭제",
  }),

  "cmd_admin_board_group_members_get": (payload) => ({
    area: "Admin Board Groups",
    localTarget:
      stringFromRecord(payload?.query, "gr_id") ??
      stringFromRecord(payload?.query, "search") ??
      "board-groups.members",
    operation: "게시판 그룹 회원 조회",
  }),

  "cmd_admin_board_group_member_add": (payload) => ({
    area: "Admin Board Groups",
    localTarget: composeCompositeTarget(payload?.input, ["gr_id", "mb_id"]),
    operation: "게시판 그룹 회원 추가",
  }),

  "cmd_admin_board_group_member_delete": (payload) => ({
    area: "Admin Board Groups",
    localTarget: composeCompositeTarget(payload?.input, ["gr_id", "mb_id"]),
    operation: "게시판 그룹 회원 삭제",
  }),

  "cmd_admin_group_legacy_get_list": () => ({
    area: "Admin Groups",
    localTarget: "groups.list",
    operation: "게시판 그룹 목록 조회 (/admin/groups)",
  }),

  "cmd_admin_group_legacy_get": (payload) => ({
    area: "Admin Groups",
    localTarget: stringFromPayload(payload, "grId"),
    operation: "게시판 그룹 상세 조회 (/admin/groups/{gr_id})",
  }),

  "cmd_admin_group_legacy_create": (payload) => ({
    area: "Admin Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 생성 (/admin/groups)",
  }),

  "cmd_admin_group_legacy_update": (payload) => ({
    area: "Admin Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 수정 (/admin/groups/{gr_id})",
  }),

  "cmd_admin_group_legacy_delete": (payload) => ({
    area: "Admin Groups",
    localTarget: stringFromRecord(payload?.input, "gr_id"),
    operation: "게시판 그룹 삭제 (/admin/groups/{gr_id})",
  }),

  "cmd_admin_group_legacy_members_get": (payload) => ({
    area: "Admin Groups",
    localTarget:
      stringFromRecord(payload?.query, "gr_id") ??
      stringFromRecord(payload?.query, "search") ??
      "groups.members",
    operation: "게시판 그룹 회원 조회 (/admin/groups/{gr_id}/members)",
  }),

  "cmd_admin_group_legacy_member_add": (payload) => ({
    area: "Admin Groups",
    localTarget: composeCompositeTarget(payload?.input, ["gr_id", "mb_id"]),
    operation: "게시판 그룹 회원 추가 (/admin/groups/{gr_id}/members)",
  }),

  "cmd_admin_group_legacy_member_delete": (payload) => ({
    area: "Admin Groups",
    localTarget: composeCompositeTarget(payload?.input, ["gr_id", "mb_id"]),
    operation: "게시판 그룹 회원 삭제 (/admin/groups/{gr_id}/members/{mb_id})",
  }),

  "cmd_admin_board_get_list": (payload) => ({
    area: "Admin Boards",
    localTarget:
      stringFromRecord(payload?.query, "search") ??
      stringFromRecord(payload?.query, "gr_id") ??
      "boards.list",
    operation: "게시판 목록 조회",
  }),

  "cmd_admin_board_get": (payload) => ({
    area: "Admin Boards",
    localTarget: stringFromPayload(payload, "boTable"),
    operation: "게시판 상세 조회",
  }),

  "cmd_admin_board_create": (payload) => ({
    area: "Admin Boards",
    localTarget: stringFromRecord(payload?.input, "bo_table"),
    operation: "게시판 생성",
  }),

  "cmd_admin_board_update": (payload) => ({
    area: "Admin Boards",
    localTarget: stringFromRecord(payload?.input, "bo_table"),
    operation: "게시판 수정",
  }),

  "cmd_admin_board_delete": (payload) => ({
    area: "Admin Boards",
    localTarget: stringFromRecord(payload?.input, "bo_table"),
    operation: "게시판 삭제",
  }),

  "cmd_admin_board_copy": (payload) => ({
    area: "Admin Boards",
    localTarget:
      composeCompositeTarget(payload?.input, [
        "bo_table",
        "target_bo_table",
      ]) ?? stringFromRecord(payload?.input, "bo_table"),
    operation: "게시판 복사",
  }),

  "cmd_admin_board_new_posts_delete": () => ({
    area: "Admin Boards",
    localTarget: "boards.new-posts",
    operation: "새글 캐시 삭제",
  }),

  "cmd_admin_layout_get_list": (payload) => ({
    area: "Admin Layouts",
    localTarget: String(numberFromRecord(payload?.query, "page") ?? 1),
    operation: "레이아웃 목록 조회",
  }),

  "cmd_admin_layout_get": (payload) => ({
    area: "Admin Layouts",
    localTarget: stringFromPayload(payload, "pageId"),
    operation: "레이아웃 상세 조회",
  }),

  "cmd_admin_layout_save": (payload) => ({
    area: "Admin Layouts",
    localTarget: stringFromRecord(payload?.input, "page_id"),
    operation: "레이아웃 저장",
  }),

  "cmd_admin_layout_widget_add": (payload) => ({
    area: "Admin Layouts",
    localTarget: stringFromRecord(payload?.input, "page_id"),
    operation: "레이아웃 위젯 추가",
  }),

  "cmd_admin_layout_widget_update": (payload) => ({
    area: "Admin Layouts",
    localTarget:
      composeCompositeTarget(payload?.input, ["page_id", "widget_id"]) ??
      stringFromRecord(payload?.input, "page_id"),
    operation: "레이아웃 위젯 수정",
  }),

  "cmd_admin_layout_widget_delete": (payload) => ({
    area: "Admin Layouts",
    localTarget:
      composeCompositeTarget(payload?.input, ["page_id", "widget_id"]) ??
      stringFromRecord(payload?.input, "page_id"),
    operation: "레이아웃 위젯 삭제",
  }),

  "cmd_admin_layout_reorder": (payload) => ({
    area: "Admin Layouts",
    localTarget: stringFromRecord(payload?.input, "page_id"),
    operation: "레이아웃 위젯 재정렬",
  }),

  "cmd_admin_layout_reorder_legacy": (payload) => ({
    area: "Admin Layouts",
    localTarget: stringFromRecord(payload?.input, "page_id"),
    operation: "레이아웃 위젯 재정렬 (/admin/layouts/{page_id}/reorder)",
  }),
};
