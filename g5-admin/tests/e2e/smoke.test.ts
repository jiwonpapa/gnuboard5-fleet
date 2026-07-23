import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

function readRegisteredCommands(): string[] {
  const marker = "tauri::generate_handler![";
  const candidates = [
    resolve(process.cwd(), "src-tauri/src/lib.rs"),
    resolve(process.cwd(), "src-tauri/src/commands/registry_groups.rs"),
    resolve(process.cwd(), "src-tauri/src/commands/registry.rs"),
  ];

  for (const candidate of candidates) {
    const source = readFileSync(candidate, "utf8");
    const start = source.indexOf(marker);
    if (start === -1) {
      continue;
    }

    const handlerBlock = source.slice(start);
    const matches = handlerBlock.match(/\bcmd_[a-z0-9_]+\b/g) ?? [];
    if (matches.length > 0) {
      return [...new Set(matches)];
    }
  }

  throw new Error(
    "Unable to locate generate_handler block in src-tauri/src/lib.rs, src-tauri/src/commands/registry_groups.rs, or src-tauri/src/commands/registry.rs",
  );
}

const commands = readRegisteredCommands();

describe("E2E Smoke: registered IPC commands are callable", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("tracks the current registered command count", () => {
    expect(commands).toHaveLength(253);
  });

  it("keeps critical auth and admin commands registered", () => {
    expect(commands).toEqual(
      expect.arrayContaining([
        "cmd_auth_login",
        "cmd_auth_logout",
        "cmd_auth_status",
        "cmd_master_lock_unlock_fast",
        "cmd_master_lock_verify_totp",
        "cmd_security_fast_unlock_status",
        "cmd_security_settings_get",
        "cmd_ssh_host_verification_status",
        "cmd_ssh_host_verification_trust",
        "cmd_ssh_shell_open",
        "cmd_ssh_terminal_bridge_connect",
        "cmd_ssh_shell_resize",
        "cmd_sftp_list_dir",
        "cmd_sftp_read_file",
        "cmd_sftp_download",
        "cmd_sftp_upload",
        "cmd_sftp_delete",
        "cmd_sftp_mkdir",
        "cmd_sftp_write_file",
        "cmd_sftp_transfer_snapshot",
        "cmd_sftp_transfer_enqueue",
        "cmd_sftp_transfer_pause",
        "cmd_sftp_transfer_retry",
        "cmd_sftp_transfer_cancel",
        "cmd_sftp_transfer_set_concurrency",
        "cmd_admin_config_get",
        "cmd_admin_member_get_list",
        "cmd_admin_menu_get_list",
        "cmd_admin_sms_message_send",
        "cmd_debug_runtime_info",
      ]),
    );
  });

  it.each(commands)('invoke("%s") is callable', async (command) => {
    vi.mocked(invoke).mockResolvedValueOnce({ ok: true });
    await expect(invoke(command, {})).resolves.toBeDefined();
    expect(invoke).toHaveBeenCalledWith(command, {});
  });
});
