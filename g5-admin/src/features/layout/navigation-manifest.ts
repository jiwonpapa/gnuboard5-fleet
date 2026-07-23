import {
  BOARD_CONTENTS_ROUTE,
  BOARD_FAQS_ROUTE,
  BOARD_GROUPS_ROUTE,
  BOARD_MANAGE_ROUTE,
  BOARD_POPULAR_RANK_ROUTE,
  BOARD_POPULAR_ROUTE,
  BOARD_QA_CONFIG_ROUTE,
  BOARD_WRITE_COUNT_ROUTE,
  ENVIRONMENT_AUTH_ROUTE,
  ENVIRONMENT_BASIC_CONFIG_ROUTE,
  ENVIRONMENT_BROWSCAP_ROUTE,
  ENVIRONMENT_MAIL_TEST_ROUTE,
  ENVIRONMENT_MAINTENANCE_CACHE_ROUTE,
  ENVIRONMENT_MAINTENANCE_CAPTCHA_ROUTE,
  ENVIRONMENT_MAINTENANCE_MEMBER_LIST_ROUTE,
  ENVIRONMENT_MAINTENANCE_SESSION_ROUTE,
  ENVIRONMENT_MAINTENANCE_THUMBNAIL_ROUTE,
  ENVIRONMENT_MENUS_ROUTE,
  ENVIRONMENT_PHPINFO_ROUTE,
  ENVIRONMENT_POPUPS_ROUTE,
  ENVIRONMENT_THEME_ROUTE,
  ENVIRONMENT_VISIT_LOG_CONVERT_ROUTE,
  MEMBER_FILES_ROUTE,
  MEMBER_MAILS_ROUTE,
  MEMBER_MANAGE_ROUTE,
  MEMBER_POINTS_ROUTE,
  MEMBER_POLLS_ROUTE,
  MEMBER_VISIT_DELETE_ROUTE,
  MEMBER_VISIT_SEARCH_ROUTE,
  MEMBER_VISIT_STATS_ROUTE,
  SMS_CONFIG_ROUTE,
  SMS_CONTACT_FILES_ROUTE,
  SMS_CONTACT_GROUPS_ROUTE,
  SMS_CONTACTS_ROUTE,
  SMS_HISTORY_BATCHES_ROUTE,
  SMS_HISTORY_DELIVERIES_ROUTE,
  SMS_MEMBER_SYNC_ROUTE,
  SMS_MESSAGES_ROUTE,
  SMS_TEMPLATE_GROUPS_ROUTE,
  SMS_TEMPLATES_ROUTE,
  SERVER_FILES_ROUTE,
  SERVER_SSH_ROUTE,
  TOOLS_LAYOUTS_ROUTE,
  TOOLS_PUSH_ROUTE,
  TOOLS_REPORTS_ROUTE,
} from "./navigation-routes";
import { navigationGroups as rawNavigationGroups } from "./navigation-groups";
import type { NavigationGroup, NavigationItem } from "./navigation-types";

