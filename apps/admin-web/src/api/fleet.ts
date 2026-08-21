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

export interface AdminMenu {
  me_id: number;
  me_code: string;
  me_name: string;
  me_link: string;
  me_target: string;
  me_order: number;
  me_use: 0 | 1;
  me_mobile_use: 0 | 1;
}

export interface AdminMenuList {
  items: AdminMenu[];
  pagination: Pagination;
}

export interface AdminMenuCreate {
  me_code: string;
  me_name: string;
  me_link: string;
  me_target?: string;
  me_order?: number;
  me_use?: 0 | 1;
  me_mobile_use?: 0 | 1;
}

export type AdminMenuUpdate = Partial<AdminMenuCreate>;

export interface AdminMenuReorderItem {
  me_id: number;
  me_order: number;
}

export interface AdminMenuReorder {
  orders: AdminMenuReorderItem[];
}

export interface AdminMenuReorderResult {
  result: "ok";
}

export type AdminLayoutWidgetType =
  | "latest_posts"
  | "notice_banner"
  | "popular_posts"
  | "category_grid"
  | "search_bar"
  | "image_carousel"
  | "ad_banner"
  | "spacer"
  | "html_block"
  | "quick_menu";

export interface AdminLayoutWidget {
  widget_id: string;
  type: AdminLayoutWidgetType;
  title: string;
  order: number;
  config: Record<string, unknown>;
  style: Record<string, unknown>;
}

export interface AdminLayoutSummary {
  sl_id: number;
  sl_page_id: string;
  sl_title: string;
  sl_active: number;
  sl_datetime: string;
  sl_updated: string;
}

export interface AdminLayoutDetail extends AdminLayoutSummary {
  sl_schema: string;
}

export interface AdminLayoutList {
  items: AdminLayoutSummary[];
  pagination: Pagination;
}

export interface AdminLayoutSave {
  title?: string;
  widgets: AdminLayoutWidget[];
}

