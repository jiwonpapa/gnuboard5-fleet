import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveOpenApiManifestPath,
  resolveOpenApiPath,
} from "./provider-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const g5AdminDir = path.join(rootDir, "g5-admin");
const snapshotDir = path.join(rootDir, "specs", "contracts");
const snapshotYamlPath = path.join(snapshotDir, "php-openapi.snapshot.yaml");
const snapshotManifestPath = path.join(
  snapshotDir,
  "php-openapi.contract-manifest.json",
);
const generatedDir = path.join(g5AdminDir, "contracts", "generated");
const generatedZodPath = path.join(generatedDir, "openapi-zod-client.ts");
const activeConsumerScopePath = path.join(
  rootDir,
  "specs",
  "integration",
  "ACTIVE_CONSUMER_SCOPE.json",
);
const apiTargetRegistryPath = path.join(
  g5AdminDir,
  "src",
  "api",
  "client",
  "core",
  "api-target-registry.ts",
);
const apiTargetRegistryGroupsDir = path.join(
  g5AdminDir,
  "src",
  "api",
  "client",
  "core",
  "api-target-registry-groups",
);
const legacyCoreTsPath = path.join(g5AdminDir, "src", "api", "client", "core.ts");
const mode = process.argv.includes("--write") ? "write" : "check";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isRelevantPath(value, consumerScope) {
  return (
    consumerScope.relevantExactPaths.has(value) ||
    consumerScope.relevantPathPrefixes.some((prefix) => value.startsWith(prefix))
  );
}

function normalizeContractPath(value) {
  return value.replace(/\{[^}]+\}/g, "{param}");
}

function collectTypeScriptFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

function loadActiveConsumerScope() {
  if (!existsSync(activeConsumerScopePath)) {
    fail(`Missing active consumer scope: ${activeConsumerScopePath}`);
  }

  const payload = JSON.parse(readFileSync(activeConsumerScopePath, "utf8"));
  const contract = payload.audit_contract;
  if (!contract || typeof contract !== "object") {
    fail(`Invalid audit_contract in ${activeConsumerScopePath}`);
  }
  if (
    contract.path_equivalents &&
    Object.keys(contract.path_equivalents).length > 0
  ) {
    fail("Distinct OpenAPI paths cannot be collapsed through path_equivalents");
  }
  const relevantPathPrefixes = Array.isArray(contract.included_path_prefixes)
    ? contract.included_path_prefixes.filter(
        (value) => typeof value === "string" && value.trim(),
      )
    : [];
  const relevantExactPaths = new Set(
    (Array.isArray(contract.included_operations)
      ? contract.included_operations
      : []
    )
      .map((operation) => operation?.path)
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => normalizeContractPath(value.trim())),
  );
  if (relevantPathPrefixes.length === 0 || relevantExactPaths.size === 0) {
    fail("Active consumer scope returned an empty path inventory");
  }
  const allowances = Array.isArray(payload.provider_only_allowances)
    ? payload.provider_only_allowances
    : [];
  const allowedExactPaths = new Set();
  const allowedPathPrefixes = [];

  for (const allowance of allowances) {
    if (!allowance || typeof allowance !== "object") {
      continue;
    }
    const pathExact = Array.isArray(allowance.path_exact)
      ? allowance.path_exact
      : [];
    const pathPrefixes = Array.isArray(allowance.path_prefixes)
      ? allowance.path_prefixes
      : [];
    for (const value of pathExact) {
      if (typeof value === "string" && value.trim()) {
        allowedExactPaths.add(normalizeContractPath(value.trim()));
      }
    }
    for (const value of pathPrefixes) {
      if (typeof value === "string" && value.trim()) {
        allowedPathPrefixes.push(value.trim());
      }
    }
  }

  return {
    relevantExactPaths,
    relevantPathPrefixes,
    allowedExactPaths,
    allowedPathPrefixes,
  };
}

function compareFileContents(leftPath, rightPath, label) {
  const left = readFileSync(leftPath, "utf8");
  const right = readFileSync(rightPath, "utf8");
  if (left !== right) {
    fail(
      `${label} is out of sync.\n` +
        `left: ${leftPath}\nright: ${rightPath}\n` +
        "Run `bun ./scripts/sync_php_openapi_snapshot.mjs` from the Rust repo root.",
    );
  }
}

function loadManifest() {
  if (!existsSync(snapshotManifestPath)) {
    fail(
      `Missing contract manifest snapshot: ${snapshotManifestPath}\n` +
        "Run `bun ./scripts/sync_php_openapi_snapshot.mjs` first.",
    );
  }

  const parsed = JSON.parse(readFileSync(snapshotManifestPath, "utf8"));
  if (!Array.isArray(parsed.operations)) {
    fail(`Invalid contract manifest: ${snapshotManifestPath}`);
  }
  return parsed;
}

