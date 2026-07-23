#!/usr/bin/env bun

import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_NAME = "그누5어드민";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FAST = process.argv.includes("--fast");
const PLATFORM = process.platform;
const EXECUTABLE_NAME =
  PLATFORM === "win32" ? "g5-admin-desktop.exe" : "g5-admin-desktop";
const FAST_RUNTIME_CONFIG = `${JSON.stringify(
  {
    debugOverlay: true,
    dbMasterStorage: "file",
    sessionStorage: "file",
  },
  null,
  2
)}\n`;
const LEGACY_FAST_RUNTIME_CONFIG = `${JSON.stringify(
  {
    debugOverlay: true,
    dbMasterStorage: "file",
    sessionStorage: "file",
  },
  null,
  2
)}\n`;
const TRANSITIONAL_FAST_RUNTIME_CONFIG = `${JSON.stringify(
  {
    debugOverlay: true,
    sessionStorage: "file",
  },
  null,
  2
)}\n`;

if (FAST) {
  ensureFastRuntimeConfigOverride();
} else {
  removeManagedFastRuntimeConfigOverride();
}

switch (PLATFORM) {
  case "darwin":
    runMacDeploy();
    break;
  case "linux":
    runLinuxDeploy();
    break;
  case "win32":
    runWindowsDeploy();
    break;
  default:
    fail(`지원하지 않는 플랫폼입니다: ${PLATFORM}`);
}

function runMacDeploy() {
  const scriptName = FAST
    ? "deploy-rust-admin-macos-fast.sh"
    : "deploy-rust-admin-macos.sh";
  run("bash", [join(ROOT, "scripts", scriptName)]);
  reportMacTrust(join("/Applications", `${APP_NAME}.app`));
}

function resolveRuntimeConfigPath() {
  switch (PLATFORM) {
    case "darwin":
      return join(
        homedir(),
        "Library",
        "Application Support",
        "g5-admin",
        "app-config.json"
      );
    case "linux":
      return join(
        process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
        "g5-admin",
        "app-config.json"
      );
    case "win32":
      return join(
        process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
        "g5-admin",
        "app-config.json"
      );
    default:
      fail(`지원하지 않는 플랫폼입니다: ${PLATFORM}`);
  }
}

function ensureFastRuntimeConfigOverride() {
  const configPath = resolveRuntimeConfigPath();
  ensureDir(dirname(configPath));
  const current = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  if (
    current !== null &&
    current !== FAST_RUNTIME_CONFIG &&
    current !== LEGACY_FAST_RUNTIME_CONFIG &&
    current !== TRANSITIONAL_FAST_RUNTIME_CONFIG
  ) {
    console.log(`사용자 정의 runtime config 유지: ${configPath}`);
    return;
  }

  writeFileSync(configPath, FAST_RUNTIME_CONFIG, "utf8");
  console.log(`빠른 배포용 runtime config 적용: ${configPath}`);
}

function removeManagedFastRuntimeConfigOverride() {
  const configPath = resolveRuntimeConfigPath();
  if (!existsSync(configPath)) {
    return;
  }

  const current = readFileSync(configPath, "utf8");
  if (
    current !== FAST_RUNTIME_CONFIG &&
    current !== LEGACY_FAST_RUNTIME_CONFIG &&
    current !== TRANSITIONAL_FAST_RUNTIME_CONFIG
  ) {
    return;
  }

  rmSync(configPath);
  console.log(`빠른 배포용 runtime config 제거: ${configPath}`);
}

function runLinuxDeploy() {
  const sourcePath = FAST
    ? resolveLinuxFastBinary()
    : resolveLinuxReleaseArtifact();
  const dataHome =
    process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  const installDir = join(dataHome, "g5-admin", FAST ? "fast" : "release");
  const installName = sourcePath.endsWith(".AppImage")
    ? `${APP_NAME}.AppImage`
    : EXECUTABLE_NAME;
  const installPath = join(installDir, installName);

  ensureDir(installDir);
  stopProcesses(["pkill", "-f", EXECUTABLE_NAME]);
  backupIfExists(installPath);
  copyFileSync(sourcePath, installPath);
  chmodSync(installPath, 0o755);

  if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
    launchDetached(installPath);
  }

  console.log(`${FAST ? "빠른" : "정식"} 배포 완료: ${installPath}`);
  reportLinuxTrust(installPath);
}

function runWindowsDeploy() {
  if (FAST) {
    const sourcePath = resolve(ROOT, "target", "desktop-fast", EXECUTABLE_NAME);
    if (!existsSync(sourcePath)) {
      fail(`빠른 배포용 바이너리가 없습니다: ${sourcePath}`);
    }
    installWindowsExecutable(sourcePath, true);
    return;
  }

  const installer = findFirstMatchingFile(
    resolve(ROOT, "target", "release", "bundle", "nsis"),
    (entry) => entry.toLowerCase().endsWith(".exe")
  );
  if (installer) {
    run("powershell", [
      "-NoProfile",
      "-Command",
      `Start-Process -FilePath '${escapePowerShell(installer)}' -Wait`,
    ]);
    console.log(`정식 배포 완료: ${installer}`);
    return;
  }

  const msi = findFirstMatchingFile(
    resolve(ROOT, "target", "release", "bundle", "msi"),
    (entry) => entry.toLowerCase().endsWith(".msi")
  );
  if (msi) {
    run("powershell", [
      "-NoProfile",
      "-Command",
      `Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i','${escapePowerShell(
        msi
      )}' -Wait`,
    ]);
    console.log(`정식 배포 완료: ${msi}`);
    return;
  }

  const sourcePath = resolve(ROOT, "target", "release", EXECUTABLE_NAME);
  if (!existsSync(sourcePath)) {
    fail(`배포 가능한 Windows 아티팩트를 찾지 못했습니다: ${sourcePath}`);
  }
  installWindowsExecutable(sourcePath, false);
}

