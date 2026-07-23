import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findFatalBuildWarnings } from "./build-web-guard-lib.mjs";
import { runDistSmokeCheck } from "./run_dist_smoke_check.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const G5_ADMIN_DIR = resolve(ROOT, "g5-admin");

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(
      `[build-guard] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}

async function main() {
  const buildOutput = await runViteBuild();
  const fatalWarnings = findFatalBuildWarnings(buildOutput);

  if (fatalWarnings.length > 0) {
    throw new Error(
      [
        "프로덕션 번들에서 치명적 경고가 감지됐습니다.",
        ...fatalWarnings.map((line) => `- ${line}`),
      ].join("\n"),
    );
  }

  await runDistSmokeCheck({ g5AdminDir: G5_ADMIN_DIR });
  console.log("[build-guard] vite build + dist smoke passed");
}

function runViteBuild() {
  return new Promise((resolvePromise, rejectPromise) => {
    const buildProcess = spawn("bun", ["x", "vite", "build"], {
      cwd: G5_ADMIN_DIR,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    buildProcess.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    buildProcess.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    buildProcess.on("error", rejectPromise);
    buildProcess.on("close", (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`vite build failed with exit code ${code ?? "unknown"}`));
        return;
      }

      resolvePromise(output);
    });
  });
}