function extractApiTargets(consumerScope) {
  if (existsSync(apiTargetRegistryPath)) {
    const sources = [
      readFileSync(apiTargetRegistryPath, "utf8"),
      ...collectTypeScriptFiles(apiTargetRegistryGroupsDir).map((filePath) =>
        readFileSync(filePath, "utf8"),
      ),
    ];
    return new Set(
      sources
        .flatMap((source) => [...source.matchAll(/:\s*"([^"]+)"/g)])
        .map((match) => match[1])
        .map((value) => normalizeContractPath(value))
        .filter((value) => isRelevantPath(value, consumerScope)),
    );
  }

  const source = readFileSync(legacyCoreTsPath, "utf8");
  return new Set(
    [...source.matchAll(/return "([^"]+)";/g)]
      .map((match) => match[1])
      .map((value) => normalizeContractPath(value))
      .filter((value) => isRelevantPath(value, consumerScope)),
  );
}

function verifyTargetCoverage() {
  const manifest = loadManifest();
  const consumerScope = loadActiveConsumerScope();
  const contractPaths = new Set(
    manifest.operations
      .map((operation) => operation?.path)
      .filter(
        (value) =>
          typeof value === "string" && isRelevantPath(value, consumerScope),
      )
      .map((value) => normalizeContractPath(value)),
  );
  const apiTargets = extractApiTargets(consumerScope);

  const missingTargets = [...contractPaths].filter(
    (value) =>
      !apiTargets.has(value) &&
      !consumerScope.allowedExactPaths.has(value) &&
      !consumerScope.allowedPathPrefixes.some((prefix) => value.startsWith(prefix)),
  );
  if (missingTargets.length > 0) {
    fail(
      "Missing Rust apiTarget mappings for contract paths:\n" +
        missingTargets.map((value) => `- ${value}`).join("\n"),
    );
  }

  const unknownTargets = [...apiTargets].filter((value) => !contractPaths.has(value));
  if (unknownTargets.length > 0) {
    fail(
      "Unknown Rust apiTarget mappings not present in contract snapshot:\n" +
        unknownTargets.map((value) => `- ${value}`).join("\n"),
    );
  }
}

function verifyLivePhpSync() {
  let liveYamlPath;
  let liveManifestPath;
  try {
    liveYamlPath = resolveOpenApiPath(rootDir);
    liveManifestPath = resolveOpenApiManifestPath(rootDir);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (existsSync(snapshotYamlPath)) {
    compareFileContents(snapshotYamlPath, liveYamlPath, "OpenAPI YAML snapshot");
  }
  if (existsSync(snapshotManifestPath)) {
    compareFileContents(
      snapshotManifestPath,
      liveManifestPath,
      "OpenAPI manifest snapshot",
    );
  }
}

function generateZodArtifact(outputPath) {
  execFileSync(
    "bun",
    [
      "x",
      "openapi-zod-client",
      snapshotYamlPath,
      "-o",
      outputPath,
      "--export-schemas",
      "--export-types",
      "--with-deprecated",
      "--with-docs",
      "--strict-objects",
      "--group-strategy",
      "none",
    ],
    {
      cwd: g5AdminDir,
      stdio: "inherit",
    },
  );
}

function verifyGeneratedArtifact() {
  if (!existsSync(snapshotYamlPath)) {
    fail(
      `Missing OpenAPI snapshot: ${snapshotYamlPath}\n` +
        "Run `bun ./scripts/sync_php_openapi_snapshot.mjs` first.",
    );
  }

  mkdirSync(generatedDir, { recursive: true });
  const tempDir = mkdtempSync(path.join(tmpdir(), "g5-openapi-zod-"));
  const tempOutputPath = path.join(tempDir, "openapi-zod-client.ts");

  try {
    generateZodArtifact(tempOutputPath);

    if (mode === "write") {
      writeFileSync(generatedZodPath, readFileSync(tempOutputPath));
      return;
    }

    if (!existsSync(generatedZodPath)) {
      fail(
        `Missing generated Zod contract artifact: ${generatedZodPath}\n` +
          "Run `bun ./scripts/sync_php_openapi_snapshot.mjs` first.",
      );
    }

    compareFileContents(generatedZodPath, tempOutputPath, "Generated Zod contract artifact");
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

verifyLivePhpSync();
verifyTargetCoverage();
verifyGeneratedArtifact();

console.log(`OpenAPI contract check passed (${mode})`);
