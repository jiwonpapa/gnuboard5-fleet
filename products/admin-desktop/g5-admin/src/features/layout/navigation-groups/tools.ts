import { BellRing, Flag, Layers3, Sparkles } from "lucide-react";
import {
  TOOLS_LAYOUTS_ROUTE,
  TOOLS_PUSH_ROUTE,
  TOOLS_REPORTS_ROUTE,
} from "../navigation-routes";
import type { NavigationGroup } from "../navigation-types";

export const toolsNavigationGroup: NavigationGroup = {
  id: "tools",
  label: "운영 확장",
  description: "감사 문서 기준 추가 관리자 도메인을 직접 진입/검색용으로 노출합니다.",
  icon: Sparkles,
  showInPrimaryNav: false,
  items: [
    {
      to: TOOLS_LAYOUTS_ROUTE,
      label: "레이아웃 관리",
      description: "페이지 레이아웃과 위젯 구성을 저장하고 재정렬합니다.",
      icon: Layers3,
      delivery: "implemented",
      legacySource: "adm/layout_list.php",
    },
    {
      to: TOOLS_REPORTS_ROUTE,
      label: "신고 관리",
      description: "신고 목록, 통계, 상태 변경과 운영 메모를 처리합니다.",
      icon: Flag,
      delivery: "implemented",
      legacySource: "adm/report_list.php",
    },
    {
      to: TOOLS_PUSH_ROUTE,
      label: "푸시 발송",
      description: "푸시 메시지 큐 등록과 발송 결과를 확인합니다.",
      icon: BellRing,
      delivery: "implemented",
      legacySource: "adm/push_send.php",
    },
  ],
};
