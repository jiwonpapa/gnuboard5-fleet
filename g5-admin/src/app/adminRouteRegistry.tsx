import type { ReactElement } from "react";
import { AdminBoardGroupsPage } from "../features/board-groups/AdminBoardGroupsPage";
import { AdminBoardsPage } from "../features/boards/AdminBoardsPage";
import { AdminConfigPage } from "../features/config/AdminConfigPage";
import { AdminContentsPage } from "../features/contents/AdminContentsPage";
import { AdminFaqsPage } from "../features/faqs/AdminFaqsPage";
import {
  APP_SITE_MANAGEMENT_ROUTE,
  BOARD_CONTENTS_ROUTE,
  BOARD_FAQS_ROUTE,
  BOARD_GROUPS_ROUTE,
  BOARD_MANAGE_ROUTE,
  BOARD_POPULAR_RANK_ROUTE,
  BOARD_POPULAR_ROUTE,
  BOARD_QA_CONFIG_ROUTE,
  BOARD_WRITE_COUNT_ROUTE,
  DEFAULT_ROUTE,
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
  flatNavigationItems,
  LOCAL_SECURITY_ROUTE,
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
  SERVER_SSH_ROUTE,
  SERVER_FILES_ROUTE,
  TOOLS_LAYOUTS_ROUTE,
  TOOLS_PUSH_ROUTE,
  TOOLS_REPORTS_ROUTE,
} from "../features/layout/navigation";
import { AdminLayoutsPage } from "../features/layouts/AdminLayoutsPage";
import { AdminMailTestPage } from "../features/mail-test/AdminMailTestPage";
import { AdminMailsPage } from "../features/mails/AdminMailsPage";
import { AdminMaintenancePage } from "../features/maintenance/AdminMaintenancePage";
import { AdminMemberFilesPage } from "../features/members/AdminMemberFilesPage";
import { AdminMembersPage } from "../features/members/AdminMembersPage";
import { AdminMenusPage } from "../features/menus/AdminMenusPage";
import { AdminOverviewPage } from "../features/overview/AdminOverviewPage";
import { AdminPermissionsPage } from "../features/permissions/AdminPermissionsPage";
import { AdminPointsPage } from "../features/points/AdminPointsPage";
import { AdminPollsPage } from "../features/polls/AdminPollsPage";
import { AdminPopularPage } from "../features/popular/AdminPopularPage";
import { AdminPopupsPage } from "../features/popups/AdminPopupsPage";
import { AdminPushPage } from "../features/push/AdminPushPage";
import { AdminQaConfigPage } from "../features/qa-config/AdminQaConfigPage";
import { AdminReportsPage } from "../features/reports/AdminReportsPage";
import { SecuritySettingsPage } from "../features/security/SecuritySettingsPage";
import { AdminMenuStatusPage } from "../features/status/AdminMenuStatusPage";
import { AdminSmsContactsPage } from "../features/sms-contacts/AdminSmsContactsPage";
import { AdminSmsHistoryPage } from "../features/sms-history/AdminSmsHistoryPage";
import { AdminSmsMessagesPage } from "../features/sms-messages/AdminSmsMessagesPage";
import { AdminSmsTemplatesPage } from "../features/sms-templates/AdminSmsTemplatesPage";
import { AdminSmsConfigPage } from "../features/system/AdminSmsConfigPage";
import { AdminBrowscapPage } from "../features/system-tools/AdminBrowscapPage";
import { AdminPhpInfoPage } from "../features/system-tools/AdminPhpInfoPage";
import { AdminThemePage } from "../features/theme/AdminThemePage";
import { AdminVisitDeletePage } from "../features/visits/AdminVisitDeletePage";
import { AdminVisitSearchPage } from "../features/visits/AdminVisitSearchPage";
import { AdminVisitStatsPage } from "../features/visits/AdminVisitStatsPage";
import { AdminWriteCountPage } from "../features/write-count/AdminWriteCountPage";
import { SiteSshSessionPage } from "../features/server-ssh/SiteSshSessionPage";
import { SiteSftpBrowserPage } from "../features/server-files/SiteSftpBrowserPage";
import { SiteDashboardPage } from "../features/sites/SiteDashboardPage";

export type AdminRouteRedirect = {
  path: string;
  to: string | ((params: Record<string, string | undefined>) => string);
};

type CanonicalAdminRoute = {
  element: ReactElement;
  path: string;
};

