import { BrowserHttpTransport } from "../transport/browserHttpTransport";

export interface HealthResponse {
  status: "ok" | "ready";
  service: string;
  version: string;
  uptime_seconds: number;
}

export interface MetaResponse {
  api_version: string;
  product_name: string;
  server_version: string;
}

const systemTransport = new BrowserHttpTransport();
const apiTransport = new BrowserHttpTransport("/api/v1");

export function getHealth(signal?: AbortSignal) {
  return systemTransport.request<HealthResponse>({
    method: "GET",
    path: "/healthz",
    signal,
  });
}

export function getMeta(signal?: AbortSignal) {
  return apiTransport.request<MetaResponse>({
    method: "GET",
    path: "/meta",
    signal,
  });
}