export interface AdminLayoutWidgetCreate {
  widget_id?: string;
  type: AdminLayoutWidgetType;
  title?: string;
  order?: number;
  config?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export type AdminLayoutWidgetUpdate = Partial<Omit<AdminLayoutWidgetCreate, "widget_id">>;

export interface AdminLayoutWidgetReorder {
  widget_ids: string[];
}

export interface AdminThemeConfig {
  cf_theme: string;
  cf_mobile_theme: string;
  cf_theme_installed: boolean;
  cf_mobile_theme_installed: boolean;
  installed_count: number;
}

export interface AdminThemeUpdate {
  cf_theme?: string;
  cf_mobile_theme?: string;
}

export interface AdminTheme {
  id: string;
  path: string;
  theme_name: string;
  theme_uri: string;
  maker: string;
  maker_uri: string;
  version: string;
  detail: string;
  license: string;
  license_uri: string;
  readme_path: string | null;
  theme_config_path: string | null;
  screenshot_path: string | null;
  set_default_skin: boolean;
  preview_board_skin: string;
  preview_mobile_board_skin: string;
  is_active: boolean;
  is_mobile_active: boolean;
  theme_config: Record<string, unknown>;
}

export interface AdminThemeList {
  items: AdminTheme[];
  total: number;
}

export interface AdminPollSummary {
  po_id: number;
  po_subject: string;
  po_date: string;
  po_level: number;
  po_point: number;
  po_use: number;
}

export interface AdminPoll extends AdminPollSummary {
  po_poll1: string;
  po_poll2: string;
  po_poll3: string;
  po_poll4: string;
  po_poll5: string;
  po_poll6: string;
  po_poll7: string;
  po_poll8: string;
  po_poll9: string;
  po_cnt1: number;
  po_cnt2: number;
  po_cnt3: number;
  po_cnt4: number;
  po_cnt5: number;
  po_cnt6: number;
  po_cnt7: number;
  po_cnt8: number;
  po_cnt9: number;
  po_etc: string;
  po_ips: string;
  mb_ids: string;
}

export interface AdminPollList {
  items: AdminPollSummary[];
  pagination: Pagination;
}

export interface AdminPollListQuery {
  page?: number;
  per_page?: number;
}

export interface AdminPollCreate {
  po_subject: string;
  po_poll1: string;
  po_poll2: string;
  po_poll3?: string;
  po_poll4?: string;
  po_poll5?: string;
  po_poll6?: string;
  po_poll7?: string;
  po_poll8?: string;
  po_poll9?: string;
  po_etc?: string;
  po_level?: number;
  po_point?: number;
  po_use?: number;
  po_date?: string;
}

export type AdminPollUpdate = Partial<Omit<AdminPollCreate, "po_date">>;

export interface AdminPopup {
  nw_id: number;
  nw_division: string | null;
  nw_device: string | null;
  nw_begin_time: string | null;
  nw_end_time: string | null;
  nw_disable_hours: number | null;
  nw_left: number | null;
  nw_top: number | null;
  nw_height: number | null;
  nw_width: number | null;
  nw_subject: string | null;
  nw_content: string | null;
  nw_content_html: number | null;
}

export interface AdminPopupList {
  items: AdminPopup[];
  pagination: Pagination;
}

export interface AdminPopupListQuery {
  page?: number;
  per_page?: number;
}

export interface AdminPopupCreate {
  nw_division?: string;
  nw_device?: string;
  nw_begin_time?: string;
  nw_end_time?: string;
  nw_disable_hours?: number;
  nw_left?: number;
  nw_top?: number;
  nw_height?: number;
  nw_width?: number;
  nw_subject: string;
  nw_content: string;
  nw_content_html?: number;
}

export type AdminPopupUpdate = Partial<AdminPopupCreate>;

export interface AdminPopularItem {
  pp_word: string;
  pp_date: string;
  pp_cnt: number;
  pp_rank: number;
}

export interface AdminPopularList {
  items: AdminPopularItem[];
  pagination: Pagination;
}

export interface AdminPopularListQuery {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
}

export interface AdminPopularRankItem {
  rank: number;
  pp_word: string;
  hit_count: number;
  first_date: string;
  last_date: string;
}

export interface AdminPopularRankList {
  items: AdminPopularRankItem[];
  pagination: Pagination;
}

export interface AdminPopularRankQuery {
  limit?: number;
  date_from?: string;
  date_to?: string;
}

export interface AdminPopularReset {
  date_from?: string;
  date_to?: string;
}

export interface AdminPopularResetResult {
  deleted_rows: number;
  date_from: string | null;
  date_to: string | null;
}

export type AdminVisitStatsType = "date" | "hour" | "week" | "month" | "year" | "browser" | "os" | "device" | "domain" | "search";

export interface AdminVisitStatsQuery {
  date_from?: string;
  date_to?: string;
  type?: AdminVisitStatsType;
  limit?: number;
}

export interface AdminVisitStats {
  type: AdminVisitStatsType;
  summary: {
    total_visits: number;
    active_days: number;
    first_date: string;
    last_date: string;
    visit_rows: number;
    unique_ips: number;
  };
  items: Array<{ stat_key: string; visit_count: number }>;
}

export interface AdminVisitSearchQuery {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  ip?: string;
  referer?: string;
  agent?: string;
}

export interface AdminVisitLogItem {
  vi_id: number;
  vi_ip: string;
  vi_date: string;
  vi_time: string;
  vi_referer: string;
  vi_agent: string;
  vi_browser: string;
  vi_os: string;
  vi_device: string;
}

export interface AdminVisitSearchResult {
  items: AdminVisitLogItem[];
  pagination: Pagination;
}

export interface AdminVisitDelete {
  before?: string;
  date_from?: string;
  date_to?: string;
  ip?: string;
}

export interface AdminVisitDeleteResult {
  deleted_rows: number;
  before: string | null;
  date_from: string | null;
  date_to: string | null;
  ip: string | null;
}

export type AdminReportStatus = "pending" | "approved" | "rejected" | "hold";
export type AdminReportTargetType = "post" | "comment" | "member";

export interface AdminReportListQuery {
  status?: AdminReportStatus;
  target_type?: AdminReportTargetType;
  page?: number;
  per_page?: number;
}

export interface AdminReportItem {
  rp_id: number;
  mb_id: string | null;
  rp_target_type: string | null;
  rp_target_id: string | null;
  rp_reason: string | null;
  rp_detail: string | null;
  rp_status: string | null;
  rp_admin_memo: string | null;
  rp_datetime: string | null;
  rp_processed_at: string | null;
}

export interface AdminReportList {
  items: AdminReportItem[];
  pagination: Pagination;
}

export interface AdminReportStats {
  pending: number;
  approved: number;
  rejected: number;
  hold: number;
  total: number;
}

export interface AdminReportUpdate {
  status: AdminReportStatus;
  admin_memo?: string;
}

export interface AdminQaConfig {
  qa_id: number;
  qa_title: string;
  qa_category: string;
  qa_skin: string;
  qa_mobile_skin: string;
  qa_use_email: string;
  qa_req_email: string;
  qa_use_hp: string;
  qa_req_hp: string;
  qa_use_sms: string;
  qa_send_number: string;
  qa_admin_hp: string;
  qa_admin_email: string;
  qa_use_editor: string;
  qa_subject_len: string;
  qa_mobile_subject_len: string;
  qa_page_rows: string;
  qa_mobile_page_rows: string;
  qa_image_width: string;
  qa_upload_size: string;
  qa_insert_content: string;
  qa_include_head: string;
  qa_include_tail: string;
  qa_content_head: string;
  qa_content_tail: string;
  qa_mobile_content_head: string;
  qa_mobile_content_tail: string;
  qa_1_subj: string;
  qa_2_subj: string;
  qa_3_subj: string;
  qa_4_subj: string;
  qa_5_subj: string;
  qa_1: string;
  qa_2: string;
  qa_3: string;
  qa_4: string;
  qa_5: string;
}

export type AdminQaConfigUpdate = Partial<Omit<AdminQaConfig, "qa_id">>;

export interface AdminQaBulkDelete {
  qa_ids: number[];
}

export interface AdminQaBulkDeleteResult {
  deleted_count: number;
  qa_ids: number[];
}

export type AdminWriteCountPeriod = "hour" | "day" | "week" | "month" | "year";

export interface AdminWriteCountStatsQuery {
  period?: AdminWriteCountPeriod;
  date_from?: string;
  date_to?: string;
  bo_table?: string;
}

export interface AdminWriteCountStats {
  period: AdminWriteCountPeriod;
  date_from: string;
  date_to: string;
  bo_table: string | null;
  summary: { write_total: number; comment_total: number };
  items: Array<{ bucket: string; write_count: number; comment_count: number }>;
}

export interface AdminMailListQuery {
  page?: number;
  per_page?: number;
}

export interface AdminMailTemplate {
  ma_id: number;
  ma_subject: string;
  ma_content: string;
  ma_time: string;
  ma_ip: string;
  ma_last_option: string;
}

export interface AdminMailLastOption {
  mb_id1: number;
  mb_id1_from: string;
  mb_id1_to: string;
  mb_email: string;
  mb_mailling: number;
  mb_level_from: number;
  mb_level_to: number;
  gr_id: string;
}

export interface AdminMailDetail extends AdminMailTemplate {
  last_option: AdminMailLastOption;
  preview_html: string;
}

export interface AdminMailList { items: AdminMailTemplate[]; pagination: Pagination; }
export interface AdminMailTemplateWrite { ma_subject: string; ma_content: string; }

export interface AdminMailRecipientQuery extends AdminMailListQuery {
  search?: string;
  level_min?: number;
  level_max?: number;
  gr_id?: string;
  member_id_from?: string;
  member_id_to?: string;
  email_contains?: string;
  mailling_only?: boolean;
}

export interface AdminMailRecipient {
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  mb_email: string;
  mb_level: number;
  mb_mailling: number;
  mb_datetime: string;
}

export interface AdminMailRecipientList { items: AdminMailRecipient[]; pagination: Pagination; }
export type AdminMailTargetType = "all" | "level" | "group" | "member";

export interface AdminMailSendRequest {
  ma_id?: number;
  subject?: string;
  content?: string;
  target_type: AdminMailTargetType;
  level_min?: number;
  level_max?: number;
  gr_id?: string;
  member_id_from?: string;
  member_id_to?: string;
  email_contains?: string;
  mb_ids: string[];
  mailling_only: boolean;
  dry_run: boolean;
}

export interface AdminMailSendResult {
  ma_id: number | null;
  template_used: boolean;
  target_count: number;
  sent_count: number;
  skipped_count: number;
  mail_enabled: boolean;
  dry_run: boolean;
  targets: Array<{ mb_id: string; mb_email: string }>;
}

export interface AdminMailTestRequest { ma_id?: number; to: string; subject?: string; content?: string; }
export interface AdminMailTestResult { ma_id: number | null; template_used: boolean; mail_enabled: boolean; sent: boolean; to: string; }

export interface AdminSystemMailTemplate { ma_id: number; ma_subject: string; ma_time: string; ma_ip: string; ma_last_option: string; }
export interface AdminSystemMailTemplateList { items: AdminSystemMailTemplate[]; pagination: Pagination; }
export interface AdminSystemMailRecipient { mb_id: string; mb_name: string; mb_nick: string; mb_email: string; mb_level: number; mb_mailling: number; mb_today_login: string; }
export interface AdminSystemMailRecipientList { items: AdminSystemMailRecipient[]; pagination: Pagination; }
export interface AdminSystemMailTestRequest { to: string; subject: string; content: string; }
export interface AdminSystemMailTestResult { sent: boolean; mail_log_id: number; to: string; }

export interface AdminSystemMailSendRequest {
  ma_id?: number;
  subject?: string;
  content?: string;
  mb_ids: string[];
  mailling_only: boolean;
  dry_run: boolean;
}

export interface AdminSystemMailSendResult {
  mail_log_id: number;
  target_count: number;
  sent_count: number;
  skipped_count: number;
  mail_enabled: boolean;
  dry_run: boolean;
  recipients: Array<{ mb_id: string; mb_email: string }>;
}

export interface AdminSmsConfig {
  cf_title: string | null;
  cf_sms_use: string | null;
  cf_sms_type: string | null;
  cf_icode_id: string | null;
  cf_icode_pw: null;
  cf_icode_server_ip: string | null;
  cf_icode_server_port: string | null;
  cf_icode_token_key: null;
  cf_phone: string | null;
  cf_datetime: string | null;
  provider_ready: boolean;
  uses_token_key: boolean;
  uses_legacy_credentials: boolean;
  storage_ready: boolean;
  missing_tables: string[];
}

export interface AdminSmsConfigUpdate {
  cf_sms_use?: "" | "icode";
  cf_sms_type?: "" | "LMS";
  cf_icode_id?: string;
  cf_icode_pw?: string;
  cf_icode_server_ip?: string;
  cf_icode_server_port?: string;
  cf_icode_token_key?: string;
  cf_phone?: string;
}

export interface AdminSmsMemberSyncResult {
  datetime: string | null;
  summary: {
    total_members: number;
    leave_members: number;
    phone_empty: number;
    phone_valid: number;
    phone_invalid: number;
    receipt_enabled: number;
    receipt_disabled: number;
  };
}

export interface AdminSmsContactGroup {
  bg_no: number;
  bg_name: string;
  bg_count: number;
  bg_member: number;
  bg_nomember: number;
  bg_receipt: number;
  bg_reject: number;
}

export interface AdminSmsContactGroupList {
  groups: AdminSmsContactGroup[];
  total: number;
}

export interface AdminSmsContact {
  bk_no: number;
  bg_no: number;
  bg_name: string | null;
  mb_id: string | null;
  bk_name: string;
  bk_hp: string;
  bk_receipt: number;
  bk_datetime: string | null;
  bk_memo: string | null;
  receipt_label: string;
  member_type: string;
  member_sync_skipped: boolean | null;
}

export interface AdminSmsContactSummary {
  total_count: number;
  receipt_count: number;
  reject_count: number;
  member_count: number;
  non_member_count: number;
  last_synced_at: string | null;
}

export interface AdminSmsContactList {
  contacts: AdminSmsContact[];
  pagination: Pagination;
  summary: AdminSmsContactSummary;
}

export interface AdminSmsContactListQuery {
  page?: number;
  per_page?: number;
  bg_no?: number;
  search_field?: "all" | "name" | "hp";
  search?: string;
  with_phone_only?: boolean;
}

export interface AdminSmsContactCreate {
  bg_no?: number;
  mb_id?: string;
  bk_name: string;
  bk_hp: string;
  bk_receipt?: number;
  bk_memo?: string;
}

export type AdminSmsContactUpdate = Partial<Omit<AdminSmsContactCreate, "mb_id">>;
export type AdminSmsContactBatchAction = "delete" | "allow" | "reject" | "move" | "copy";

export interface AdminSmsContactBatch {
  action: AdminSmsContactBatchAction;
  contact_ids: number[];
  target_bg_no?: number;
}

export interface AdminSmsContactBatchResult {
  action: AdminSmsContactBatchAction;
  affected: number;
  target_bg_no: number | null;
}

export interface AdminSmsContactImportItem {
  name?: string;
  phone?: string;
  memo?: string;
  receipt?: boolean;
}

export interface AdminSmsContactImport {
  bg_no: number;
  dry_run: boolean;
  contacts: AdminSmsContactImportItem[];
}

export interface AdminSmsContactImportResult {
  total_count: number;
  invalid_count: number;
  duplicate_count: number;
  importable_count: number;
  imported_count: number;
  dry_run: boolean;
  duplicate_phones: string[];
  importable_phones: string[];
}

export interface AdminSmsContactExportQuery {
  bg_no?: number;
  include_no_phone?: boolean;
  with_hyphen?: boolean;
}

export interface AdminSmsContactExportItem {
  bk_name: string;
  bk_hp: string;
  bg_no: number;
  mb_id: string | null;
  bk_receipt: number;
}

export interface AdminSmsContactExport {
  items: AdminSmsContactExportItem[];
  total: number;
  bg_no: number | null;
  include_no_phone: boolean;
  with_hyphen: boolean;
}

export interface AdminPointItem {
  po_id: number;
  mb_id: string;
  po_point: number;
  po_datetime: string;
  po_content: string;
  po_use_point: number;
  po_expired: number;
  po_expire_date: string;
  po_mb_point: number;
  po_rel_table: string;
  po_rel_id: string;
  po_rel_action: string;
}

export interface AdminPointList {
  items: AdminPointItem[];
  pagination: Pagination;
}

export interface AdminPointListQuery {
  page?: number;
  per_page?: number;
  mb_id?: string;
  search_field?: "mb_id" | "po_content";
  search?: string;
}

export interface AdminPointChange {
  mb_id: string;
  point: number;
  po_content?: string;
}

export interface AdminPointChangeResult {
  mb_id: string;
  before_point: number;
  changed_point: number;
  after_point: number;
  po_content: string;
  processed_at: string;
}

export interface AdminPointExpire {
  base_date?: string;
}

export interface AdminPointExpireResult {
  base_date: string;
  expired_count: number;
  synced_members: number;
}

export type AdminPointAction =
  | ({ action: "grant" | "deduct" } & AdminPointChange)
  | ({ action: "expire" } & AdminPointExpire);

export type AdminPointActionResult = AdminPointChangeResult | AdminPointExpireResult;

export interface AdminPointDelete {
  po_ids: number[];
}

export interface AdminPointDeleteResult {
  requested_count: number;
  deleted_count: number;
}

export interface AdminPointSummary {
  mb_id: string | null;
  total_point: number;
  total_rows: number;
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

export function listAdminMenus(siteId: string) {
  return transport.request<AdminMenuList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus`,
  });
}

export function createAdminMenu(siteId: string, create: AdminMenuCreate, csrfToken: string) {
  return transport.request<AdminMenu, AdminMenuCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus`,
    csrfToken,
    body: create,
  });
}

