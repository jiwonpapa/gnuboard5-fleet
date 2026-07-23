import type { HealthResponse } from "../../types/HealthResponse";
import { invokeCommand } from "./core";

export async function getSystemHealth(): Promise<HealthResponse> {
  return invokeCommand<HealthResponse>("cmd_system_health");
}
