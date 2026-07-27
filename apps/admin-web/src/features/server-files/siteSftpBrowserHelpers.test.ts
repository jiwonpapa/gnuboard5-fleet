import { describe, expect, it } from "vitest";

import type { SftpEntry } from "../../api/fleet";
import {
  buildPathAncestors,
  buildSuggestedSftpCopyPath,
  buildSftpChildPath,
  formatSftpBytes,
  getSftpParentPath,
  isEditableSftpEntry,
  sortSftpEntries,
} from "./siteSftpBrowserHelpers";

const entry = (name: string, kind: SftpEntry["kind"]): SftpEntry => ({
  name,
  path: `/var/www/${name}`,
  kind,
  size: 128,
  permissions: "-rw-r--r--",
  owner: "deploy",
  group: "www-data",
  modified: "Jul 27 12:00",
});

describe("site SFTP browser helpers", () => {
  it("reuses legacy path, copy and editability rules for the web server", () => {
    expect(buildSftpChildPath("/", "index.php")).toBe("/index.php");
    expect(getSftpParentPath("/var/www/index.php")).toBe("/var/www");
    expect(buildSuggestedSftpCopyPath("/var/www/index.php"))
      .toBe("/var/www/index-copy.php");
    expect(buildPathAncestors("/var/www")).toEqual([
      { label: "/", path: "/" },
      { label: "var", path: "/var" },
      { label: "www", path: "/var/www" },
    ]);
    expect(isEditableSftpEntry(entry("index.php", "file"))).toBe(true);
    expect(formatSftpBytes(1536)).toBe("1.5 KiB");
  });

  it("sorts directories before files without mutating the response", () => {
    const entries = [entry("z.php", "file"), entry("assets", "directory")];
    expect(sortSftpEntries(entries).map((item) => item.name))
      .toEqual(["assets", "z.php"]);
    expect(entries[0].name).toBe("z.php");
  });
});