export function getAdminMenu(siteId: string, meId: number) {
  return transport.request<AdminMenu>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus/${meId}`,
  });
}

export function updateAdminMenu(
  siteId: string,
  meId: number,
  update: AdminMenuUpdate,
  csrfToken: string,
) {
  return transport.request<AdminMenu, AdminMenuUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus/${meId}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminMenu(siteId: string, meId: number, csrfToken: string) {
  return transport.request<null>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus/${meId}`,
    csrfToken,
  });
}

export function reorderAdminMenus(
  siteId: string,
  reorder: AdminMenuReorder,
  csrfToken: string,
) {
  return transport.request<AdminMenuReorderResult, AdminMenuReorder>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus`,
    csrfToken,
    body: reorder,
  });
}

export function reorderAdminMenusLegacy(
  siteId: string,
  reorder: AdminMenuReorder,
  csrfToken: string,
) {
  return transport.request<AdminMenuReorderResult, AdminMenuReorder>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/menus/reorder`,
    csrfToken,
    body: reorder,
  });
}

export function listAdminLayouts(
  siteId: string,
  query: { page?: number; per_page?: number } = {},
) {
  return transport.request<AdminLayoutList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts${fleetQuery(query)}`,
  });
}

export function getAdminLayout(siteId: string, pageId: string) {
  return transport.request<AdminLayoutDetail>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}`,
  });
}

