import { BrowserHttpTransport } from "../transport/browserHttpTransport";
import type { CoreOperation } from "../generated/coreOperations";

export interface LoginResponse {
  csrf_token: string;
  expires_at_unix: number;
}

export interface InstallStatus {
  state: "complete" | "setup_required";
}

export interface InstallChallenge {
    setup_token: string;
    manual_entry_key: string;
    otpauth_uri: string;
    expires_at_unix: number;
}

export interface TotpChallenge {
  manual_entry_key: string;
  otpauth_uri: string;
}

export interface InstallCompletion {
  principal_id: string;
  recovery_codes: string[];
}

export interface FleetSession {
  principal_id: string;
  web_session_id: string;
  expires_at_unix: number;
  step_up_active: boolean;
  csrf_token: string;
}

export interface SecuritySettings {
  totp_enabled: boolean;
  session_idle_timeout_minutes: number;
}

export interface AuditEntry {
  audit_id: number;
  request_id: string | null;
  principal_id: string | null;
  site_id: string | null;
  action: string;
  outcome: "success" | "denied" | "failed";
  details: unknown;
  created_at: string;
}

export interface Site {
  site_id: string;
  owner_user_id: string;
  display_name: string;
  base_url: string;
  status: string;
}

export interface Dashboard {
  site_count: number;
  attention_count: number;
  active_job_count: number;
  recent_activity: AuditEntry[];
}

export interface RuntimeDiagnostics {
  service: string;
  server_version: string;
  build_revision: string;
  image_version: string;
  database_engine: "sqlite";
  database_status: "ok" | "failed";
  uptime_seconds: number;
  dev_bootstrap_available: false;
  native_devtools_available: false;
  log_tail_available: false;
}

export interface PortableBackupEnvelope {
  format: string;
  version: number;
  cipher: string;
  kdf: string;
  kdf_memory_kib: number;
  kdf_iterations: number;
  kdf_lanes: number;
  created_at_unix: number;
  site_count: number;
  salt_b64: string;
  nonce_b64: string;
  ciphertext_b64: string;
}

