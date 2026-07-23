import type { MasterLockStatus } from "../../types/MasterLockStatus";
import type { SiteCatalog } from "../../types/SiteCatalog";
import {
  buildMasterSetupRoute,
  buildMasterUnlockRoute,
} from "../layout/navigation";
import { resolveEntryPath } from "../sites/site-flow";

export function resolveMasterGatePath(
  status: MasterLockStatus | null | undefined,
  nextPath?: string | null,
) {
  if (!status || !status.is_configured) {
    return buildMasterSetupRoute(nextPath);
  }

  if (!status.is_unlocked) {
    return buildMasterUnlockRoute(nextPath);
  }

  return null;
}

export function resolveAppEntryPath(
  status: MasterLockStatus | null | undefined,
  catalog: SiteCatalog | null | undefined,
  targetPath: string,
) {
  const gatePath = resolveMasterGatePath(status);
  if (gatePath) {
    return gatePath;
  }

  return resolveEntryPath(catalog, targetPath);
}

export function resolvePostMasterAuthPath(nextPath: string | null | undefined) {
  const normalizedNextPath = nextPath?.trim();
  if (!normalizedNextPath || normalizedNextPath.startsWith("/master/")) {
    return "/";
  }

  return normalizedNextPath;
}