export function saveAdminLayout(
  siteId: string,
  pageId: string,
  save: AdminLayoutSave,
  csrfToken: string,
) {
  return transport.request<AdminLayoutDetail, AdminLayoutSave>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}`,
    csrfToken,
    body: save,
  });
}

export function addAdminLayoutWidget(
  siteId: string,
  pageId: string,
  create: AdminLayoutWidgetCreate,
  csrfToken: string,
) {
  return transport.request<AdminLayoutDetail, AdminLayoutWidgetCreate>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}/widgets`,
    csrfToken,
    body: create,
  });
}

export function updateAdminLayoutWidget(
  siteId: string,
  pageId: string,
  widgetId: string,
  update: AdminLayoutWidgetUpdate,
  csrfToken: string,
) {
  return transport.request<AdminLayoutDetail, AdminLayoutWidgetUpdate>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}/widgets/${encodeURIComponent(widgetId)}`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminLayoutWidget(
  siteId: string,
  pageId: string,
  widgetId: string,
  csrfToken: string,
) {
  return transport.request<AdminLayoutDetail>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}/widgets/${encodeURIComponent(widgetId)}`,
    csrfToken,
  });
}

export function reorderAdminLayoutWidgets(
  siteId: string,
  pageId: string,
  reorder: AdminLayoutWidgetReorder,
  csrfToken: string,
) {
  return transport.request<AdminLayoutDetail, AdminLayoutWidgetReorder>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}/widgets`,
    csrfToken,
    body: reorder,
  });
}

export function reorderAdminLayoutWidgetsLegacy(
  siteId: string,
  pageId: string,
  reorder: AdminLayoutWidgetReorder,
  csrfToken: string,
) {
  return transport.request<AdminLayoutDetail, AdminLayoutWidgetReorder>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/layouts/${encodeURIComponent(pageId)}/reorder`,
    csrfToken,
    body: reorder,
  });
}