export interface PortableBackupImportSummary {
  imported_site_count: number;
  reused_site_count: number;
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

export type AdminConfig = Record<string, string>;
export type AdminConfigUpdate = Record<string, string | number | boolean>;

export interface AdminDashboardData {
  limit: number | null;
  summary: {
    members?: {
      total_members?: number;
      blocked_members?: number;
      leave_members?: number;
    };
    posts?: { total_rows?: number };
    points?: { total_rows?: number };
    visits?: { total_visits?: number };
  } | null;
  recent_members: Array<{
    mb_id?: string;
    mb_name?: string;
    mb_nick?: string;
    mb_datetime?: string;
  }>;
  recent_posts: Array<{
    bo_subject?: string;
    wr_subject?: string;
    wr_name?: string;
    wr_datetime?: string;
  }>;
  recent_points: Array<{
    mb_id?: string;
    po_content?: string;
    po_point?: number;
    po_datetime?: string;
  }>;
}

export interface AdminFieldOption {
  value: string;
  label: string;
}

export interface AdminFieldSchema {
  name: string;
  label: string;
  input_type:
    | "text"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "password"
    | "file"
    | "number"
    | "date"
    | "datetime-local"
    | "hidden";
  data_type: "string" | "integer" | "boolean" | "file";
  required: boolean;
  create_only: boolean;
  readonly_on_update: boolean;
  description: string | null;
  default_value: string | number | boolean | null;
  options: AdminFieldOption[];
  option_source: {
    kind: "endpoint" | "directory";
    name: string;
    endpoint: string | null;
    value_field: string | null;
    label_field: string | null;
  } | null;
}

export interface AdminSchemaSection {
  key: string;
  label: string;
  order: number;
  description: string | null;
  fields: AdminFieldSchema[];
}

export interface AdminSchemaDetail {
  domain: string;
  title: string;
  legacy_form: string;
  generated_at: string;
  field_count: number;
  section_count: number;
  layout: {
    desktop: "tabs" | "stack";
    mobile: "accordion" | "stack";
    single_open: boolean;
  } | null;
  sections: AdminSchemaSection[];
  fields_by_name: Record<string, AdminFieldSchema>;
}

export interface AdminSchemaCatalog {
  items: Array<{
    domain: string;
    title: string;
    legacy_form: string;
    field_count: number;
    section_count: number;
    generated_at: string;
  }>;
  total: number;
}

export interface Pagination {
  mode: string | null;
  total: number | null;
  page: number | null;
  per_page: number | null;
  last_page: number | null;
  cursor: string | null;
  next_cursor: string | null;
  has_next: boolean | null;
  has_prev: boolean | null;
}

export interface MemberProfile {
  mb_id: string;
  mb_name: string | null;
  mb_nick: string | null;
  mb_email: string | null;
  mb_level: number | null;
  mb_point: number | null;
}

export interface AdminMember {
  mb_id: string;
  mb_no?: number | null;
  mb_name?: string | null;
  mb_nick?: string | null;
  mb_email?: string | null;
  mb_homepage?: string | null;
  mb_level?: number | null;
  mb_tel?: string | null;
  mb_hp?: string | null;
  mb_certify?: string | null;
  mb_adult?: number | null;
  mb_zip?: string | null;
  mb_addr1?: string | null;
  mb_addr2?: string | null;
  mb_addr3?: string | null;
  mb_addr_jibeon?: string | null;
  mb_signature?: string | null;
  mb_point?: number | null;
  mb_today_login?: string | null;
  mb_datetime?: string | null;
  mb_leave_date?: string | null;
  mb_intercept_date?: string | null;
  mb_memo?: string | null;
  mb_mailling?: number | null;
  mb_sms?: number | null;
  mb_open?: number | null;
  mb_profile?: string | null;
  mb_marketing_agree?: number | null;
  mb_thirdparty_agree?: number | null;
  mb_1?: string | null;
  mb_2?: string | null;
  mb_3?: string | null;
  mb_4?: string | null;
  mb_5?: string | null;
  mb_6?: string | null;
  mb_7?: string | null;
  mb_8?: string | null;
  mb_9?: string | null;
  mb_10?: string | null;
}

export interface AdminMemberList {
  items: AdminMember[];
  pagination: Pagination;
}

export type AdminMemberUpdate = Partial<{
  mb_name: string;
  mb_nick: string;
  mb_email: string;
  mb_level: number;
  mb_hp: string;
  mb_tel: string;
  mb_mailling: number;
  mb_sms: number;
  mb_marketing_agree: number;
  mb_thirdparty_agree: number;
  mb_homepage: string;
  mb_zip: string;
  mb_addr1: string;
  mb_addr2: string;
  mb_addr3: string;
  mb_addr_jibeon: string;
  mb_memo: string;
  mb_profile: string;
  mb_signature: string;
  mb_adult: number;
  mb_certify: string;
  mb_open: number;
  mb_leave_date: string;
  mb_intercept_date: string;
  mb_password: string;
  mb_1: string;
  mb_2: string;
  mb_3: string;
  mb_4: string;
  mb_5: string;
  mb_6: string;
  mb_7: string;
  mb_8: string;
  mb_9: string;
  mb_10: string;
}>;

export interface AdminMemberMediaUpload {
  file_name: string;
  mime_type: string | null;
  bytes_base64: string;
}

export interface AdminMemberMediaResult {
  mb_id: string;
  storage: "member" | "member_image";
  relative_path: string;
  url: string;
  size?: number;
  width?: number;
  height?: number;
  mime?: string;
  deleted?: boolean;
}

export interface AdminBoardGroup {
  gr_id: string;
  gr_subject: string;
  gr_admin: string;
  gr_device: "both" | "pc" | "mobile";
  gr_use_access: 0 | 1;
}

export interface AdminBoardGroupList {
  items: AdminBoardGroup[];
  pagination: Pagination;
}

export interface AdminBoardGroupCreate {
  gr_id: string;
  gr_subject: string;
  gr_admin?: string;
  gr_device?: "both" | "pc" | "mobile";
  gr_use_access?: 0 | 1;
}

export interface AdminBoardGroupUpdate {
  gr_subject: string;
  gr_admin?: string;
  gr_device?: "both" | "pc" | "mobile";
  gr_use_access?: 0 | 1;
}

export interface AdminBoardGroupMember {
  gm_id: number;
  gr_id: string;
  mb_id: string;
  gm_datetime: string;
  mb_name: string | null;
  mb_nick: string | null;
  mb_level: number | null;
  mb_today_login: string | null;
}

export interface AdminBoardGroupMemberList {
  items: AdminBoardGroupMember[];
  pagination: Pagination;
}

export interface AdminBoardGroupMemberResult {
  gr_id: string;
  mb_id: string;
  gm_datetime: string;
}

export interface AdminBoard {
  bo_table: string;
  bo_subject: string | null;
  gr_id: string | null;
  bo_device: string | null;
  bo_use_category: boolean | null;
  bo_category_list: string | null;
  bo_admin: string | null;
  bo_read_level: number | null;
  bo_write_level: number | null;
  bo_comment_level: number | null;
  bo_download_level: number | null;
  bo_use_secret: number | null;
  bo_upload_count: number | null;
  bo_upload_size: number | null;
  bo_count_write: number | null;
  bo_count_comment: number | null;
}

export interface AdminBoardList {
  items: AdminBoard[];
  pagination: Pagination;
}

export interface AdminBoardCreate {
  bo_table: string;
  bo_subject: string;
  gr_id: string;
  bo_use_category?: boolean;
  bo_category_list?: string;
  bo_read_level?: number;
  bo_write_level?: number;
  bo_comment_level?: number;
  bo_download_level?: number;
  bo_use_secret?: number;
  bo_upload_count?: number;
  bo_upload_size?: number;
}

export type AdminBoardUpdate = Partial<Omit<AdminBoardCreate, "bo_table">>;

export interface AdminBoardCopy {
  target_bo_table: string;
  target_bo_subject?: string;
  copy_posts: boolean;
}

export interface AdminNewPostsDeleteResult {
  deleted: boolean;
  deleted_count: number;
  deleted_posts: number;
  deleted_comments: number;
  skipped: number;
  bn_ids: number[];
}

export interface AdminContent {
  co_id: string;
  co_subject: string;
  co_html: 0 | 1 | 2;
  co_content: string;
  co_mobile_content: string;
  co_include_head: string;
  co_include_tail: string;
  co_tag_filter_use: 0 | 1;
  co_skin: string;
  co_mobile_skin: string;
}

export interface AdminContentList {
  items: AdminContent[];
  pagination: Pagination;
}

export interface AdminContentCreate {
  co_id: string;
  co_subject: string;
  co_content: string;
  co_html?: 0 | 1 | 2;
  co_mobile_content?: string;
  co_include_head?: string;
  co_include_tail?: string;
  co_tag_filter_use?: 0 | 1;
  co_skin?: string;
  co_mobile_skin?: string;
}

export type AdminContentUpdate = Partial<Omit<AdminContentCreate, "co_id">>;

export interface AdminFaqImage {
  exists: boolean;
  relative_path: string;
  url: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  size: number | null;
}

export interface AdminFaqMasterSummary {
  fm_id: number;
  fm_subject: string;
  fm_order: number;
  faq_count: number;
  header_image: AdminFaqImage;
  footer_image: AdminFaqImage;
}

export interface AdminFaqMasterDetail extends AdminFaqMasterSummary {
  fm_head_html: string;
  fm_tail_html: string;
  fm_mobile_head_html: string;
  fm_mobile_tail_html: string;
}

export interface AdminFaqMasterList {
  items: AdminFaqMasterSummary[];
  pagination: Pagination;
}

export interface AdminFaqMasterCreate {
  fm_subject: string;
  fm_order?: number;
  fm_head_html?: string;
  fm_tail_html?: string;
  fm_mobile_head_html?: string;
  fm_mobile_tail_html?: string;
}

export type AdminFaqMasterUpdate = Partial<AdminFaqMasterCreate>;

export interface AdminFaqItem {
  fa_id: number;
  fm_id: number;
  fm_subject: string | null;
  fa_subject: string;
  fa_content: string;
  fa_order: number;
}

export interface AdminFaqList {
  items: AdminFaqItem[];
  pagination: Pagination;
}

export interface AdminFaqCreate {
  fm_id: number;
  fa_subject: string;
  fa_content: string;
  fa_order?: number;
}

export type AdminFaqUpdate = Partial<AdminFaqCreate>;

export interface AdminFaqImageUpload {
  file_name: string;
  mime_type: string | null;
  bytes_base64: string;
}

export interface AdminAuthAssignment {
  au_menu: string;
  au_auth: string;
}

export interface AdminAuthMember {
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  auths: AdminAuthAssignment[];
}

export interface AdminSystemPermission {
  mb_id: string;
  au_menu: string;
  au_auth: string;
  mb_name: string | null;
  mb_nick: string | null;
}

export interface AdminAuthMemberList {
  items: AdminAuthMember[];
  pagination: Pagination;
}

export interface AdminSystemPermissionList {
  items: AdminSystemPermission[];
  pagination: Pagination;
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
  server_key_algorithm: string;
  server_key_fingerprint: string;
}

export interface HostKeyInspection {
  host: string;
  port: number;
  server_key_algorithm: string;
  server_key_fingerprint: string;
  known_hosts_line: string;
}

export interface TerminalTicket {
  ticket: string;
  expires_at_unix: number;
}

export type SftpOperation =
  | { action: "list"; path: string }
  | { action: "stat"; path: string }
  | { action: "mkdir"; path: string }
  | { action: "chmod"; path: string; mode: string }
  | { action: "copy"; from: string; to: string }
  | { action: "rename"; from: string; to: string }
  | { action: "delete_file"; path: string }
  | { action: "delete_directory"; path: string };

export interface SftpEntry {
  name: string;
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
  size: number | null;
  permissions: string;
  owner: string;
  group: string;
  modified: string;
}

export interface SftpResult {
  output: string;
  resolved_path: string | null;
  parent_path: string | null;
  entries: SftpEntry[];
}

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

export interface TransferQueueSnapshot {
  site_id: string;
  jobs: TransferJob[];
  active_count: number;
  queued_count: number;
  paused_count: number;
  failed_count: number;
  concurrency_limit: number;
}

const transport = new BrowserHttpTransport("/api/v1");

export function getInstallStatus() {
  return transport.request<InstallStatus>({
    method: "GET",
    path: "/install/status",
  });
}

export function startInstallChallenge(loginName: string) {
  return transport.request<InstallChallenge, {
    login_name: string;
  }>({
    method: "POST",
    path: "/install/challenge",
    body: { login_name: loginName },
  });
}

export function completeInstall(input: {
  setup_token: string;
  login_name: string;
  password: string;
  totp_code: string;
}) {
  return transport.request<InstallCompletion, typeof input>({
    method: "POST",
    path: "/install/complete",
    body: input,
  });
}

export function loginFleet(
  loginName: string,
  password: string,
  factor: { totpCode?: string; recoveryCode?: string } = {},
) {
  return transport.request<LoginResponse, {
    login_name: string;
    password: string;
    totp_code?: string;
    recovery_code?: string;
  }>({
    method: "POST",
    path: "/auth/login",
    body: {
      login_name: loginName,
      password,
      totp_code: factor.totpCode,
      recovery_code: factor.recoveryCode,
    },
  });
}

export function getFleetSession() {
  return transport.request<FleetSession>({
    method: "GET",
    path: "/session",
  });
}

export function logoutFleet(csrfToken: string) {
  return transport.request<null>({
    method: "POST",
    path: "/auth/logout",
    csrfToken,
  });
}

export function stepUp(
  password: string,
  csrfToken: string,
  factor: { totpCode?: string; recoveryCode?: string } = {},
) {
  return transport.request<null, {
    password: string;
    totp_code?: string;
    recovery_code?: string;
  }>({
    method: "POST",
    path: "/auth/step-up",
    csrfToken,
    body: {
      password,
      totp_code: factor.totpCode,
      recovery_code: factor.recoveryCode,
    },
  });
}

export function getSecuritySettings() {
  return transport.request<SecuritySettings>({
    method: "GET",
    path: "/security/settings",
  });
}

export function updateIdleTimeout(minutes: number, csrfToken: string) {
  return transport.request<null, { minutes: number }>({
    method: "PUT",
    path: "/security/idle-timeout",
    csrfToken,
    body: { minutes },
  });
}

export function changeFleetPassword(
  input: {
    current_password: string;
    new_password: string;
    totp_code?: string;
    recovery_code?: string;
  },
  csrfToken: string,
) {
  return transport.request<null, typeof input>({
    method: "PUT",
    path: "/security/password",
    csrfToken,
    body: input,
  });
}

export function startTotpEnrollment(csrfToken: string) {
  return transport.request<TotpChallenge>({
    method: "POST",
    path: "/security/totp/challenge",
    csrfToken,
  });
}

export function enableTotp(code: string, csrfToken: string) {
  return transport.request<{ recovery_codes: string[] }, { code: string }>({
    method: "POST",
    path: "/security/totp/enable",
    csrfToken,
    body: { code },
  });
}

export function disableTotp(
  input: {
    current_password: string;
    totp_code?: string;
    recovery_code?: string;
  },
  csrfToken: string,
) {
  return transport.request<null, typeof input>({
    method: "POST",
    path: "/security/totp/disable",
    csrfToken,
    body: input,
  });
}

export function regenerateRecoveryCodes(csrfToken: string) {
  return transport.request<{ recovery_codes: string[] }>({
    method: "POST",
    path: "/security/recovery-codes",
    csrfToken,
  });
}

export function listAuditEntries(input: {
  siteId?: string;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  if (input.siteId) query.set("site_id", input.siteId);
  if (input.limit) query.set("limit", String(input.limit));
  const suffix = query.size ? `?${query.toString()}` : "";
  return transport.request<AuditEntry[]>({
    method: "GET",
    path: `/audit${suffix}`,
  });
}

export function createFleetUser(
  loginName: string,
  password: string,
  csrfToken: string,
) {
  return transport.request<{ principal_id: string }, {
    login_name: string;
    password: string;
  }>({
    method: "POST",
    path: "/users",
    csrfToken,
    body: { login_name: loginName, password },
  });
}

export function listSites() {
  return transport.request<Site[]>({ method: "GET", path: "/sites" });
}

export function getDashboard() {
  return transport.request<Dashboard>({ method: "GET", path: "/dashboard" });
}

export function getRuntimeDiagnostics() {
  return transport.request<RuntimeDiagnostics>({
    method: "GET",
    path: "/diagnostics/runtime",
  });
}

export function getSite(siteId: string) {
  return transport.request<Site>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}`,
  });
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

export function updateSite(
  siteId: string,
  input: { display_name: string; base_url: string },
  csrfToken: string,
) {
  return transport.request<null, typeof input>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}`,
    csrfToken,
    body: input,
  });
}