const navigationApiTargetsByRoute: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    [ENVIRONMENT_BASIC_CONFIG_ROUTE]: ["GET /admin/config", "PUT /admin/config"],
    [ENVIRONMENT_AUTH_ROUTE]: [
      "GET /admin/system/auths",
      "POST /admin/system/auths",
      "DELETE /admin/system/auths/{mb_id}/{au_menu}",
    ],
    [ENVIRONMENT_THEME_ROUTE]: [
      "GET /admin/system/theme",
      "PUT /admin/system/theme",
      "GET /admin/system/themes",
      "GET /admin/system/themes/{theme}",
    ],
    [ENVIRONMENT_MENUS_ROUTE]: [
      "GET /admin/menus",
      "POST /admin/menus",
      "PATCH /admin/menus",
      "GET /admin/menus/{me_id}",
      "PUT /admin/menus/{me_id}",
      "DELETE /admin/menus/{me_id}",
      "PATCH /admin/menus/reorder",
    ],
    [ENVIRONMENT_MAIL_TEST_ROUTE]: [
      "POST /admin/mail-tests",
      "POST /admin/mails/test",
      "POST /admin/system/mails/test",
    ],
    [ENVIRONMENT_POPUPS_ROUTE]: [
      "GET /admin/system/popups",
      "POST /admin/system/popups",
      "GET /admin/system/popups/{nw_id}",
      "PUT /admin/system/popups/{nw_id}",
      "DELETE /admin/system/popups/{nw_id}",
    ],
    [ENVIRONMENT_MAINTENANCE_SESSION_ROUTE]: [
      "POST /admin/system/maintenance/session-files/purge",
    ],
    [ENVIRONMENT_MAINTENANCE_CACHE_ROUTE]: [
      "POST /admin/system/maintenance/cache-files/purge",
    ],
    [ENVIRONMENT_MAINTENANCE_CAPTCHA_ROUTE]: [
      "POST /admin/system/maintenance/captcha-files/purge",
    ],
    [ENVIRONMENT_MAINTENANCE_THUMBNAIL_ROUTE]: [
      "POST /admin/system/maintenance/thumbnail-files/purge",
    ],
    [ENVIRONMENT_MAINTENANCE_MEMBER_LIST_ROUTE]: [
      "POST /admin/system/maintenance/member-list-files/purge",
    ],
    [ENVIRONMENT_PHPINFO_ROUTE]: ["GET /admin/system/phpinfo"],
    [ENVIRONMENT_BROWSCAP_ROUTE]: [
      "GET /admin/system/browscap",
      "POST /admin/system/browscap/update",
    ],
    [ENVIRONMENT_VISIT_LOG_CONVERT_ROUTE]: [
      "POST /admin/system/browscap/convert",
    ],
    [MEMBER_MANAGE_ROUTE]: [
      "GET /admin/members",
      "GET /admin/members/{mb_id}",
      "PATCH /admin/members/{mb_id}",
      "DELETE /admin/members/{mb_id}",
      "PATCH /admin/members/{mb_id}/level",
    ],
    [MEMBER_FILES_ROUTE]: ["GET /admin/members/excel"],
    [MEMBER_MAILS_ROUTE]: [
      "GET /admin/mails",
      "POST /admin/mails",
      "GET /admin/mails/{ma_id}",
      "PUT /admin/mails/{ma_id}",
      "DELETE /admin/mails/{ma_id}",
      "POST /admin/mails/templates",
      "GET /admin/mails/recipients",
      "POST /admin/system/mails/send",
    ],
    [MEMBER_VISIT_STATS_ROUTE]: ["GET /admin/visits/stats"],
    [MEMBER_VISIT_SEARCH_ROUTE]: ["GET /admin/visits/search"],
    [MEMBER_VISIT_DELETE_ROUTE]: ["DELETE /admin/visits"],
    [MEMBER_POINTS_ROUTE]: [
      "GET /admin/points",
      "POST /admin/points",
      "DELETE /admin/points",
      "POST /admin/points/grant",
      "POST /admin/points/deduct",
      "GET /admin/points/summary",
      "POST /admin/points/expire",
    ],
    [MEMBER_POLLS_ROUTE]: [
      "GET /admin/system/polls",
      "POST /admin/system/polls",
      "GET /admin/system/polls/{po_id}",
      "PUT /admin/system/polls/{po_id}",
      "DELETE /admin/system/polls/{po_id}",
    ],
    [BOARD_MANAGE_ROUTE]: [
      "GET /admin/boards",
      "POST /admin/boards",
      "GET /admin/boards/{bo_table}",
      "PUT /admin/boards/{bo_table}",
      "DELETE /admin/boards/{bo_table}",
    ],
    [BOARD_GROUPS_ROUTE]: [
      "GET /admin/board-groups",
      "POST /admin/board-groups",
      "GET /admin/board-groups/{gr_id}",
      "PUT /admin/board-groups/{gr_id}",
      "DELETE /admin/board-groups/{gr_id}",
      "GET /admin/board-groups/{gr_id}/members",
    ],
    [BOARD_POPULAR_ROUTE]: ["GET /admin/popular", "DELETE /admin/popular"],
    [BOARD_POPULAR_RANK_ROUTE]: ["GET /admin/popular/rank"],
    [BOARD_QA_CONFIG_ROUTE]: [
      "GET /admin/system/qa-config",
      "PUT /admin/system/qa-config",
    ],
    [BOARD_CONTENTS_ROUTE]: [
      "GET /admin/contents",
      "POST /admin/contents",
      "GET /admin/contents/{co_id}",
      "PUT /admin/contents/{co_id}",
      "DELETE /admin/contents/{co_id}",
    ],
    [BOARD_FAQS_ROUTE]: [
      "GET /admin/faq-masters",
      "POST /admin/faq-masters",
      "GET /admin/faq-masters/{fm_id}",
      "PUT /admin/faq-masters/{fm_id}",
      "GET /admin/faqs",
      "POST /admin/faqs",
      "GET /admin/faqs/{fa_id}",
      "PUT /admin/faqs/{fa_id}",
      "DELETE /admin/faqs/{fa_id}",
    ],
    [BOARD_WRITE_COUNT_ROUTE]: ["GET /admin/write-count/stats"],
    [SMS_CONFIG_ROUTE]: ["GET /admin/sms/config", "PUT /admin/sms/config"],
    [SMS_MEMBER_SYNC_ROUTE]: ["POST /admin/sms/member-sync"],
    [SMS_MESSAGES_ROUTE]: ["POST /admin/sms/messages"],
    [SMS_HISTORY_BATCHES_ROUTE]: [
      "GET /admin/sms/history/batches",
      "GET /admin/sms/history/batches/{wr_no}",
      "POST /admin/sms/history/batches/{wr_no}/resend-failures",
      "POST /admin/sms/history/batches/{wr_no}/resend-all",
    ],
    [SMS_HISTORY_DELIVERIES_ROUTE]: ["GET /admin/sms/history/deliveries"],
    [SMS_TEMPLATE_GROUPS_ROUTE]: [
      "GET /admin/sms/template-groups",
      "POST /admin/sms/template-groups",
      "GET /admin/sms/template-groups/{fg_no}",
      "PUT /admin/sms/template-groups/{fg_no}",
      "DELETE /admin/sms/template-groups/{fg_no}",
      "POST /admin/sms/template-groups/{fg_no}/move",
      "DELETE /admin/sms/template-groups/{fg_no}/templates",
    ],
    [SMS_TEMPLATES_ROUTE]: [
      "GET /admin/sms/templates",
      "POST /admin/sms/templates",
      "POST /admin/sms/templates/batch",
      "GET /admin/sms/templates/{fo_no}",
      "PUT /admin/sms/templates/{fo_no}",
      "DELETE /admin/sms/templates/{fo_no}",
    ],
    [SMS_CONTACT_GROUPS_ROUTE]: [
      "GET /admin/sms/contact-groups",
      "POST /admin/sms/contact-groups",
      "GET /admin/sms/contact-groups/{bg_no}",
      "PUT /admin/sms/contact-groups/{bg_no}",
      "DELETE /admin/sms/contact-groups/{bg_no}",
      "POST /admin/sms/contact-groups/{bg_no}/move",
      "DELETE /admin/sms/contact-groups/{bg_no}/contacts",
    ],
    [SMS_CONTACTS_ROUTE]: [
      "GET /admin/sms/contacts",
      "POST /admin/sms/contacts",
      "POST /admin/sms/contacts/batch",
      "GET /admin/sms/contacts/{bk_no}",
      "PUT /admin/sms/contacts/{bk_no}",
      "DELETE /admin/sms/contacts/{bk_no}",
    ],
    [SMS_CONTACT_FILES_ROUTE]: [
      "POST /admin/sms/contacts/import",
      "GET /admin/sms/contacts/export",
    ],
    [TOOLS_LAYOUTS_ROUTE]: [
      "GET /admin/layouts",
      "GET /admin/layouts/{page_id}",
      "PUT /admin/layouts/{page_id}",
      "POST /admin/layouts/{page_id}/widgets",
      "PATCH /admin/layouts/{page_id}/widgets",
      "PATCH /admin/layouts/{page_id}/widgets/{widget_id}",
      "DELETE /admin/layouts/{page_id}/widgets/{widget_id}",
      "PATCH /admin/layouts/{page_id}/reorder",
    ],
    [TOOLS_REPORTS_ROUTE]: [
      "GET /admin/reports",
      "PATCH /admin/reports/{report_id}",
      "GET /admin/reports/stats",
    ],
    [TOOLS_PUSH_ROUTE]: ["POST /admin/push/messages", "POST /admin/push/send"],
    [SERVER_SSH_ROUTE]: [
      "local://sites/{site_id}/ssh-profiles",
      "local://sites/{site_id}/ssh-profiles/{ssh_profile_id}",
      "local://sites/{site_id}/ssh-host-verification",
      "local://sites/{site_id}/ssh-session",
      "local://sites/{site_id}/ssh-shell",
    ],
    [SERVER_FILES_ROUTE]: [
      "local://sites/{site_id}/sftp",
      "local://sites/{site_id}/sftp/stat",
      "local://sites/{site_id}/sftp/file",
      "local://sites/{site_id}/sftp/download",
      "local://sites/{site_id}/sftp/upload",
      "local://sites/{site_id}/sftp/copy",
      "local://sites/{site_id}/sftp/move",
      "local://sites/{site_id}/sftp/chmod",
      "local://sites/{site_id}/sftp/delete",
      "local://sites/{site_id}/sftp/mkdir",
      "local://sites/{site_id}/sftp/write",
    ],
  });

function withNavigationApiTargets(item: NavigationItem): NavigationItem {
  const apiTargets = navigationApiTargetsByRoute[item.to];
  if (!apiTargets) {
    return item;
  }

  return {
    ...item,
    apiTargets: [...apiTargets],
  };
}

export const navigationGroups: NavigationGroup[] = rawNavigationGroups.map(
  (group) => ({
    ...group,
    items: group.items.map(withNavigationApiTargets),
  }),
);

export const primaryNavigationGroups = navigationGroups.filter(
  (group) => group.showInPrimaryNav !== false,
);

export const flatNavigationItems = navigationGroups.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    allPaths: [item.to, ...(item.aliases ?? [])],
    groupDescription: group.description,
    groupIcon: group.icon,
    groupId: group.id,
    groupLabel: group.label,
  })),
);
