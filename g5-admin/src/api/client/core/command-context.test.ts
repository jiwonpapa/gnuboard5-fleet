import { describe, expect, it } from "vitest";
import { apiTargetCommands } from "./api-target-registry";
import { resolveApiTarget } from "./api-targets";
import { buildCommandContext } from "./command-context";
import { commandContextCommands } from "./command-context-registry";

describe("buildCommandContext", () => {
  it("keeps local master lock commands in the local security namespace", () => {
    expect(buildCommandContext("cmd_master_lock_unlock")).toEqual({
      apiTarget: "local://master-lock/unlock",
      area: "Master Lock",
      command: "cmd_master_lock_unlock",
      localTarget: "unlock",
      operation: "앱 잠금 해제",
    });
  });

  it("extracts local targets from site connectivity payloads", () => {
    expect(
      buildCommandContext("cmd_site_health_check", {
        input: {
          api_base_url: "https://gnurestapi.cc/api/v1",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/health-check",
      area: "Site Catalog",
      command: "cmd_site_health_check",
      localTarget: "https://gnurestapi.cc/api/v1",
      operation: "사이트 연결 테스트",
    });
  });

  it("keeps SSH profile CRUD in the local site server namespace", () => {
    expect(
      buildCommandContext("cmd_ssh_profile_update", {
        input: {
          site_id: "site-alpha",
          ssh_profile_id: "ssh-profile-1",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/ssh-profiles/{ssh_profile_id}",
      area: "Site SSH Profiles",
      command: "cmd_ssh_profile_update",
      localTarget: "ssh-profile-1",
      operation: "SSH 프로필 수정",
    });
  });

  it("keeps SSH session commands in the local site server namespace", () => {
    expect(
      buildCommandContext("cmd_ssh_connect", {
        input: {
          site_id: "site-alpha",
          ssh_profile_id: "ssh-profile-1",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/ssh-session",
      area: "Site SSH Session",
      command: "cmd_ssh_connect",
      localTarget: "ssh-profile-1",
      operation: "SSH 연결 시작",
    });
  });

  it("keeps SSH shell commands in the dedicated local shell namespace", () => {
    expect(
      buildCommandContext("cmd_ssh_shell_open", {
        input: {
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/ssh-shell",
      area: "Site SSH Shell",
      command: "cmd_ssh_shell_open",
      localTarget: "site-alpha",
      operation: "SSH interactive shell 열기",
    });
  });

  it("keeps SSH shell resize commands in the dedicated local shell namespace", () => {
    expect(
      buildCommandContext("cmd_ssh_shell_resize", {
        input: {
          site_id: "site-alpha",
          cols: 140,
          rows: 48,
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/ssh-shell/resize",
      area: "Site SSH Shell",
      command: "cmd_ssh_shell_resize",
      localTarget: "site-alpha",
      operation: "SSH PTY 크기 동기화",
    });
  });

  it("keeps SFTP list commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_list_dir", {
        input: {
          path: ".",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp",
      area: "Site SFTP",
      command: "cmd_sftp_list_dir",
      localTarget: ".",
      operation: "SFTP 디렉터리 목록 조회",
    });
  });

  it("keeps SFTP stat commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_stat", {
        input: {
          path: "/var/www/html/index.php",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/stat",
      area: "Site SFTP",
      command: "cmd_sftp_stat",
      localTarget: "/var/www/html/index.php",
      operation: "SFTP 파일 정보 조회",
    });
  });

  it("keeps SFTP file read commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_read_file", {
        input: {
          path: "/var/www/html/index.php",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/file",
      area: "Site SFTP",
      command: "cmd_sftp_read_file",
      localTarget: "/var/www/html/index.php",
      operation: "SFTP 파일 본문 읽기",
    });
  });

  it("keeps SFTP download commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_download", {
        input: {
          destination_path: "/Users/test/Downloads/index.php",
          path: "/var/www/html/index.php",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/download",
      area: "Site SFTP",
      command: "cmd_sftp_download",
      localTarget: "/var/www/html/index.php",
      operation: "SFTP 파일 다운로드",
    });
  });

  it("keeps SFTP upload commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_upload", {
        input: {
          destination_path: "/var/www/html/logo.png",
          site_id: "site-alpha",
          source_path: "/Users/test/Desktop/logo.png",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/upload",
      area: "Site SFTP",
      command: "cmd_sftp_upload",
      localTarget: "/var/www/html/logo.png",
      operation: "SFTP 파일 업로드",
    });
  });

  it("keeps SFTP delete commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_delete", {
        input: {
          path: "/var/www/html/index.php",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/delete",
      area: "Site SFTP",
      command: "cmd_sftp_delete",
      localTarget: "/var/www/html/index.php",
      operation: "SFTP 항목 삭제",
    });
  });

  it("keeps SFTP mkdir commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_mkdir", {
        input: {
          path: "/var/www/html/releases",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/mkdir",
      area: "Site SFTP",
      command: "cmd_sftp_mkdir",
      localTarget: "/var/www/html/releases",
      operation: "SFTP 디렉터리 생성",
    });
  });

  it("keeps SFTP write commands in the dedicated local sftp namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_write_file", {
        input: {
          path: "/var/www/html/index.php",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/write",
      area: "Site SFTP",
      command: "cmd_sftp_write_file",
      localTarget: "/var/www/html/index.php",
        operation: "SFTP 파일 저장",
      });
  });

  it("keeps SFTP transfer snapshot commands in the dedicated local transfer namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_transfer_snapshot", {
        input: {
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/transfers",
      area: "Site SFTP Transfers",
      command: "cmd_sftp_transfer_snapshot",
      localTarget: "site-alpha",
      operation: "SFTP 전송 큐 조회",
    });
  });

  it("keeps SFTP transfer enqueue commands in the dedicated local transfer namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_transfer_enqueue", {
        input: {
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/transfers/enqueue",
      area: "Site SFTP Transfers",
      command: "cmd_sftp_transfer_enqueue",
      localTarget: "site-alpha",
      operation: "SFTP 전송 큐 등록",
    });
  });

  it("keeps SFTP transfer pause commands in the dedicated local transfer namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_transfer_pause", {
        input: {
          item_id: "item-1",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/transfers/{item_id}/pause",
      area: "Site SFTP Transfers",
      command: "cmd_sftp_transfer_pause",
      localTarget: "item-1",
      operation: "SFTP 전송 일시 중지",
    });
  });

  it("keeps SFTP transfer retry commands in the dedicated local transfer namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_transfer_retry", {
        input: {
          item_id: "item-1",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/transfers/{item_id}/retry",
      area: "Site SFTP Transfers",
      command: "cmd_sftp_transfer_retry",
      localTarget: "item-1",
      operation: "SFTP 전송 재시도",
    });
  });

  it("keeps SFTP transfer cancel commands in the dedicated local transfer namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_transfer_cancel", {
        input: {
          item_id: "item-1",
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/transfers/{item_id}/cancel",
      area: "Site SFTP Transfers",
      command: "cmd_sftp_transfer_cancel",
      localTarget: "item-1",
      operation: "SFTP 전송 취소",
    });
  });

  it("keeps SFTP transfer concurrency commands in the dedicated local transfer namespace", () => {
    expect(
      buildCommandContext("cmd_sftp_transfer_set_concurrency", {
        input: {
          concurrency_limit: 3,
          site_id: "site-alpha",
        },
      }),
    ).toEqual({
      apiTarget: "local://sites/{site_id}/sftp/transfers/concurrency",
      area: "Site SFTP Transfers",
      command: "cmd_sftp_transfer_set_concurrency",
      localTarget: "site-alpha",
      operation: "SFTP 전송 동시 처리 수 변경",
    });
  });

  it("keeps admin content mutations mapped to the canonical admin path", () => {
    expect(
      buildCommandContext("cmd_admin_content_update", {
        input: {
          co_id: "company",
        },
      }),
    ).toEqual({
      apiTarget: "/admin/contents/{co_id}",
      area: "Admin Contents",
      command: "cmd_admin_content_update",
      localTarget: "company",
      operation: "내용 수정",
    });
  });

  it("builds composite local targets for admin permission mutations", () => {
    expect(
      buildCommandContext("cmd_admin_permission_save", {
        input: {
          au_menu: "200100",
          mb_id: "admin",
        },
      }),
    ).toEqual({
      apiTarget: "/admin/system/auths",
      area: "Admin Permissions",
      command: "cmd_admin_permission_save",
      localTarget: "admin / 200100",
      operation: "권한 저장",
    });
  });

  it("falls back to the command name for unknown commands", () => {
    expect(buildCommandContext("cmd_unknown_feature")).toEqual({
      apiTarget: "unknown",
      area: "Unknown",
      command: "cmd_unknown_feature",
      operation: "cmd_unknown_feature",
    });
  });
});

describe("resolveApiTarget", () => {
  it("keeps debug commands in the local debug namespace", () => {
    expect(resolveApiTarget("cmd_debug_log_tail")).toBe(
      "local://debug/log-tail",
    );
  });

  it("keeps legacy admin command aliases on their original API paths", () => {
    expect(resolveApiTarget("cmd_admin_mail_test_send_legacy_mails")).toBe(
      "/admin/mails/test",
    );
  });

  it("tracks the active-site remote dashboard on the canonical admin path", () => {
    expect(buildCommandContext("cmd_admin_dashboard_get")).toEqual({
      apiTarget: "/admin/dashboard",
      area: "Admin Dashboard",
      command: "cmd_admin_dashboard_get",
      localTarget: "overview.remote-dashboard",
      operation: "관리자 대시보드 조회",
    });
  });

  it("keeps target mappings in sync with every exported command context entry", () => {
    const contextCases = new Set(commandContextCommands);
    const targetCases = new Set(apiTargetCommands);

    expect([...contextCases].filter((command) => !targetCases.has(command))).toEqual([]);
    expect([...targetCases].filter((command) => !contextCases.has(command))).toEqual([]);
  });
});