export function deleteSite(siteId: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}`,
    csrfToken,
  });
}

export function exportPortableBackup(password: string, csrfToken: string) {
  return transport.request<PortableBackupEnvelope, { password: string }>({
    method: "POST",
    path: "/backup/export",
    csrfToken,
    body: { password },
  });
}

export function importPortableBackup(
  envelope: PortableBackupEnvelope,
  password: string,
  csrfToken: string,
) {
  return transport.request<
    PortableBackupImportSummary,
    { password: string; envelope: PortableBackupEnvelope }
  >({
    method: "POST",
    path: "/backup/import",
    csrfToken,
    body: { password, envelope },
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

export function getAdminDashboard(siteId: string, limit = 5) {
  return transport.request<AdminDashboardData>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/dashboard?limit=${
      encodeURIComponent(String(limit))
    }`,
  });
}

export function getAdminConfig(siteId: string) {
  return transport.request<AdminConfig>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/config`,
  });
}

export function updateAdminConfig(
  siteId: string,
  update: AdminConfigUpdate,
  csrfToken: string,
) {
  return transport.request<AdminConfig, AdminConfigUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/config`,
    csrfToken,
    body: update,
  });
}

export function listAdminFieldSchemas(siteId: string) {
  return transport.request<AdminSchemaCatalog>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/schema`,
  });
}

export function getAdminFieldSchema(siteId: string, domain: string) {
  return transport.request<AdminSchemaDetail>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/schema/${
      encodeURIComponent(domain)
    }`,
  });
}

