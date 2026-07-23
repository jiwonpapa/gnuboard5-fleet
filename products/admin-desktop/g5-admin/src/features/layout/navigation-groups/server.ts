import { HardDrive } from "lucide-react";
import {
  SERVER_FILES_ROUTE,
  SERVER_SSH_ROUTE,
} from "../navigation-routes";
import type { NavigationGroup } from "../navigation-types";

export const serverNavigationGroup: NavigationGroup = {
  id: "server",
  label: "서버",
  description: "사이트별 SSH/SFTP 연결 준비 단계를 로컬 앱에서 관리합니다.",
  icon: HardDrive,
  showInPrimaryNav: false,
  items: [
    {
      to: SERVER_SSH_ROUTE,
      label: "SSH",
      description: "사이트별 SSH 프로필/연결과 xterm.js 터미널을 같은 작업면에서 관리합니다.",
      icon: HardDrive,
      delivery: "implemented",
      legacySource: "local-server-session",
      note: "프로필 관리, known_hosts 신뢰 등록, 연결/해제, interactive shell을 한 화면에서 제공합니다.",
    },
    {
      to: SERVER_FILES_ROUTE,
      label: "SFTP",
      description:
        "활성 SSH 연결 위에 SFTP 탐색, 파일 미리보기/편집, 다운로드, 업로드, 삭제, 새 폴더 생성을 제공합니다.",
      icon: HardDrive,
      delivery: "implemented",
      legacySource: "local-server-files",
      note: "현재는 탐색, 본문 읽기/저장, 다운로드, 업로드, 파일/빈 디렉터리 삭제, 새 폴더 생성을 제공합니다.",
    },
  ],
};
