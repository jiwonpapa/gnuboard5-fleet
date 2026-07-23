import { describe, expect, it } from "vitest";
import {
  getNavigationDeliveryDescription,
  getNavigationDeliveryLabel,
  navigationGroups,
  primaryNavigationGroups,
  resolveRouteGroup,
  resolveRouteMeta,
} from "./navigation";

const expectedMenuStructure = {
  "환경설정": [
    "기본환경설정",
    "관리권한설정",
    "테마설정",
    "메뉴설정",
    "메일 테스트",
    "팝업레이어관리",
    "세션파일 일괄삭제",
    "캐시파일 일괄삭제",
    "캡챠파일 일괄삭제",
    "썸네일파일 일괄삭제",
    "회원관리파일 일괄삭제",
    "phpinfo()",
    "Browscap 업데이트",
    "접속로그 변환",
    "DB업그레이드",
    "부가서비스",
  ],
  "회원관리": [
    "회원관리",
    "회원관리파일",
    "회원메일발송",
    "접속자집계",
    "접속자검색",
    "접속자로그삭제",
    "포인트관리",
    "투표관리",
  ],
  "게시판관리": [
    "게시판관리",
    "게시판그룹관리",
    "인기검색어관리",
    "인기검색어순위",
    "1:1문의설정",
    "내용관리",
    "FAQ관리",
    "글,댓글 현황",
  ],
  "SMS 관리": [
    "SMS 기본설정",
    "회원정보업데이트",
    "문자 보내기",
    "전송내역-건별",
    "전송내역-번호별",
    "이모티콘 그룹",
    "이모티콘 관리",
    "휴대폰번호 그룹",
    "휴대폰번호 관리",
    "휴대폰번호 파일",
  ],
} as const;

describe("navigation", () => {
  it("keeps the primary admin IA aligned with the legacy menu structure", () => {
    expect(primaryNavigationGroups.map((group) => group.label)).toEqual([
      "환경설정",
      "회원관리",
      "게시판관리",
      "SMS 관리",
    ]);

    for (const group of primaryNavigationGroups) {
      expect(group.items.map((item) => item.label)).toEqual(
        expectedMenuStructure[group.label as keyof typeof expectedMenuStructure],
      );
    }
  });

  it("resolves alias and nested routes back to the canonical menu metadata", () => {
    expect(resolveRouteMeta("/settings/general")?.label).toBe("기본환경설정");
    expect(resolveRouteMeta("/sites/site-alpha/settings/general")?.label).toBe(
      "기본환경설정",
    );
    expect(resolveRouteMeta("/operations/polls")?.label).toBe("투표관리");
    expect(resolveRouteMeta("/settings/sms/advanced")?.label).toBe("SMS 기본설정");
    expect(resolveRouteMeta("/tools/reports")?.label).toBe("신고 관리");
    expect(resolveRouteGroup("/members/manage/neojins")?.label).toBe("회원관리");
    expect(resolveRouteGroup("/sites/site-alpha/boards/faqs/42")?.label).toBe(
      "게시판관리",
    );
    expect(resolveRouteGroup("/boards/faqs/42")?.label).toBe("게시판관리");
    expect(resolveRouteGroup("/tools/layouts/widgets/1")?.label).toBe("운영 확장");
    expect(resolveRouteMeta("/does-not-exist")).toBeUndefined();
    expect(resolveRouteGroup("/does-not-exist")).toBeUndefined();
  });

  it("keeps search-only tools out of the primary navigation while preserving lookup metadata", () => {
    expect(primaryNavigationGroups.some((group) => group.label === "운영 확장")).toBe(false);
    expect(navigationGroups.find((group) => group.label === "운영 확장")?.showInPrimaryNav).toBe(
      false,
    );
    expect(resolveRouteMeta("/tools/push")?.label).toBe("푸시 발송");
  });

  it("keeps server tool labels explicit about SSH and SFTP surfaces", () => {
    const serverGroup = navigationGroups.find((group) => group.id === "server");

    expect(serverGroup?.items.map((item) => item.label)).toEqual(["SSH", "SFTP"]);
  });

  it("returns stable delivery labels and descriptions for every navigation state", () => {
    expect(getNavigationDeliveryLabel("implemented")).toBe("구현완료");
    expect(getNavigationDeliveryLabel("api_ready")).toBe("API만 완료");
    expect(getNavigationDeliveryLabel("api_excluded")).toBe("API 제외");

    expect(getNavigationDeliveryDescription("implemented")).toBe(
      "Rust 작업면과 REST API가 모두 연결된 상태입니다.",
    );
    expect(getNavigationDeliveryDescription("api_ready")).toBe(
      "REST API는 준비됐지만 Rust 작업면이 아직 없습니다.",
    );
    expect(getNavigationDeliveryDescription("api_excluded")).toBe(
      "운영 정책상 REST API 이관 대상에서 제외된 항목입니다.",
    );
  });
});