export function getMyProfile(siteId: string) {
  return transport.request<MemberProfile>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/member/me`,
  });
}

export function listAdminMembers(
  siteId: string,
  query: {
    page?: number;
    per_page?: number;
    search?: string;
    search_field?: "all" | "mb_id" | "mb_name" | "mb_nick" | "mb_email";
    sort_by?: "mb_id" | "mb_level" | "mb_point" | "mb_datetime";
    sort_direction?: "ASC" | "DESC";
  } = {},
) {
  return transport.request<AdminMemberList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members${fleetQuery(query)}`,
  });
}

export function exportAdminMembers(
  siteId: string,
  query: { search?: string; search_field?: string } = {},
) {
  return transport.request<AdminMemberList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/export${fleetQuery(query)}`,
  });
}

export function getAdminMember(siteId: string, mbId: string) {
  return transport.request<AdminMember>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/${encodeURIComponent(mbId)}`,
  });
}

export function updateAdminMember(
  siteId: string,
  mbId: string,
  update: AdminMemberUpdate,
  csrfToken: string,
) {
  return transport.request<AdminMember, AdminMemberUpdate>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/${encodeURIComponent(mbId)}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminMember(siteId: string, mbId: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/${encodeURIComponent(mbId)}`,
    csrfToken,
  });
}

export function updateAdminMemberLevel(
  siteId: string,
  mbId: string,
  mbLevel: number,
  csrfToken: string,
) {
  return transport.request<AdminMember, { mb_level: number }>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/${encodeURIComponent(mbId)}/level`,
    csrfToken,
    body: { mb_level: mbLevel },
  });
}