export function getAdminThemeConfig(siteId: string) {
  return transport.request<AdminThemeConfig>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/theme`,
  });
}

export function updateAdminThemeConfig(
  siteId: string,
  update: AdminThemeUpdate,
  csrfToken: string,
) {
  return transport.request<AdminThemeConfig, AdminThemeUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/theme`,
    csrfToken,
    body: update,
  });
}

export function listAdminThemes(siteId: string) {
  return transport.request<AdminThemeList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/themes`,
  });
}

export function getAdminTheme(siteId: string, theme: string) {
  return transport.request<AdminTheme>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/themes/${encodeURIComponent(theme)}`,
  });
}

function adminPollPath(siteId: string, system: boolean, poId?: number): `/${string}` {
  const base = `/sites/${encodeURIComponent(siteId)}/admin/${system ? "system/" : ""}polls` as const;
  return (poId === undefined ? base : `${base}/${poId}`) as `/${string}`;
}

function adminPollListPath(
  siteId: string,
  system: boolean,
  query: AdminPollListQuery,
) : `/${string}` {
  const search = new URLSearchParams();
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  const suffix = search.size ? `?${search.toString()}` : "";
  return `${adminPollPath(siteId, system)}${suffix}` as `/${string}`;
}

export function listAdminSystemPolls(siteId: string, query: AdminPollListQuery = {}) {
  return transport.request<AdminPollList>({
    method: "GET",
    path: adminPollListPath(siteId, true, query),
  });
}

export function createAdminSystemPoll(
  siteId: string,
  create: AdminPollCreate,
  csrfToken: string,
) {
  return transport.request<AdminPoll, AdminPollCreate>({
    method: "POST",
    path: adminPollPath(siteId, true),
    csrfToken,
    body: create,
  });
}

export function getAdminSystemPoll(siteId: string, poId: number) {
  return transport.request<AdminPoll>({
    method: "GET",
    path: adminPollPath(siteId, true, poId),
  });
}

export function updateAdminSystemPoll(
  siteId: string,
  poId: number,
  update: AdminPollUpdate,
  csrfToken: string,
) {
  return transport.request<AdminPoll, AdminPollUpdate>({
    method: "PUT",
    path: adminPollPath(siteId, true, poId),
    csrfToken,
    body: update,
  });
}

export function deleteAdminSystemPoll(siteId: string, poId: number, csrfToken: string) {
  return transport.request<void>({
    method: "DELETE",
    path: adminPollPath(siteId, true, poId),
    csrfToken,
  });
}

export function listAdminLegacyPolls(siteId: string, query: AdminPollListQuery = {}) {
  return transport.request<AdminPollList>({
    method: "GET",
    path: adminPollListPath(siteId, false, query),
  });
}

export function createAdminLegacyPoll(
  siteId: string,
  create: AdminPollCreate,
  csrfToken: string,
) {
  return transport.request<AdminPoll, AdminPollCreate>({
    method: "POST",
    path: adminPollPath(siteId, false),
    csrfToken,
    body: create,
  });
}

export function getAdminLegacyPoll(siteId: string, poId: number) {
  return transport.request<AdminPoll>({
    method: "GET",
    path: adminPollPath(siteId, false, poId),
  });
}

export function updateAdminLegacyPoll(
  siteId: string,
  poId: number,
  update: AdminPollUpdate,
  csrfToken: string,
) {
  return transport.request<AdminPoll, AdminPollUpdate>({
    method: "PATCH",
    path: adminPollPath(siteId, false, poId),
    csrfToken,
    body: update,
  });
}

export function deleteAdminLegacyPoll(siteId: string, poId: number, csrfToken: string) {
  return transport.request<void>({
    method: "DELETE",
    path: adminPollPath(siteId, false, poId),
    csrfToken,
  });
}

function adminPopupPath(siteId: string, system: boolean, nwId?: number): `/${string}` {
  const base = `/sites/${encodeURIComponent(siteId)}/admin/${system ? "system/" : ""}popups` as const;
  return (nwId === undefined ? base : `${base}/${nwId}`) as `/${string}`;
}

function adminPopupListPath(siteId: string, system: boolean, query: AdminPopupListQuery): `/${string}` {
  const search = new URLSearchParams();
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  const suffix = search.size ? `?${search.toString()}` : "";
  return `${adminPopupPath(siteId, system)}${suffix}` as `/${string}`;
}

export function listAdminSystemPopups(siteId: string, query: AdminPopupListQuery = {}) {
  return transport.request<AdminPopupList>({ method: "GET", path: adminPopupListPath(siteId, true, query) });
}

export function createAdminSystemPopup(siteId: string, create: AdminPopupCreate, csrfToken: string) {
  return transport.request<AdminPopup, AdminPopupCreate>({ method: "POST", path: adminPopupPath(siteId, true), csrfToken, body: create });
}

export function getAdminSystemPopup(siteId: string, nwId: number) {
  return transport.request<AdminPopup>({ method: "GET", path: adminPopupPath(siteId, true, nwId) });
}

