import { apiTargetsByCommand } from "./api-target-registry";

export function resolveApiTarget(command: string): string {
  return apiTargetsByCommand[command] ?? "unknown";
}
