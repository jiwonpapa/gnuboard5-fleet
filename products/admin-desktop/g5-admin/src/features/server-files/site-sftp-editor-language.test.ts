import { describe, expect, it } from "vitest";
import { resolveSiteSftpEditorLanguage } from "./site-sftp-editor-language";

describe("resolveSiteSftpEditorLanguage", () => {
  it("maps php family files to php highlighting", () => {
    expect(resolveSiteSftpEditorLanguage("/var/www/html/index.php")).toBe("php");
    expect(resolveSiteSftpEditorLanguage("/var/www/html/view.phtml")).toBe("php");
  });

  it("maps frontend sources to javascript and typescript", () => {
    expect(resolveSiteSftpEditorLanguage("/app/src/main.tsx")).toBe("typescript");
    expect(resolveSiteSftpEditorLanguage("/app/src/main.jsx")).toBe("javascript");
  });

  it("maps yaml and shell-oriented files", () => {
    expect(resolveSiteSftpEditorLanguage("/deploy/docker-compose.yml")).toBe("yaml");
    expect(resolveSiteSftpEditorLanguage("/deploy/release.sh")).toBe("shell");
  });

  it("falls back to plaintext for unknown extensions", () => {
    expect(resolveSiteSftpEditorLanguage("/tmp/archive.unknown")).toBe("plaintext");
  });
});