export function updateAdminSystemPopup(siteId: string, nwId: number, update: AdminPopupUpdate, csrfToken: string) {
  return transport.request<AdminPopup, AdminPopupUpdate>({ method: "PUT", path: adminPopupPath(siteId, true, nwId), csrfToken, body: update });
}

export function deleteAdminSystemPopup(siteId: string, nwId: number, csrfToken: string) {
  return transport.request<void>({ method: "DELETE", path: adminPopupPath(siteId, true, nwId), csrfToken });
}

export function listAdminLegacyPopups(siteId: string, query: AdminPopupListQuery = {}) {
  return transport.request<AdminPopupList>({ method: "GET", path: adminPopupListPath(siteId, false, query) });
}

export function createAdminLegacyPopup(siteId: string, create: AdminPopupCreate, csrfToken: string) {
  return transport.request<AdminPopup, AdminPopupCreate>({ method: "POST", path: adminPopupPath(siteId, false), csrfToken, body: create });
}

export function getAdminLegacyPopup(siteId: string, nwId: number) {
  return transport.request<AdminPopup>({ method: "GET", path: adminPopupPath(siteId, false, nwId) });
}

export function updateAdminLegacyPopup(siteId: string, nwId: number, update: AdminPopupUpdate, csrfToken: string) {
  return transport.request<AdminPopup, AdminPopupUpdate>({ method: "PATCH", path: adminPopupPath(siteId, false, nwId), csrfToken, body: update });
}

export function deleteAdminLegacyPopup(siteId: string, nwId: number, csrfToken: string) {
  return transport.request<void>({ method: "DELETE", path: adminPopupPath(siteId, false, nwId), csrfToken });
}

function appendPopularRange(search: URLSearchParams, query: { date_from?: string; date_to?: string }) {
  if (query.date_from) search.set("date_from", query.date_from);
  if (query.date_to) search.set("date_to", query.date_to);
}

export function listAdminPopular(siteId: string, query: AdminPopularListQuery = {}) {
  const search = new URLSearchParams();
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  appendPopularRange(search, query);
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminPopularList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/popular${suffix}`,
  });
}

export function getAdminPopularRank(siteId: string, query: AdminPopularRankQuery = {}) {
  const search = new URLSearchParams();
  if (query.limit !== undefined) search.set("limit", String(query.limit));
  appendPopularRange(search, query);
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminPopularRankList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/popular/rank${suffix}`,
  });
}

export function resetAdminPopular(
  siteId: string,
  reset: AdminPopularReset,
  csrfToken: string,
) {
  return transport.request<AdminPopularResetResult, AdminPopularReset>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/popular`,
    csrfToken,
    body: reset,
  });
}

function appendVisitFilters(search: URLSearchParams, query: AdminVisitStatsQuery | AdminVisitSearchQuery) {
  if (query.date_from) search.set("date_from", query.date_from);
  if (query.date_to) search.set("date_to", query.date_to);
}

export function getAdminVisitStats(siteId: string, query: AdminVisitStatsQuery = {}) {
  const search = new URLSearchParams();
  appendVisitFilters(search, query);
  if (query.type) search.set("type", query.type);
  if (query.limit !== undefined) search.set("limit", String(query.limit));
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminVisitStats>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/visits/stats${suffix}`,
  });
}

export function searchAdminVisits(siteId: string, query: AdminVisitSearchQuery = {}) {
  const search = new URLSearchParams();
  appendVisitFilters(search, query);
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  if (query.ip) search.set("ip", query.ip);
  if (query.referer) search.set("referer", query.referer);
  if (query.agent) search.set("agent", query.agent);
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminVisitSearchResult>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/visits/search${suffix}`,
  });
}

export function deleteAdminVisits(siteId: string, input: AdminVisitDelete, csrfToken: string) {
  return transport.request<AdminVisitDeleteResult, AdminVisitDelete>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/visits`,
    csrfToken,
    body: input,
  });
}

export function listAdminReports(siteId: string, query: AdminReportListQuery = {}) {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.target_type) search.set("target_type", query.target_type);
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminReportList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/reports${suffix}`,
  });
}

export function getAdminReportStats(siteId: string) {
  return transport.request<AdminReportStats>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/reports/stats`,
  });
}

export function updateAdminReport(
  siteId: string,
  reportId: number,
  update: AdminReportUpdate,
  csrfToken: string,
) {
  return transport.request<AdminReportItem, AdminReportUpdate>({
    method: "PATCH",
    path: `/sites/${encodeURIComponent(siteId)}/admin/reports/${reportId}`,
    csrfToken,
    body: update,
  });
}

export function getAdminQaConfig(siteId: string) {
  return transport.request<AdminQaConfig>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/system/qa-config`,
  });
}

export function updateAdminQaConfig(
  siteId: string,
  update: AdminQaConfigUpdate,
  csrfToken: string,
) {
  return transport.request<AdminQaConfig, AdminQaConfigUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/system/qa-config`,
    csrfToken,
    body: update,
  });
}

export function deleteAdminQaBulk(
  siteId: string,
  input: AdminQaBulkDelete,
  csrfToken: string,
) {
  return transport.request<AdminQaBulkDeleteResult, AdminQaBulkDelete>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/qa`,
    csrfToken,
    body: input,
  });
}

export function getAdminWriteCountStats(
  siteId: string,
  query: AdminWriteCountStatsQuery = {},
) {
  const search = new URLSearchParams();
  if (query.period) search.set("period", query.period);
  if (query.date_from) search.set("date_from", query.date_from);
  if (query.date_to) search.set("date_to", query.date_to);
  if (query.bo_table) search.set("bo_table", query.bo_table);
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminWriteCountStats>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/write-count/stats${suffix}`,
  });
}