export function uploadAdminMemberMedia(
  siteId: string,
  mbId: string,
  kind: "icon" | "image",
  upload: AdminMemberMediaUpload,
  csrfToken: string,
) {
  return transport.request<AdminMemberMediaResult, AdminMemberMediaUpload>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/${encodeURIComponent(mbId)}/${kind}`,
    csrfToken,
    body: upload,
  });
}

export function deleteAdminMemberMedia(
  siteId: string,
  mbId: string,
  kind: "icon" | "image",
  csrfToken: string,
) {
  return transport.request<AdminMemberMediaResult>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/members/${encodeURIComponent(mbId)}/${kind}`,
    csrfToken,
  });
}

export function listAdminBoardGroups(siteId: string) {
  return transport.request<AdminBoardGroupList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups`,
  });
}

export function createAdminBoardGroup(
  siteId: string,
  create: AdminBoardGroupCreate,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroup, AdminBoardGroupCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups`,
    csrfToken,
    body: create,
  });
}

export function getAdminBoardGroup(siteId: string, grId: string) {
  return transport.request<AdminBoardGroup>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}`,
  });
}

export function updateAdminBoardGroup(
  siteId: string,
  grId: string,
  update: AdminBoardGroupUpdate,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroup, AdminBoardGroupUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}`,
    csrfToken,
    body: update,
  });
}

