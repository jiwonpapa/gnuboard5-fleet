export type FleetAccessView = "application" | "checking" | "install" | "login";

export function resolveAccessView(input: {
  installState: "complete" | "setup_required" | null;
  sessionReady: boolean;
}): FleetAccessView {
  if (input.installState === null) return "checking";
  if (input.installState === "setup_required") return "install";
  return input.sessionReady ? "application" : "login";
}