function adminMailListQuery(query: AdminMailListQuery = {}): string {
  const search = new URLSearchParams();
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  return search.size ? `?${search.toString()}` : "";
}

function adminMailRecipientQuery(query: AdminMailRecipientQuery = {}): string {
  const search = new URLSearchParams(adminMailListQuery(query).slice(1));
  if (query.search) search.set("search", query.search);
  if (query.level_min !== undefined) search.set("level_min", String(query.level_min));
  if (query.level_max !== undefined) search.set("level_max", String(query.level_max));
  if (query.gr_id) search.set("gr_id", query.gr_id);
  if (query.member_id_from) search.set("member_id_from", query.member_id_from);
  if (query.member_id_to) search.set("member_id_to", query.member_id_to);
  if (query.email_contains) search.set("email_contains", query.email_contains);
  if (query.mailling_only) search.set("mailling_only", "true");
  return search.size ? `?${search.toString()}` : "";
}

export function listAdminMails(siteId: string, query: AdminMailListQuery = {}) {
  return transport.request<AdminMailList>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/mails${adminMailListQuery(query)}` });
}

export function sendAdminMail(siteId: string, input: AdminMailSendRequest, csrfToken: string) {
  return transport.request<AdminMailSendResult, AdminMailSendRequest & { confirm_send: true }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/mails`, csrfToken, body: { ...input, confirm_send: true } });
}

export function createAdminMailTemplate(siteId: string, input: AdminMailTemplateWrite, csrfToken: string) {
  return transport.request<AdminMailDetail, AdminMailTemplateWrite>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/templates`, csrfToken, body: input });
}

export function listAdminMailRecipients(siteId: string, query: AdminMailRecipientQuery = {}) {
  return transport.request<AdminMailRecipientList>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/recipients${adminMailRecipientQuery(query)}` });
}

export function createAdminMailTest(siteId: string, input: AdminMailTestRequest, csrfToken: string) {
  return transport.request<AdminMailTestResult, AdminMailTestRequest & { confirm_send: true }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/test`, csrfToken, body: { ...input, confirm_send: true } });
}

export function sendAdminMailTestLegacy(siteId: string, input: AdminMailTestRequest, csrfToken: string) {
  return transport.request<AdminMailTestResult, AdminMailTestRequest & { confirm_send: true }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/test/legacy`, csrfToken, body: { ...input, confirm_send: true } });
}

export function getAdminMail(siteId: string, maId: number) {
  return transport.request<AdminMailDetail>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/${maId}` });
}

export function updateAdminMailTemplate(siteId: string, maId: number, input: AdminMailTemplateWrite, csrfToken: string) {
  return transport.request<AdminMailDetail, AdminMailTemplateWrite>({ method: "PUT", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/${maId}`, csrfToken, body: input });
}

export function deleteAdminMail(siteId: string, maId: number, csrfToken: string) {
  return transport.request<void>({ method: "DELETE", path: `/sites/${encodeURIComponent(siteId)}/admin/mails/${maId}`, csrfToken });
}

export function listAdminSystemMails(siteId: string, query: AdminMailListQuery = {}) {
  return transport.request<AdminSystemMailTemplateList>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/system/mails${adminMailListQuery(query)}` });
}

export function listAdminSystemMailRecipients(siteId: string, query: Pick<AdminMailRecipientQuery, "page" | "per_page" | "search"> = {}) {
  return transport.request<AdminSystemMailRecipientList>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/system/mail-recipients${adminMailRecipientQuery(query)}` });
}

export function sendAdminSystemMailTest(siteId: string, input: AdminSystemMailTestRequest, csrfToken: string) {
  return transport.request<AdminSystemMailTestResult, AdminSystemMailTestRequest & { confirm_send: true }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/system/mails/test`, csrfToken, body: { ...input, confirm_send: true } });
}

export function sendAdminSystemMemberMail(siteId: string, input: AdminSystemMailSendRequest, csrfToken: string) {
  return transport.request<AdminSystemMailSendResult, AdminSystemMailSendRequest & { confirm_send: true }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/system/mails/send`, csrfToken, body: { ...input, confirm_send: true } });
}

export function getAdminSmsConfig(siteId: string) {
  return transport.request<AdminSmsConfig>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/sms/config`,
  });
}

export function updateAdminSmsConfig(
  siteId: string,
  input: AdminSmsConfigUpdate,
  csrfToken: string,
) {
  return transport.request<AdminSmsConfig, AdminSmsConfigUpdate>({
    method: "PUT",
    path: `/sites/${encodeURIComponent(siteId)}/admin/sms/config`,
    csrfToken,
    body: input,
  });
}

export function syncAdminSmsMembers(siteId: string, csrfToken: string) {
  return transport.request<AdminSmsMemberSyncResult, { confirm_sync: true }>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/sms/member-sync`,
    csrfToken,
    body: { confirm_sync: true },
  });
}

function adminSmsContactQuery(query: AdminSmsContactListQuery = {}): string {
  const search = new URLSearchParams();
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  if (query.bg_no !== undefined) search.set("bg_no", String(query.bg_no));
  if (query.search_field) search.set("search_field", query.search_field);
  if (query.search) search.set("search", query.search);
  if (query.with_phone_only) search.set("with_phone_only", "true");
  return search.size ? `?${search.toString()}` : "";
}

export function listAdminSmsContactGroups(siteId: string) {
  return transport.request<AdminSmsContactGroupList>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups` });
}

export function createAdminSmsContactGroup(siteId: string, bgName: string, csrfToken: string) {
  return transport.request<AdminSmsContactGroup, { bg_name: string }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups`, csrfToken, body: { bg_name: bgName } });
}