export function patchAdminBoardGroup(
  siteId: string,
  grId: string,
  update: AdminBoardGroupUpdate,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroup, AdminBoardGroupUpdate>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminBoardGroup(siteId: string, grId: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}`,
    csrfToken,
  });
}

export function listAdminBoardGroupMembers(
  siteId: string,
  grId: string,
  query: { page?: number; per_page?: number; search?: string } = {},
) {
  return transport.request<AdminBoardGroupMemberList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}/members${fleetQuery(query)}`,
  });
}

export function addAdminBoardGroupMember(
  siteId: string,
  grId: string,
  mbId: string,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroupMemberResult, { mb_id: string }>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}/members`,
    csrfToken,
    body: { mb_id: mbId },
  });
}

export function deleteAdminBoardGroupMember(
  siteId: string,
  grId: string,
  mbId: string,
  csrfToken: string,
) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/board-groups/${encodeURIComponent(grId)}/members/${encodeURIComponent(mbId)}`,
    csrfToken,
  });
}

export function listAdminBoards(
  siteId: string,
  query: {
    page?: number;
    per_page?: number;
    gr_id?: string;
    search?: string;
    sort_by?: "bo_table" | "bo_subject" | "gr_id" | "bo_count_write" | "bo_count_comment";
    sort_direction?: "ASC" | "DESC";
  } = {},
) {
  return transport.request<AdminBoardList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards${fleetQuery(query)}`,
  });
}

export function createAdminBoard(
  siteId: string,
  create: AdminBoardCreate,
  csrfToken: string,
) {
  return transport.request<AdminBoard, AdminBoardCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards`,
    csrfToken,
    body: create,
  });
}

export function getAdminBoard(siteId: string, boTable: string) {
  return transport.request<AdminBoard>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards/${encodeURIComponent(boTable)}`,
  });
}

export function updateAdminBoard(
  siteId: string,
  boTable: string,
  update: AdminBoardUpdate,
  csrfToken: string,
) {
  return transport.request<AdminBoard, AdminBoardUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards/${encodeURIComponent(boTable)}`,
    csrfToken,
    body: update,
  });
}

