export interface FleetRequestScope {
  requestId: string;
  siteId: string;
}

export function buildSitePath(
  scope: FleetRequestScope,
  suffix: `/${string}`,
): `/sites/${string}/${string}` {
  const siteId = scope.siteId.trim();
  const requestId = scope.requestId.trim();
  if (!siteId || !requestId || siteId.includes("/")) {
    throw new Error("Explicit siteId and requestId are required.");
  }
  return `/sites/${encodeURIComponent(siteId)}${suffix}`;
}
