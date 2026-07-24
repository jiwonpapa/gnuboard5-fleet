import { BrowserHttpTransport } from "../transport/browserHttpTransport";
import type { CoreOperation } from "../generated/coreOperations";

export interface LoginResponse {
  csrf_token: string;
  expires_at_unix: number;
}

export interface Site {
  site_id: string;
  owner_user_id: string;
  display_name: string;
  base_url: string;
  status: string;
}

export interface ConnectorHealth {
  status: string;
  version: string;
  timestamp: number;
}

export interface BasicConfig {
  cf_title: string | null;
  cf_admin: string | null;
  cf_10: string | null;
}

export interface SiteOverview {
  connector_status: string;
  connector_version: string;
  site_title: string | null;
  administrator_id: string | null;
}

export interface CoreExecuteInput {
  path: Record<string, string>;
  query: Record<string, unknown>;
  body: Record<string, unknown> | null;
  confirm_destructive: boolean;
}

export interface CoreExecuteResponse {
  operation_id: string;
  upstream_status: number;
  content_type: string | null;
  data: unknown | null;
  body_base64: string | null;
}

export interface SshProfileInput {
  username: string;
  host: string;
  port: number;
  private_key: string;
  known_hosts: string;
}

export interface SshProfileSummary {
  username: string;
  host: string;
  port: number;
  host_key_verification: "strict_known_hosts";
}

export interface TerminalTicket {
  ticket: string;
  expires_at_unix: number;
}

export type SftpOperation =
  | { action: "list"; path: string }
  | { action: "mkdir"; path: string }
  | { action: "rename"; from: string; to: string }
  | { action: "delete_file"; path: string }
  | { action: "delete_directory"; path: string };

export interface TransferJob {
  job_id: string;
  owner_user_id: string;
  site_id: string | null;
  kind: string;
  state: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  input: unknown;
  result: unknown | null;
  created_at: string;
  updated_at: string;
}

const transport = new BrowserHttpTransport("/api/v1");

export function bootstrapAdmin(loginName: string, password: string) {
  return transport.request<{ principal_id: string }, {
    login_name: string;
    password: string;
  }>({
    method: "POST",
    path: "/bootstrap",
    body: { login_name: loginName, password },
  });
}

export function loginFleet(loginName: string, password: string) {
  return transport.request<LoginResponse, {
    login_name: string;
    password: string;
  }>({
    method: "POST",
    path: "/auth/login",
    body: { login_name: loginName, password },
  });
}

export function stepUp(password: string, csrfToken: string) {
  return transport.request<null, { password: string }>({
    method: "POST",
    path: "/auth/step-up",
    csrfToken,
    body: { password },
  });
}

export function listSites() {
  return transport.request<Site[]>({ method: "GET", path: "/sites" });
}

export function createSite(
  input: { site_id: string; display_name: string; base_url: string },
  csrfToken: string,
) {
  return transport.request<null, typeof input>({
    method: "POST",
    path: "/sites",
    csrfToken,
    body: input,
  });
}

export function connectorHealth(siteId: string) {
  return transport.request<ConnectorHealth>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/connector/health`,
  });
}

export function connectorLogin(
  siteId: string,
  input: { mb_id: string; mb_password: string },
  csrfToken: string,
) {
  return transport.request<{ connected: boolean; expires_in: number },
    typeof input>({
      method: "POST",
      path: `/sites/${encodeURIComponent(siteId)}/connector/login`,
      csrfToken,
      body: input,
    });
}

export function connectorRefresh(siteId: string, csrfToken: string) {
  return transport.request<{ connected: boolean; expires_in: number }>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/connector/refresh`,
    csrfToken,
  });
}

export function connectorLogout(siteId: string, csrfToken: string) {
  return transport.request<null>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/connector/logout`,
    csrfToken,
  });
}

export function getSiteOverview(siteId: string) {
  return transport.request<SiteOverview>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/overview`,
  });
}