function installWindowsExecutable(sourcePath, fast) {
  const localAppData =
    process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
  const installDir = join(localAppData, "Programs", APP_NAME);
  const installPath = join(installDir, EXECUTABLE_NAME);

  ensureDir(installDir);
  stopProcesses(["taskkill", "/IM", EXECUTABLE_NAME, "/F"]);
  backupIfExists(installPath);
  copyFileSync(sourcePath, installPath);
  launchDetached("cmd", ["/c", "start", "", installPath], {
    windowsHide: true,
  });

  console.log(`${fast ? "빠른" : "정식"} 배포 완료: ${installPath}`);
  reportWindowsTrust(installPath);
}

function resolveLinuxFastBinary() {
  const sourcePath = resolve(ROOT, "target", "desktop-fast", EXECUTABLE_NAME);
  if (!existsSync(sourcePath)) {
    fail(`빠른 배포용 바이너리가 없습니다: ${sourcePath}`);
  }
  return sourcePath;
}

function resolveLinuxReleaseArtifact() {
  const appImage = findFirstMatchingFile(
    resolve(ROOT, "target", "release", "bundle", "appimage"),
    (entry) => entry.endsWith(".AppImage")
  );
  if (appImage) {
    return appImage;
  }

  const sourcePath = resolve(ROOT, "target", "release", EXECUTABLE_NAME);
  if (!existsSync(sourcePath)) {
    fail(
      `정식 Linux 아티팩트를 찾지 못했습니다. 먼저 'bun run tauri build --bundles app' 또는 native Linux 빌드를 실행해 주세요: ${sourcePath}`
    );
  }
  return sourcePath;
}

function findFirstMatchingFile(directoryPath, predicate) {
  if (!existsSync(directoryPath)) {
    return null;
  }

  return (
    readdirSync(directoryPath)
      .sort((left, right) => left.localeCompare(right))
      .map((entry) => join(directoryPath, entry))
      .find((entryPath) => predicate(entryPath)) ?? null
  );
}

function ensureDir(directoryPath) {
  mkdirSync(directoryPath, { recursive: true });
}

function backupIfExists(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  renameSync(targetPath, `${targetPath}.stale-${timestamp()}`);
  pruneStaleSiblings(targetPath);
}

function pruneStaleSiblings(targetPath) {
  const directoryPath = dirname(targetPath);
  const prefix = `${basename(targetPath)}.stale-`;
  const keep = 2;
  const stalePaths = readdirSync(directoryPath)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => join(directoryPath, entry))
    .sort(
      (left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs
    );

  for (const stalePath of stalePaths.slice(keep)) {
    rmSync(stalePath, { force: true, recursive: true });
  }
}

function stopProcesses(command) {
  spawnSync(command[0], command.slice(1), {
    stdio: "ignore",
    windowsHide: true,
  });
}

function launchDetached(command, args = [], options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    ...options,
  });
  child.unref();
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function reportMacTrust(appPath) {
  if (!existsSync(appPath)) {
    return;
  }

  const codesign = spawnSync("codesign", ["-dv", "--verbose=4", appPath], {
    encoding: "utf8",
    windowsHide: true,
  });
  const spctl = spawnSync(
    "spctl",
    ["--assess", "--type", "execute", "--verbose=4", appPath],
    {
      encoding: "utf8",
      windowsHide: true,
    }
  );

  console.log("배포 신뢰 보고(macOS):");
  console.log(`- 경로: ${appPath}`);
  console.log(`- codesign: ${codesign.status === 0 ? "ok" : "warning"}`);
  const codesignSummary = (codesign.stderr || codesign.stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        line.startsWith("Identifier=") ||
        line.startsWith("TeamIdentifier=") ||
        line.startsWith("Authority=") ||
        line.startsWith("Format=")
    );
  for (const line of codesignSummary) {
    console.log(`  ${line}`);
  }
  console.log(`- spctl: ${spctl.status === 0 ? "accepted" : "not accepted"}`);
  const assessSummary = (spctl.stdout || spctl.stderr)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3);
  for (const line of assessSummary) {
    console.log(`  ${line}`);
  }
}

function reportWindowsTrust(installPath) {
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `if (Test-Path '${escapePowerShell(
        installPath
      )}') { Get-AuthenticodeSignature '${escapePowerShell(
        installPath
      )}' | Format-List -Property Status,StatusMessage,SignerCertificate }`,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
    }
  );

  if (result.error) {
    return;
  }

  console.log("배포 신뢰 보고(Windows):");
  console.log(`- 경로: ${installPath}`);
  const lines = (result.stdout || result.stderr)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
}

function reportLinuxTrust(installPath) {
  console.log("배포 신뢰 보고(Linux):");
  console.log(`- 경로: ${installPath}`);
  console.log(
    "  로컬 fast deploy는 OS 코드서명 보고를 강제하지 않습니다. 배포 패키지 서명 여부는 배포 채널에서 별도 확인하십시오."
  );
}

function escapePowerShell(rawValue) {
  return rawValue.replace(/'/g, "''");
}

function timestamp() {
  const current = new Date();
  const parts = [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, "0"),
    String(current.getDate()).padStart(2, "0"),
  ];
  const clock = [
    String(current.getHours()).padStart(2, "0"),
    String(current.getMinutes()).padStart(2, "0"),
    String(current.getSeconds()).padStart(2, "0"),
  ];

  return `${parts.join("")}-${clock.join("")}`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
