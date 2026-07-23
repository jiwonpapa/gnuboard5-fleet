import { Cog, House, Layers3 } from "lucide-react";
import { APP_OVERVIEW_LABEL } from "../branding";
import {
  APP_SITE_MANAGEMENT_ROUTE,
  DEFAULT_ROUTE,
  LOCAL_SECURITY_ROUTE,
} from "../navigation-routes";
import type { NavigationGroup } from "../navigation-types";

export const overviewNavigationGroup: NavigationGroup = {
  id: "overview",
  label: "개요",
  description: "활성 사이트 상태, 최근 활동, 주메뉴 진입점을 먼저 확인합니다.",
  icon: House,
  showInPrimaryNav: false,
  items: [
    {
      to: DEFAULT_ROUTE,
      label: APP_OVERVIEW_LABEL,
      description: "활성 사이트 요약, 원격 관리자 대시보드, 최근 로컬 활동을 확인합니다.",
      icon: House,
      delivery: "implemented",
      legacySource: "adm/index.php",
      note: "활성 사이트 작업 홈은 로컬 멀티사이트 상태와 PHP /admin/dashboard 요약을 함께 표시합니다.",
    },
  ],
};

export const appSettingsNavigationGroup: NavigationGroup = {
  id: "app-settings",
  label: "앱설정",
  description: "로컬 마스터 비밀번호, OTP, 자동 잠금 시간을 관리합니다.",
  icon: Cog,
  showInPrimaryNav: false,
  items: [
    {
      to: LOCAL_SECURITY_ROUTE,
      label: "앱설정",
      description: "마스터 비밀번호 변경, OTP 등록·해제, 자동 잠금 시간을 관리합니다.",
      icon: Cog,
      delivery: "implemented",
      legacySource: "local-app-security",
      note: "로컬 앱 보안 설정이며 PHP 관리자 계정과 분리됩니다.",
    },
  ],
};

export const siteManagementNavigationGroup: NavigationGroup = {
  id: "site-management",
  label: "사이트관리",
  description: "등록 사이트, 백업/복구, 활성 사이트 전환을 한 작업면에서 관리합니다.",
  icon: Layers3,
  showInPrimaryNav: false,
  items: [
    {
      to: APP_SITE_MANAGEMENT_ROUTE,
      label: "사이트관리",
      description:
        "등록 사이트 목록, 새 사이트 등록, 휴대용 백업/복구, 활성 사이트 전환을 처리합니다.",
      icon: Layers3,
      delivery: "implemented",
      legacySource: "local-site-management",
      note: "로그인 후 앱 셸 내부에서도 동일한 사이트 관리 작업면을 제공합니다.",
    },
  ],
};
