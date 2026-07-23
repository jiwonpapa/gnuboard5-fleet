import { describe, expect, it } from "vitest";
import {
  extractBuiltEntryScript,
  findFatalBuildWarnings,
} from "../../../scripts/build-web-guard-lib.mjs";

describe("build-web-guard-lib", () => {
  it("flags circular chunk warnings as fatal", () => {
    const output = `
vite v7 building...
Circular chunk: vendor -> react-core -> vendor. Please adjust the manual chunk logic for these chunks.
(!) Some chunks are larger than 500 kB after minification.
`;

    expect(findFatalBuildWarnings(output)).toEqual([
      "Circular chunk: vendor -> react-core -> vendor. Please adjust the manual chunk logic for these chunks.",
    ]);
  });

  it("extracts the built module entry script from index.html", () => {
    const html = `
<!doctype html>
<html lang="ko">
  <head></head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
  </body>
</html>
`;

    expect(extractBuiltEntryScript(html)).toBe("/assets/index-abc123.js");
  });

  it("fails when the built html does not expose a module entry script", () => {
    expect(() => extractBuiltEntryScript("<html><body></body></html>")).toThrow(
      "dist/index.html에서 module entry script를 찾지 못했습니다.",
    );
  });
});
