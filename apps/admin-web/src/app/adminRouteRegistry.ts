export type DeliveryState = "active" | "planned";

export interface AdminRouteMeta {
  description: string;
  delivery: DeliveryState;
  group: string;
  label: string;
  legacySource: string;
  path: `/${string}`;
}

export const adminRoutes: readonly AdminRouteMeta[] = [
  {
    path: "/",
    label: "개요",
    group: "운영",
    description: "등록 사이트와 서버 상태를 확인합니다.",
    delivery: "active",
    legacySource: "overview/AdminOverviewPage.tsx",
  },
  {
    path: "/sites",
    label: "사이트",
    group: "운영",
    description: "G5 사이트 연결과 상태를 관리합니다.",
    delivery: "active",
    legacySource: "sites/SiteDashboardPage.tsx",
  },
  {
    path: "/audit",
    label: "감사 기록",
    group: "운영",
    description: "사용자·사이트별 append-only 변경 이력을 확인합니다.",
    delivery: "active",
    legacySource: "security/audit + activity command",
  },
  {
    path: "/backup",
    label: "백업",
    group: "시스템",
    description: "암호화 사이트 백업을 내보내고 검증 후 병합합니다.",
    delivery: "active",
    legacySource: "sites/SiteDashboardPage.tsx + backup commands",
  },
  {
    path: "/diagnostics",
    label: "진단",
    group: "시스템",
    description: "서버 런타임과 SQLite 상태를 확인합니다.",
    delivery: "active",
    legacySource: "debug/*",
  },
  {
    path: "/security",
    label: "보안 설정",
    group: "시스템",
    description: "OTP·비밀번호·복구 코드·유휴 세션을 관리합니다.",
    delivery: "active",
    legacySource: "security/SecuritySettingsPage.tsx",
  },
  ...[
    ["회원", "members", "회원", "members/AdminMembersPage.tsx"],
    ["권한", "permissions", "회원", "permissions/AdminPermissionsPage.tsx"],
    ["포인트", "points", "회원", "points/AdminPointsPage.tsx"],
    ["그룹", "groups", "게시판", "board-groups/AdminBoardGroupsPage.tsx"],
    ["게시판", "boards", "게시판", "boards/AdminBoardsPage.tsx"],
    ["내용", "contents", "게시판", "contents/AdminContentsPage.tsx"],
    ["FAQ", "faqs", "게시판", "faqs/AdminFaqsPage.tsx"],
    ["메뉴", "menus", "화면", "menus/AdminMenusPage.tsx"],
    ["레이아웃", "layouts", "화면", "layouts/AdminLayoutsPage.tsx"],
    ["테마", "theme", "화면", "theme/AdminThemePage.tsx"],
    ["투표", "polls", "운영 도구", "polls/AdminPollsPage.tsx"],
    ["팝업", "popups", "운영 도구", "popups/AdminPopupsPage.tsx"],
    ["인기검색", "popular", "운영 도구", "popular/AdminPopularPage.tsx"],
    ["접속자", "visits", "운영 도구", "visits/AdminVisitStatsPage.tsx"],
    ["신고", "reports", "운영 도구", "reports/AdminReportsPage.tsx"],
    ["QA", "qa", "운영 도구", "qa-config/AdminQaConfigPage.tsx"],
    ["글·댓글 통계", "write-count", "운영 도구", "write-count/AdminWriteCountPage.tsx"],
    ["메일", "mails", "메시징", "mails/AdminMailsPage.tsx"],
    ["SMS 설정", "sms", "메시징", "system/AdminSmsConfigPage.tsx"],
    ["SMS 연락처", "sms-contacts", "메시징", "sms-contacts/AdminSmsContactsPage.tsx"],
    ["SMS 템플릿", "sms-templates", "메시징", "sms-templates/AdminSmsTemplatesPage.tsx"],
    ["SMS 내역", "sms-messages", "메시징", "sms-history/AdminSmsHistoryPage.tsx"],
    ["Push", "push", "메시징", "push/AdminPushPage.tsx"],
    ["시스템 도구", "system-tools", "시스템", "system-tools/AdminPhpInfoPage.tsx"],
    ["유지보수", "maintenance", "시스템", "maintenance/AdminMaintenancePage.tsx"],
  ].map(([label, slug, group, legacySource]) => ({
    path: `/admin/${slug}` as const,
    label,
    group,
    description: `${label} 도메인 작업면입니다.`,
    delivery: ["members", "groups", "faqs", "menus", "layouts", "theme", "points", "polls", "popups", "popular", "visits", "reports", "qa", "write-count", "mails", "sms"].includes(slug) ? "active" as const : "planned" as const,
    legacySource,
  })),
];

export function resolveRouteMeta(pathname: string): AdminRouteMeta | undefined {
  return adminRoutes.find((route) => route.path === pathname);
}

export function groupedAdminRoutes(): ReadonlyMap<string, AdminRouteMeta[]> {
  const groups = new Map<string, AdminRouteMeta[]>();
  for (const route of adminRoutes) {
    const items = groups.get(route.group) ?? [];
    items.push(route);
    groups.set(route.group, items);
  }
  return groups;
}