const canonicalAdminRoutes: CanonicalAdminRoute[] = [
  { path: DEFAULT_ROUTE, element: <AdminOverviewPage /> },
  { path: LOCAL_SECURITY_ROUTE, element: <SecuritySettingsPage /> },
  { path: APP_SITE_MANAGEMENT_ROUTE, element: <SiteDashboardPage embedded /> },
  { path: SERVER_SSH_ROUTE, element: <SiteSshSessionPage /> },
  { path: SERVER_FILES_ROUTE, element: <SiteSftpBrowserPage /> },
  { path: ENVIRONMENT_BASIC_CONFIG_ROUTE, element: <AdminConfigPage /> },
  { path: ENVIRONMENT_AUTH_ROUTE, element: <AdminPermissionsPage /> },
  { path: ENVIRONMENT_PHPINFO_ROUTE, element: <AdminPhpInfoPage /> },
  { path: ENVIRONMENT_BROWSCAP_ROUTE, element: <AdminBrowscapPage /> },
  { path: ENVIRONMENT_VISIT_LOG_CONVERT_ROUTE, element: <AdminBrowscapPage /> },
  { path: ENVIRONMENT_MAIL_TEST_ROUTE, element: <AdminMailTestPage /> },
  { path: ENVIRONMENT_MAINTENANCE_SESSION_ROUTE, element: <AdminMaintenancePage /> },
  { path: ENVIRONMENT_MAINTENANCE_CACHE_ROUTE, element: <AdminMaintenancePage /> },
  { path: ENVIRONMENT_MAINTENANCE_CAPTCHA_ROUTE, element: <AdminMaintenancePage /> },
  {
    path: ENVIRONMENT_MAINTENANCE_THUMBNAIL_ROUTE,
    element: <AdminMaintenancePage />,
  },
  {
    path: ENVIRONMENT_MAINTENANCE_MEMBER_LIST_ROUTE,
    element: <AdminMaintenancePage />,
  },
  { path: ENVIRONMENT_MENUS_ROUTE, element: <AdminMenusPage /> },
  { path: ENVIRONMENT_THEME_ROUTE, element: <AdminThemePage /> },
  { path: ENVIRONMENT_POPUPS_ROUTE, element: <AdminPopupsPage /> },
  { path: MEMBER_MANAGE_ROUTE, element: <AdminMembersPage /> },
  { path: MEMBER_FILES_ROUTE, element: <AdminMemberFilesPage /> },
  { path: MEMBER_MAILS_ROUTE, element: <AdminMailsPage /> },
  { path: MEMBER_POINTS_ROUTE, element: <AdminPointsPage /> },
  { path: MEMBER_VISIT_STATS_ROUTE, element: <AdminVisitStatsPage /> },
  { path: MEMBER_VISIT_SEARCH_ROUTE, element: <AdminVisitSearchPage /> },
  { path: MEMBER_VISIT_DELETE_ROUTE, element: <AdminVisitDeletePage /> },
  { path: MEMBER_POLLS_ROUTE, element: <AdminPollsPage /> },
  { path: BOARD_MANAGE_ROUTE, element: <AdminBoardsPage /> },
  { path: BOARD_GROUPS_ROUTE, element: <AdminBoardGroupsPage /> },
  { path: BOARD_CONTENTS_ROUTE, element: <AdminContentsPage /> },
  { path: BOARD_FAQS_ROUTE, element: <AdminFaqsPage /> },
  { path: BOARD_POPULAR_ROUTE, element: <AdminPopularPage /> },
  { path: BOARD_POPULAR_RANK_ROUTE, element: <AdminPopularPage /> },
  { path: BOARD_QA_CONFIG_ROUTE, element: <AdminQaConfigPage /> },
  { path: BOARD_WRITE_COUNT_ROUTE, element: <AdminWriteCountPage /> },
  { path: TOOLS_LAYOUTS_ROUTE, element: <AdminLayoutsPage /> },
  { path: TOOLS_REPORTS_ROUTE, element: <AdminReportsPage /> },
  { path: TOOLS_PUSH_ROUTE, element: <AdminPushPage /> },
  { path: SMS_CONFIG_ROUTE, element: <AdminSmsConfigPage /> },
  { path: SMS_MEMBER_SYNC_ROUTE, element: <AdminSmsConfigPage /> },
  { path: SMS_MESSAGES_ROUTE, element: <AdminSmsMessagesPage /> },
  { path: SMS_HISTORY_BATCHES_ROUTE, element: <AdminSmsHistoryPage /> },
  { path: SMS_HISTORY_DELIVERIES_ROUTE, element: <AdminSmsHistoryPage /> },
  { path: SMS_TEMPLATE_GROUPS_ROUTE, element: <AdminSmsTemplatesPage /> },
  { path: SMS_TEMPLATES_ROUTE, element: <AdminSmsTemplatesPage /> },
  { path: SMS_CONTACT_GROUPS_ROUTE, element: <AdminSmsContactsPage /> },
  { path: SMS_CONTACTS_ROUTE, element: <AdminSmsContactsPage /> },
  { path: SMS_CONTACT_FILES_ROUTE, element: <AdminSmsContactsPage /> },
];

const canonicalAdminRouteMap = new Map(
  canonicalAdminRoutes.map((route) => [route.path, route.element]),
);

export const canonicalAdminChildRoutes = flatNavigationItems.map((item) => ({
  path: toChildPath(item.to),
  element: canonicalAdminRouteMap.get(item.to) ?? <AdminMenuStatusPage />,
}));

export const canonicalAdminTopLevelRedirects: AdminRouteRedirect[] =
  flatNavigationItems.map((item) => ({
    path: toChildPath(item.to),
    to: item.to,
  }));

const sharedLegacyAdminRedirects: AdminRouteRedirect[] = flatNavigationItems.flatMap(
  (item) =>
    (item.aliases ?? []).map((alias) => ({
      path: toChildPath(alias),
      to: item.to,
    })),
);

export const memberDetailChildRoute = {
  path: `${toChildPath(MEMBER_MANAGE_ROUTE)}/:mbId`,
  element: <AdminMembersPage />,
};

export const memberDetailRedirect: AdminRouteRedirect = {
  path: "members/:mbId",
  to: (params) => `${MEMBER_MANAGE_ROUTE}/${params.mbId ?? ""}`,
};

export const scopedLegacyAdminRedirects: AdminRouteRedirect[] = [
  ...sharedLegacyAdminRedirects,
  memberDetailRedirect,
];

export const topLevelLegacyAdminRedirects: AdminRouteRedirect[] = [
  ...sharedLegacyAdminRedirects,
  memberDetailRedirect,
];

export const memberDetailTopLevelRedirect: AdminRouteRedirect = {
  path: memberDetailChildRoute.path,
  to: memberDetailRedirect.to,
};

export function toChildPath(pathname: string) {
  return pathname.replace(/^\//, "");
}