export function copyAdminBoard(
  siteId: string,
  boTable: string,
  copy: AdminBoardCopy,
  csrfToken: string,
) {
  return transport.request<AdminBoard, AdminBoardCopy>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards/${encodeURIComponent(boTable)}/copy`,
    csrfToken,
    body: copy,
  });
}

export function deleteAdminBoard(siteId: string, boTable: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards/${encodeURIComponent(boTable)}`,
    csrfToken,
  });
}

export function deleteAdminNewPosts(siteId: string, bnIds: number[], csrfToken: string) {
  return transport.request<AdminNewPostsDeleteResult, { bn_ids: number[] }>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/boards/new-posts`,
    csrfToken,
    body: { bn_ids: bnIds },
  });
}

export function listAdminContents(
  siteId: string,
  query: { page?: number; per_page?: number; search?: string } = {},
) {
  return transport.request<AdminContentList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/contents${fleetQuery(query)}`,
  });
}

export function createAdminContent(
  siteId: string,
  create: AdminContentCreate,
  csrfToken: string,
) {
  return transport.request<AdminContent, AdminContentCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/contents`,
    csrfToken,
    body: create,
  });
}

export function getAdminContent(siteId: string, coId: string) {
  return transport.request<AdminContent>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/contents/${encodeURIComponent(coId)}`,
  });
}

export function updateAdminContent(
  siteId: string,
  coId: string,
  update: AdminContentUpdate,
  csrfToken: string,
) {
  return transport.request<AdminContent, AdminContentUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/contents/${encodeURIComponent(coId)}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminContent(siteId: string, coId: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/contents/${encodeURIComponent(coId)}`,
    csrfToken,
  });
}

export function listAdminFaqMasters(
  siteId: string,
  query: { page?: number; per_page?: number } = {},
) {
  return transport.request<AdminFaqMasterList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters${fleetQuery(query)}`,
  });
}

export function createAdminFaqMaster(
  siteId: string,
  create: AdminFaqMasterCreate,
  csrfToken: string,
) {
  return transport.request<AdminFaqMasterDetail, AdminFaqMasterCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters`,
    csrfToken,
    body: create,
  });
}

export function getAdminFaqMaster(siteId: string, fmId: number) {
  return transport.request<AdminFaqMasterDetail>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters/${fmId}`,
  });
}

export function updateAdminFaqMaster(
  siteId: string,
  fmId: number,
  update: AdminFaqMasterUpdate,
  csrfToken: string,
) {
  return transport.request<AdminFaqMasterDetail, AdminFaqMasterUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters/${fmId}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminFaqMaster(siteId: string, fmId: number, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters/${fmId}`,
    csrfToken,
  });
}

export function uploadAdminFaqMasterImage(
  siteId: string,
  fmId: number,
  kind: "header" | "footer",
  upload: AdminFaqImageUpload,
  csrfToken: string,
) {
  return transport.request<AdminFaqImage, AdminFaqImageUpload>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters/${fmId}/${kind}-image`,
    csrfToken,
    body: upload,
  });
}

export function deleteAdminFaqMasterImage(
  siteId: string,
  fmId: number,
  kind: "header" | "footer",
  csrfToken: string,
) {
  return transport.request<AdminFaqImage>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faq-masters/${fmId}/${kind}-image`,
    csrfToken,
  });
}

export function listAdminFaqs(
  siteId: string,
  query: { page?: number; per_page?: number; fm_id?: number } = {},
) {
  return transport.request<AdminFaqList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faqs${fleetQuery(query)}`,
  });
}

export function createAdminFaq(siteId: string, create: AdminFaqCreate, csrfToken: string) {
  return transport.request<AdminFaqItem, AdminFaqCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faqs`,
    csrfToken,
    body: create,
  });
}

export function getAdminFaq(siteId: string, faId: number) {
  return transport.request<AdminFaqItem>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faqs/${faId}`,
  });
}

export function updateAdminFaq(
  siteId: string,
  faId: number,
  update: AdminFaqUpdate,
  csrfToken: string,
) {
  return transport.request<AdminFaqItem, AdminFaqUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faqs/${faId}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminFaq(siteId: string, faId: number, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/faqs/${faId}`,
    csrfToken,
  });
}

export function listAdminLegacyGroups(siteId: string) {
  return transport.request<AdminBoardGroupList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups`,
  });
}

