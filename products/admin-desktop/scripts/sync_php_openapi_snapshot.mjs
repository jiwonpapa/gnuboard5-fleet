import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  resolveOpenApiManifestPath,
  resolveOpenApiPath,
} from "./provider-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const snapshotDir = path.join(rootDir, "specs", "contracts");
const snapshotYamlPath = path.join(snapshotDir, "php-openapi.snapshot.yaml");
const snapshotManifestPath = path.join(
  snapshotDir,
  "php-openapi.contract-manifest.json",
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

let liveYamlPath;
let liveManifestPath;
try {
  liveYamlPath = resolveOpenApiPath(rootDir);
  liveManifestPath = resolveOpenApiManifestPath(rootDir);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

mkdirSync(snapshotDir, { recursive: true });
copyFileSync(liveYamlPath, snapshotYamlPath);
copyFileSync(liveManifestPath, snapshotManifestPath);

execFileSync("bun", [path.join(rootDir, "scripts", "check_openapi_contract.mjs"), "--write"], {
  cwd: rootDir,
  stdio: "inherit",
});

console.log(`Synced PHP OpenAPI snapshot into ${snapshotDir}`);
