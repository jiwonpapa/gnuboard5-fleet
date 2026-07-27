import { describe, expect, it } from "vitest";

import {
  formatEditableContent,
  resolveSiteSftpEditorLanguage,
} from "./siteSftpEditorLanguage";

describe("server SFTP editor reuse", () => {
  it("preserves the desktop language mapping without native dependencies", () => {
    expect(resolveSiteSftpEditorLanguage("/var/www/html/index.php")).toBe("php");
    expect(resolveSiteSftpEditorLanguage("/app/src/main.tsx")).toBe("typescript");
    expect(resolveSiteSftpEditorLanguage("/deploy/release.sh")).toBe("shell");
    expect(resolveSiteSftpEditorLanguage("/tmp/archive.unknown")).toBe("plaintext");
  });

  it("formats JSON locally and leaves unsupported content unchanged", () => {
    expect(formatEditableContent("/app/config.json", "{\"enabled\":true}")).toBe(
      "{\n  \"enabled\": true\n}\n",
    );
    expect(formatEditableContent("/app/index.php", "<?php")).toBeNull();
  });
});