export function getAdminSmsContactGroup(siteId: string, bgNo: number) {
  return transport.request<AdminSmsContactGroup>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups/${bgNo}` });
}

export function updateAdminSmsContactGroup(siteId: string, bgNo: number, bgName: string, csrfToken: string) {
  return transport.request<AdminSmsContactGroup, { bg_name: string }>({ method: "PUT", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups/${bgNo}`, csrfToken, body: { bg_name: bgName } });
}

export function deleteAdminSmsContactGroup(siteId: string, bgNo: number, csrfToken: string) {
  return transport.request<void>({ method: "DELETE", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups/${bgNo}?confirm=true`, csrfToken });
}

export function moveAdminSmsContactGroup(siteId: string, bgNo: number, targetBgNo: number, csrfToken: string) {
  return transport.request<{ from_bg_no: number; target_bg_no: number; affected: number }, { target_bg_no: number }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups/${bgNo}/move`, csrfToken, body: { target_bg_no: targetBgNo } });
}

export function clearAdminSmsContactGroup(siteId: string, bgNo: number, csrfToken: string) {
  return transport.request<{ bg_no: number; deleted: number }>({ method: "DELETE", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contact-groups/${bgNo}/contacts?confirm=true`, csrfToken });
}

export function listAdminSmsContacts(siteId: string, query: AdminSmsContactListQuery = {}) {
  return transport.request<AdminSmsContactList>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts${adminSmsContactQuery(query)}` });
}

export function createAdminSmsContact(siteId: string, input: AdminSmsContactCreate, csrfToken: string) {
  return transport.request<AdminSmsContact, AdminSmsContactCreate>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts`, csrfToken, body: input });
}

export function getAdminSmsContact(siteId: string, bkNo: number) {
  return transport.request<AdminSmsContact>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts/${bkNo}` });
}

export function updateAdminSmsContact(siteId: string, bkNo: number, input: AdminSmsContactUpdate, csrfToken: string) {
  return transport.request<AdminSmsContact, AdminSmsContactUpdate>({ method: "PUT", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts/${bkNo}`, csrfToken, body: input });
}

export function deleteAdminSmsContact(siteId: string, bkNo: number, csrfToken: string) {
  return transport.request<void>({ method: "DELETE", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts/${bkNo}?confirm=true`, csrfToken });
}

export function batchAdminSmsContacts(siteId: string, input: AdminSmsContactBatch, csrfToken: string) {
  return transport.request<AdminSmsContactBatchResult, AdminSmsContactBatch & { confirm_action: true }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts/batch`, csrfToken, body: { ...input, confirm_action: true } });
}

export function importAdminSmsContacts(siteId: string, input: AdminSmsContactImport, csrfToken: string) {
  return transport.request<AdminSmsContactImportResult, AdminSmsContactImport & { confirm_import: boolean }>({ method: "POST", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts/import`, csrfToken, body: { ...input, confirm_import: !input.dry_run } });
}

export function exportAdminSmsContacts(siteId: string, query: AdminSmsContactExportQuery = {}) {
  const search = new URLSearchParams();
  if (query.bg_no !== undefined) search.set("bg_no", String(query.bg_no));
  if (query.include_no_phone !== undefined) search.set("include_no_phone", String(query.include_no_phone));
  if (query.with_hyphen !== undefined) search.set("with_hyphen", String(query.with_hyphen));
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminSmsContactExport>({ method: "GET", path: `/sites/${encodeURIComponent(siteId)}/admin/sms/contacts/export${suffix}` });
}

export function listAdminPoints(siteId: string, query: AdminPointListQuery = {}) {
  const search = new URLSearchParams();
  if (query.page !== undefined) search.set("page", String(query.page));
  if (query.per_page !== undefined) search.set("per_page", String(query.per_page));
  if (query.mb_id) search.set("mb_id", query.mb_id);
  if (query.search_field) search.set("search_field", query.search_field);
  if (query.search) search.set("search", query.search);
  const suffix = search.size ? `?${search.toString()}` : "";
  return transport.request<AdminPointList>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points${suffix}`,
  });
}

export function createAdminPointAction(
  siteId: string,
  action: AdminPointAction,
  csrfToken: string,
) {
  return transport.request<AdminPointActionResult, AdminPointAction>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points`,
    csrfToken,
    body: action,
  });
}

export function deleteAdminPoints(
  siteId: string,
  input: AdminPointDelete,
  csrfToken: string,
) {
  return transport.request<AdminPointDeleteResult, AdminPointDelete>({
    method: "DELETE",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points`,
    csrfToken,
    body: input,
  });
}

export function grantAdminPoint(
  siteId: string,
  change: AdminPointChange,
  csrfToken: string,
) {
  return transport.request<AdminPointChangeResult, AdminPointChange>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points/grant`,
    csrfToken,
    body: change,
  });
}

export function deductAdminPoint(
  siteId: string,
  change: AdminPointChange,
  csrfToken: string,
) {
  return transport.request<AdminPointChangeResult, AdminPointChange>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points/deduct`,
    csrfToken,
    body: change,
  });
}

export function getAdminPointSummary(siteId: string, mbId?: string) {
  const suffix = mbId ? `?mb_id=${encodeURIComponent(mbId)}` : "";
  return transport.request<AdminPointSummary>({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points/summary${suffix}`,
  });
}

export function expireAdminPoints(
  siteId: string,
  input: AdminPointExpire,
  csrfToken: string,
) {
  return transport.request<AdminPointExpireResult, AdminPointExpire>({
    method: "POST",
    path: `/sites/${encodeURIComponent(siteId)}/admin/points/expire`,
    csrfToken,
    body: input,
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