export function createAdminLegacyGroup(
  siteId: string,
  create: AdminBoardGroupCreate,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroup, AdminBoardGroupCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups`,
    csrfToken,
    body: create,
  });
}

export function getAdminLegacyGroup(siteId: string, grId: string) {
  return transport.request<AdminBoardGroup>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups/${encodeURIComponent(grId)}`,
  });
}

export function updateAdminLegacyGroup(
  siteId: string,
  grId: string,
  update: AdminBoardGroupUpdate,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroup, AdminBoardGroupUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups/${encodeURIComponent(grId)}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminLegacyGroup(siteId: string, grId: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups/${encodeURIComponent(grId)}`,
    csrfToken,
  });
}

export function listAdminLegacyGroupMembers(
  siteId: string,
  grId: string,
  query: { page?: number; per_page?: number; search?: string } = {},
) {
  return transport.request<AdminBoardGroupMemberList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups/${encodeURIComponent(grId)}/members${fleetQuery(query)}`,
  });
}

export function addAdminLegacyGroupMember(
  siteId: string,
  grId: string,
  mbId: string,
  csrfToken: string,
) {
  return transport.request<AdminBoardGroupMemberResult, { mb_id: string }>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups/${encodeURIComponent(grId)}/members`,
    csrfToken,
    body: { mb_id: mbId },
  });
}

export function deleteAdminLegacyGroupMember(
  siteId: string,
  grId: string,
  mbId: string,
  csrfToken: string,
) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/groups/${encodeURIComponent(grId)}/members/${encodeURIComponent(mbId)}`,
    csrfToken,
  });
}

export function listAdminAuth(
  siteId: string,
  query: { page?: number; per_page?: number; mb_id?: string } = {},
) {
  return transport.request<AdminAuthMemberList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/auth${
      fleetQuery(query)
    }`,
  });
}

export function upsertAdminAuth(
  siteId: string,
  mbId: string,
  auths: AdminAuthAssignment[],
  csrfToken: string,
) {
  return transport.request<AdminAuthMember, { auths: AdminAuthAssignment[] }>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/auth/${
      encodeURIComponent(mbId)
    }`,
    csrfToken,
    body: { auths },
  });
}

export function deleteAdminAuthByMember(
  siteId: string,
  mbId: string,
  csrfToken: string,
) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/auth/${
      encodeURIComponent(mbId)
    }`,
    csrfToken,
  });
}

export function listAdminSystemPermissions(
  siteId: string,
  query: { page?: number; per_page?: number; mb_id?: string } = {},
) {
  return transport.request<AdminSystemPermissionList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/permissions${
      fleetQuery(query)
    }`,
  });
}

export function saveAdminSystemPermission(
  siteId: string,
  input: { mb_id: string; au_menu: string; au_auth: string },
  csrfToken: string,
) {
  return transport.request<AdminSystemPermission, typeof input>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/permissions`,
    csrfToken,
    body: input,
  });
}

export function deleteAdminSystemPermission(
  siteId: string,
  mbId: string,
  menu: string,
  csrfToken: string,
) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/permissions/${
      encodeURIComponent(mbId)
    }/${encodeURIComponent(menu)}`,
    csrfToken,
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

export function deleteSshProfile(siteId: string, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/ssh/profile`,
    csrfToken,
  });
}

export function inspectSshHostKey(
  siteId: string,
  host: string,
  port: number,
  csrfToken: string,
) {
  return transport.request<
    HostKeyInspection,
    { host: string; port: number }
  >({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/ssh/host-key`,
    csrfToken,
    body: { host, port },
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
  return transport.request<SftpResult, SftpOperation>({
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

export function getTransferQueue(siteId: string) {
  return transport.request<TransferQueueSnapshot>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/transfers`,
  });
}

export function setTransferConcurrency(
  siteId: string,
  concurrencyLimit: number,
  csrfToken: string,
) {
  return transport.request<
    TransferQueueSnapshot,
    { concurrency_limit: number }
  >({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/transfers/config`,
    csrfToken,
    body: { concurrency_limit: concurrencyLimit },
  });
}

export function cancelTransfer(
  siteId: string,
  jobId: string,
  csrfToken: string,
) {
  return transferAction(siteId, jobId, "cancel", csrfToken);
}

export function pauseTransfer(
  siteId: string,
  jobId: string,
  csrfToken: string,
) {
  return transferAction(siteId, jobId, "pause", csrfToken);
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
  action: "cancel" | "pause" | "retry",
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

function fleetQuery(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(name, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}
