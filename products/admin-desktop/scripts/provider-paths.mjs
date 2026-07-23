import { existsSync, statSync } from "node:fs";
import path from "node:path";

const providerRelativePath = path.join("connectors", "gnuboard5-php");
const openApiRelativePath = path.join("api", "docs", "openapi.yaml");
const manifestRelativePath = path.join(
  "api",
  "docs",
  "openapi.contract-manifest.json",
);

function explicitPath(name) {
  if (!Object.hasOwn(process.env, name)) {
    return null;
  }
  const value = process.env[name]?.trim() ?? "";
  if (value === "") {
    throw new Error(`${name} is explicitly set but empty`);
  }
  return path.resolve(value);
}

function requireFile(filePath, source) {
  let isFile = false;
  try {
    isFile = statSync(filePath).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    throw new Error(`${source} does not point to a file: ${filePath}`);
  }
  return filePath;
}

function fleetRootFor(rustRoot) {
  return path.resolve(rustRoot, "..", "..");
}

function isFleetLayout(rustRoot) {
  const fleetRoot = fleetRootFor(rustRoot);
  const fleetProvider = path.join(fleetRoot, providerRelativePath);
  return (
    path.basename(path.dirname(rustRoot)) === "products" ||
    existsSync(path.join(fleetRoot, "PRODUCT_MANIFEST.json")) ||
    existsSync(fleetProvider)
  );
}

export function resolvePhpRoot(rustRoot) {
  const explicit = explicitPath("G5_PHP_ROOT");
  if (explicit !== null) {
    requireFile(path.join(explicit, openApiRelativePath), "G5_PHP_ROOT");
    return explicit;
  }

  if (isFleetLayout(rustRoot)) {
    const fleetProvider = path.join(fleetRootFor(rustRoot), providerRelativePath);
    requireFile(
      path.join(fleetProvider, openApiRelativePath),
      "fleet PHP connector",
    );
    return fleetProvider;
  }

  const legacyProvider = path.resolve(rustRoot, "..", "php");
  requireFile(
    path.join(legacyProvider, openApiRelativePath),
    "legacy sibling PHP provider",
  );
  return legacyProvider;
}

export function resolveOpenApiPath(rustRoot) {
  const explicit = explicitPath("G5_OPENAPI_PATH");
  if (explicit !== null) {
    return requireFile(explicit, "G5_OPENAPI_PATH");
  }
  return requireFile(
    path.join(resolvePhpRoot(rustRoot), openApiRelativePath),
    "resolved PHP OpenAPI contract",
  );
}

export function resolveOpenApiManifestPath(rustRoot) {
  const explicit = explicitPath("G5_OPENAPI_MANIFEST_PATH");
  if (explicit !== null) {
    return requireFile(explicit, "G5_OPENAPI_MANIFEST_PATH");
  }
  return requireFile(
    path.join(resolvePhpRoot(rustRoot), manifestRelativePath),
    "resolved PHP OpenAPI manifest",
  );
}
