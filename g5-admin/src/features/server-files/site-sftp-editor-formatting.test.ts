import { describe, expect, it } from "vitest";
import {
  formatSiteSftpContent,
  supportsSiteSftpFormatting,
} from "./site-sftp-editor-formatting";

describe("site SFTP editor formatting", () => {
  it("formats JavaScript with the Prettier 3 standalone plugins", async () => {
    await expect(
      formatSiteSftpContent("app.js", "const config={enabled:true}"),
    ).resolves.toBe("const config = { enabled: true };\n");
  });

  it("formats TypeScript and rejects unsupported extensions", async () => {
    await expect(
      formatSiteSftpContent("app.ts", "const port:number=8080"),
    ).resolves.toBe("const port: number = 8080;\n");
    expect(supportsSiteSftpFormatting("archive.zip")).toBe(false);
    await expect(formatSiteSftpContent("archive.zip", "raw")).resolves.toBeNull();
  });
});