export function getBasicConfig(siteId: string) {
  return transport.request<BasicConfig>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/config/basic`,
  });
}

export function updateBasicConfig(
  siteId: string,
  cf10: string,
  csrfToken: string,
) {
  return transport.request<BasicConfig, { cf_10: string }>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/config/basic`,
    csrfToken,
    body: { cf_10: cf10 },
  });
}

export function getCoreRegistry() {
  return transport.request<CoreOperation[]>({
    method: "GET",
    path: "/core/registry",
  });
}

export function executeCoreOperation(
  siteId: string,
  operationId: string,
  input: CoreExecuteInput,
  csrfToken: string,
) {
  return transport.request<CoreExecuteResponse, CoreExecuteInput>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/core/${
      encodeURIComponent(operationId)
    }`,
    csrfToken,
    body: input,
  });
}

export function getSshProfile(siteId: string) {
  return transport.request<SshProfileSummary>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/ssh/profile`,
  });
}

export function putSshProfile(
  siteId: string,
  profile: SshProfileInput,
  csrfToken: string,
) {
  return transport.request<SshProfileSummary, SshProfileInput>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/ssh/profile`,
    csrfToken,
    body: profile,
  });
}

export function issueTerminalTicket(siteId: string, csrfToken: string) {
  return transport.request<TerminalTicket>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/terminal/ticket`,
    csrfToken,
  });
}

export function openTerminalSocket(siteId: string, ticket: string) {
  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(
    `/api/v1/sites/${encodeURIComponent(siteId)}/terminal`,
    globalThis.location.origin,
  );
  url.protocol = protocol;
  return new WebSocket(url, ["g5-fleet-terminal", `ticket.${ticket}`]);
}

export function runSftpOperation(
  siteId: string,
  operation: SftpOperation,
  csrfToken: string,
) {
  return transport.request<{ output: string }, SftpOperation>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/sftp`,
    csrfToken,
    body: operation,
  });
}

export async function uploadSftpFile(
  siteId: string,
  remotePath: string,
  file: File,
  csrfToken: string,
) {
  const response = await globalThis.fetch(
    sameOriginApi(`/sites/${encodeURIComponent(siteId)}/transfers/upload`),
    {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
        "x-g5-remote-path": remotePath,
        "content-type": "application/octet-stream",
      },
      body: file,
      credentials: "same-origin",
      redirect: "error",
    },
  );
  if (!response.ok) throw new Error(`업로드 실패 (${response.status})`);
  return await response.json() as TransferJob;
}

export async function downloadSftpFile(
  siteId: string,
  remotePath: string,
  csrfToken: string,
) {
  const response = await globalThis.fetch(
    sameOriginApi(`/sites/${encodeURIComponent(siteId)}/transfers/download`),
    {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({ path: remotePath }),
      credentials: "same-origin",
      redirect: "error",
    },
  );
  if (!response.ok) throw new Error(`다운로드 실패 (${response.status})`);
  return {
    blob: await response.blob(),
    jobId: response.headers.get("x-g5-fleet-job-id"),
  };
}

export function getTransfer(siteId: string, jobId: string) {
  return transport.request<TransferJob>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/transfers/${
      encodeURIComponent(jobId)
    }`,
  });
}

export function cancelTransfer(
  siteId: string,
  jobId: string,
  csrfToken: string,
) {
  return transferAction(siteId, jobId, "cancel", csrfToken);
}

export function retryTransfer(
  siteId: string,
  jobId: string,
  csrfToken: string,
) {
  return transferAction(siteId, jobId, "retry", csrfToken);
}

function transferAction(
  siteId: string,
  jobId: string,
  action: "cancel" | "retry",
  csrfToken: string,
) {
  return transport.request<null>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/transfers/${
      encodeURIComponent(jobId)
    }/${action}`,
    csrfToken,
  });
}

function sameOriginApi(path: `/${string}`) {
  const url = new URL(`/api/v1${path}`, globalThis.location.origin);
  if (url.origin !== globalThis.location.origin) {
    throw new Error("same-origin Fleet API만 허용됩니다.");
  }
  return url;
}
