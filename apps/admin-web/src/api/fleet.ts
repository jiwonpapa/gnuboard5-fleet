import { BrowserHttpTransport } from "../transport/browserHttpTransport";

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
