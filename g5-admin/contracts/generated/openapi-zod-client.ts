import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

type ProblemDetails = {
  type: string;
  status: number;
  title: string;
  detail: string;
  instance?: string | undefined;
  error_code?: string | undefined;
  error_category?: string | undefined;
  fault_domain?: string | undefined;
  owner?: string | undefined;
  retryable?: boolean | undefined;
  user_actionable?: boolean | undefined;
  request_id?: string | undefined;
  correlation_id?: string | undefined;
  server_request_id?: string | undefined;
  meta?: Meta | undefined;
  guide?: ErrorGuide | undefined;
  errors?: {} | undefined;
};
type Meta = Partial<{
  request_id: string;
  correlation_id: string;
  server_request_id: string;
  server_time: string;
  version: string;
  error_code: string;
  error_category: string;
  fault_domain: string;
  owner: string;
  retryable: boolean;
  user_actionable: boolean;
}>;
type ErrorGuide = Partial<{
  action: string;
  reason: string;
  docs: string;
  related_fields: Array<string>;
}>;
type HealthResponse = {
  /**
   * @example "ok"
   */
  status: string;
  /**
   * @example "1.0.0"
   */
  version: string;
  timestamp: number;
  meta: Meta;
};
type TokenResponse = {
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  meta: Meta;
};
type AuthLogoutResult = {
  revoked: AuthLogoutRevoked;
  logged_out: boolean;
};
type AuthLogoutRevoked = {
  access: boolean;
  refresh: boolean;
};
type AuthLogoutResponse = {
  data: AuthLogoutResult;
  meta: Meta;
};
type AvailabilityResponse = {
  data: AvailabilityCheck;
  meta?: Meta | undefined;
};
type AvailabilityCheck = {
  /**
   * @enum member_id, nick, email, phone, recommender
   */
  type: "member_id" | "nick" | "email" | "phone" | "recommender";
  input: string;
  normalized_value: string;
  available: boolean;
  /**
   * @enum available, already_taken, invalid, blocked, feature_disabled, not_found
   */
  reason:
    | "available"
    | "already_taken"
    | "invalid"
    | "blocked"
    | "feature_disabled"
    | "not_found";
  message: string;
};
type RegisterResponse = {
  data: {
    mb_id: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  meta?: Meta | undefined;
};
type ExternalAuthProviderListResponse = {
  data: {
    providers: Array<ExternalAuthProviderDefinition>;
  };
  meta?: Meta | undefined;
};
type ExternalAuthProviderDefinition = {
  provider: string;
  label: string;
  /**
   * @enum fake, sandbox, live
   */
  mode: "fake" | "sandbox" | "live";
  description: string;
  flows: Array<
    /**
     * @enum login, identity_verify, account_link
     */
    "login" | "identity_verify" | "account_link"
  >;
  sandbox_available: boolean;
  replay_supported: boolean;
  runtime_replay_enabled: boolean;
};
type ExternalAuthStartResponse = {
  data: {
    provider: string;
    /**
     * @enum login, identity_verify, account_link
     */
    flow: "login" | "identity_verify" | "account_link";
    request_token: string;
    state: string;
    callback_url: string;
    /**
     * @enum GET, POST
     */
    callback_method: "GET" | "POST";
    authorization_url: string;
    expires_in: number;
    /**
     * @enum fake, sandbox, live, external
     */
    provider_mode: "fake" | "sandbox" | "live" | "external";
    provider_meta?: {} | undefined;
  };
  meta?: Meta | undefined;
};
type ExternalAuthLinkage = {
  /**
   * @enum linked, candidate, ambiguous, signup_required, unresolvable
   */
  status:
    | "linked"
    | "candidate"
    | "ambiguous"
    | "signup_required"
    | "unresolvable";
  reason: string;
  linked_member?: ExternalAuthLinkedMember | undefined;
  candidate_member?: ExternalAuthLinkedMember | undefined;
};
type ExternalAuthLinkedMember = Partial<{
  mb_id: string;
  mb_email: string;
  mb_name: string;
  mb_nick: string;
  mb_level: number;
  active: boolean;
}>;
type ExternalAuthSessionPayload = {
  mb_id: string;
  provider: string;
  provider_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  link: ExternalAuthLinkRecord;
};
type ExternalAuthLinkRecord = {
  link_id: number;
  provider: string;
  provider_user_id: string;
  mb_id: string;
  provider_email: string;
  provider_profile?: {} | undefined;
  linked_at: string;
  updated_at: string;
};
type ExternalAuthSessionResponse = {
  data: ExternalAuthSessionPayload;
  meta?: Meta | undefined;
};
type ExternalAuthClaimResponse = {
  data: ExternalAuthSessionPayload & {
    claimed: boolean;
  };
  meta?: Meta | undefined;
};
type ExternalAuthRegistrationResponse = {
  data: ExternalAuthSessionPayload & {
    registered: boolean;
  };
  meta?: Meta | undefined;
};
type ExternalAuthLinkResponse = {
  data: ExternalAuthLinkRecord;
  meta?: Meta | undefined;
};
type ExternalAuthLinkListResponse = {
  data: {
    links: Array<ExternalAuthLinkRecord>;
  };
  meta?: Meta | undefined;
};
type ExternalAuthCompleteResponse = {
  data: {
    provider: string;
    /**
     * @enum login, identity_verify, account_link
     */
    flow: "login" | "identity_verify" | "account_link";
    /**
     * @enum success, pending, cancelled, failed, expired, requires_user_action
     */
    status:
      | "success"
      | "pending"
      | "cancelled"
      | "failed"
      | "expired"
      | "requires_user_action";
    internal_request_id: string;
    state: string;
    provider_tx_id: string;
    retryable: boolean;
    user_action_required: boolean;
    error_code?: (string | null) | undefined;
    error_message?: (string | null) | undefined;
    provider_user?: ExternalAuthProviderUser | undefined;
    linkage: ExternalAuthLinkage;
    available_actions: Array<
      /**
       * @enum session, claim, register
       */
      "session" | "claim" | "register"
    >;
    transition_token?: (string | null) | undefined;
    link_token?:
      | /**
       * legacy alias. 신규 클라이언트는 `transition_token`을 사용합니다.
       */
      (string | null)
      | undefined;
    provider_payload?: {} | undefined;
    provider_meta?: {} | undefined;
  };
  meta?: Meta | undefined;
};
type ExternalAuthProviderUser = Partial<{
  provider_user_id: string;
  email: string;
  display_name: string;
}>;
type AdminNewPostsDeleteResponse = {
  data: AdminNewPostsDeleteResult;
  meta: Meta;
};
type AdminNewPostsDeleteResult = {
  deleted: boolean;
  /**
   * @minimum 0
   */
  deleted_count: number;
  /**
   * @minimum 0
   */
  deleted_posts: number;
  /**
   * @minimum 0
   */
  deleted_comments: number;
  /**
   * @minimum 0
   */
  skipped: number;
  bn_ids: Array</**
   * @minimum 1
   */
  number>;
};
type AdminBoardListResponse = {
  data: Array<AdminBoard>;
  pagination: Pagination;
  meta: Meta;
};
type AdminBoard = Partial<{
  "<<": unknown;
  bo_table: string;
  bo_count_write: number;
  bo_count_comment: number;
  bo_notice: string;
}>;
type Pagination = Partial<{
  /**
   * @enum cursor
   */
  mode: "cursor";
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  cursor: string | null;
  next_cursor: string | null;
  has_next: boolean;
  has_prev: boolean;
}>;
type AdminBoardDetailResponse = {
  data: AdminBoard;
  meta: Meta;
};
type BoardListResponse = {
  data: Array<BoardSummary>;
  pagination: Pagination;
  meta: Meta;
};
type BoardSummary = {
  bo_table: string;
  bo_subject: string;
  gr_id: string;
  gr_subject: string;
  bo_read_level: number;
  bo_write_level: number;
  bo_comment_level: number;
  bo_use_category: number;
  bo_category_list: string;
  bo_count_write: number;
  bo_count_comment: number;
  bo_use_secret: number;
  bo_use_dhtml_editor: number;
  bo_upload_count: number;
  bo_upload_size: number;
};
type BoardDetailResponse = {
  data: BoardDetail;
  meta: Meta;
};
type BoardDetail = {
  bo_table: string;
  bo_subject: string;
  gr_id: string;
  bo_admin: string;
  gr_admin: string;
  gr_use_access: number;
  bo_read_level: number;
  bo_write_level: number;
  bo_reply_level: number;
  bo_comment_level: number;
  bo_use_category: number;
  bo_category_list: string;
  bo_count_delete: number;
  bo_count_write: number;
  bo_count_comment: number;
  bo_use_secret: number;
  bo_use_dhtml_editor: number;
  bo_upload_count: number;
  bo_upload_size: number;
  bo_list_level: number;
  bo_download_level: number;
  bo_read_point: number;
  bo_write_point: number;
  bo_comment_point: number;
  bo_download_point: number;
};
type AdminFieldSchema = {
  name: string;
  label: string;
  /**
   * @enum text, textarea, select, checkbox, radio, password, file, number, date, datetime-local, hidden
   */
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
  /**
   * @enum string, integer, boolean, file
   */
  data_type: "string" | "integer" | "boolean" | "file";
  required: boolean;
  create_only: boolean;
  readonly_on_update: boolean;
  description?: (string | null) | undefined;
  options: Array<AdminFieldOption>;
  option_source?: AdminFieldOptionSource | undefined;
  default_value: string | number | boolean | null;
};
type AdminFieldOption = {
  value: string;
  label: string;
};
type AdminFieldOptionSource = {
  /**
   * @enum endpoint, directory
   */
  kind: "endpoint" | "directory";
  name: string;
  endpoint?: (string | null) | undefined;
  value_field?: (string | null) | undefined;
  label_field?: (string | null) | undefined;
};
type AdminSchemaSection = {
  key: string;
  label: string;
  order: number;
  description?: (string | null) | undefined;
  fields: Array<AdminFieldSchema>;
};
type AdminSchemaCatalog = {
  items: Array<AdminSchemaDomainSummary>;
  total: number;
};
type AdminSchemaDomainSummary = {
  domain: string;
  title: string;
  legacy_form: string;
  field_count: number;
  section_count: number;
  generated_at: string;
};
type AdminSchemaCatalogResponse = {
  data: AdminSchemaCatalog;
  meta: Meta;
};
type AdminSchemaDetail = {
  domain: string;
  title: string;
  legacy_form: string;
  generated_at: string;
  field_count: number;
  section_count: number;
  layout?: AdminSchemaLayout | undefined;
  sections: Array<AdminSchemaSection>;
  fields_by_name: {};
};
type AdminSchemaLayout = {
  /**
   * @enum tabs, stack
   */
  desktop: "tabs" | "stack";
  /**
   * @enum accordion, stack
   */
  mobile: "accordion" | "stack";
  single_open: boolean;
};
type AdminSchemaDetailResponse = {
  data: AdminSchemaDetail;
  meta: Meta;
};
type PostListResponse = {
  data: Array<Post>;
  pagination: Pagination;
  meta: Meta;
};
type Post = {
  wr_id: number;
  wr_num: number;
  wr_parent: number;
  wr_is_comment: number;
  wr_comment: number;
  wr_comment_reply: string;
  wr_subject: string;
  wr_content: string;
  wr_name: string;
  wr_email: string | null;
  wr_hp: string | null;
  wr_datetime: string;
  wr_last: string;
  wr_hit: number;
  wr_good: number;
  wr_nogood: number;
  wr_option: string;
  ca_name: string | null;
  mb_id: string | null;
  wr_link1: string;
  wr_link2: string;
  wr_link1_hit: number;
  wr_link2_hit: number;
  is_notice: boolean;
};
type PostDetailResponse = {
  data: Post;
  meta: Meta;
};
type PostCreateRequest = {
  /**
   * @minLength 1
   * @maxLength 255
   */
  wr_subject: string;
  /**
   * @minLength 1
   */
  wr_content: string;
  ca_name?: string | undefined;
  wr_option?: string | undefined;
  wr_link1?: string | undefined;
  wr_link2?: string | undefined;
  is_notice?: PostNoticeInput | undefined;
};
type PostNoticeInput = boolean | number | number | string;
type PostUpdateRequest = Partial<{
  /**
   * @minLength 1
   * @maxLength 255
   */
  wr_subject: string;
  /**
   * @minLength 1
   */
  wr_content: string;
  ca_name: string;
  wr_option: string;
  wr_link1: string;
  wr_link2: string;
  is_notice: PostNoticeInput;
}>;
type PostCreateResponse = {
  data: PostCreated;
  meta: Meta;
};
type PostCreated = {
  wr_id: number;
  bo_table: string;
};
type PostReplyResponse = {
  data: PostReplyCreated;
  meta: Meta;
};
type PostReplyCreated = {
  wr_id: number;
  bo_table: string;
  parent_wr_id: number;
};
type PostScrapCreateResponse = {
  data: PostScrapCreated;
  meta: Meta;
};
type PostScrapCreated = {
  ms_id: number;
  bo_table: string;
  wr_id: number;
  scraped: boolean;
};
type NewPostListResponse = {
  data: Array<{}>;
  pagination: Pagination;
  meta: Meta;
};
type CommentListResponse = {
  data: Array<Comment>;
  meta: Meta;
};
type Comment = {
  wr_id: number;
  wr_parent: number;
  wr_comment: number;
  wr_comment_reply: string;
  wr_content: string;
  mb_id: string;
  wr_name: string;
  wr_datetime: string;
};
type CommentDetailResponse = {
  data: Comment;
  meta: Meta;
};
type PostFileResponse = {
  data: PostFile;
  meta: Meta;
};
type PostFile = {
  bo_table: string;
  wr_id: number;
  bf_no: number;
  bf_source: string;
  bf_file: string;
  bf_content: string;
  bf_fileurl: string;
  bf_thumburl: string;
  bf_storage: string;
  bf_download: number;
  bf_filesize: number;
  bf_width: number;
  bf_height: number;
  bf_type: number;
  bf_datetime: string;
  bf_file_mime: string;
};
type PostFileListResponse = {
  data: Array<PostFile>;
  pagination: Pagination;
  meta: Meta;
};
type PostVoteResponse = {
  data: PostVoteResult;
  meta: Meta;
};
type PostVoteResult = {
  wr_good: number;
  wr_nogood: number;
};
type AdminMemberListResponse = {
  data: Array<AdminMember>;
  pagination: Pagination;
  meta: Meta;
};
type AdminMember = {
  /**
   * @minimum 0
   */
  mb_no: number;
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  mb_nick_date: string;
  mb_email: string;
  mb_homepage: string;
  /**
   * @minimum 0
   * @maximum 10
   */
  mb_level: number;
  mb_sex: string;
  mb_birth: string;
  mb_tel: string;
  mb_hp: string;
  mb_certify: string;
  /**
   * @enum 0, 1
   */
  mb_adult: 0 | 1;
  mb_zip: string;
  mb_zip1: string;
  mb_zip2: string;
  mb_addr1: string;
  mb_addr2: string;
  mb_addr3: string;
  mb_addr_jibeon: string;
  mb_signature: string;
  mb_recommend: string;
  mb_point: number;
  mb_today_login: string;
  mb_login_ip: string;
  mb_datetime: string;
  mb_ip: string;
  /**
   * @pattern ^(\d{8}|)$
   */
  mb_leave_date: string;
  /**
   * @pattern ^(\d{8}|)$
   */
  mb_intercept_date: string;
  mb_email_certify: string;
  mb_memo: string;
  /**
   * @enum 0, 1
   */
  mb_mailling: 0 | 1;
  mb_mailling_date: string;
  /**
   * @enum 0, 1
   */
  mb_sms: 0 | 1;
  mb_sms_date: string;
  /**
   * @enum 0, 1
   */
  mb_open: 0 | 1;
  mb_open_date: string;
  mb_profile: string;
  mb_memo_call: string;
  /**
   * @minimum 0
   */
  mb_memo_cnt: number;
  /**
   * @minimum 0
   */
  mb_scrap_cnt: number;
  /**
   * @enum 0, 1
   */
  mb_marketing_agree: 0 | 1;
  mb_marketing_date: string;
  /**
   * @enum 0, 1
   */
  mb_thirdparty_agree: 0 | 1;
  mb_thirdparty_date: string;
  mb_agree_log: string;
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
};
type AdminMemberDetailResponse = {
  data: AdminMember;
  meta: Meta;
};
type AdminMemberMediaUploadResponse = {
  data: AdminMemberMediaUploadResult;
  meta: Meta;
};
type AdminMemberMediaUploadResult = {
  mb_id: string;
  /**
   * @enum member, member_image
   */
  storage: "member" | "member_image";
  relative_path: string;
  url: string;
  /**
   * @minimum 0
   */
  size: number;
  /**
   * @minimum 0
   */
  width: number;
  /**
   * @minimum 0
   */
  height: number;
  mime: string;
};
type AdminMemberMediaDeleteResponse = {
  data: AdminMemberMediaDeleteResult;
  meta: Meta;
};
type AdminMemberMediaDeleteResult = {
  mb_id: string;
  /**
   * @enum member, member_image
   */
  storage: "member" | "member_image";
  relative_path: string;
  url: string;
  deleted: boolean;
};
type MemberListResponse = {
  data: Array<Member>;
  pagination: Pagination;
  meta: Meta;
};
type Member = Partial<{
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  mb_nick_date: string;
  mb_email: string;
  mb_level: number;
  mb_point: number;
  mb_hp: string;
  mb_tel: string;
  mb_homepage: string;
  mb_zip: string;
  mb_zip1: string;
  mb_zip2: string;
  mb_addr1: string;
  mb_addr2: string;
  mb_addr3: string;
  mb_addr_jibeon: string;
  mb_open: number;
  /**
   * @pattern ^(\d{4}-\d{2}-\d{2}|0000-00-00)$
   */
  mb_open_date: string;
  mb_mailling: number;
  mb_sms: number;
  mb_marketing_agree: number;
  mb_thirdparty_agree: number;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_mailling_date: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_sms_date: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_marketing_date: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_thirdparty_date: string;
  mb_signature: string;
  mb_profile: string;
  mb_memo: string;
  mb_adult: number;
  mb_certify: string;
  mb_agree_log: string;
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
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_today_login: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_datetime: string;
  mb_leave_date: string;
  mb_intercept_date: string;
}>;
type MemberMeResponse = {
  data: Member;
  meta: Meta;
};
type MemberDetailResponse = {
  data: Member;
  meta: Meta;
};
type MenuReorderRequest = {
  orders: Array<MenuReorderItem>;
};
type MenuReorderItem = {
  /**
   * @minimum 1
   */
  me_id: number;
  /**
   * @minimum 0
   */
  me_order: number;
};
type MenuReorderResponse = {
  data: MenuReorderResult;
  meta: Meta;
};
type MenuReorderResult = {
  /**
   * @enum ok
   */
  result: "ok";
};
type MenuListResponse = {
  data: Array<MenuItem>;
  pagination: Pagination;
  meta: Meta;
};
type MenuItem = {
  me_id: number;
  me_code: string;
  me_name: string;
  me_link: string;
  me_target: string;
  me_order: number;
  /**
   * @enum 0, 1
   */
  me_use: 0 | 1;
  /**
   * @enum 0, 1
   */
  me_mobile_use: 0 | 1;
};
type MenuDetailResponse = {
  data: MenuItem;
  meta: Meta;
};
type ConfigResponse = {
  data: Config;
  meta: Meta;
};
type Config = Partial<{
  cf_title: string;
  cf_admin: string;
  cf_admin_email: string;
  cf_admin_email_name: string;
  cf_register_level: number;
  cf_register_point: number;
  cf_login_point: number;
  cf_use_point: number;
  cf_write_point: number;
  cf_comment_point: number;
  cf_download_point: number;
  cf_read_point: number;
  cf_memo_send_point: number;
  cf_use_email_certify: number;
  cf_use_homepage: number;
  cf_req_homepage: number;
  cf_use_tel: number;
  cf_req_tel: number;
  cf_use_hp: number;
  cf_req_hp: number;
  cf_use_addr: number;
  cf_req_addr: number;
  cf_new_skin: string;
  cf_search_skin: string;
  cf_connect_skin: string;
  cf_faq_skin: string;
  cf_editor: string;
  cf_member_skin: string;
  cf_mobile_member_skin: string;
  cf_captcha: string;
  cf_social_login_use: number;
  cf_cert_use: number;
  cf_stipulation: string;
  cf_privacy: string;
}>;
type AdminConfigUpdateRequest = Partial<{
  cf_title: string;
  cf_admin: string;
  cf_admin_email: string;
  cf_admin_email_name: string;
  cf_add_script: string;
  cf_use_email_certify: AdminConfigFlagInput;
  cf_email_use: string;
  cf_email_mb_member: string;
  cf_email_mb_super_admin: string;
  cf_email_po_super_admin: string;
  cf_email_wr_board_admin: string;
  cf_email_wr_comment_all: string;
  cf_email_wr_group_admin: string;
  cf_email_wr_super_admin: string;
  cf_email_wr_write: string;
  cf_use_homepage: AdminConfigFlagInput;
  cf_req_homepage: AdminConfigFlagInput;
  cf_use_tel: AdminConfigFlagInput;
  cf_req_tel: AdminConfigFlagInput;
  cf_use_hp: AdminConfigFlagInput;
  cf_req_hp: AdminConfigFlagInput;
  cf_use_addr: AdminConfigFlagInput;
  cf_req_addr: AdminConfigFlagInput;
  cf_cert_use: AdminConfigFlagInput;
  cf_cert_find: string;
  cf_cert_simple: string;
  cf_cert_use_seed: AdminConfigIntegerInput;
  cf_cert_ipin: AdminConfigFlagInput;
  cf_cert_hp: AdminConfigFlagInput;
  cf_cert_kcb_cd: string;
  cf_cert_kcp_cd: string;
  cf_cert_kcp_enckey: string;
  cf_cert_kg_cd: string;
  cf_cert_kg_mid: string;
  cf_cert_limit: AdminConfigIntegerInput;
  cf_cert_req: string;
  cf_register_level: AdminConfigIntegerInput;
  cf_register_point: AdminConfigIntegerInput;
  cf_login_point: AdminConfigIntegerInput;
  cf_login_minutes: string;
  cf_use_point: AdminConfigFlagInput;
  cf_write_point: AdminConfigIntegerInput;
  cf_comment_point: AdminConfigIntegerInput;
  cf_download_point: AdminConfigIntegerInput;
  cf_read_point: AdminConfigIntegerInput;
  cf_recommend_point: AdminConfigIntegerInput;
  cf_memo_send_point: AdminConfigIntegerInput;
  cf_cut_name: AdminConfigIntegerInput;
  cf_nick_modify: AdminConfigIntegerInput;
  cf_leave_day: AdminConfigIntegerInput;
  cf_new_skin: string;
  cf_new_rows: AdminConfigIntegerInput;
  cf_search_skin: string;
  cf_connect_skin: string;
  cf_faq_skin: string;
  cf_editor: string;
  cf_member_skin: string;
  cf_mobile_member_skin: string;
  cf_page_rows: AdminConfigIntegerInput;
  cf_write_pages: AdminConfigIntegerInput;
  cf_mobile_page_rows: AdminConfigIntegerInput;
  cf_mobile_pages: AdminConfigIntegerInput;
  cf_use_copy_log: AdminConfigFlagInput;
  cf_captcha: string;
  cf_captcha_mp3: string;
  cf_recaptcha_site_key: string;
  cf_recaptcha_secret_key: string;
  cf_syndi_token: string;
  cf_syndi_except: string;
  cf_stipulation: string;
  cf_privacy: string;
  cf_prohibit_id: string;
  cf_prohibit_email: string;
  cf_analytics: string;
  cf_add_meta: string;
  cf_filter: string;
  cf_open_modify: AdminConfigIntegerInput;
  cf_possible_ip: string;
  cf_intercept_ip: string;
  cf_bbs_rewrite: string;
  cf_search_part: AdminConfigIntegerInput;
  cf_formmail_is_member: string;
  cf_link_target: string;
  cf_1_subj: string;
  cf_2_subj: string;
  cf_3_subj: string;
  cf_4_subj: string;
  cf_5_subj: string;
  cf_6_subj: string;
  cf_7_subj: string;
  cf_8_subj: string;
  cf_9_subj: string;
  cf_10_subj: string;
  cf_1: string;
  cf_2: string;
  cf_3: string;
  cf_4: string;
  cf_5: string;
  cf_6: string;
  cf_7: string;
  cf_8: string;
  cf_9: string;
  cf_10: string;
  cf_point_term: AdminConfigIntegerInput;
  cf_delay_sec: AdminConfigIntegerInput;
  cf_new_del: AdminConfigIntegerInput;
  cf_memo_del: AdminConfigIntegerInput;
  cf_visit_del: AdminConfigIntegerInput;
  cf_popular_del: AdminConfigIntegerInput;
  cf_image_extension: string;
  cf_flash_extension: string;
  cf_movie_extension: string;
  cf_social_login_use: AdminConfigFlagInput;
  cf_facebook_appid: string;
  cf_facebook_secret: string;
  cf_twitter_key: string;
  cf_twitter_secret: string;
  cf_googl_shorturl_apikey: string;
  cf_google_clientid: string;
  cf_google_secret: string;
  cf_kakao_rest_key: string;
  cf_kakao_client_secret: string;
  cf_kakao_js_apikey: string;
  cf_naver_clientid: string;
  cf_naver_secret: string;
  cf_payco_clientid: string;
  cf_payco_secret: string;
  cf_social_servicelist: AdminConfigSocialServicesInput;
  cf_icode_server_ip: string;
  cf_icode_id: string;
  cf_icode_pw: string;
  cf_icode_server_port: AdminConfigDigitIntegerInput;
  cf_icode_token_key: string;
  cf_sms_use: string;
  cf_sms_type: string;
  cf_use_member_icon: AdminConfigIntegerInput;
  cf_icon_level: AdminConfigIntegerInput;
  cf_member_icon_width: AdminConfigIntegerInput;
  cf_member_icon_height: AdminConfigIntegerInput;
  cf_member_icon_size: AdminConfigIntegerInput;
  cf_member_img_width: AdminConfigIntegerInput;
  cf_member_img_height: AdminConfigIntegerInput;
  cf_member_img_size: AdminConfigIntegerInput;
  cf_use_profile: string;
  cf_req_profile: string;
  cf_use_signature: string;
  cf_req_signature: string;
  cf_use_recommend: string;
  cf_use_promotion: string;
  cf_mobile_new_skin: string;
  cf_mobile_search_skin: string;
  cf_mobile_connect_skin: string;
  cf_mobile_faq_skin: string;
}>;
type AdminConfigFlagInput =
  | /**
   * @enum 0, 1
   */
  (0 | 1)
  | boolean
  /**
   * @enum 0, 1, true, false, on, off, yes, no, y, n
   */
  | ("0" | "1" | "true" | "false" | "on" | "off" | "yes" | "no" | "y" | "n");
type AdminConfigIntegerInput =
  | number
  /**
   * @pattern ^-?[0-9]+$
   */
  | string;
type AdminConfigSocialServicesInput =
  /**
   * 쉼표 구분 목록
   */
  | string
  | Array<
      /**
       * @enum naver, kakao, facebook, google, twitter, payco
       */
      "naver" | "kakao" | "facebook" | "google" | "twitter" | "payco"
    >;
type AdminConfigDigitIntegerInput =
  | number
  /**
   * 레거시 관리자 호환을 위해 숫자 외 문자는 서버가 제거합니다.
   */
  | string;
type AdminConfigResponse = {
  data: AdminConfig;
  meta: Meta;
};
type AdminConfig = Partial<{
  cf_title: string;
  cf_admin: string;
  cf_admin_email: string;
  cf_admin_email_name: string;
  cf_add_script: string;
  /**
   * @enum 0, 1
   */
  cf_use_email_certify: 0 | 1;
  cf_email_use: string;
  cf_email_mb_member: string;
  cf_email_mb_super_admin: string;
  cf_email_po_super_admin: string;
  cf_email_wr_board_admin: string;
  cf_email_wr_comment_all: string;
  cf_email_wr_group_admin: string;
  cf_email_wr_super_admin: string;
  cf_email_wr_write: string;
  /**
   * @enum 0, 1
   */
  cf_use_homepage: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_req_homepage: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_use_tel: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_req_tel: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_use_hp: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_req_hp: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_use_addr: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_req_addr: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_cert_use: 0 | 1;
  cf_cert_find: string;
  cf_cert_simple: string;
  cf_cert_use_seed: number;
  /**
   * @enum 0, 1
   */
  cf_cert_ipin: 0 | 1;
  /**
   * @enum 0, 1
   */
  cf_cert_hp: 0 | 1;
  cf_cert_kcb_cd: string;
  cf_cert_kcp_cd: string;
  cf_cert_kg_cd: string;
  cf_cert_kg_mid: string;
  cf_cert_limit: number;
  cf_cert_req: string;
  cf_register_level: number;
  cf_register_point: number;
  cf_login_point: number;
  cf_login_minutes: string;
  /**
   * @enum 0, 1
   */
  cf_use_point: 0 | 1;
  cf_write_point: number;
  cf_comment_point: number;
  cf_download_point: number;
  cf_read_point: number;
  cf_recommend_point: number;
  cf_memo_send_point: number;
  cf_cut_name: number;
  cf_nick_modify: number;
  cf_leave_day: number;
  cf_new_skin: string;
  cf_new_rows: number;
  cf_search_skin: string;
  cf_connect_skin: string;
  cf_faq_skin: string;
  cf_editor: string;
  cf_member_skin: string;
  cf_mobile_member_skin: string;
  cf_page_rows: number;
  cf_write_pages: number;
  cf_mobile_page_rows: number;
  cf_mobile_pages: number;
  /**
   * @enum 0, 1
   */
  cf_use_copy_log: 0 | 1;
  cf_captcha: string;
  cf_captcha_mp3: string;
  cf_recaptcha_site_key: string;
  cf_syndi_except: string;
  cf_stipulation: string;
  cf_privacy: string;
  cf_prohibit_id: string;
  cf_prohibit_email: string;
  cf_analytics: string;
  cf_add_meta: string;
  cf_filter: string;
  cf_open_modify: number;
  cf_possible_ip: string;
  cf_intercept_ip: string;
  cf_bbs_rewrite: string;
  cf_search_part: number;
  cf_formmail_is_member: string;
  cf_link_target: string;
  cf_1_subj: string;
  cf_2_subj: string;
  cf_3_subj: string;
  cf_4_subj: string;
  cf_5_subj: string;
  cf_6_subj: string;
  cf_7_subj: string;
  cf_8_subj: string;
  cf_9_subj: string;
  cf_10_subj: string;
  cf_1: string;
  cf_2: string;
  cf_3: string;
  cf_4: string;
  cf_5: string;
  cf_6: string;
  cf_7: string;
  cf_8: string;
  cf_9: string;
  cf_10: string;
  cf_point_term: number;
  cf_delay_sec: number;
  cf_new_del: number;
  cf_memo_del: number;
  cf_visit_del: number;
  cf_popular_del: number;
  cf_image_extension: string;
  cf_flash_extension: string;
  cf_movie_extension: string;
  /**
   * @enum 0, 1
   */
  cf_social_login_use: 0 | 1;
  cf_facebook_appid: string;
  cf_twitter_key: string;
  cf_google_clientid: string;
  cf_kakao_js_apikey: string;
  cf_naver_clientid: string;
  cf_payco_clientid: string;
  cf_social_servicelist: string;
  cf_icode_server_ip: string;
  cf_icode_id: string;
  cf_icode_server_port: number;
  cf_sms_use: string;
  cf_sms_type: string;
  cf_use_member_icon: number;
  cf_icon_level: number;
  cf_member_icon_width: number;
  cf_member_icon_height: number;
  cf_member_icon_size: number;
  cf_member_img_width: number;
  cf_member_img_height: number;
  cf_member_img_size: number;
  cf_use_profile: string;
  cf_req_profile: string;
  cf_use_signature: string;
  cf_req_signature: string;
  cf_use_recommend: string;
  cf_use_promotion: string;
  cf_mobile_new_skin: string;
  cf_mobile_search_skin: string;
  cf_mobile_connect_skin: string;
  cf_mobile_faq_skin: string;
}>;
type PointChangeResponse = {
  data: PointChangeResult;
  meta: Meta;
};
type PointChangeResult = {
  mb_id: string;
  before_point: number;
  changed_point: number;
  after_point: number;
  po_content: string;
  processed_at: string;
};
type PointDeleteResponse = {
  data: PointDeleteResult;
  meta: Meta;
};
type PointDeleteResult = {
  /**
   * @minimum 0
   */
  requested_count: number;
  /**
   * @minimum 0
   */
  deleted_count: number;
};
type PointExpireResponse = {
  data: PointExpireResult;
  meta: Meta;
};
type PointExpireResult = {
  base_date: string;
  /**
   * @minimum 0
   */
  expired_count: number;
  /**
   * @minimum 0
   */
  synced_members: number;
};
type PointActionResponse = {
  data: PointChangeResult | PointExpireResult;
  meta: Meta;
};
type PointHistoryListResponse = {
  data: Array<PointItem>;
  pagination: Pagination;
  meta: Meta;
};
type PointItem = {
  po_id: number;
  mb_id: string;
  po_point: number;
  po_datetime: string;
  po_content: string;
  po_use_point: number;
  /**
   * @enum 0, 1
   */
  po_expired: 0 | 1;
  po_expire_date: string;
  po_mb_point: number;
  po_rel_table: string;
  po_rel_id: string;
  po_rel_action: string;
};
type PointSummaryResponse = {
  data: PointSummary;
  meta: Meta;
};
type PointSummary = {
  mb_id?: string | undefined;
  total_point: number;
  total_rows: number;
};
type AdminDashboardSummary = Partial<{
  members: AdminDashboardMemberSummary;
  posts: AdminDashboardPostSummary;
  points: AdminDashboardPointSummary;
  visits: VisitStatsSummary;
}>;
type AdminDashboardMemberSummary = Partial<{
  total_members: number;
  blocked_members: number;
  leave_members: number;
}>;
type AdminDashboardPostSummary = Partial<{
  total_rows: number;
}>;
type AdminDashboardPointSummary = Partial<{
  total_rows: number;
}>;
type VisitStatsSummary = Partial<{
  total_visits: number;
  active_days: number;
  first_date: string;
  last_date: string;
  visit_rows: number;
  unique_ips: number;
}>;
type AdminDashboardData = Partial<{
  limit: number;
  summary: AdminDashboardSummary;
  recent_members: Array<AdminDashboardRecentMember>;
  recent_posts: Array<AdminDashboardRecentPost>;
  recent_points: Array<AdminDashboardRecentPoint>;
}>;
type AdminDashboardRecentMember = Partial<{
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  mb_level: number;
  mb_point: number;
  mb_datetime: string;
  mb_mailling: boolean;
  mb_open: boolean;
  email_certified: boolean;
  intercepted: boolean;
  group_count: number;
}>;
type AdminDashboardRecentPost = Partial<{
  bn_id: number;
  gr_id: string;
  gr_subject: string;
  bo_table: string;
  bo_subject: string;
  wr_id: number;
  wr_parent: number;
  /**
   * @enum w, c
   */
  view_type: "w" | "c";
  wr_subject: string;
  parent_wr_subject: string;
  wr_name: string;
  wr_datetime: string;
  post_mb_id: string;
  post_exists: boolean;
}>;
type AdminDashboardRecentPoint = Partial<{
  po_id: number;
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  po_datetime: string;
  po_content: string;
  po_point: number;
  po_mb_point: number;
  po_rel_table: string;
  po_rel_id: string;
  po_rel_action: string;
}>;
type AdminDashboardResponse = {
  data: AdminDashboardData;
  meta: Meta;
};
type VisitStatsData = Partial<{
  /**
   * @enum date, hour, week, month, year, browser, os, device, domain, search
   */
  type:
    | "date"
    | "hour"
    | "week"
    | "month"
    | "year"
    | "browser"
    | "os"
    | "device"
    | "domain"
    | "search";
  summary: VisitStatsSummary;
  items: Array<VisitStatItem>;
}>;
type VisitStatItem = Partial<{
  stat_key: string;
  visit_count: number;
}>;
type VisitStatsResponse = {
  data: VisitStatsData;
  meta: Meta;
};
type VisitSearchResponse = {
  data: Array<VisitLogItem>;
  pagination: Pagination;
  meta: Meta;
};
type VisitLogItem = Partial<{
  vi_id: number;
  vi_ip: string;
  vi_date: string;
  vi_time: string;
  vi_referer: string;
  vi_agent: string;
  vi_browser: string;
  vi_os: string;
  vi_device: string;
}>;
type VisitDeleteResponse = {
  data: VisitDeleteResult;
  meta: Meta;
};
type VisitDeleteResult = {
  deleted_rows: number;
  before: string | null;
  date_from: string | null;
  date_to: string | null;
  ip: string | null;
};
type AdminPushSendResponse = {
  data: AdminPushSendResult;
  meta: Meta;
};
type AdminPushSendResult = {
  requested_by: string;
  target_count: number;
  queued: number;
  failed: number;
};
type AdminReportListResponse = {
  data: Array<AdminReportItem>;
  pagination: Pagination;
  meta: Meta;
};
type AdminReportItem = {
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
};
type AdminReportDetailResponse = {
  data: AdminReportItem;
  meta: Meta;
};
type AdminReportStatsResponse = {
  data: AdminReportStats;
  meta: Meta;
};
type AdminReportStats = {
  pending: number;
  approved: number;
  rejected: number;
  hold: number;
  total: number;
};
type AdminQaBulkDeleteResponse = {
  data: AdminQaBulkDeleteResult;
  meta: Meta;
};
type AdminQaBulkDeleteResult = {
  deleted_count: number;
  qa_ids: Array</**
   * @minimum 1
   */
  number>;
};
type GroupListResponse = {
  data: Array<Group>;
  pagination: Pagination;
  meta: Meta;
};
type Group = {
  gr_id: string;
  gr_subject: string;
  gr_admin: string;
  /**
   * @enum both, pc, mobile
   */
  gr_device: "both" | "pc" | "mobile";
  /**
   * @enum 0, 1
   */
  gr_use_access: 0 | 1;
};
type GroupDetailResponse = {
  data: Group;
  meta: Meta;
};
type AdminGroupMemberListResponse = {
  data: Array<AdminGroupMember>;
  pagination: Pagination;
  meta: Meta;
};
type AdminGroupMember = {
  /**
   * @minimum 0
   */
  gm_id: number;
  gr_id: string;
  mb_id: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  gm_datetime: string;
  mb_name: string | null;
  mb_nick: string | null;
  mb_level: number | null;
  mb_today_login: string | null;
};
type AdminGroupMemberResponse = {
  data: AdminGroupMemberResult;
  meta: Meta;
};
type AdminGroupMemberResult = {
  gr_id: string;
  mb_id: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  gm_datetime: string;
};
type AdminMailDetail = {
  /**
   * @minimum 1
   */
  ma_id: number;
  ma_subject: string;
  ma_content: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  ma_time: string;
  ma_ip: string;
  ma_last_option: string;
  last_option: AdminMailLastOption;
  preview_html: string;
};
type AdminMailLastOption = {
  /**
   * @enum 0, 1
   */
  mb_id1: 0 | 1;
  mb_id1_from: string;
  mb_id1_to: string;
  mb_email: string;
  /**
   * @enum 0, 1
   */
  mb_mailling: 0 | 1;
  /**
   * @minimum 1
   * @maximum 10
   */
  mb_level_from: number;
  /**
   * @minimum 1
   * @maximum 10
   */
  mb_level_to: number;
  gr_id: string;
};
type AdminMailSendResult = {
  /**
   * @minimum 1
   */
  ma_id: number | null;
  template_used: boolean;
  /**
   * @minimum 0
   */
  target_count: number;
  /**
   * @minimum 0
   */
  sent_count: number;
  /**
   * @minimum 0
   */
  skipped_count: number;
  mail_enabled: boolean;
  dry_run: boolean;
  targets: Array<AdminMailSendTarget>;
};
type AdminMailSendTarget = {
  mb_id: string;
  mb_email: string;
};
type AdminMailListResponse = {
  data: Array<AdminMailTemplate>;
  pagination: Pagination;
  meta: Meta;
};
type AdminMailTemplate = {
  /**
   * @minimum 1
   */
  ma_id: number;
  ma_subject: string;
  ma_content: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  ma_time: string;
  ma_ip: string;
  ma_last_option: string;
};
type AdminMailDetailResponse = {
  data: AdminMailDetail;
  meta: Meta;
};
type AdminMailRecipientListResponse = {
  data: Array<AdminMailRecipient>;
  pagination: Pagination;
  meta: Meta;
};
type AdminMailRecipient = {
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  mb_email: string;
  /**
   * @minimum 1
   * @maximum 10
   */
  mb_level: number;
  /**
   * @enum 0, 1
   */
  mb_mailling: 0 | 1;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  mb_datetime: string;
};
type AdminMailSendResponse = {
  data: AdminMailSendResult;
  meta: Meta;
};
type AdminMailTestResponse = {
  data: AdminMailTestResult;
  meta: Meta;
};
type AdminMailTestResult = {
  /**
   * @minimum 1
   */
  ma_id: number | null;
  template_used: boolean;
  mail_enabled: boolean;
  sent: boolean;
  to: string;
};
type ContentListResponse = {
  data: Array<ContentItem>;
  pagination: Pagination;
  meta: Meta;
};
type ContentItem = {
  /**
   * @pattern ^[a-zA-Z0-9_]{1,20}$
   */
  co_id: string;
  co_subject: string;
  /**
   * @enum 0, 1, 2
   */
  co_html: 0 | 1 | 2;
  co_content: string;
  co_mobile_content: string;
  co_include_head: string;
  co_include_tail: string;
  /**
   * @enum 0, 1
   */
  co_tag_filter_use: 0 | 1;
  co_skin: string;
  co_mobile_skin: string;
};
type ContentDetailResponse = {
  data: ContentItem;
  meta: Meta;
};
type AdminAuthMember = {
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  auths: Array<AdminAuthAssignment>;
};
type AdminAuthAssignment = {
  /**
   * @pattern ^[0-9]{3,6}$
   */
  au_menu: string;
  /**
   * @pattern ^[rwd](,[rwd]){0,2}$
   */
  au_auth: string;
};
type AdminAuthMemberListResponse = {
  data: Array<AdminAuthMember>;
  pagination: Pagination;
  meta: Meta;
};
type AdminAuthMemberResponse = {
  data: AdminAuthMember;
  meta: Meta;
};
type AdminAuthListResponse = {
  data: Array<AdminSystemPermission>;
  pagination: Pagination;
  meta: Meta;
};
type AdminSystemPermission = {
  mb_id: string;
  au_menu: string;
  au_auth: string;
  mb_name?: (string | null) | undefined;
  mb_nick?: (string | null) | undefined;
};
type AdminSystemPermissionResponse = {
  data: AdminSystemPermission;
  meta: Meta;
};
type PopupListResponse = {
  data: Array<Popup>;
  pagination: Pagination;
  meta: Meta;
};
type Popup = Partial<{
  nw_id: number;
  nw_division: string;
  nw_device: string;
  nw_begin_time: string;
  nw_end_time: string;
  nw_disable_hours: number;
  nw_left: number;
  nw_top: number;
  nw_height: number;
  nw_width: number;
  nw_subject: string;
  nw_content: string;
  nw_content_html: number;
}>;
type PopupDetailResponse = {
  data: Popup;
  meta: Meta;
};
type PollListResponse = {
  data: Array<PollSummary>;
  pagination: Pagination;
  meta: Meta;
};
type PollSummary = {
  po_id: number;
  po_subject: string;
  po_date: string;
  po_level: number;
  po_point: number;
  po_use: number;
};
type PollDetailResponse = {
  data: Poll;
  meta: Meta;
};
type Poll = {
  po_id: number;
  po_subject: string;
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
  po_level: number;
  po_point: number;
  po_date: string;
  po_ips: string;
  mb_ids: string;
  po_use: number;
};
type PollPublicResult = {
  po_id: number;
  po_subject: string;
  po_date: string;
  po_level: number;
  po_point: number;
  po_use: number;
  po_etc: string;
  total_votes: number;
  choices: Array<PollChoice>;
  etc_items?: Array<PollEtcItem> | undefined;
};
type PollChoice = {
  /**
   * @minimum 1
   * @maximum 9
   */
  no: number;
  text: string;
  count: number;
  percent: number;
};
type PollEtcItem = {
  pc_id: number;
  po_id: number;
  mb_id: string;
  pc_name: string;
  pc_idea: string;
  pc_datetime: string;
};
type PollActiveResult = {
  active: boolean;
  can_vote: boolean;
  poll: PollPublicResult;
};
type PollActiveResponse = {
  data: PollActiveResult;
  meta: Meta;
};
type PollVoteResponse = {
  data: PollVoteResult;
  meta: Meta;
};
type PollVoteResult = {
  voted: boolean;
  po_id: number;
  poll_no: number;
  choice: string;
};
type PollResultResponse = {
  data: PollPublicResult;
  meta: Meta;
};
type AdminPollUpdateRequest = Partial<{
  /**
   * @minLength 1
   */
  po_subject: string;
  options: Array<string>;
  po_poll1: string;
  po_poll2: string;
  po_poll3: string;
  po_poll4: string;
  po_poll5: string;
  po_poll6: string;
  po_poll7: string;
  po_poll8: string;
  po_poll9: string;
  /**
   * @maxLength 125
   */
  po_etc: string;
  po_level: AdminPollIntegerInput;
  po_point: AdminPollIntegerInput;
  po_use: AdminPollFlagInput;
}>;
type AdminPollIntegerInput =
  | number
  /**
   * @pattern ^-?[0-9]+$
   */
  | string;
type AdminPollFlagInput =
  | /**
   * @enum 0, 1
   */
  (0 | 1)
  | boolean
  /**
   * @enum 0, 1, true, false, on, off, yes, no, y, n
   */
  | ("0" | "1" | "true" | "false" | "on" | "off" | "yes" | "no" | "y" | "n");
type AdminPollListResponse = {
  data: Array<Poll>;
  pagination: Pagination;
  meta: Meta;
};
type AdminPopularListResponse = {
  data: Array<AdminPopularItem>;
  pagination: Pagination;
  meta: Meta;
};
type AdminPopularItem = {
  pp_word: string;
  pp_date: string;
  pp_cnt: number;
  pp_rank: number;
};
type AdminPopularResetResponse = {
  data: AdminPopularResetResult;
  meta: Meta;
};
type AdminPopularResetResult = {
  deleted_rows: number;
  date_from: string | null;
  date_to: string | null;
};
type AdminPopularRankResponse = {
  data: Array<AdminPopularRankItem>;
  pagination: Pagination;
  meta: Meta;
};
type AdminPopularRankItem = {
  rank: number;
  pp_word: string;
  hit_count: number;
  first_date: string;
  last_date: string;
};
type AdminWriteCountStats = {
  /**
   * @enum hour, day, week, month, year
   */
  period: "hour" | "day" | "week" | "month" | "year";
  date_from: string;
  date_to: string;
  bo_table: string | null;
  summary: AdminWriteCountSummary;
  items: Array<AdminWriteCountItem>;
};
type AdminWriteCountSummary = {
  write_total: number;
  comment_total: number;
};
type AdminWriteCountItem = {
  bucket: string;
  write_count: number;
  comment_count: number;
};
type AdminWriteCountStatsResponse = {
  data: AdminWriteCountStats;
  meta: Meta;
};
type AdminSystemQaConfigResponse = {
  data: AdminSystemQaConfig;
  meta: Meta;
};
type AdminSystemQaConfig = {
  qa_id: number;
  "<<"?: unknown | undefined;
};
type AdminSystemThemeConfigResponse = {
  data: AdminSystemThemeConfig;
  meta: Meta;
};
type AdminSystemThemeConfig = {
  cf_theme: string;
  cf_mobile_theme: string;
  cf_theme_installed: boolean;
  cf_mobile_theme_installed: boolean;
  installed_count: number;
};
type AdminSystemThemeListResponse = {
  data: Array<AdminSystemTheme>;
  meta: AdminSystemThemeListMeta;
};
type AdminSystemTheme = {
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
  theme_config: {};
};
type AdminSystemThemeListMeta = {
  server_time: string;
  version: string;
  total?: number | undefined;
  request_id?: string | undefined;
  correlation_id?: string | undefined;
  server_request_id?: string | undefined;
};
type AdminSystemThemeDetailResponse = {
  data: AdminSystemTheme;
  meta: Meta;
};
type AdminSystemPhpInfoResponse = {
  data: AdminSystemPhpInfo;
  meta: Meta;
};
type AdminSystemPhpInfo = {
  php_version: string;
  sapi: string;
  loaded_ini: string | null;
  scanned_ini: string | null;
  extension_count: number;
  html: string;
};
type AdminSystemMaintenanceResponse = {
  data: AdminSystemMaintenanceResult;
  meta: Meta;
};
type AdminSystemMaintenanceResult = {
  task: string;
  /**
   * @enum completed, skipped
   */
  status: "completed" | "skipped";
  directory: string;
  deleted_count: number;
  deleted_paths: Array<string>;
  message?: string | undefined;
  social_log_deleted_count?: number | undefined;
};
type AdminSystemBrowscapStatusResponse = {
  data: AdminSystemBrowscapStatus;
  meta: Meta;
};
type AdminSystemBrowscapStatus = {
  available: boolean;
  plugin_path: string;
  cache_directory: string;
  cache_file: string;
  cache_exists: boolean;
  php_version: string;
  pending_visit_count: number;
  updated?: boolean | undefined;
  cache_mtime?: (string | null) | undefined;
};
type AdminSystemBrowscapConvertResponse = {
  data: AdminSystemBrowscapConvertResult;
  meta: Meta;
};
type AdminSystemBrowscapConvertResult = {
  rows: number;
  total_pending_before: number;
  processed_count: number;
  remaining_count: number;
  completed: boolean;
};
type AdminSystemMailTemplateListResponse = {
  data: Array<AdminSystemMailTemplate>;
  pagination: Pagination;
  meta: Meta;
};
type AdminSystemMailTemplate = {
  ma_id: number;
  ma_subject: string;
  ma_time: string;
  ma_ip: string;
  ma_last_option: string;
};
type AdminSystemMailRecipientListResponse = {
  data: Array<AdminSystemMailRecipient>;
  pagination: Pagination;
  meta: Meta;
};
type AdminSystemMailRecipient = {
  mb_id: string;
  mb_name: string;
  mb_nick: string;
  mb_email: string;
  mb_level: number;
  mb_mailling: number;
  mb_today_login: string;
};
type AdminSystemMailTestResponse = {
  data: AdminSystemMailTestResult;
  meta: Meta;
};
type AdminSystemMailTestResult = {
  sent: boolean;
  mail_log_id: number;
  to: string;
};
type AdminSystemMailSendResult = {
  mail_log_id: number;
  target_count: number;
  sent_count: number;
  skipped_count: number;
  mail_enabled: boolean;
  dry_run: boolean;
  recipients: Array<AdminSystemMailSendRecipient>;
};
type AdminSystemMailSendRecipient = {
  mb_id: string;
  mb_email: string;
};
type AdminSystemMailSendResponse = {
  data: AdminSystemMailSendResult;
  meta: Meta;
};
type FaqListResponse = {
  data: Array<FaqItem>;
  pagination: Pagination;
  meta: Meta;
};
type FaqItem = {
  fa_id: number;
  fm_id: number;
  fm_subject: string | null;
  fa_subject: string;
  fa_content: string;
  fa_order: number;
};
type FaqDetailResponse = {
  data: FaqItem;
  meta: Meta;
};
type FaqMasterSummary = {
  fm_id: number;
  fm_subject: string;
  fm_order: number;
  faq_count: number;
  header_image: FaqImage;
  footer_image: FaqImage;
};
type FaqImage = {
  exists: boolean;
  relative_path: string;
  url: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  size: number | null;
};
type FaqMasterDetail = {
  fm_id: number;
  fm_subject: string;
  fm_head_html: string;
  fm_tail_html: string;
  fm_mobile_head_html: string;
  fm_mobile_tail_html: string;
  fm_order: number;
  faq_count: number;
  header_image: FaqImage;
  footer_image: FaqImage;
};
type FaqMasterListResponse = {
  data: Array<FaqMasterSummary>;
  pagination: Pagination;
  meta: Meta;
};
type FaqMasterDetailResponse = {
  data: FaqMasterDetail;
  meta: Meta;
};
type FaqImageResponse = {
  data: FaqImage;
  meta: Meta;
};
type AdminLayoutSaveRequest = {
  title?: string | undefined;
  widgets: Array<AdminLayoutWidget>;
};
type AdminLayoutWidget = {
  /**
   * @minLength 1
   * @maxLength 80
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  widget_id: string;
  /**
   * @enum latest_posts, notice_banner, popular_posts, category_grid, search_bar, image_carousel, ad_banner, spacer, html_block, quick_menu
   */
  type:
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
  title?: string | undefined;
  order?: /**
   * @default 1
   * @minimum 1
   */
  number | undefined;
  config?: {} | undefined;
  style?: {} | undefined;
};
type AdminLayoutListResponse = {
  data: Array<AdminLayoutSummary>;
  pagination: Pagination;
  meta: Meta;
};
type AdminLayoutSummary = {
  /**
   * @minimum 0
   */
  sl_id: number;
  sl_page_id: string;
  sl_title: string;
  /**
   * @enum 0, 1
   */
  sl_active: 0 | 1;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  sl_datetime: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  sl_updated: string;
};
type AdminLayoutDetailResponse = {
  data: AdminLayoutDetail;
  meta: Meta;
};
type AdminLayoutDetail = {
  /**
   * @minimum 0
   */
  sl_id: number;
  sl_page_id: string;
  sl_title: string;
  /**
   * `{"widgets":[]}` 루트 구조로 저장되는 JSON 문자열
   */
  sl_schema: string;
  /**
   * @enum 0, 1
   */
  sl_active: 0 | 1;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  sl_datetime: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
   */
  sl_updated: string;
};
type SmsConfigResponse = {
  data: SmsConfig;
  meta: Meta;
};
type SmsConfig = {
  cf_title: string | null;
  cf_sms_use: string | null;
  cf_sms_type: string | null;
  cf_icode_id: string | null;
  cf_icode_pw: string | null;
  cf_icode_server_ip: string | null;
  cf_icode_server_port: string | null;
  cf_icode_token_key: string | null;
  cf_phone: string | null;
  cf_datetime: string | null;
  provider_ready: boolean;
  uses_token_key: boolean;
  uses_legacy_credentials: boolean;
  storage_ready: boolean;
  missing_tables: Array<string>;
};
type AdminSmsMemberSyncResult = {
  datetime: string | null;
  summary: AdminSmsMemberSyncSummary;
};
type AdminSmsMemberSyncSummary = {
  total_members: number;
  leave_members: number;
  phone_empty: number;
  phone_valid: number;
  phone_invalid: number;
  receipt_enabled: number;
  receipt_disabled: number;
};
type AdminSmsMemberSyncResponse = {
  data: AdminSmsMemberSyncResult;
  meta: Meta;
};
type AdminSmsTemplateGroupListResponse = {
  data: Array<AdminSmsTemplateGroup>;
  meta: Meta & {
    total: number;
  };
};
type AdminSmsTemplateGroup = {
  fg_no: number;
  fg_name: string;
  fg_count: number;
  fg_member: number;
  is_virtual: boolean;
};
type AdminSmsTemplateGroupDetailResponse = {
  data: AdminSmsTemplateGroup;
  meta: Meta;
};
type AdminSmsTemplateGroupMoveResponse = {
  data: AdminSmsTemplateGroupMoveResult;
  meta: Meta;
};
type AdminSmsTemplateGroupMoveResult = {
  from_fg_no: number;
  target_fg_no: number;
  affected: number;
};
type AdminSmsTemplateGroupClearResponse = {
  data: AdminSmsTemplateGroupClearResult;
  meta: Meta;
};
type AdminSmsTemplateGroupClearResult = {
  fg_no: number;
  deleted: number;
};
type AdminSmsTemplateListResponse = {
  data: Array<AdminSmsTemplate>;
  pagination: Pagination;
  meta: Meta;
};
type AdminSmsTemplate = {
  fo_no: number;
  fg_no: number;
  fg_member: number;
  fg_name: string | null;
  fo_name: string;
  fo_content: string;
  fo_datetime: string | null;
};
type AdminSmsTemplateDetailResponse = {
  data: AdminSmsTemplate;
  meta: Meta;
};
type AdminSmsTemplateBatchResponse = {
  data: AdminSmsTemplateBatchResult;
  meta: Meta;
};
type AdminSmsTemplateBatchResult = {
  /**
   * @enum move, delete
   */
  action: "move" | "delete";
  affected: number;
  target_fg_no: number | null;
};
type AdminSmsContactGroupListResponse = {
  data: Array<AdminSmsContactGroup>;
  meta: Meta & {
    total: number;
  };
};
type AdminSmsContactGroup = {
  bg_no: number;
  bg_name: string;
  bg_count: number;
  bg_member: number;
  bg_nomember: number;
  bg_receipt: number;
  bg_reject: number;
};
type AdminSmsContactGroupDetailResponse = {
  data: AdminSmsContactGroup;
  meta: Meta;
};
type AdminSmsContactGroupMoveResponse = {
  data: AdminSmsContactGroupMoveResult;
  meta: Meta;
};
type AdminSmsContactGroupMoveResult = {
  from_bg_no: number;
  target_bg_no: number;
  affected: number;
};
type AdminSmsContactGroupClearResponse = {
  data: AdminSmsContactGroupClearResult;
  meta: Meta;
};
type AdminSmsContactGroupClearResult = {
  bg_no: number;
  deleted: number;
};
type AdminSmsContactListResponse = {
  data: Array<AdminSmsContact>;
  pagination: Pagination;
  meta: Meta & AdminSmsContactSummary;
};
type AdminSmsContact = {
  bk_no: number;
  bg_no: number;
  bg_name: string | null;
  mb_id: string | null;
  bk_name: string;
  bk_hp: string;
  /**
   * @enum 0, 1
   */
  bk_receipt: 0 | 1;
  bk_datetime: string | null;
  bk_memo: string | null;
  receipt_label: string;
  /**
   * @enum member, non_member
   */
  member_type: "member" | "non_member";
  member_sync_skipped: boolean | null;
};
type AdminSmsContactSummary = {
  total_count: number;
  receipt_count: number;
  reject_count: number;
  member_count: number;
  non_member_count: number;
  last_synced_at: string | null;
};
type AdminSmsContactDetailResponse = {
  data: AdminSmsContact;
  meta: Meta;
};
type AdminSmsContactBatchResponse = {
  data: AdminSmsContactBatchResult;
  meta: Meta;
};
type AdminSmsContactBatchResult = {
  /**
   * @enum delete, allow, reject, move, copy
   */
  action: "delete" | "allow" | "reject" | "move" | "copy";
  affected: number;
  target_bg_no: number | null;
};
type AdminSmsContactImportResponse = {
  data: AdminSmsContactImportResult;
  meta: Meta;
};
type AdminSmsContactImportResult = {
  total_count: number;
  invalid_count: number;
  duplicate_count: number;
  importable_count: number;
  imported_count: number;
  dry_run: boolean;
  duplicate_phones: Array<string>;
  importable_phones: Array<string>;
};
type AdminSmsContactExportResponse = {
  data: Array<AdminSmsContactExportItem>;
  meta: Meta & {
    total: number;
    bg_no: number | null;
    include_no_phone: boolean;
    with_hyphen: boolean;
  };
};
type AdminSmsContactExportItem = {
  bk_name: string;
  bk_hp: string;
  bg_no: number;
  mb_id: string | null;
  /**
   * @enum 0, 1
   */
  bk_receipt: 0 | 1;
};
type AdminSmsMessageBatch = {
  wr_no: number;
  wr_renum: number;
  wr_reply: string | null;
  wr_message: string | null;
  wr_booking: string | null;
  wr_total: number;
  wr_re_total: number;
  wr_success: number;
  wr_failure: number;
  wr_datetime: string | null;
  wr_memo: string | null;
  duplicate_summary: AdminSmsDuplicateSummary;
};
type AdminSmsDuplicateSummary = {
  total: number;
  phones: Array<string>;
};
type AdminSmsMessageBatchDetail = {
  wr_no: number;
  wr_renum: number;
  wr_reply: string | null;
  wr_message: string | null;
  wr_booking: string | null;
  wr_total: number;
  wr_re_total: number;
  wr_success: number;
  wr_failure: number;
  wr_datetime: string | null;
  wr_memo: string | null;
  duplicate_summary: AdminSmsDuplicateSummary;
  retry_batches: Array<AdminSmsRetryBatch>;
  deliveries: Array<AdminSmsDelivery>;
  deliveries_pagination: Pagination;
};
type AdminSmsRetryBatch = {
  wr_no: number;
  wr_renum: number;
  wr_total: number;
  wr_success: number;
  wr_failure: number;
  wr_datetime: string | null;
};
type AdminSmsDelivery = {
  hs_no: number;
  wr_no: number | null;
  wr_renum: number | null;
  bg_no: number | null;
  bg_name: string | null;
  mb_id: string | null;
  bk_no: number | null;
  hs_name: string | null;
  hs_hp: string | null;
  hs_datetime: string | null;
  hs_flag: number | null;
  hs_code: string | null;
  hs_memo: string | null;
  hs_log: string | null;
  wr_message: string | null;
  wr_datetime: string | null;
  wr_booking: string | null;
};
type AdminSmsMessageBatchListResponse = {
  data: Array<AdminSmsMessageBatch>;
  pagination: Pagination;
  meta: Meta;
};
type AdminSmsMessageBatchDetailResponse = {
  data: AdminSmsMessageBatchDetail;
  meta: Meta;
};
type AdminSmsDeliveryListResponse = {
  data: Array<AdminSmsDelivery>;
  pagination: Pagination;
  meta: Meta;
};
type AdminSmsSendResult = {
  write_no: number;
  write_renum: number;
  reply: string | null;
  message: string | null;
  booking_at: string | null;
  total: number;
  success: number;
  failure: number;
  duplicate_summary: AdminSmsDuplicateSummary;
  provider_ready: boolean;
};
type AdminSmsSendResponse = {
  data: AdminSmsSendResult;
  meta: Meta;
};
type MessageResponse = {
  data: {} | Array<{}>;
  meta: Meta;
};
type PluginBoardRewardBoardResponse = {
  /**
   * @example "board-reward"
   */
  plugin: string;
  board: PluginBoardRewardBoard;
  /**
   * @example ["board.read","point.write"]
   */
  scopes: Array<string>;
};
type PluginBoardRewardBoard = {
  /**
   * @example "free"
   */
  bo_table: string;
  /**
   * @example "자유게시판"
   */
  subject: string;
  /**
   * @example "community"
   */
  group_id: string;
};
type PluginBoardRewardResolvedCommand = PluginBoardRewardCommand & {};
type PluginBoardRewardCommand = {
  /**
   * @example "free"
   */
  board_id: string;
  /**
   * @example "neo"
   */
  member_id: string;
  /**
   * @example 100
   * @minimum 1
   */
  amount: number;
  /**
   * @example "plugin demo"
   */
  reason: string;
  rel_id?: /**
   * @example "grant-1"
   */
  string | undefined;
};
type PluginBoardRewardPreviewResponse = {
  /**
   * @example "board-reward"
   */
  plugin: string;
  /**
   * @example "preview"
   */
  mode: string;
  /**
   * @example false
   */
  grant_enabled: boolean;
  reward: PluginBoardRewardResolvedCommand;
};
type PluginBoardRewardGrantResponse = {
  /**
   * @example "board-reward"
   */
  plugin: string;
  /**
   * @example "grant"
   */
  mode: string;
  /**
   * @example "granted"
   */
  status: string;
  reward: PluginBoardRewardResolvedCommand;
};

const Meta: z.ZodType<Meta> = z
  .object({
    request_id: z.string(),
    correlation_id: z.string(),
    server_request_id: z.string(),
    server_time: z.string().datetime({ offset: true }),
    version: z.string(),
    error_code: z.string(),
    error_category: z.string(),
    fault_domain: z.string(),
    owner: z.string(),
    retryable: z.boolean(),
    user_actionable: z.boolean(),
  })
  .partial()
  .strict()
  .passthrough();
const HealthResponse: z.ZodType<HealthResponse> = z
  .object({
    status: z.string(),
    version: z.string(),
    timestamp: z.number().int(),
    meta: Meta,
  })
  .strict()
  .passthrough();
const ErrorGuide: z.ZodType<ErrorGuide> = z
  .object({
    action: z.string(),
    reason: z.string(),
    docs: z.string().url(),
    related_fields: z.array(z.string()),
  })
  .partial()
  .strict()
  .passthrough();
const ProblemDetails: z.ZodType<ProblemDetails> = z
  .object({
    type: z.string(),
    status: z.number().int(),
    title: z.string(),
    detail: z.string(),
    instance: z.string().optional(),
    error_code: z.string().optional(),
    error_category: z.string().optional(),
    fault_domain: z.string().optional(),
    owner: z.string().optional(),
    retryable: z.boolean().optional(),
    user_actionable: z.boolean().optional(),
    request_id: z.string().optional(),
    correlation_id: z.string().optional(),
    server_request_id: z.string().optional(),
    meta: Meta.optional(),
    guide: ErrorGuide.optional(),
    errors: z.object({}).partial().strict().passthrough().optional(),
  })
  .strict()
  .passthrough();
const PluginHelloGreetResponse = z
  .object({ message: z.string(), version: z.string() })
  .strict()
  .passthrough();
const PluginHelloInfoResponse = z
  .object({ plugin: z.string(), vendor: z.string(), api_version: z.string() })
  .strict()
  .passthrough();
const PluginPremiumPushStatusResponse = z
  .object({
    plugin: z.string(),
    status: z.string(),
    license_required_for: z.array(z.string()),
  })
  .strict()
  .passthrough();
const PluginPremiumPushSendRequest = z
  .object({ target: z.string(), message: z.string() })
  .partial()
  .strict()
  .passthrough();
const PluginPremiumPushSendResponse = z
  .object({ status: z.string(), target: z.string(), message: z.string() })
  .strict()
  .passthrough();
const PluginBoardRewardBoard: z.ZodType<PluginBoardRewardBoard> = z
  .object({ bo_table: z.string(), subject: z.string(), group_id: z.string() })
  .strict()
  .passthrough();
const PluginBoardRewardBoardResponse: z.ZodType<PluginBoardRewardBoardResponse> =
  z
    .object({
      plugin: z.string(),
      board: PluginBoardRewardBoard,
      scopes: z.array(z.string()),
    })
    .strict()
    .passthrough();
const PluginBoardRewardCommand: z.ZodType<PluginBoardRewardCommand> = z
  .object({
    board_id: z.string(),
    member_id: z.string(),
    amount: z.number().int().gte(1),
    reason: z.string(),
    rel_id: z.string().optional(),
  })
  .strict()
  .passthrough();
const PluginBoardRewardResolvedCommand: z.ZodType<PluginBoardRewardResolvedCommand> =
  PluginBoardRewardCommand.and(z.object({}).strict().passthrough());
const PluginBoardRewardPreviewResponse: z.ZodType<PluginBoardRewardPreviewResponse> =
  z
    .object({
      plugin: z.string(),
      mode: z.string(),
      grant_enabled: z.boolean(),
      reward: PluginBoardRewardResolvedCommand,
    })
    .strict()
    .passthrough();
const PluginBoardRewardGrantResponse: z.ZodType<PluginBoardRewardGrantResponse> =
  z
    .object({
      plugin: z.string(),
      mode: z.string(),
      status: z.string(),
      reward: PluginBoardRewardResolvedCommand,
    })
    .strict()
    .passthrough();
const AuthLoginRequest = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[0-9A-Za-z_]{3,20}$/),
    mb_password: z.string().min(1),
  })
  .strict();
const TokenResponse: z.ZodType<TokenResponse> = z
  .object({
    data: z
      .object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number().int(),
      })
      .strict(),
    meta: Meta,
  })
  .strict();
const AvailabilityCheck: z.ZodType<AvailabilityCheck> = z
  .object({
    type: z.enum(["member_id", "nick", "email", "phone", "recommender"]),
    input: z.string(),
    normalized_value: z.string(),
    available: z.boolean(),
    reason: z.enum([
      "available",
      "already_taken",
      "invalid",
      "blocked",
      "feature_disabled",
      "not_found",
    ]),
    message: z.string(),
  })
  .strict()
  .passthrough();
const AvailabilityResponse: z.ZodType<AvailabilityResponse> = z
  .object({ data: AvailabilityCheck, meta: Meta.optional() })
  .strict()
  .passthrough();
const AuthRefreshRequest = z
  .object({ refresh_token: z.string().min(1) })
  .strict();
const register_Body = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[0-9A-Za-z_]{3,20}$/),
    mb_password: z.string().min(8),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_email: z.string().email(),
    mb_hp: z.string().optional(),
    mb_mailling: z.boolean().optional(),
    mb_sms: z.boolean().optional(),
    mb_open: z.boolean().optional(),
    mb_homepage: z.string().optional(),
    mb_tel: z.string().optional(),
    mb_zip: z.string().optional(),
    mb_zip1: z.string().optional(),
    mb_zip2: z.string().optional(),
    mb_addr1: z.string().optional(),
    mb_addr2: z.string().optional(),
    mb_addr3: z.string().optional(),
    mb_addr_jibeon: z.enum(["R", "J"]).optional(),
    mb_signature: z.string().optional(),
    mb_profile: z.string().optional(),
    mb_recommend: z.string().optional(),
    mb_marketing_agree: z.boolean().optional(),
    mb_thirdparty_agree: z.boolean().optional(),
  })
  .strict()
  .passthrough();
const RegisterResponse: z.ZodType<RegisterResponse> = z
  .object({
    data: z
      .object({
        mb_id: z.string(),
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number().int(),
      })
      .strict()
      .passthrough(),
    meta: Meta.optional(),
  })
  .strict()
  .passthrough();
const AuthLogoutRequest = z
  .object({ refresh_token: z.string().min(1).nullable() })
  .partial()
  .strict();
const AuthLogoutRevoked: z.ZodType<AuthLogoutRevoked> = z
  .object({ access: z.boolean(), refresh: z.boolean() })
  .strict();
const AuthLogoutResult: z.ZodType<AuthLogoutResult> = z
  .object({ revoked: AuthLogoutRevoked, logged_out: z.boolean() })
  .strict();
const AuthLogoutResponse: z.ZodType<AuthLogoutResponse> = z
  .object({ data: AuthLogoutResult, meta: Meta })
  .strict();
const requestPasswordReset_Body = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[0-9A-Za-z_]{3,20}$/)
      .optional(),
    mb_email: z.string().email(),
  })
  .strict()
  .passthrough();
const MessageResponse: z.ZodType<MessageResponse> = z
  .object({
    data: z.union([
      z.object({}).partial().strict().passthrough(),
      z.array(z.object({}).partial().strict().passthrough()),
    ]),
    meta: Meta,
  })
  .strict()
  .passthrough();
const confirmPasswordReset_Body = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[0-9A-Za-z_]{3,20}$/),
    reset_token: z.string().min(1),
    new_password: z.string().min(8),
  })
  .strict()
  .passthrough();
const createEmailReverificationRequest_Body = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[0-9A-Za-z_]{3,20}$/),
    mb_password: z.string().min(1),
    mb_email: z.string().email().optional(),
  })
  .strict()
  .passthrough();
const confirmEmailVerify_Body = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[0-9A-Za-z_]{3,20}$/),
    verify_token: z.string().min(1),
  })
  .strict()
  .passthrough();
const ExternalAuthProviderDefinition: z.ZodType<ExternalAuthProviderDefinition> =
  z
    .object({
      provider: z.string(),
      label: z.string(),
      mode: z.enum(["fake", "sandbox", "live"]),
      description: z.string(),
      flows: z.array(z.enum(["login", "identity_verify", "account_link"])),
      sandbox_available: z.boolean(),
      replay_supported: z.boolean(),
      runtime_replay_enabled: z.boolean(),
    })
    .strict()
    .passthrough();
const ExternalAuthProviderListResponse: z.ZodType<ExternalAuthProviderListResponse> =
  z
    .object({
      data: z
        .object({ providers: z.array(ExternalAuthProviderDefinition) })
        .strict()
        .passthrough(),
      meta: Meta.optional(),
    })
    .strict()
    .passthrough();
const ExternalAuthStartRequest = z
  .object({
    flow: z
      .enum(["login", "identity_verify", "account_link"])
      .optional()
      .default("login"),
    callback_url: z.string(),
    state: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    metadata: z.object({}).partial().strict().passthrough().optional(),
    scenario: z.string().optional(),
  })
  .strict()
  .passthrough();
const ExternalAuthStartResponse: z.ZodType<ExternalAuthStartResponse> = z
  .object({
    data: z
      .object({
        provider: z.string(),
        flow: z.enum(["login", "identity_verify", "account_link"]),
        request_token: z.string(),
        state: z.string(),
        callback_url: z.string(),
        callback_method: z.enum(["GET", "POST"]),
        authorization_url: z.string(),
        expires_in: z.number().int(),
        provider_mode: z.enum(["fake", "sandbox", "live", "external"]),
        provider_meta: z.object({}).partial().strict().passthrough().nullish(),
      })
      .strict()
      .passthrough(),
    meta: Meta.optional(),
  })
  .strict()
  .passthrough();
const ExternalAuthCompleteRequest = z
  .object({
    request_token: z.string(),
    state: z.string().optional(),
    code: z.string().optional(),
    scenario: z.string().optional(),
    payload: z.object({}).partial().strict().passthrough().optional(),
  })
  .strict()
  .passthrough();
const ExternalAuthProviderUser: z.ZodType<ExternalAuthProviderUser> = z
  .object({
    provider_user_id: z.string(),
    email: z.string().email(),
    display_name: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const ExternalAuthLinkedMember: z.ZodType<ExternalAuthLinkedMember> = z
  .object({
    mb_id: z.string(),
    mb_email: z.string().email(),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_level: z.number().int(),
    active: z.boolean(),
  })
  .partial()
  .strict()
  .passthrough();
const ExternalAuthLinkage: z.ZodType<ExternalAuthLinkage> = z
  .object({
    status: z.enum([
      "linked",
      "candidate",
      "ambiguous",
      "signup_required",
      "unresolvable",
    ]),
    reason: z.string(),
    linked_member: ExternalAuthLinkedMember.nullish(),
    candidate_member: ExternalAuthLinkedMember.nullish(),
  })
  .strict()
  .passthrough();
const ExternalAuthCompleteResponse: z.ZodType<ExternalAuthCompleteResponse> = z
  .object({
    data: z
      .object({
        provider: z.string(),
        flow: z.enum(["login", "identity_verify", "account_link"]),
        status: z.enum([
          "success",
          "pending",
          "cancelled",
          "failed",
          "expired",
          "requires_user_action",
        ]),
        internal_request_id: z.string(),
        state: z.string(),
        provider_tx_id: z.string(),
        retryable: z.boolean(),
        user_action_required: z.boolean(),
        error_code: z.string().nullish(),
        error_message: z.string().nullish(),
        provider_user: ExternalAuthProviderUser.nullish(),
        linkage: ExternalAuthLinkage,
        available_actions: z.array(z.enum(["session", "claim", "register"])),
        transition_token: z.string().nullish(),
        link_token: z.string().nullish(),
        provider_payload: z
          .object({})
          .partial()
          .strict()
          .passthrough()
          .nullish(),
        provider_meta: z.object({}).partial().strict().passthrough().nullish(),
      })
      .strict()
      .passthrough(),
    meta: Meta.optional(),
  })
  .strict()
  .passthrough();
const ExternalAuthTransitionTokenRequest = z.union([z.unknown(), z.unknown()]);
const ExternalAuthLinkRecord: z.ZodType<ExternalAuthLinkRecord> = z
  .object({
    link_id: z.number().int(),
    provider: z.string(),
    provider_user_id: z.string(),
    mb_id: z.string(),
    provider_email: z.string().email(),
    provider_profile: z.object({}).partial().strict().passthrough().nullish(),
    linked_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .passthrough();
const ExternalAuthSessionPayload: z.ZodType<ExternalAuthSessionPayload> = z
  .object({
    mb_id: z.string(),
    provider: z.string(),
    provider_user_id: z.string(),
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number().int(),
    link: ExternalAuthLinkRecord,
  })
  .strict()
  .passthrough();
const ExternalAuthSessionResponse: z.ZodType<ExternalAuthSessionResponse> = z
  .object({ data: ExternalAuthSessionPayload, meta: Meta.optional() })
  .strict()
  .passthrough();
const ExternalAuthClaimRequest = z.union([z.unknown(), z.unknown()]);
const ExternalAuthClaimResponse: z.ZodType<ExternalAuthClaimResponse> = z
  .object({
    data: ExternalAuthSessionPayload.and(
      z.object({ claimed: z.boolean() }).strict().passthrough()
    ),
    meta: Meta.optional(),
  })
  .strict()
  .passthrough();
const ExternalAuthRegistrationRequest = z.union([z.unknown(), z.unknown()]);
const ExternalAuthRegistrationResponse: z.ZodType<ExternalAuthRegistrationResponse> =
  z
    .object({
      data: ExternalAuthSessionPayload.and(
        z.object({ registered: z.boolean() }).strict().passthrough()
      ),
      meta: Meta.optional(),
    })
    .strict()
    .passthrough();
const ExternalAuthLinkListResponse: z.ZodType<ExternalAuthLinkListResponse> = z
  .object({
    data: z
      .object({ links: z.array(ExternalAuthLinkRecord) })
      .strict()
      .passthrough(),
    meta: Meta.optional(),
  })
  .strict()
  .passthrough();
const ExternalAuthLinkResponse: z.ZodType<ExternalAuthLinkResponse> = z
  .object({ data: ExternalAuthLinkRecord, meta: Meta.optional() })
  .strict()
  .passthrough();
const ExternalAuthUnlinkResponse = z
  .object({
    data: z
      .object({
        provider: z.string(),
        provider_user_id: z.string(),
        unlinked: z.boolean(),
      })
      .strict()
      .passthrough(),
  })
  .strict()
  .passthrough();
const BoardSummary: z.ZodType<BoardSummary> = z
  .object({
    bo_table: z.string(),
    bo_subject: z.string(),
    gr_id: z.string(),
    gr_subject: z.string(),
    bo_read_level: z.number().int(),
    bo_write_level: z.number().int(),
    bo_comment_level: z.number().int(),
    bo_use_category: z.number().int(),
    bo_category_list: z.string(),
    bo_count_write: z.number().int(),
    bo_count_comment: z.number().int(),
    bo_use_secret: z.number().int(),
    bo_use_dhtml_editor: z.number().int(),
    bo_upload_count: z.number().int(),
    bo_upload_size: z.number().int(),
  })
  .strict();
const Pagination: z.ZodType<Pagination> = z
  .object({
    mode: z.literal("cursor"),
    total: z.number().int(),
    page: z.number().int(),
    per_page: z.number().int(),
    last_page: z.number().int(),
    cursor: z.string().nullable(),
    next_cursor: z.string().nullable(),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  })
  .partial()
  .strict()
  .passthrough();
const BoardListResponse: z.ZodType<BoardListResponse> = z
  .object({ data: z.array(BoardSummary), pagination: Pagination, meta: Meta })
  .strict();
const NewPostListResponse: z.ZodType<NewPostListResponse> = z
  .object({
    data: z.array(z.object({}).partial().strict().passthrough()),
    pagination: Pagination,
    meta: Meta,
  })
  .strict()
  .passthrough();
const BoardDetail: z.ZodType<BoardDetail> = z
  .object({
    bo_table: z.string(),
    bo_subject: z.string(),
    gr_id: z.string(),
    bo_admin: z.string(),
    gr_admin: z.string(),
    gr_use_access: z.number().int(),
    bo_read_level: z.number().int(),
    bo_write_level: z.number().int(),
    bo_reply_level: z.number().int(),
    bo_comment_level: z.number().int(),
    bo_use_category: z.number().int(),
    bo_category_list: z.string(),
    bo_count_delete: z.number().int(),
    bo_count_write: z.number().int(),
    bo_count_comment: z.number().int(),
    bo_use_secret: z.number().int(),
    bo_use_dhtml_editor: z.number().int(),
    bo_upload_count: z.number().int(),
    bo_upload_size: z.number().int(),
    bo_list_level: z.number().int(),
    bo_download_level: z.number().int(),
    bo_read_point: z.number().int(),
    bo_write_point: z.number().int(),
    bo_comment_point: z.number().int(),
    bo_download_point: z.number().int(),
  })
  .strict();
const BoardDetailResponse: z.ZodType<BoardDetailResponse> = z
  .object({ data: BoardDetail, meta: Meta })
  .strict();
const Post: z.ZodType<Post> = z
  .object({
    wr_id: z.number().int(),
    wr_num: z.number().int(),
    wr_parent: z.number().int(),
    wr_is_comment: z.number().int(),
    wr_comment: z.number().int(),
    wr_comment_reply: z.string(),
    wr_subject: z.string(),
    wr_content: z.string(),
    wr_name: z.string(),
    wr_email: z.string().nullable(),
    wr_hp: z.string().nullable(),
    wr_datetime: z.string(),
    wr_last: z.string(),
    wr_hit: z.number().int(),
    wr_good: z.number().int(),
    wr_nogood: z.number().int(),
    wr_option: z.string(),
    ca_name: z.string().nullable(),
    mb_id: z.string().nullable(),
    wr_link1: z.string(),
    wr_link2: z.string(),
    wr_link1_hit: z.number().int(),
    wr_link2_hit: z.number().int(),
    is_notice: z.boolean(),
  })
  .strict();
const PostListResponse: z.ZodType<PostListResponse> = z
  .object({ data: z.array(Post), pagination: Pagination, meta: Meta })
  .strict();
const PostNoticeInput = z.union([
  z.boolean(),
  z.number(),
  z.number(),
  z.string(),
]);
const PostCreateRequest: z.ZodType<PostCreateRequest> = z
  .object({
    wr_subject: z.string().min(1).max(255),
    wr_content: z.string().min(1),
    ca_name: z.string().optional(),
    wr_option: z.string().optional(),
    wr_link1: z.string().optional(),
    wr_link2: z.string().optional(),
    is_notice: PostNoticeInput.optional(),
  })
  .strict();
const PostCreated: z.ZodType<PostCreated> = z
  .object({ wr_id: z.number().int(), bo_table: z.string() })
  .strict();
const PostCreateResponse: z.ZodType<PostCreateResponse> = z
  .object({ data: PostCreated, meta: Meta })
  .strict();
const PostDetailResponse: z.ZodType<PostDetailResponse> = z
  .object({ data: Post, meta: Meta })
  .strict();
const PostUpdateRequest: z.ZodType<PostUpdateRequest> = z
  .object({
    wr_subject: z.string().min(1).max(255),
    wr_content: z.string().min(1),
    ca_name: z.string(),
    wr_option: z.string(),
    wr_link1: z.string(),
    wr_link2: z.string(),
    is_notice: PostNoticeInput,
  })
  .partial()
  .strict();
const PostReplyRequest = z
  .object({
    wr_subject: z.string().min(1).max(255),
    wr_content: z.string().min(1),
    wr_option: z.string().optional(),
  })
  .strict();
const PostReplyCreated: z.ZodType<PostReplyCreated> = z
  .object({
    wr_id: z.number().int(),
    bo_table: z.string(),
    parent_wr_id: z.number().int(),
  })
  .strict();
const PostReplyResponse: z.ZodType<PostReplyResponse> = z
  .object({ data: PostReplyCreated, meta: Meta })
  .strict();
const PostScrapCreated: z.ZodType<PostScrapCreated> = z
  .object({
    ms_id: z.number().int(),
    bo_table: z.string(),
    wr_id: z.number().int(),
    scraped: z.boolean(),
  })
  .strict();
const PostScrapCreateResponse: z.ZodType<PostScrapCreateResponse> = z
  .object({ data: PostScrapCreated, meta: Meta })
  .strict();
const PostFile: z.ZodType<PostFile> = z
  .object({
    bo_table: z.string(),
    wr_id: z.number().int(),
    bf_no: z.number().int(),
    bf_source: z.string(),
    bf_file: z.string(),
    bf_content: z.string(),
    bf_fileurl: z.string(),
    bf_thumburl: z.string(),
    bf_storage: z.string(),
    bf_download: z.number().int(),
    bf_filesize: z.number().int(),
    bf_width: z.number().int(),
    bf_height: z.number().int(),
    bf_type: z.number().int(),
    bf_datetime: z.string(),
    bf_file_mime: z.string(),
  })
  .strict();
const PostFileListResponse: z.ZodType<PostFileListResponse> = z
  .object({ data: z.array(PostFile), pagination: Pagination, meta: Meta })
  .strict();
const PostFileUploadRequest = z.object({ file: z.instanceof(File) }).strict();
const PostFileResponse: z.ZodType<PostFileResponse> = z
  .object({ data: PostFile, meta: Meta })
  .strict();
const PostVoteRequest = z.object({ type: z.enum(["good", "nogood"]) }).strict();
const PostVoteResult: z.ZodType<PostVoteResult> = z
  .object({ wr_good: z.number().int(), wr_nogood: z.number().int() })
  .strict();
const PostVoteResponse: z.ZodType<PostVoteResponse> = z
  .object({ data: PostVoteResult, meta: Meta })
  .strict();
const Comment: z.ZodType<Comment> = z
  .object({
    wr_id: z.number().int(),
    wr_parent: z.number().int(),
    wr_comment: z.number().int(),
    wr_comment_reply: z.string(),
    wr_content: z.string(),
    mb_id: z.string(),
    wr_name: z.string(),
    wr_datetime: z.string(),
  })
  .strict();
const CommentListResponse: z.ZodType<CommentListResponse> = z
  .object({ data: z.array(Comment), meta: Meta })
  .strict();
const CommentCreateRequest = z
  .object({
    wr_content: z.string().min(1),
    parent_comment_id: z.number().int().gte(1).optional(),
  })
  .strict();
const CommentDetailResponse: z.ZodType<CommentDetailResponse> = z
  .object({ data: Comment, meta: Meta })
  .strict();
const CommentUpdateRequest = z
  .object({ wr_content: z.string().min(1) })
  .strict();
const Member: z.ZodType<Member> = z
  .object({
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_nick_date: z.string(),
    mb_email: z.string().email(),
    mb_level: z.number().int(),
    mb_point: z.number().int(),
    mb_hp: z.string(),
    mb_tel: z.string(),
    mb_homepage: z.string(),
    mb_zip: z.string(),
    mb_zip1: z.string(),
    mb_zip2: z.string(),
    mb_addr1: z.string(),
    mb_addr2: z.string(),
    mb_addr3: z.string(),
    mb_addr_jibeon: z.string(),
    mb_open: z.number().int(),
    mb_open_date: z.string().regex(/^(\d{4}-\d{2}-\d{2}|0000-00-00)$/),
    mb_mailling: z.number().int(),
    mb_sms: z.number().int(),
    mb_marketing_agree: z.number().int(),
    mb_thirdparty_agree: z.number().int(),
    mb_mailling_date: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_sms_date: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_marketing_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_thirdparty_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_signature: z.string(),
    mb_profile: z.string(),
    mb_memo: z.string(),
    mb_adult: z.number().int(),
    mb_certify: z.string(),
    mb_agree_log: z.string(),
    mb_1: z.string(),
    mb_2: z.string(),
    mb_3: z.string(),
    mb_4: z.string(),
    mb_5: z.string(),
    mb_6: z.string(),
    mb_7: z.string(),
    mb_8: z.string(),
    mb_9: z.string(),
    mb_10: z.string(),
    mb_today_login: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_leave_date: z.string(),
    mb_intercept_date: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const MemberMeResponse: z.ZodType<MemberMeResponse> = z
  .object({ data: Member, meta: Meta })
  .strict()
  .passthrough();
const updateMyProfile_Body = z
  .object({
    mb_password_current: z.string(),
    mb_password: z.string().optional(),
    mb_nick: z.string().optional(),
    mb_email: z.string().email().optional(),
    mb_hp: z.string().optional(),
    mb_tel: z.string().optional(),
    mb_homepage: z.string().optional(),
    mb_zip: z.string().optional(),
    mb_zip1: z.string().optional(),
    mb_zip2: z.string().optional(),
    mb_addr1: z.string().optional(),
    mb_addr2: z.string().optional(),
    mb_addr3: z.string().optional(),
    mb_addr_jibeon: z.enum(["R", "J"]).optional(),
    mb_mailling: z.boolean().optional(),
    mb_sms: z.boolean().optional(),
    mb_open: z.boolean().optional(),
    mb_marketing_agree: z.boolean().optional(),
    mb_thirdparty_agree: z.boolean().optional(),
    mb_signature: z.string().optional(),
    mb_profile: z.string().optional(),
    mb_1: z.string().optional(),
    mb_2: z.string().optional(),
    mb_3: z.string().optional(),
    mb_4: z.string().optional(),
    mb_5: z.string().optional(),
    mb_6: z.string().optional(),
    mb_7: z.string().optional(),
    mb_8: z.string().optional(),
    mb_9: z.string().optional(),
    mb_10: z.string().optional(),
  })
  .strict()
  .passthrough();
const uploadMyIcon_Body = z
  .object({
    icon: z.instanceof(File),
    mb_icon: z.instanceof(File),
    file: z.instanceof(File),
  })
  .partial()
  .strict()
  .passthrough();
const uploadMyImage_Body = z
  .object({
    image: z.instanceof(File),
    mb_img: z.instanceof(File),
    file: z.instanceof(File),
  })
  .partial()
  .strict()
  .passthrough();
const PointItem: z.ZodType<PointItem> = z
  .object({
    po_id: z.number().int(),
    mb_id: z.string(),
    po_point: z.number().int(),
    po_datetime: z.string().datetime({ offset: true }),
    po_content: z.string(),
    po_use_point: z.number().int(),
    po_expired: z.union([z.literal(0), z.literal(1)]),
    po_expire_date: z.string(),
    po_mb_point: z.number().int(),
    po_rel_table: z.string(),
    po_rel_id: z.string(),
    po_rel_action: z.string(),
  })
  .strict();
const PointHistoryListResponse: z.ZodType<PointHistoryListResponse> = z
  .object({ data: z.array(PointItem), pagination: Pagination, meta: Meta })
  .strict();
const sendMemo_Body = z
  .object({ me_recv_mb_id: z.string(), me_memo: z.string() })
  .strict()
  .passthrough();
const FileUploadRequest = z
  .object({
    file: z.instanceof(File),
    bo_table: z
      .string()
      .min(1)
      .max(20)
      .regex(/^[A-Za-z0-9_]+$/),
    wr_id: z.number().int().gte(0).optional().default(0),
  })
  .strict();
const Config: z.ZodType<Config> = z
  .object({
    cf_title: z.string(),
    cf_admin: z.string(),
    cf_admin_email: z.string().email(),
    cf_admin_email_name: z.string(),
    cf_register_level: z.number().int(),
    cf_register_point: z.number().int(),
    cf_login_point: z.number().int(),
    cf_use_point: z.number().int(),
    cf_write_point: z.number().int(),
    cf_comment_point: z.number().int(),
    cf_download_point: z.number().int(),
    cf_read_point: z.number().int(),
    cf_memo_send_point: z.number().int(),
    cf_use_email_certify: z.number().int(),
    cf_use_homepage: z.number().int(),
    cf_req_homepage: z.number().int(),
    cf_use_tel: z.number().int(),
    cf_req_tel: z.number().int(),
    cf_use_hp: z.number().int(),
    cf_req_hp: z.number().int(),
    cf_use_addr: z.number().int(),
    cf_req_addr: z.number().int(),
    cf_new_skin: z.string(),
    cf_search_skin: z.string(),
    cf_connect_skin: z.string(),
    cf_faq_skin: z.string(),
    cf_editor: z.string(),
    cf_member_skin: z.string(),
    cf_mobile_member_skin: z.string(),
    cf_captcha: z.string(),
    cf_social_login_use: z.number().int(),
    cf_cert_use: z.number().int(),
    cf_stipulation: z.string(),
    cf_privacy: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const ConfigResponse: z.ZodType<ConfigResponse> = z
  .object({ data: Config, meta: Meta })
  .strict()
  .passthrough();
const MenuItem: z.ZodType<MenuItem> = z
  .object({
    me_id: z.number().int(),
    me_code: z.string(),
    me_name: z.string(),
    me_link: z.string(),
    me_target: z.string(),
    me_order: z.number().int(),
    me_use: z.union([z.literal(0), z.literal(1)]),
    me_mobile_use: z.union([z.literal(0), z.literal(1)]),
  })
  .strict();
const MenuListResponse: z.ZodType<MenuListResponse> = z
  .object({ data: z.array(MenuItem), pagination: Pagination, meta: Meta })
  .strict();
const registerDevice_Body = z
  .object({ token: z.string().max(512), platform: z.enum(["fcm", "apns"]) })
  .strict()
  .passthrough();
const updateNotificationSettings_Body = z
  .object({
    receive_comment: z.boolean(),
    receive_message: z.boolean(),
    receive_notice: z.boolean(),
  })
  .partial()
  .strict()
  .passthrough();
const createReport_Body = z
  .object({
    target_type: z.enum(["post", "comment", "member"]),
    target_id: z.string(),
    reason: z.enum(["spam", "abuse", "adult", "privacy", "copyright", "other"]),
    detail: z.string().optional(),
  })
  .strict()
  .passthrough();
const PollChoice: z.ZodType<PollChoice> = z
  .object({
    no: z.number().int().gte(1).lte(9),
    text: z.string(),
    count: z.number().int(),
    percent: z.number(),
  })
  .strict();
const PollEtcItem: z.ZodType<PollEtcItem> = z
  .object({
    pc_id: z.number().int(),
    po_id: z.number().int(),
    mb_id: z.string(),
    pc_name: z.string(),
    pc_idea: z.string(),
    pc_datetime: z.string(),
  })
  .strict();
const PollPublicResult: z.ZodType<PollPublicResult> = z
  .object({
    po_id: z.number().int(),
    po_subject: z.string(),
    po_date: z.string(),
    po_level: z.number().int(),
    po_point: z.number().int(),
    po_use: z.number().int(),
    po_etc: z.string(),
    total_votes: z.number().int(),
    choices: z.array(PollChoice),
    etc_items: z.array(PollEtcItem).optional(),
  })
  .strict();
const PollActiveResult: z.ZodType<PollActiveResult> = z
  .object({
    active: z.boolean(),
    can_vote: z.boolean(),
    poll: PollPublicResult.nullable(),
  })
  .strict();
const PollActiveResponse: z.ZodType<PollActiveResponse> = z
  .object({ data: PollActiveResult, meta: Meta })
  .strict();
const PollVoteRequest = z.union([z.unknown(), z.unknown()]);
const PollVoteResult: z.ZodType<PollVoteResult> = z
  .object({
    voted: z.boolean(),
    po_id: z.number().int(),
    poll_no: z.number().int(),
    choice: z.string(),
  })
  .strict();
const PollVoteResponse: z.ZodType<PollVoteResponse> = z
  .object({ data: PollVoteResult, meta: Meta })
  .strict();
const PollResultResponse: z.ZodType<PollResultResponse> = z
  .object({ data: PollPublicResult, meta: Meta })
  .strict();
const AdminDashboardMemberSummary: z.ZodType<AdminDashboardMemberSummary> = z
  .object({
    total_members: z.number().int(),
    blocked_members: z.number().int(),
    leave_members: z.number().int(),
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardPostSummary: z.ZodType<AdminDashboardPostSummary> = z
  .object({ total_rows: z.number().int() })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardPointSummary: z.ZodType<AdminDashboardPointSummary> = z
  .object({ total_rows: z.number().int() })
  .partial()
  .strict()
  .passthrough();
const VisitStatsSummary: z.ZodType<VisitStatsSummary> = z
  .object({
    total_visits: z.number().int(),
    active_days: z.number().int(),
    first_date: z.string(),
    last_date: z.string(),
    visit_rows: z.number().int(),
    unique_ips: z.number().int(),
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardSummary: z.ZodType<AdminDashboardSummary> = z
  .object({
    members: AdminDashboardMemberSummary,
    posts: AdminDashboardPostSummary,
    points: AdminDashboardPointSummary,
    visits: VisitStatsSummary,
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardRecentMember: z.ZodType<AdminDashboardRecentMember> = z
  .object({
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_level: z.number().int(),
    mb_point: z.number().int(),
    mb_datetime: z.string().datetime({ offset: true }),
    mb_mailling: z.boolean(),
    mb_open: z.boolean(),
    email_certified: z.boolean(),
    intercepted: z.boolean(),
    group_count: z.number().int(),
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardRecentPost: z.ZodType<AdminDashboardRecentPost> = z
  .object({
    bn_id: z.number().int(),
    gr_id: z.string(),
    gr_subject: z.string(),
    bo_table: z.string(),
    bo_subject: z.string(),
    wr_id: z.number().int(),
    wr_parent: z.number().int(),
    view_type: z.enum(["w", "c"]),
    wr_subject: z.string(),
    parent_wr_subject: z.string(),
    wr_name: z.string(),
    wr_datetime: z.string().datetime({ offset: true }),
    post_mb_id: z.string(),
    post_exists: z.boolean(),
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardRecentPoint: z.ZodType<AdminDashboardRecentPoint> = z
  .object({
    po_id: z.number().int(),
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    po_datetime: z.string().datetime({ offset: true }),
    po_content: z.string(),
    po_point: z.number().int(),
    po_mb_point: z.number().int(),
    po_rel_table: z.string(),
    po_rel_id: z.string(),
    po_rel_action: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardData: z.ZodType<AdminDashboardData> = z
  .object({
    limit: z.number().int(),
    summary: AdminDashboardSummary,
    recent_members: z.array(AdminDashboardRecentMember),
    recent_posts: z.array(AdminDashboardRecentPost),
    recent_points: z.array(AdminDashboardRecentPoint),
  })
  .partial()
  .strict()
  .passthrough();
const AdminDashboardResponse: z.ZodType<AdminDashboardResponse> = z
  .object({ data: AdminDashboardData, meta: Meta })
  .strict()
  .passthrough();
const AdminAuthAssignment: z.ZodType<AdminAuthAssignment> = z
  .object({
    au_menu: z.string().regex(/^[0-9]{3,6}$/),
    au_auth: z.string().regex(/^[rwd](,[rwd]){0,2}$/),
  })
  .strict();
const AdminAuthMember: z.ZodType<AdminAuthMember> = z
  .object({
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    auths: z.array(AdminAuthAssignment),
  })
  .strict();
const AdminAuthMemberListResponse: z.ZodType<AdminAuthMemberListResponse> = z
  .object({
    data: z.array(AdminAuthMember),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminAuthUpsertRequest = z.union([z.unknown(), z.unknown()]);
const AdminAuthMemberResponse: z.ZodType<AdminAuthMemberResponse> = z
  .object({ data: AdminAuthMember, meta: Meta })
  .strict();
const Poll: z.ZodType<Poll> = z
  .object({
    po_id: z.number().int(),
    po_subject: z.string(),
    po_poll1: z.string(),
    po_poll2: z.string(),
    po_poll3: z.string(),
    po_poll4: z.string(),
    po_poll5: z.string(),
    po_poll6: z.string(),
    po_poll7: z.string(),
    po_poll8: z.string(),
    po_poll9: z.string(),
    po_cnt1: z.number().int(),
    po_cnt2: z.number().int(),
    po_cnt3: z.number().int(),
    po_cnt4: z.number().int(),
    po_cnt5: z.number().int(),
    po_cnt6: z.number().int(),
    po_cnt7: z.number().int(),
    po_cnt8: z.number().int(),
    po_cnt9: z.number().int(),
    po_etc: z.string(),
    po_level: z.number().int(),
    po_point: z.number().int(),
    po_date: z.string(),
    po_ips: z.string(),
    mb_ids: z.string(),
    po_use: z.number().int(),
  })
  .strict();
const AdminPollListResponse: z.ZodType<AdminPollListResponse> = z
  .object({ data: z.array(Poll), pagination: Pagination, meta: Meta })
  .strict();
const AdminPollCreateRequest = z.union([z.unknown(), z.unknown()]);
const PollDetailResponse: z.ZodType<PollDetailResponse> = z
  .object({ data: Poll, meta: Meta })
  .strict();
const AdminPollIntegerInput = z.union([z.number(), z.string()]);
const AdminPollFlagInput = z.union([
  z.union([z.literal(0), z.literal(1)]),
  z.boolean(),
  z.enum(["0", "1", "true", "false", "on", "off", "yes", "no", "y", "n"]),
]);
const AdminPollUpdateRequest: z.ZodType<AdminPollUpdateRequest> = z
  .object({
    po_subject: z.string().min(1),
    options: z.array(z.string()).min(1).max(9),
    po_poll1: z.string(),
    po_poll2: z.string(),
    po_poll3: z.string(),
    po_poll4: z.string(),
    po_poll5: z.string(),
    po_poll6: z.string(),
    po_poll7: z.string(),
    po_poll8: z.string(),
    po_poll9: z.string(),
    po_etc: z.string().max(125),
    po_level: AdminPollIntegerInput,
    po_point: AdminPollIntegerInput,
    po_use: AdminPollFlagInput,
  })
  .partial()
  .strict();
const Popup: z.ZodType<Popup> = z
  .object({
    nw_id: z.number().int(),
    nw_division: z.string(),
    nw_device: z.string(),
    nw_begin_time: z.string(),
    nw_end_time: z.string(),
    nw_disable_hours: z.number().int(),
    nw_left: z.number().int(),
    nw_top: z.number().int(),
    nw_height: z.number().int(),
    nw_width: z.number().int(),
    nw_subject: z.string(),
    nw_content: z.string(),
    nw_content_html: z.number().int(),
  })
  .partial()
  .strict()
  .passthrough();
const PopupListResponse: z.ZodType<PopupListResponse> = z
  .object({ data: z.array(Popup), pagination: Pagination, meta: Meta })
  .strict()
  .passthrough();
const PopupCreateRequest = z
  .object({
    nw_division: z.enum(["both", "comm", "shop", "layer", "new"]).optional(),
    nw_device: z.enum(["both", "pc", "mobile"]).optional(),
    nw_begin_time: z.string().optional(),
    nw_end_time: z.string().optional(),
    nw_disable_hours: z.number().int().optional(),
    nw_left: z.number().int().optional(),
    nw_top: z.number().int().optional(),
    nw_height: z.number().int().optional(),
    nw_width: z.number().int().optional(),
    nw_subject: z.string(),
    nw_content: z.string(),
    nw_content_html: z.number().int().optional(),
  })
  .strict();
const PopupDetailResponse: z.ZodType<PopupDetailResponse> = z
  .object({ data: Popup, meta: Meta })
  .strict()
  .passthrough();
const PopupUpdateRequest = z
  .object({
    nw_division: z.enum(["both", "comm", "shop", "layer", "new"]),
    nw_device: z.enum(["both", "pc", "mobile"]),
    nw_begin_time: z.string(),
    nw_end_time: z.string(),
    nw_disable_hours: z.number().int(),
    nw_left: z.number().int(),
    nw_top: z.number().int(),
    nw_height: z.number().int(),
    nw_width: z.number().int(),
    nw_subject: z.string(),
    nw_content: z.string(),
    nw_content_html: z.number().int(),
  })
  .partial()
  .strict();
const AdminMailTemplate: z.ZodType<AdminMailTemplate> = z
  .object({
    ma_id: z.number().int().gte(1),
    ma_subject: z.string(),
    ma_content: z.string(),
    ma_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    ma_ip: z.string(),
    ma_last_option: z.string(),
  })
  .strict();
const AdminMailListResponse: z.ZodType<AdminMailListResponse> = z
  .object({
    data: z.array(AdminMailTemplate),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminMailSendRequest = z.union([z.unknown(), z.unknown()]);
const AdminMailSendTarget: z.ZodType<AdminMailSendTarget> = z
  .object({ mb_id: z.string(), mb_email: z.string().email() })
  .strict();
const AdminMailSendResult: z.ZodType<AdminMailSendResult> = z
  .object({
    ma_id: z.number().int().gte(1).nullable(),
    template_used: z.boolean(),
    target_count: z.number().int().gte(0),
    sent_count: z.number().int().gte(0),
    skipped_count: z.number().int().gte(0),
    mail_enabled: z.boolean(),
    dry_run: z.boolean(),
    targets: z.array(AdminMailSendTarget),
  })
  .strict();
const AdminMailSendResponse: z.ZodType<AdminMailSendResponse> = z
  .object({ data: AdminMailSendResult, meta: Meta })
  .strict();
const AdminMailTemplateRequest = z.union([z.unknown(), z.unknown()]);
const AdminMailLastOption: z.ZodType<AdminMailLastOption> = z
  .object({
    mb_id1: z.union([z.literal(0), z.literal(1)]),
    mb_id1_from: z.string(),
    mb_id1_to: z.string(),
    mb_email: z.string(),
    mb_mailling: z.union([z.literal(0), z.literal(1)]),
    mb_level_from: z.number().int().gte(1).lte(10),
    mb_level_to: z.number().int().gte(1).lte(10),
    gr_id: z.string(),
  })
  .strict();
const AdminMailDetail: z.ZodType<AdminMailDetail> = z
  .object({
    ma_id: z.number().int().gte(1),
    ma_subject: z.string(),
    ma_content: z.string(),
    ma_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    ma_ip: z.string(),
    ma_last_option: z.string(),
    last_option: AdminMailLastOption,
    preview_html: z.string(),
  })
  .strict();
const AdminMailDetailResponse: z.ZodType<AdminMailDetailResponse> = z
  .object({ data: AdminMailDetail, meta: Meta })
  .strict();
const AdminMailRecipient: z.ZodType<AdminMailRecipient> = z
  .object({
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_email: z.string().email(),
    mb_level: z.number().int().gte(1).lte(10),
    mb_mailling: z.union([z.literal(0), z.literal(1)]),
    mb_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  })
  .strict();
const AdminMailRecipientListResponse: z.ZodType<AdminMailRecipientListResponse> =
  z
    .object({
      data: z.array(AdminMailRecipient),
      pagination: Pagination,
      meta: Meta,
    })
    .strict();
const AdminMailTestRequest = z.union([z.unknown(), z.unknown()]);
const AdminMailTestResult: z.ZodType<AdminMailTestResult> = z
  .object({
    ma_id: z.number().int().gte(1).nullable(),
    template_used: z.boolean(),
    mail_enabled: z.boolean(),
    sent: z.boolean(),
    to: z.string().email(),
  })
  .strict();
const AdminMailTestResponse: z.ZodType<AdminMailTestResponse> = z
  .object({ data: AdminMailTestResult, meta: Meta })
  .strict();
const AdminSchemaDomainSummary: z.ZodType<AdminSchemaDomainSummary> = z
  .object({
    domain: z.string(),
    title: z.string(),
    legacy_form: z.string(),
    field_count: z.number().int(),
    section_count: z.number().int(),
    generated_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .passthrough();
const AdminSchemaCatalog: z.ZodType<AdminSchemaCatalog> = z
  .object({ items: z.array(AdminSchemaDomainSummary), total: z.number().int() })
  .strict()
  .passthrough();
const AdminSchemaCatalogResponse: z.ZodType<AdminSchemaCatalogResponse> = z
  .object({ data: AdminSchemaCatalog, meta: Meta })
  .strict()
  .passthrough();
const AdminSchemaLayout: z.ZodType<AdminSchemaLayout> = z
  .object({
    desktop: z.enum(["tabs", "stack"]),
    mobile: z.enum(["accordion", "stack"]),
    single_open: z.boolean(),
  })
  .strict()
  .passthrough();
const AdminFieldOption: z.ZodType<AdminFieldOption> = z
  .object({ value: z.string(), label: z.string() })
  .strict()
  .passthrough();
const AdminFieldOptionSource: z.ZodType<AdminFieldOptionSource> = z
  .object({
    kind: z.enum(["endpoint", "directory"]),
    name: z.string(),
    endpoint: z.string().nullish(),
    value_field: z.string().nullish(),
    label_field: z.string().nullish(),
  })
  .strict()
  .passthrough();
const AdminFieldSchema: z.ZodType<AdminFieldSchema> = z
  .object({
    name: z.string(),
    label: z.string(),
    input_type: z.enum([
      "text",
      "textarea",
      "select",
      "checkbox",
      "radio",
      "password",
      "file",
      "number",
      "date",
      "datetime-local",
      "hidden",
    ]),
    data_type: z.enum(["string", "integer", "boolean", "file"]),
    required: z.boolean(),
    create_only: z.boolean(),
    readonly_on_update: z.boolean(),
    description: z.string().nullish(),
    options: z.array(AdminFieldOption),
    option_source: AdminFieldOptionSource.nullish(),
    default_value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  })
  .strict()
  .passthrough();
const AdminSchemaSection: z.ZodType<AdminSchemaSection> = z
  .object({
    key: z.string(),
    label: z.string(),
    order: z.number().int(),
    description: z.string().nullish(),
    fields: z.array(AdminFieldSchema),
  })
  .strict()
  .passthrough();
const AdminSchemaDetail: z.ZodType<AdminSchemaDetail> = z
  .object({
    domain: z.string(),
    title: z.string(),
    legacy_form: z.string(),
    generated_at: z.string().datetime({ offset: true }),
    field_count: z.number().int(),
    section_count: z.number().int(),
    layout: AdminSchemaLayout.nullish(),
    sections: z.array(AdminSchemaSection),
    fields_by_name: z.record(AdminFieldSchema),
  })
  .strict()
  .passthrough();
const AdminSchemaDetailResponse: z.ZodType<AdminSchemaDetailResponse> = z
  .object({ data: AdminSchemaDetail, meta: Meta })
  .strict()
  .passthrough();
const AdminBoard: z.ZodType<AdminBoard> = z
  .object({
    "<<": z.unknown(),
    bo_table: z.string(),
    bo_count_write: z.number().int(),
    bo_count_comment: z.number().int(),
    bo_notice: z.string(),
  })
  .partial()
  .strict();
const AdminBoardListResponse: z.ZodType<AdminBoardListResponse> = z
  .object({ data: z.array(AdminBoard), pagination: Pagination, meta: Meta })
  .strict();
const AdminBoardCreateRequest = z
  .object({
    "<<": z.unknown().optional(),
    bo_table: z.string().regex(/^[A-Za-z0-9_]{1,20}$/),
    bo_count_write: z.number().int().gte(0).optional(),
    bo_count_comment: z.number().int().gte(0).optional(),
  })
  .strict();
const AdminBoardDetailResponse: z.ZodType<AdminBoardDetailResponse> = z
  .object({ data: AdminBoard, meta: Meta })
  .strict();
const AdminBoardUpdateRequest = z
  .object({
    gr_id: z.string(),
    bo_subject: z.string(),
    bo_mobile_subject: z.string(),
    bo_device: z.enum(["both", "pc", "mobile"]),
    bo_use_category: z.boolean(),
    bo_category_list: z.string(),
    bo_admin: z.string(),
    bo_list_level: z.number().int(),
    bo_read_level: z.number().int(),
    bo_write_level: z.number().int(),
    bo_reply_level: z.number().int(),
    bo_comment_level: z.number().int(),
    bo_upload_level: z.number().int(),
    bo_download_level: z.number().int(),
    bo_html_level: z.number().int(),
    bo_link_level: z.number().int(),
    bo_count_delete: z.number().int(),
    bo_count_modify: z.number().int(),
    bo_use_sideview: z.boolean(),
    bo_use_file_content: z.boolean(),
    bo_use_secret: z.number().int(),
    bo_use_dhtml_editor: z.boolean(),
    bo_select_editor: z.string(),
    bo_use_rss_view: z.boolean(),
    bo_use_good: z.boolean(),
    bo_use_nogood: z.boolean(),
    bo_use_name: z.boolean(),
    bo_use_signature: z.boolean(),
    bo_use_ip_view: z.boolean(),
    bo_use_list_view: z.boolean(),
    bo_use_list_file: z.boolean(),
    bo_use_list_content: z.boolean(),
    bo_upload_size: z.number().int(),
    bo_use_search: z.boolean(),
    bo_order: z.number().int(),
    bo_write_min: z.number().int(),
    bo_write_max: z.number().int(),
    bo_comment_min: z.number().int(),
    bo_comment_max: z.number().int(),
    bo_upload_count: z.number().int(),
    bo_use_email: z.boolean(),
    bo_use_cert: z.enum(["", "cert", "adult"]),
    bo_use_sns: z.boolean(),
    bo_use_captcha: z.boolean(),
    bo_read_point: z.number().int(),
    bo_write_point: z.number().int(),
    bo_comment_point: z.number().int(),
    bo_download_point: z.number().int(),
    bo_table_width: z.number().int(),
    bo_subject_len: z.number().int(),
    bo_mobile_subject_len: z.number().int(),
    bo_page_rows: z.number().int(),
    bo_mobile_page_rows: z.number().int(),
    bo_new: z.number().int(),
    bo_hot: z.number().int(),
    bo_image_width: z.number().int(),
    bo_skin: z.string(),
    bo_mobile_skin: z.string(),
    bo_include_head: z.string(),
    bo_include_tail: z.string(),
    bo_content_head: z.string(),
    bo_mobile_content_head: z.string(),
    bo_content_tail: z.string(),
    bo_mobile_content_tail: z.string(),
    bo_insert_content: z.string(),
    bo_gallery_cols: z.number().int(),
    bo_gallery_width: z.number().int(),
    bo_gallery_height: z.number().int(),
    bo_mobile_gallery_width: z.number().int(),
    bo_mobile_gallery_height: z.number().int(),
    bo_reply_order: z.union([z.literal(0), z.literal(1)]),
    bo_sort_field: z.string(),
    bo_1_subj: z.string(),
    bo_2_subj: z.string(),
    bo_3_subj: z.string(),
    bo_4_subj: z.string(),
    bo_5_subj: z.string(),
    bo_6_subj: z.string(),
    bo_7_subj: z.string(),
    bo_8_subj: z.string(),
    bo_9_subj: z.string(),
    bo_10_subj: z.string(),
    bo_1: z.string(),
    bo_2: z.string(),
    bo_3: z.string(),
    bo_4: z.string(),
    bo_5: z.string(),
    bo_6: z.string(),
    bo_7: z.string(),
    bo_8: z.string(),
    bo_9: z.string(),
    bo_10: z.string(),
  })
  .partial()
  .strict();
const AdminBoardCopyRequest = z
  .object({
    target_bo_table: z.string().regex(/^[A-Za-z0-9_]{1,20}$/),
    target_bo_subject: z.string().optional(),
    copy_posts: z.boolean().optional().default(false),
  })
  .strict();
const AdminNewPostsDeleteRequest = z
  .object({ bn_ids: z.array(z.number().int().gte(1)).min(1) })
  .strict();
const AdminNewPostsDeleteResult: z.ZodType<AdminNewPostsDeleteResult> = z
  .object({
    deleted: z.boolean(),
    deleted_count: z.number().int().gte(0),
    deleted_posts: z.number().int().gte(0),
    deleted_comments: z.number().int().gte(0),
    skipped: z.number().int().gte(0),
    bn_ids: z.array(z.number().int().gte(1)),
  })
  .strict();
const AdminNewPostsDeleteResponse: z.ZodType<AdminNewPostsDeleteResponse> = z
  .object({ data: AdminNewPostsDeleteResult, meta: Meta })
  .strict();
const Group: z.ZodType<Group> = z
  .object({
    gr_id: z.string(),
    gr_subject: z.string(),
    gr_admin: z.string(),
    gr_device: z.enum(["both", "pc", "mobile"]),
    gr_use_access: z.union([z.literal(0), z.literal(1)]),
  })
  .strict();
const GroupListResponse: z.ZodType<GroupListResponse> = z
  .object({ data: z.array(Group), pagination: Pagination, meta: Meta })
  .strict();
const AdminGroupCreateRequest = z
  .object({
    gr_id: z
      .string()
      .min(1)
      .max(10)
      .regex(/^[A-Za-z0-9_]+$/),
    gr_subject: z.string().min(1),
    gr_admin: z.string().optional().default(""),
    gr_device: z.enum(["both", "pc", "mobile"]).optional().default("both"),
    gr_use_access: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .default(0),
  })
  .strict();
const GroupDetailResponse: z.ZodType<GroupDetailResponse> = z
  .object({ data: Group, meta: Meta })
  .strict();
const AdminGroupUpdateRequest = z
  .object({
    gr_subject: z.string().min(1),
    gr_admin: z.string().optional(),
    gr_device: z.enum(["both", "pc", "mobile"]).optional(),
    gr_use_access: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .strict();
const AdminGroupMember: z.ZodType<AdminGroupMember> = z
  .object({
    gm_id: z.number().int().gte(0),
    gr_id: z.string(),
    mb_id: z.string(),
    gm_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    mb_name: z.string().nullable(),
    mb_nick: z.string().nullable(),
    mb_level: z.number().int().nullable(),
    mb_today_login: z.string().nullable(),
  })
  .strict();
const AdminGroupMemberListResponse: z.ZodType<AdminGroupMemberListResponse> = z
  .object({
    data: z.array(AdminGroupMember),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminGroupMemberCreateRequest = z
  .object({
    mb_id: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[A-Za-z0-9_]+$/),
  })
  .strict();
const AdminGroupMemberResult: z.ZodType<AdminGroupMemberResult> = z
  .object({
    gr_id: z.string(),
    mb_id: z.string(),
    gm_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  })
  .strict();
const AdminGroupMemberResponse: z.ZodType<AdminGroupMemberResponse> = z
  .object({ data: AdminGroupMemberResult, meta: Meta })
  .strict();
const AdminSystemPermission: z.ZodType<AdminSystemPermission> = z
  .object({
    mb_id: z.string(),
    au_menu: z.string(),
    au_auth: z.string(),
    mb_name: z.string().nullish(),
    mb_nick: z.string().nullish(),
  })
  .strict();
const AdminAuthListResponse: z.ZodType<AdminAuthListResponse> = z
  .object({
    data: z.array(AdminSystemPermission),
    pagination: Pagination,
    meta: Meta,
  })
  .strict()
  .passthrough();
const AdminSystemAuthSaveRequest = z
  .object({
    mb_id: z.string().regex(/^[A-Za-z0-9_]{3,20}$/),
    au_menu: z.string().regex(/^[A-Za-z0-9_]{1,50}$/),
    au_auth: z.string().regex(/^[rwdRWD]+$/),
  })
  .strict();
const AdminSystemPermissionResponse: z.ZodType<AdminSystemPermissionResponse> =
  z.object({ data: AdminSystemPermission, meta: Meta }).strict().passthrough();
const PollSummary: z.ZodType<PollSummary> = z
  .object({
    po_id: z.number().int(),
    po_subject: z.string(),
    po_date: z.string(),
    po_level: z.number().int(),
    po_point: z.number().int(),
    po_use: z.number().int(),
  })
  .strict();
const PollListResponse: z.ZodType<PollListResponse> = z
  .object({ data: z.array(PollSummary), pagination: Pagination, meta: Meta })
  .strict();
const AdminSystemPollCreateRequest = z
  .object({
    po_subject: z.string(),
    po_poll1: z.string(),
    po_poll2: z.string(),
    po_poll3: z.string().optional(),
    po_poll4: z.string().optional(),
    po_poll5: z.string().optional(),
    po_poll6: z.string().optional(),
    po_poll7: z.string().optional(),
    po_poll8: z.string().optional(),
    po_poll9: z.string().optional(),
    po_etc: z.string().optional(),
    po_level: z.number().int().optional(),
    po_point: z.number().int().optional(),
    po_use: z.number().int().optional(),
  })
  .strict();
const AdminSystemPollUpdateRequest = z
  .object({
    po_subject: z.string(),
    po_poll1: z.string(),
    po_poll2: z.string(),
    po_poll3: z.string(),
    po_poll4: z.string(),
    po_poll5: z.string(),
    po_poll6: z.string(),
    po_poll7: z.string(),
    po_poll8: z.string(),
    po_poll9: z.string(),
    po_etc: z.string(),
    po_level: z.number().int(),
    po_point: z.number().int(),
    po_use: z.number().int(),
  })
  .partial()
  .strict();
const AdminSystemQaConfig: z.ZodType<AdminSystemQaConfig> = z
  .object({ qa_id: z.number().int(), "<<": z.unknown().optional() })
  .strict();
const AdminSystemQaConfigResponse: z.ZodType<AdminSystemQaConfigResponse> = z
  .object({ data: AdminSystemQaConfig, meta: Meta })
  .strict()
  .passthrough();
const AdminSystemQaConfigUpdateRequest = z
  .object({
    qa_title: z.string(),
    qa_category: z.string(),
    qa_skin: z.string(),
    qa_mobile_skin: z.string(),
    qa_use_email: z.string(),
    qa_req_email: z.string(),
    qa_use_hp: z.string(),
    qa_req_hp: z.string(),
    qa_use_sms: z.string(),
    qa_send_number: z.string(),
    qa_admin_hp: z.string(),
    qa_admin_email: z.string(),
    qa_use_editor: z.string(),
    qa_subject_len: z.string(),
    qa_mobile_subject_len: z.string(),
    qa_page_rows: z.string(),
    qa_mobile_page_rows: z.string(),
    qa_image_width: z.string(),
    qa_upload_size: z.string(),
    qa_insert_content: z.string(),
    qa_include_head: z.string(),
    qa_include_tail: z.string(),
    qa_content_head: z.string(),
    qa_content_tail: z.string(),
    qa_mobile_content_head: z.string(),
    qa_mobile_content_tail: z.string(),
    qa_1_subj: z.string(),
    qa_2_subj: z.string(),
    qa_3_subj: z.string(),
    qa_4_subj: z.string(),
    qa_5_subj: z.string(),
    qa_1: z.string(),
    qa_2: z.string(),
    qa_3: z.string(),
    qa_4: z.string(),
    qa_5: z.string(),
  })
  .partial()
  .strict();
const AdminSystemThemeConfig: z.ZodType<AdminSystemThemeConfig> = z
  .object({
    cf_theme: z.string(),
    cf_mobile_theme: z.string(),
    cf_theme_installed: z.boolean(),
    cf_mobile_theme_installed: z.boolean(),
    installed_count: z.number().int(),
  })
  .strict();
const AdminSystemThemeConfigResponse: z.ZodType<AdminSystemThemeConfigResponse> =
  z.object({ data: AdminSystemThemeConfig, meta: Meta }).strict().passthrough();
const AdminSystemThemeUpdateRequest = z
  .object({
    cf_theme: z.string().regex(/^[A-Za-z0-9_-]*$/),
    cf_mobile_theme: z.string().regex(/^[A-Za-z0-9_-]*$/),
  })
  .partial()
  .strict();
const AdminSystemTheme: z.ZodType<AdminSystemTheme> = z
  .object({
    id: z.string(),
    path: z.string(),
    theme_name: z.string(),
    theme_uri: z.string(),
    maker: z.string(),
    maker_uri: z.string(),
    version: z.string(),
    detail: z.string(),
    license: z.string(),
    license_uri: z.string(),
    readme_path: z.string().nullable(),
    theme_config_path: z.string().nullable(),
    screenshot_path: z.string().nullable(),
    set_default_skin: z.boolean(),
    preview_board_skin: z.string(),
    preview_mobile_board_skin: z.string(),
    is_active: z.boolean(),
    is_mobile_active: z.boolean(),
    theme_config: z.object({}).partial().strict().passthrough(),
  })
  .strict();
const AdminSystemThemeListMeta: z.ZodType<AdminSystemThemeListMeta> = z
  .object({
    server_time: z.string().datetime({ offset: true }),
    version: z.string(),
    total: z.number().int().optional(),
    request_id: z.string().optional(),
    correlation_id: z.string().optional(),
    server_request_id: z.string().optional(),
  })
  .strict()
  .passthrough();
const AdminSystemThemeListResponse: z.ZodType<AdminSystemThemeListResponse> = z
  .object({ data: z.array(AdminSystemTheme), meta: AdminSystemThemeListMeta })
  .strict()
  .passthrough();
const AdminSystemThemeDetailResponse: z.ZodType<AdminSystemThemeDetailResponse> =
  z.object({ data: AdminSystemTheme, meta: Meta }).strict().passthrough();
const AdminSystemPhpInfo: z.ZodType<AdminSystemPhpInfo> = z
  .object({
    php_version: z.string(),
    sapi: z.string(),
    loaded_ini: z.string().nullable(),
    scanned_ini: z.string().nullable(),
    extension_count: z.number().int(),
    html: z.string(),
  })
  .strict();
const AdminSystemPhpInfoResponse: z.ZodType<AdminSystemPhpInfoResponse> = z
  .object({ data: AdminSystemPhpInfo, meta: Meta })
  .strict()
  .passthrough();
const AdminSystemMaintenanceResult: z.ZodType<AdminSystemMaintenanceResult> = z
  .object({
    task: z.string(),
    status: z.enum(["completed", "skipped"]),
    directory: z.string(),
    deleted_count: z.number().int(),
    deleted_paths: z.array(z.string()),
    message: z.string().optional(),
    social_log_deleted_count: z.number().int().optional(),
  })
  .strict();
const AdminSystemMaintenanceResponse: z.ZodType<AdminSystemMaintenanceResponse> =
  z
    .object({ data: AdminSystemMaintenanceResult, meta: Meta })
    .strict()
    .passthrough();
const AdminSystemBrowscapStatus: z.ZodType<AdminSystemBrowscapStatus> = z
  .object({
    available: z.boolean(),
    plugin_path: z.string(),
    cache_directory: z.string(),
    cache_file: z.string(),
    cache_exists: z.boolean(),
    php_version: z.string(),
    pending_visit_count: z.number().int(),
    updated: z.boolean().optional(),
    cache_mtime: z.string().datetime({ offset: true }).nullish(),
  })
  .strict();
const AdminSystemBrowscapStatusResponse: z.ZodType<AdminSystemBrowscapStatusResponse> =
  z
    .object({ data: AdminSystemBrowscapStatus, meta: Meta })
    .strict()
    .passthrough();
const AdminSystemBrowscapConvertRequest = z
  .object({ rows: z.number().int().gte(1).default(100) })
  .partial()
  .strict();
const AdminSystemBrowscapConvertResult: z.ZodType<AdminSystemBrowscapConvertResult> =
  z
    .object({
      rows: z.number().int(),
      total_pending_before: z.number().int(),
      processed_count: z.number().int(),
      remaining_count: z.number().int(),
      completed: z.boolean(),
    })
    .strict();
const AdminSystemBrowscapConvertResponse: z.ZodType<AdminSystemBrowscapConvertResponse> =
  z
    .object({ data: AdminSystemBrowscapConvertResult, meta: Meta })
    .strict()
    .passthrough();
const AdminSystemMailTemplate: z.ZodType<AdminSystemMailTemplate> = z
  .object({
    ma_id: z.number().int(),
    ma_subject: z.string(),
    ma_time: z.string(),
    ma_ip: z.string(),
    ma_last_option: z.string(),
  })
  .strict();
const AdminSystemMailTemplateListResponse: z.ZodType<AdminSystemMailTemplateListResponse> =
  z
    .object({
      data: z.array(AdminSystemMailTemplate),
      pagination: Pagination,
      meta: Meta,
    })
    .strict()
    .passthrough();
const AdminSystemMailRecipient: z.ZodType<AdminSystemMailRecipient> = z
  .object({
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_email: z.string(),
    mb_level: z.number().int(),
    mb_mailling: z.number().int(),
    mb_today_login: z.string(),
  })
  .strict();
const AdminSystemMailRecipientListResponse: z.ZodType<AdminSystemMailRecipientListResponse> =
  z
    .object({
      data: z.array(AdminSystemMailRecipient),
      pagination: Pagination,
      meta: Meta,
    })
    .strict()
    .passthrough();
const AdminSystemMailTestRequest = z
  .object({ to: z.string().email(), subject: z.string(), content: z.string() })
  .strict();
const AdminSystemMailTestResult: z.ZodType<AdminSystemMailTestResult> = z
  .object({
    sent: z.boolean(),
    mail_log_id: z.number().int(),
    to: z.string().email(),
  })
  .strict();
const AdminSystemMailTestResponse: z.ZodType<AdminSystemMailTestResponse> = z
  .object({ data: AdminSystemMailTestResult, meta: Meta })
  .strict()
  .passthrough();
const AdminSystemMailSendRequest = z
  .object({
    ma_id: z.number().int().gte(1).optional(),
    subject: z.string().optional(),
    content: z.string().optional(),
    mb_ids: z.array(z.string().regex(/^[0-9A-Za-z_]{3,20}$/)).min(1),
    mailling_only: z.boolean().optional().default(true),
    dry_run: z.boolean().optional().default(false),
  })
  .strict();
const AdminSystemMailSendRecipient: z.ZodType<AdminSystemMailSendRecipient> = z
  .object({ mb_id: z.string(), mb_email: z.string().email() })
  .strict();
const AdminSystemMailSendResult: z.ZodType<AdminSystemMailSendResult> = z
  .object({
    mail_log_id: z.number().int(),
    target_count: z.number().int(),
    sent_count: z.number().int(),
    skipped_count: z.number().int(),
    mail_enabled: z.boolean(),
    dry_run: z.boolean(),
    recipients: z.array(AdminSystemMailSendRecipient),
  })
  .strict();
const AdminSystemMailSendResponse: z.ZodType<AdminSystemMailSendResponse> = z
  .object({ data: AdminSystemMailSendResult, meta: Meta })
  .strict()
  .passthrough();
const AdminMember: z.ZodType<AdminMember> = z
  .object({
    mb_no: z.number().int().gte(0),
    mb_id: z.string(),
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_nick_date: z.string(),
    mb_email: z.string(),
    mb_homepage: z.string(),
    mb_level: z.number().int().gte(0).lte(10),
    mb_sex: z.string(),
    mb_birth: z.string(),
    mb_tel: z.string(),
    mb_hp: z.string(),
    mb_certify: z.string(),
    mb_adult: z.union([z.literal(0), z.literal(1)]),
    mb_zip: z.string(),
    mb_zip1: z.string(),
    mb_zip2: z.string(),
    mb_addr1: z.string(),
    mb_addr2: z.string(),
    mb_addr3: z.string(),
    mb_addr_jibeon: z.string(),
    mb_signature: z.string(),
    mb_recommend: z.string(),
    mb_point: z.number().int(),
    mb_today_login: z.string(),
    mb_login_ip: z.string(),
    mb_datetime: z.string(),
    mb_ip: z.string(),
    mb_leave_date: z.string().regex(/^(\d{8}|)$/),
    mb_intercept_date: z.string().regex(/^(\d{8}|)$/),
    mb_email_certify: z.string(),
    mb_memo: z.string(),
    mb_mailling: z.union([z.literal(0), z.literal(1)]),
    mb_mailling_date: z.string(),
    mb_sms: z.union([z.literal(0), z.literal(1)]),
    mb_sms_date: z.string(),
    mb_open: z.union([z.literal(0), z.literal(1)]),
    mb_open_date: z.string(),
    mb_profile: z.string(),
    mb_memo_call: z.string(),
    mb_memo_cnt: z.number().int().gte(0),
    mb_scrap_cnt: z.number().int().gte(0),
    mb_marketing_agree: z.union([z.literal(0), z.literal(1)]),
    mb_marketing_date: z.string(),
    mb_thirdparty_agree: z.union([z.literal(0), z.literal(1)]),
    mb_thirdparty_date: z.string(),
    mb_agree_log: z.string(),
    mb_1: z.string(),
    mb_2: z.string(),
    mb_3: z.string(),
    mb_4: z.string(),
    mb_5: z.string(),
    mb_6: z.string(),
    mb_7: z.string(),
    mb_8: z.string(),
    mb_9: z.string(),
    mb_10: z.string(),
  })
  .strict();
const AdminMemberListResponse: z.ZodType<AdminMemberListResponse> = z
  .object({ data: z.array(AdminMember), pagination: Pagination, meta: Meta })
  .strict();
const AdminMemberDetailResponse: z.ZodType<AdminMemberDetailResponse> = z
  .object({ data: AdminMember, meta: Meta })
  .strict();
const AdminMemberUpdateRequest = z
  .object({
    mb_name: z.string(),
    mb_nick: z.string(),
    mb_email: z.string(),
    mb_level: z.number().int().gte(1).lte(10),
    mb_hp: z.string(),
    mb_tel: z.string(),
    mb_mailling: z.union([z.literal(0), z.literal(1)]),
    mb_sms: z.union([z.literal(0), z.literal(1)]),
    mb_marketing_agree: z.union([z.literal(0), z.literal(1)]),
    mb_thirdparty_agree: z.union([z.literal(0), z.literal(1)]),
    mb_homepage: z.string(),
    mb_zip: z.string(),
    mb_zip1: z.string().max(3),
    mb_zip2: z.string().max(3),
    mb_addr1: z.string(),
    mb_addr2: z.string(),
    mb_addr3: z.string(),
    mb_addr_jibeon: z.string(),
    mb_memo: z.string(),
    mb_profile: z.string(),
    mb_signature: z.string(),
    mb_adult: z.union([z.literal(0), z.literal(1)]),
    mb_certify: z.enum(["", "admin", "simple", "hp", "ipin"]),
    mb_certify_case: z.enum(["", "admin", "simple", "hp", "ipin"]),
    mb_open: z.union([z.literal(0), z.literal(1)]),
    mb_leave_date: z.string().regex(/^(\d{8}|)$/),
    mb_intercept_date: z.string().regex(/^(\d{8}|)$/),
    mb_password: z.string().min(1),
    mb_1: z.string(),
    mb_2: z.string(),
    mb_3: z.string(),
    mb_4: z.string(),
    mb_5: z.string(),
    mb_6: z.string(),
    mb_7: z.string(),
    mb_8: z.string(),
    mb_9: z.string(),
    mb_10: z.string(),
  })
  .partial()
  .strict();
const AdminMemberLevelUpdateRequest = z
  .object({ mb_level: z.number().int().gte(1).lte(10) })
  .strict();
const AdminMemberIconUploadRequest = z.union([
  z.unknown(),
  z.unknown(),
  z.unknown(),
]);
const AdminMemberMediaUploadResult: z.ZodType<AdminMemberMediaUploadResult> = z
  .object({
    mb_id: z.string(),
    storage: z.enum(["member", "member_image"]),
    relative_path: z.string(),
    url: z.string(),
    size: z.number().int().gte(0),
    width: z.number().int().gte(0),
    height: z.number().int().gte(0),
    mime: z.string(),
  })
  .strict();
const AdminMemberMediaUploadResponse: z.ZodType<AdminMemberMediaUploadResponse> =
  z.object({ data: AdminMemberMediaUploadResult, meta: Meta }).strict();
const AdminMemberMediaDeleteResult: z.ZodType<AdminMemberMediaDeleteResult> = z
  .object({
    mb_id: z.string(),
    storage: z.enum(["member", "member_image"]),
    relative_path: z.string(),
    url: z.string(),
    deleted: z.boolean(),
  })
  .strict();
const AdminMemberMediaDeleteResponse: z.ZodType<AdminMemberMediaDeleteResponse> =
  z.object({ data: AdminMemberMediaDeleteResult, meta: Meta }).strict();
const AdminMemberImageUploadRequest = z.union([
  z.unknown(),
  z.unknown(),
  z.unknown(),
]);
const AdminConfig: z.ZodType<AdminConfig> = z
  .object({
    cf_title: z.string(),
    cf_admin: z.string(),
    cf_admin_email: z.string().email(),
    cf_admin_email_name: z.string(),
    cf_add_script: z.string(),
    cf_use_email_certify: z.union([z.literal(0), z.literal(1)]),
    cf_email_use: z.string(),
    cf_email_mb_member: z.string(),
    cf_email_mb_super_admin: z.string(),
    cf_email_po_super_admin: z.string(),
    cf_email_wr_board_admin: z.string(),
    cf_email_wr_comment_all: z.string(),
    cf_email_wr_group_admin: z.string(),
    cf_email_wr_super_admin: z.string(),
    cf_email_wr_write: z.string(),
    cf_use_homepage: z.union([z.literal(0), z.literal(1)]),
    cf_req_homepage: z.union([z.literal(0), z.literal(1)]),
    cf_use_tel: z.union([z.literal(0), z.literal(1)]),
    cf_req_tel: z.union([z.literal(0), z.literal(1)]),
    cf_use_hp: z.union([z.literal(0), z.literal(1)]),
    cf_req_hp: z.union([z.literal(0), z.literal(1)]),
    cf_use_addr: z.union([z.literal(0), z.literal(1)]),
    cf_req_addr: z.union([z.literal(0), z.literal(1)]),
    cf_cert_use: z.union([z.literal(0), z.literal(1)]),
    cf_cert_find: z.string(),
    cf_cert_simple: z.string(),
    cf_cert_use_seed: z.number().int(),
    cf_cert_ipin: z.union([z.literal(0), z.literal(1)]),
    cf_cert_hp: z.union([z.literal(0), z.literal(1)]),
    cf_cert_kcb_cd: z.string(),
    cf_cert_kcp_cd: z.string(),
    cf_cert_kg_cd: z.string(),
    cf_cert_kg_mid: z.string(),
    cf_cert_limit: z.number().int(),
    cf_cert_req: z.string(),
    cf_register_level: z.number().int(),
    cf_register_point: z.number().int(),
    cf_login_point: z.number().int(),
    cf_login_minutes: z.string(),
    cf_use_point: z.union([z.literal(0), z.literal(1)]),
    cf_write_point: z.number().int(),
    cf_comment_point: z.number().int(),
    cf_download_point: z.number().int(),
    cf_read_point: z.number().int(),
    cf_recommend_point: z.number().int(),
    cf_memo_send_point: z.number().int(),
    cf_cut_name: z.number().int(),
    cf_nick_modify: z.number().int(),
    cf_leave_day: z.number().int(),
    cf_new_skin: z.string(),
    cf_new_rows: z.number().int(),
    cf_search_skin: z.string(),
    cf_connect_skin: z.string(),
    cf_faq_skin: z.string(),
    cf_editor: z.string(),
    cf_member_skin: z.string(),
    cf_mobile_member_skin: z.string(),
    cf_page_rows: z.number().int(),
    cf_write_pages: z.number().int(),
    cf_mobile_page_rows: z.number().int(),
    cf_mobile_pages: z.number().int(),
    cf_use_copy_log: z.union([z.literal(0), z.literal(1)]),
    cf_captcha: z.string(),
    cf_captcha_mp3: z.string(),
    cf_recaptcha_site_key: z.string(),
    cf_syndi_except: z.string(),
    cf_stipulation: z.string(),
    cf_privacy: z.string(),
    cf_prohibit_id: z.string(),
    cf_prohibit_email: z.string(),
    cf_analytics: z.string(),
    cf_add_meta: z.string(),
    cf_filter: z.string(),
    cf_open_modify: z.number().int(),
    cf_possible_ip: z.string(),
    cf_intercept_ip: z.string(),
    cf_bbs_rewrite: z.string(),
    cf_search_part: z.number().int(),
    cf_formmail_is_member: z.string(),
    cf_link_target: z.string(),
    cf_1_subj: z.string(),
    cf_2_subj: z.string(),
    cf_3_subj: z.string(),
    cf_4_subj: z.string(),
    cf_5_subj: z.string(),
    cf_6_subj: z.string(),
    cf_7_subj: z.string(),
    cf_8_subj: z.string(),
    cf_9_subj: z.string(),
    cf_10_subj: z.string(),
    cf_1: z.string(),
    cf_2: z.string(),
    cf_3: z.string(),
    cf_4: z.string(),
    cf_5: z.string(),
    cf_6: z.string(),
    cf_7: z.string(),
    cf_8: z.string(),
    cf_9: z.string(),
    cf_10: z.string(),
    cf_point_term: z.number().int(),
    cf_delay_sec: z.number().int(),
    cf_new_del: z.number().int(),
    cf_memo_del: z.number().int(),
    cf_visit_del: z.number().int(),
    cf_popular_del: z.number().int(),
    cf_image_extension: z.string(),
    cf_flash_extension: z.string(),
    cf_movie_extension: z.string(),
    cf_social_login_use: z.union([z.literal(0), z.literal(1)]),
    cf_facebook_appid: z.string(),
    cf_twitter_key: z.string(),
    cf_google_clientid: z.string(),
    cf_kakao_js_apikey: z.string(),
    cf_naver_clientid: z.string(),
    cf_payco_clientid: z.string(),
    cf_social_servicelist: z.string(),
    cf_icode_server_ip: z.string(),
    cf_icode_id: z.string(),
    cf_icode_server_port: z.number().int(),
    cf_sms_use: z.string(),
    cf_sms_type: z.string(),
    cf_use_member_icon: z.number().int(),
    cf_icon_level: z.number().int(),
    cf_member_icon_width: z.number().int(),
    cf_member_icon_height: z.number().int(),
    cf_member_icon_size: z.number().int(),
    cf_member_img_width: z.number().int(),
    cf_member_img_height: z.number().int(),
    cf_member_img_size: z.number().int(),
    cf_use_profile: z.string(),
    cf_req_profile: z.string(),
    cf_use_signature: z.string(),
    cf_req_signature: z.string(),
    cf_use_recommend: z.string(),
    cf_use_promotion: z.string(),
    cf_mobile_new_skin: z.string(),
    cf_mobile_search_skin: z.string(),
    cf_mobile_connect_skin: z.string(),
    cf_mobile_faq_skin: z.string(),
  })
  .partial()
  .strict();
const AdminConfigResponse: z.ZodType<AdminConfigResponse> = z
  .object({ data: AdminConfig, meta: Meta })
  .strict();
const AdminConfigFlagInput = z.union([
  z.union([z.literal(0), z.literal(1)]),
  z.boolean(),
  z.enum(["0", "1", "true", "false", "on", "off", "yes", "no", "y", "n"]),
]);
const AdminConfigIntegerInput = z.union([z.number(), z.string()]);
const AdminConfigSocialServicesInput = z.union([
  z.string(),
  z.array(z.enum(["naver", "kakao", "facebook", "google", "twitter", "payco"])),
]);
const AdminConfigDigitIntegerInput = z.union([z.number(), z.string()]);
const AdminConfigUpdateRequest: z.ZodType<AdminConfigUpdateRequest> = z
  .object({
    cf_title: z.string(),
    cf_admin: z.string(),
    cf_admin_email: z.string().email(),
    cf_admin_email_name: z.string(),
    cf_add_script: z.string(),
    cf_use_email_certify: AdminConfigFlagInput,
    cf_email_use: z.string(),
    cf_email_mb_member: z.string(),
    cf_email_mb_super_admin: z.string(),
    cf_email_po_super_admin: z.string(),
    cf_email_wr_board_admin: z.string(),
    cf_email_wr_comment_all: z.string(),
    cf_email_wr_group_admin: z.string(),
    cf_email_wr_super_admin: z.string(),
    cf_email_wr_write: z.string(),
    cf_use_homepage: AdminConfigFlagInput,
    cf_req_homepage: AdminConfigFlagInput,
    cf_use_tel: AdminConfigFlagInput,
    cf_req_tel: AdminConfigFlagInput,
    cf_use_hp: AdminConfigFlagInput,
    cf_req_hp: AdminConfigFlagInput,
    cf_use_addr: AdminConfigFlagInput,
    cf_req_addr: AdminConfigFlagInput,
    cf_cert_use: AdminConfigFlagInput,
    cf_cert_find: z.string(),
    cf_cert_simple: z.string(),
    cf_cert_use_seed: AdminConfigIntegerInput,
    cf_cert_ipin: AdminConfigFlagInput,
    cf_cert_hp: AdminConfigFlagInput,
    cf_cert_kcb_cd: z.string(),
    cf_cert_kcp_cd: z.string(),
    cf_cert_kcp_enckey: z.string(),
    cf_cert_kg_cd: z.string(),
    cf_cert_kg_mid: z.string(),
    cf_cert_limit: AdminConfigIntegerInput,
    cf_cert_req: z.string(),
    cf_register_level: AdminConfigIntegerInput,
    cf_register_point: AdminConfigIntegerInput,
    cf_login_point: AdminConfigIntegerInput,
    cf_login_minutes: z.string(),
    cf_use_point: AdminConfigFlagInput,
    cf_write_point: AdminConfigIntegerInput,
    cf_comment_point: AdminConfigIntegerInput,
    cf_download_point: AdminConfigIntegerInput,
    cf_read_point: AdminConfigIntegerInput,
    cf_recommend_point: AdminConfigIntegerInput,
    cf_memo_send_point: AdminConfigIntegerInput,
    cf_cut_name: AdminConfigIntegerInput,
    cf_nick_modify: AdminConfigIntegerInput,
    cf_leave_day: AdminConfigIntegerInput,
    cf_new_skin: z.string(),
    cf_new_rows: AdminConfigIntegerInput,
    cf_search_skin: z.string(),
    cf_connect_skin: z.string(),
    cf_faq_skin: z.string(),
    cf_editor: z.string(),
    cf_member_skin: z.string(),
    cf_mobile_member_skin: z.string(),
    cf_page_rows: AdminConfigIntegerInput,
    cf_write_pages: AdminConfigIntegerInput,
    cf_mobile_page_rows: AdminConfigIntegerInput,
    cf_mobile_pages: AdminConfigIntegerInput,
    cf_use_copy_log: AdminConfigFlagInput,
    cf_captcha: z.string(),
    cf_captcha_mp3: z.string(),
    cf_recaptcha_site_key: z.string(),
    cf_recaptcha_secret_key: z.string(),
    cf_syndi_token: z.string(),
    cf_syndi_except: z.string(),
    cf_stipulation: z.string(),
    cf_privacy: z.string(),
    cf_prohibit_id: z.string(),
    cf_prohibit_email: z.string(),
    cf_analytics: z.string(),
    cf_add_meta: z.string(),
    cf_filter: z.string(),
    cf_open_modify: AdminConfigIntegerInput,
    cf_possible_ip: z.string(),
    cf_intercept_ip: z.string(),
    cf_bbs_rewrite: z.string(),
    cf_search_part: AdminConfigIntegerInput,
    cf_formmail_is_member: z.string(),
    cf_link_target: z.string(),
    cf_1_subj: z.string(),
    cf_2_subj: z.string(),
    cf_3_subj: z.string(),
    cf_4_subj: z.string(),
    cf_5_subj: z.string(),
    cf_6_subj: z.string(),
    cf_7_subj: z.string(),
    cf_8_subj: z.string(),
    cf_9_subj: z.string(),
    cf_10_subj: z.string(),
    cf_1: z.string(),
    cf_2: z.string(),
    cf_3: z.string(),
    cf_4: z.string(),
    cf_5: z.string(),
    cf_6: z.string(),
    cf_7: z.string(),
    cf_8: z.string(),
    cf_9: z.string(),
    cf_10: z.string(),
    cf_point_term: AdminConfigIntegerInput,
    cf_delay_sec: AdminConfigIntegerInput,
    cf_new_del: AdminConfigIntegerInput,
    cf_memo_del: AdminConfigIntegerInput,
    cf_visit_del: AdminConfigIntegerInput,
    cf_popular_del: AdminConfigIntegerInput,
    cf_image_extension: z.string(),
    cf_flash_extension: z.string(),
    cf_movie_extension: z.string(),
    cf_social_login_use: AdminConfigFlagInput,
    cf_facebook_appid: z.string(),
    cf_facebook_secret: z.string(),
    cf_twitter_key: z.string(),
    cf_twitter_secret: z.string(),
    cf_googl_shorturl_apikey: z.string(),
    cf_google_clientid: z.string(),
    cf_google_secret: z.string(),
    cf_kakao_rest_key: z.string(),
    cf_kakao_client_secret: z.string(),
    cf_kakao_js_apikey: z.string(),
    cf_naver_clientid: z.string(),
    cf_naver_secret: z.string(),
    cf_payco_clientid: z.string(),
    cf_payco_secret: z.string(),
    cf_social_servicelist: AdminConfigSocialServicesInput,
    cf_icode_server_ip: z.string(),
    cf_icode_id: z.string(),
    cf_icode_pw: z.string(),
    cf_icode_server_port: AdminConfigDigitIntegerInput,
    cf_icode_token_key: z.string(),
    cf_sms_use: z.string(),
    cf_sms_type: z.string(),
    cf_use_member_icon: AdminConfigIntegerInput,
    cf_icon_level: AdminConfigIntegerInput,
    cf_member_icon_width: AdminConfigIntegerInput,
    cf_member_icon_height: AdminConfigIntegerInput,
    cf_member_icon_size: AdminConfigIntegerInput,
    cf_member_img_width: AdminConfigIntegerInput,
    cf_member_img_height: AdminConfigIntegerInput,
    cf_member_img_size: AdminConfigIntegerInput,
    cf_use_profile: z.string(),
    cf_req_profile: z.string(),
    cf_use_signature: z.string(),
    cf_req_signature: z.string(),
    cf_use_recommend: z.string(),
    cf_use_promotion: z.string(),
    cf_mobile_new_skin: z.string(),
    cf_mobile_search_skin: z.string(),
    cf_mobile_connect_skin: z.string(),
    cf_mobile_faq_skin: z.string(),
  })
  .partial()
  .strict();
const ContentItem: z.ZodType<ContentItem> = z
  .object({
    co_id: z.string().regex(/^[a-zA-Z0-9_]{1,20}$/),
    co_subject: z.string(),
    co_html: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    co_content: z.string(),
    co_mobile_content: z.string(),
    co_include_head: z.string(),
    co_include_tail: z.string(),
    co_tag_filter_use: z.union([z.literal(0), z.literal(1)]),
    co_skin: z.string(),
    co_mobile_skin: z.string(),
  })
  .strict();
const ContentListResponse: z.ZodType<ContentListResponse> = z
  .object({ data: z.array(ContentItem), pagination: Pagination, meta: Meta })
  .strict();
const ContentCreateRequest = z
  .object({
    co_id: z.string().regex(/^[a-zA-Z0-9_]{1,20}$/),
    co_subject: z.string().min(1),
    co_html: z
      .union([z.literal(0), z.literal(1), z.literal(2)])
      .optional()
      .default(0),
    co_content: z.string().min(1),
    co_mobile_content: z.string().optional().default(""),
    co_include_head: z.string().optional().default(""),
    co_include_tail: z.string().optional().default(""),
    co_tag_filter_use: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .default(1),
    co_skin: z.string().optional().default(""),
    co_mobile_skin: z.string().optional().default(""),
  })
  .strict();
const ContentDetailResponse: z.ZodType<ContentDetailResponse> = z
  .object({ data: ContentItem, meta: Meta })
  .strict();
const ContentUpdateRequest = z
  .object({
    co_subject: z.string().min(1),
    co_html: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    co_content: z.string().min(1),
    co_mobile_content: z.string(),
    co_include_head: z.string(),
    co_include_tail: z.string(),
    co_tag_filter_use: z.union([z.literal(0), z.literal(1)]),
    co_skin: z.string(),
    co_mobile_skin: z.string(),
  })
  .partial()
  .strict();
const FaqItem: z.ZodType<FaqItem> = z
  .object({
    fa_id: z.number().int(),
    fm_id: z.number().int(),
    fm_subject: z.string().nullable(),
    fa_subject: z.string(),
    fa_content: z.string(),
    fa_order: z.number().int(),
  })
  .strict();
const FaqListResponse: z.ZodType<FaqListResponse> = z
  .object({ data: z.array(FaqItem), pagination: Pagination, meta: Meta })
  .strict();
const FaqCreateRequest = z
  .object({
    fm_id: z.number().int().gte(1),
    fa_subject: z.string().min(1),
    fa_content: z.string().min(1),
    fa_order: z.number().int().optional().default(0),
  })
  .strict();
const FaqDetailResponse: z.ZodType<FaqDetailResponse> = z
  .object({ data: FaqItem, meta: Meta })
  .strict();
const FaqUpdateRequest = z
  .object({
    fm_id: z.number().int().gte(1),
    fa_subject: z.string().min(1),
    fa_content: z.string().min(1),
    fa_order: z.number().int(),
  })
  .partial()
  .strict();
const FaqImage: z.ZodType<FaqImage> = z
  .object({
    exists: z.boolean(),
    relative_path: z.string(),
    url: z.string(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    mime: z.string().nullable(),
    size: z.number().int().nullable(),
  })
  .strict();
const FaqMasterSummary: z.ZodType<FaqMasterSummary> = z
  .object({
    fm_id: z.number().int(),
    fm_subject: z.string(),
    fm_order: z.number().int(),
    faq_count: z.number().int(),
    header_image: FaqImage,
    footer_image: FaqImage,
  })
  .strict();
const FaqMasterListResponse: z.ZodType<FaqMasterListResponse> = z
  .object({
    data: z.array(FaqMasterSummary),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const FaqMasterCreateRequest = z
  .object({
    fm_subject: z.string().min(1),
    fm_order: z.number().int().optional().default(0),
    fm_head_html: z.string().optional().default(""),
    fm_tail_html: z.string().optional().default(""),
    fm_mobile_head_html: z.string().optional().default(""),
    fm_mobile_tail_html: z.string().optional().default(""),
  })
  .strict();
const FaqMasterDetail: z.ZodType<FaqMasterDetail> = z
  .object({
    fm_id: z.number().int(),
    fm_subject: z.string(),
    fm_head_html: z.string(),
    fm_tail_html: z.string(),
    fm_mobile_head_html: z.string(),
    fm_mobile_tail_html: z.string(),
    fm_order: z.number().int(),
    faq_count: z.number().int(),
    header_image: FaqImage,
    footer_image: FaqImage,
  })
  .strict();
const FaqMasterDetailResponse: z.ZodType<FaqMasterDetailResponse> = z
  .object({ data: FaqMasterDetail, meta: Meta })
  .strict();
const FaqMasterUpdateRequest = z
  .object({
    fm_subject: z.string().min(1),
    fm_order: z.number().int(),
    fm_head_html: z.string(),
    fm_tail_html: z.string(),
    fm_mobile_head_html: z.string(),
    fm_mobile_tail_html: z.string(),
  })
  .partial()
  .strict();
const FaqMasterHeaderImageUploadRequest = z.union([
  z.unknown(),
  z.unknown(),
  z.unknown(),
  z.unknown(),
]);
const FaqImageResponse: z.ZodType<FaqImageResponse> = z
  .object({ data: FaqImage, meta: Meta })
  .strict();
const FaqMasterFooterImageUploadRequest = z.union([
  z.unknown(),
  z.unknown(),
  z.unknown(),
  z.unknown(),
]);
const MenuCreateRequest = z
  .object({
    me_code: z.string().min(1),
    me_name: z.string().min(1),
    me_link: z.string().min(1),
    me_target: z.string().min(1).optional().default("_self"),
    me_order: z.number().int().gte(0).optional().default(0),
    me_use: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .default(1),
    me_mobile_use: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .default(1),
  })
  .strict();
const MenuDetailResponse: z.ZodType<MenuDetailResponse> = z
  .object({ data: MenuItem, meta: Meta })
  .strict();
const MenuReorderItem: z.ZodType<MenuReorderItem> = z
  .object({ me_id: z.number().int().gte(1), me_order: z.number().int().gte(0) })
  .strict();
const MenuReorderRequest: z.ZodType<MenuReorderRequest> = z
  .object({ orders: z.array(MenuReorderItem).min(1) })
  .strict();
const MenuReorderResult: z.ZodType<MenuReorderResult> = z
  .object({ result: z.literal("ok") })
  .strict();
const MenuReorderResponse: z.ZodType<MenuReorderResponse> = z
  .object({ data: MenuReorderResult, meta: Meta })
  .strict();
const MenuUpdateRequest = z
  .object({
    me_code: z.string().min(1),
    me_name: z.string().min(1),
    me_link: z.string().min(1),
    me_target: z.string().min(1),
    me_order: z.number().int().gte(0),
    me_use: z.union([z.literal(0), z.literal(1)]),
    me_mobile_use: z.union([z.literal(0), z.literal(1)]),
  })
  .partial()
  .strict();
const AdminPopularItem: z.ZodType<AdminPopularItem> = z
  .object({
    pp_word: z.string(),
    pp_date: z.string(),
    pp_cnt: z.number().int(),
    pp_rank: z.number().int(),
  })
  .strict();
const AdminPopularListResponse: z.ZodType<AdminPopularListResponse> = z
  .object({
    data: z.array(AdminPopularItem),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminPopularResetRequest = z
  .object({ date_from: z.string(), date_to: z.string() })
  .partial()
  .strict();
const AdminPopularResetResult: z.ZodType<AdminPopularResetResult> = z
  .object({
    deleted_rows: z.number().int(),
    date_from: z.string().nullable(),
    date_to: z.string().nullable(),
  })
  .strict();
const AdminPopularResetResponse: z.ZodType<AdminPopularResetResponse> = z
  .object({ data: AdminPopularResetResult, meta: Meta })
  .strict();
const AdminPopularRankItem: z.ZodType<AdminPopularRankItem> = z
  .object({
    rank: z.number().int(),
    pp_word: z.string(),
    hit_count: z.number().int(),
    first_date: z.string(),
    last_date: z.string(),
  })
  .strict();
const AdminPopularRankResponse: z.ZodType<AdminPopularRankResponse> = z
  .object({
    data: z.array(AdminPopularRankItem),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const VisitStatItem: z.ZodType<VisitStatItem> = z
  .object({ stat_key: z.string(), visit_count: z.number().int() })
  .partial()
  .strict()
  .passthrough();
const VisitStatsData: z.ZodType<VisitStatsData> = z
  .object({
    type: z.enum([
      "date",
      "hour",
      "week",
      "month",
      "year",
      "browser",
      "os",
      "device",
      "domain",
      "search",
    ]),
    summary: VisitStatsSummary,
    items: z.array(VisitStatItem),
  })
  .partial()
  .strict()
  .passthrough();
const VisitStatsResponse: z.ZodType<VisitStatsResponse> = z
  .object({ data: VisitStatsData, meta: Meta })
  .strict()
  .passthrough();
const VisitLogItem: z.ZodType<VisitLogItem> = z
  .object({
    vi_id: z.number().int(),
    vi_ip: z.string(),
    vi_date: z.string(),
    vi_time: z.string(),
    vi_referer: z.string(),
    vi_agent: z.string(),
    vi_browser: z.string(),
    vi_os: z.string(),
    vi_device: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const VisitSearchResponse: z.ZodType<VisitSearchResponse> = z
  .object({ data: z.array(VisitLogItem), pagination: Pagination, meta: Meta })
  .strict()
  .passthrough();
const AdminVisitDeleteRequest = z
  .object({
    before: z.string(),
    date_from: z.string(),
    date_to: z.string(),
    ip: z.string(),
  })
  .partial()
  .strict();
const VisitDeleteResult: z.ZodType<VisitDeleteResult> = z
  .object({
    deleted_rows: z.number().int(),
    before: z.string().nullable(),
    date_from: z.string().nullable(),
    date_to: z.string().nullable(),
    ip: z.string().nullable(),
  })
  .strict();
const VisitDeleteResponse: z.ZodType<VisitDeleteResponse> = z
  .object({ data: VisitDeleteResult, meta: Meta })
  .strict();
const AdminWriteCountSummary: z.ZodType<AdminWriteCountSummary> = z
  .object({ write_total: z.number().int(), comment_total: z.number().int() })
  .strict();
const AdminWriteCountItem: z.ZodType<AdminWriteCountItem> = z
  .object({
    bucket: z.string(),
    write_count: z.number().int(),
    comment_count: z.number().int(),
  })
  .strict();
const AdminWriteCountStats: z.ZodType<AdminWriteCountStats> = z
  .object({
    period: z.enum(["hour", "day", "week", "month", "year"]),
    date_from: z.string(),
    date_to: z.string(),
    bo_table: z.string().nullable(),
    summary: AdminWriteCountSummary,
    items: z.array(AdminWriteCountItem),
  })
  .strict();
const AdminWriteCountStatsResponse: z.ZodType<AdminWriteCountStatsResponse> = z
  .object({ data: AdminWriteCountStats, meta: Meta })
  .strict();
const PointActionRequest = z.union([
  z
    .object({ action: z.literal("grant") })
    .strict()
    .passthrough(),
  z
    .object({ action: z.literal("deduct") })
    .strict()
    .passthrough(),
  z
    .object({ action: z.literal("expire") })
    .strict()
    .passthrough(),
]);
const PointChangeResult: z.ZodType<PointChangeResult> = z
  .object({
    mb_id: z.string(),
    before_point: z.number().int(),
    changed_point: z.number().int(),
    after_point: z.number().int(),
    po_content: z.string(),
    processed_at: z.string(),
  })
  .strict();
const PointExpireResult: z.ZodType<PointExpireResult> = z
  .object({
    base_date: z.string(),
    expired_count: z.number().int().gte(0),
    synced_members: z.number().int().gte(0),
  })
  .strict();
const PointActionResponse: z.ZodType<PointActionResponse> = z
  .object({ data: z.union([PointChangeResult, PointExpireResult]), meta: Meta })
  .strict();
const PointDeleteRequest = z
  .object({ po_ids: z.array(z.number().int().gte(1)).min(1) })
  .strict();
const PointDeleteResult: z.ZodType<PointDeleteResult> = z
  .object({
    requested_count: z.number().int().gte(0),
    deleted_count: z.number().int().gte(0),
  })
  .strict();
const PointDeleteResponse: z.ZodType<PointDeleteResponse> = z
  .object({ data: PointDeleteResult, meta: Meta })
  .strict();
const PointChangeRequest = z
  .object({
    mb_id: z.string().min(1),
    point: z.number().int().gte(1),
    po_content: z.string().optional(),
  })
  .strict();
const PointChangeResponse: z.ZodType<PointChangeResponse> = z
  .object({ data: PointChangeResult, meta: Meta })
  .strict();
const PointSummary: z.ZodType<PointSummary> = z
  .object({
    mb_id: z.string().optional(),
    total_point: z.number().int(),
    total_rows: z.number().int(),
  })
  .strict();
const PointSummaryResponse: z.ZodType<PointSummaryResponse> = z
  .object({ data: PointSummary, meta: Meta })
  .strict();
const PointExpireRequest = z
  .object({ base_date: z.string() })
  .partial()
  .strict();
const PointExpireResponse: z.ZodType<PointExpireResponse> = z
  .object({ data: PointExpireResult, meta: Meta })
  .strict();
const AdminPushSendRequest = z.union([z.unknown(), z.unknown()]);
const AdminPushSendResult: z.ZodType<AdminPushSendResult> = z
  .object({
    requested_by: z.string(),
    target_count: z.number().int(),
    queued: z.number().int(),
    failed: z.number().int(),
  })
  .strict();
const AdminPushSendResponse: z.ZodType<AdminPushSendResponse> = z
  .object({ data: AdminPushSendResult, meta: Meta })
  .strict();
const SmsConfig: z.ZodType<SmsConfig> = z
  .object({
    cf_title: z.string().nullable(),
    cf_sms_use: z.string().nullable(),
    cf_sms_type: z.string().nullable(),
    cf_icode_id: z.string().nullable(),
    cf_icode_pw: z.string().nullable(),
    cf_icode_server_ip: z.string().nullable(),
    cf_icode_server_port: z.string().nullable(),
    cf_icode_token_key: z.string().nullable(),
    cf_phone: z.string().nullable(),
    cf_datetime: z.string().nullable(),
    provider_ready: z.boolean(),
    uses_token_key: z.boolean(),
    uses_legacy_credentials: z.boolean(),
    storage_ready: z.boolean(),
    missing_tables: z.array(z.string()),
  })
  .strict();
const SmsConfigResponse: z.ZodType<SmsConfigResponse> = z
  .object({ data: SmsConfig, meta: Meta })
  .strict();
const AdminSmsConfigUpdateRequest = z
  .object({
    cf_sms_use: z.enum(["", "icode"]),
    cf_sms_type: z.enum(["", "LMS"]),
    cf_icode_id: z.string(),
    cf_icode_pw: z.string(),
    cf_icode_server_ip: z.string(),
    cf_icode_server_port: z.string(),
    cf_icode_token_key: z.string(),
    cf_phone: z.string(),
  })
  .partial()
  .strict();
const AdminSmsMemberSyncSummary: z.ZodType<AdminSmsMemberSyncSummary> = z
  .object({
    total_members: z.number().int(),
    leave_members: z.number().int(),
    phone_empty: z.number().int(),
    phone_valid: z.number().int(),
    phone_invalid: z.number().int(),
    receipt_enabled: z.number().int(),
    receipt_disabled: z.number().int(),
  })
  .strict();
const AdminSmsMemberSyncResult: z.ZodType<AdminSmsMemberSyncResult> = z
  .object({
    datetime: z.string().nullable(),
    summary: AdminSmsMemberSyncSummary,
  })
  .strict();
const AdminSmsMemberSyncResponse: z.ZodType<AdminSmsMemberSyncResponse> = z
  .object({ data: AdminSmsMemberSyncResult, meta: Meta })
  .strict();
const AdminSmsTemplateGroup: z.ZodType<AdminSmsTemplateGroup> = z
  .object({
    fg_no: z.number().int(),
    fg_name: z.string(),
    fg_count: z.number().int(),
    fg_member: z.number().int(),
    is_virtual: z.boolean(),
  })
  .strict();
const AdminSmsTemplateGroupListResponse: z.ZodType<AdminSmsTemplateGroupListResponse> =
  z
    .object({
      data: z.array(AdminSmsTemplateGroup),
      meta: Meta.and(
        z.object({ total: z.number().int() }).strict().passthrough()
      ),
    })
    .strict();
const AdminSmsTemplateGroupCreateRequest = z
  .object({
    fg_name: z.string(),
    fg_member: z.number().int().gte(0).lte(1).optional(),
  })
  .strict();
const AdminSmsTemplateGroupDetailResponse: z.ZodType<AdminSmsTemplateGroupDetailResponse> =
  z.object({ data: AdminSmsTemplateGroup, meta: Meta }).strict();
const AdminSmsTemplateGroupUpdateRequest = z
  .object({ fg_name: z.string(), fg_member: z.number().int().gte(0).lte(1) })
  .partial()
  .strict();
const AdminSmsTemplateGroupMoveRequest = z
  .object({ target_fg_no: z.number().int().gte(0) })
  .strict();
const AdminSmsTemplateGroupMoveResult: z.ZodType<AdminSmsTemplateGroupMoveResult> =
  z
    .object({
      from_fg_no: z.number().int(),
      target_fg_no: z.number().int(),
      affected: z.number().int(),
    })
    .strict();
const AdminSmsTemplateGroupMoveResponse: z.ZodType<AdminSmsTemplateGroupMoveResponse> =
  z.object({ data: AdminSmsTemplateGroupMoveResult, meta: Meta }).strict();
const AdminSmsTemplateGroupClearResult: z.ZodType<AdminSmsTemplateGroupClearResult> =
  z.object({ fg_no: z.number().int(), deleted: z.number().int() }).strict();
const AdminSmsTemplateGroupClearResponse: z.ZodType<AdminSmsTemplateGroupClearResponse> =
  z.object({ data: AdminSmsTemplateGroupClearResult, meta: Meta }).strict();
const AdminSmsTemplate: z.ZodType<AdminSmsTemplate> = z
  .object({
    fo_no: z.number().int(),
    fg_no: z.number().int(),
    fg_member: z.number().int(),
    fg_name: z.string().nullable(),
    fo_name: z.string(),
    fo_content: z.string(),
    fo_datetime: z.string().nullable(),
  })
  .strict();
const AdminSmsTemplateListResponse: z.ZodType<AdminSmsTemplateListResponse> = z
  .object({
    data: z.array(AdminSmsTemplate),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminSmsTemplateCreateRequest = z
  .object({
    fg_no: z.number().int().gte(0).optional(),
    fo_name: z.string(),
    fo_content: z.string(),
  })
  .strict();
const AdminSmsTemplateDetailResponse: z.ZodType<AdminSmsTemplateDetailResponse> =
  z.object({ data: AdminSmsTemplate, meta: Meta }).strict();
const AdminSmsTemplateBatchRequest = z.union([z.unknown(), z.unknown()]);
const AdminSmsTemplateBatchResult: z.ZodType<AdminSmsTemplateBatchResult> = z
  .object({
    action: z.enum(["move", "delete"]),
    affected: z.number().int(),
    target_fg_no: z.number().int().nullable(),
  })
  .strict();
const AdminSmsTemplateBatchResponse: z.ZodType<AdminSmsTemplateBatchResponse> =
  z.object({ data: AdminSmsTemplateBatchResult, meta: Meta }).strict();
const AdminSmsTemplateUpdateRequest = z
  .object({
    fg_no: z.number().int().gte(0),
    fo_name: z.string(),
    fo_content: z.string(),
  })
  .partial()
  .strict();
const AdminSmsContactGroup: z.ZodType<AdminSmsContactGroup> = z
  .object({
    bg_no: z.number().int(),
    bg_name: z.string(),
    bg_count: z.number().int(),
    bg_member: z.number().int(),
    bg_nomember: z.number().int(),
    bg_receipt: z.number().int(),
    bg_reject: z.number().int(),
  })
  .strict();
const AdminSmsContactGroupListResponse: z.ZodType<AdminSmsContactGroupListResponse> =
  z
    .object({
      data: z.array(AdminSmsContactGroup),
      meta: Meta.and(
        z.object({ total: z.number().int() }).strict().passthrough()
      ),
    })
    .strict();
const AdminSmsContactGroupRequest = z.object({ bg_name: z.string() }).strict();
const AdminSmsContactGroupDetailResponse: z.ZodType<AdminSmsContactGroupDetailResponse> =
  z.object({ data: AdminSmsContactGroup, meta: Meta }).strict();
const AdminSmsContactGroupMoveRequest = z
  .object({ target_bg_no: z.number().int().gte(1) })
  .strict();
const AdminSmsContactGroupMoveResult: z.ZodType<AdminSmsContactGroupMoveResult> =
  z
    .object({
      from_bg_no: z.number().int(),
      target_bg_no: z.number().int(),
      affected: z.number().int(),
    })
    .strict();
const AdminSmsContactGroupMoveResponse: z.ZodType<AdminSmsContactGroupMoveResponse> =
  z.object({ data: AdminSmsContactGroupMoveResult, meta: Meta }).strict();
const AdminSmsContactGroupClearResult: z.ZodType<AdminSmsContactGroupClearResult> =
  z.object({ bg_no: z.number().int(), deleted: z.number().int() }).strict();
const AdminSmsContactGroupClearResponse: z.ZodType<AdminSmsContactGroupClearResponse> =
  z.object({ data: AdminSmsContactGroupClearResult, meta: Meta }).strict();
const AdminSmsContact: z.ZodType<AdminSmsContact> = z
  .object({
    bk_no: z.number().int(),
    bg_no: z.number().int(),
    bg_name: z.string().nullable(),
    mb_id: z.string().nullable(),
    bk_name: z.string(),
    bk_hp: z.string(),
    bk_receipt: z.union([z.literal(0), z.literal(1)]),
    bk_datetime: z.string().nullable(),
    bk_memo: z.string().nullable(),
    receipt_label: z.string(),
    member_type: z.enum(["member", "non_member"]),
    member_sync_skipped: z.boolean().nullable(),
  })
  .strict();
const AdminSmsContactSummary: z.ZodType<AdminSmsContactSummary> = z
  .object({
    total_count: z.number().int(),
    receipt_count: z.number().int(),
    reject_count: z.number().int(),
    member_count: z.number().int(),
    non_member_count: z.number().int(),
    last_synced_at: z.string().nullable(),
  })
  .strict();
const AdminSmsContactListResponse: z.ZodType<AdminSmsContactListResponse> = z
  .object({
    data: z.array(AdminSmsContact),
    pagination: Pagination,
    meta: Meta.and(AdminSmsContactSummary),
  })
  .strict();
const AdminSmsContactCreateRequest = z
  .object({
    bg_no: z.number().int().gte(1).optional(),
    mb_id: z.string().optional(),
    bk_name: z.string(),
    bk_hp: z.string(),
    bk_receipt: z.number().int().gte(0).lte(1).optional(),
    bk_memo: z.string().optional(),
  })
  .strict();
const AdminSmsContactDetailResponse: z.ZodType<AdminSmsContactDetailResponse> =
  z.object({ data: AdminSmsContact, meta: Meta }).strict();
const AdminSmsContactBatchRequest = z.union([z.unknown(), z.unknown()]);
const AdminSmsContactBatchResult: z.ZodType<AdminSmsContactBatchResult> = z
  .object({
    action: z.enum(["delete", "allow", "reject", "move", "copy"]),
    affected: z.number().int(),
    target_bg_no: z.number().int().nullable(),
  })
  .strict();
const AdminSmsContactBatchResponse: z.ZodType<AdminSmsContactBatchResponse> = z
  .object({ data: AdminSmsContactBatchResult, meta: Meta })
  .strict();
const AdminSmsContactImportMultipartRequest = z
  .union([z.unknown(), z.unknown()])
  .and(z.union([z.unknown(), z.unknown(), z.unknown()]));
const AdminSmsContactImportResult: z.ZodType<AdminSmsContactImportResult> = z
  .object({
    total_count: z.number().int(),
    invalid_count: z.number().int(),
    duplicate_count: z.number().int(),
    importable_count: z.number().int(),
    imported_count: z.number().int(),
    dry_run: z.boolean(),
    duplicate_phones: z.array(z.string()),
    importable_phones: z.array(z.string()),
  })
  .strict();
const AdminSmsContactImportResponse: z.ZodType<AdminSmsContactImportResponse> =
  z.object({ data: AdminSmsContactImportResult, meta: Meta }).strict();
const bg_no = z.union([z.number(), z.literal("all")]).optional();
const AdminSmsContactExportItem: z.ZodType<AdminSmsContactExportItem> = z
  .object({
    bk_name: z.string(),
    bk_hp: z.string(),
    bg_no: z.number().int(),
    mb_id: z.string().nullable(),
    bk_receipt: z.union([z.literal(0), z.literal(1)]),
  })
  .strict();
const AdminSmsContactExportResponse: z.ZodType<AdminSmsContactExportResponse> =
  z
    .object({
      data: z.array(AdminSmsContactExportItem),
      meta: Meta.and(
        z
          .object({
            total: z.number().int(),
            bg_no: z.number().int().nullable(),
            include_no_phone: z.boolean(),
            with_hyphen: z.boolean(),
          })
          .strict()
          .passthrough()
      ),
    })
    .strict();
const AdminSmsContactUpdateRequest = z
  .object({
    bg_no: z.number().int().gte(1),
    bk_name: z.string(),
    bk_hp: z.string(),
    bk_receipt: z.number().int().gte(0).lte(1),
    bk_memo: z.string(),
  })
  .partial()
  .strict();
const AdminSmsDuplicateSummary: z.ZodType<AdminSmsDuplicateSummary> = z
  .object({ total: z.number().int(), phones: z.array(z.string()) })
  .strict();
const AdminSmsMessageBatch: z.ZodType<AdminSmsMessageBatch> = z
  .object({
    wr_no: z.number().int(),
    wr_renum: z.number().int(),
    wr_reply: z.string().nullable(),
    wr_message: z.string().nullable(),
    wr_booking: z.string().nullable(),
    wr_total: z.number().int(),
    wr_re_total: z.number().int(),
    wr_success: z.number().int(),
    wr_failure: z.number().int(),
    wr_datetime: z.string().nullable(),
    wr_memo: z.string().nullable(),
    duplicate_summary: AdminSmsDuplicateSummary.nullable(),
  })
  .strict();
const AdminSmsMessageBatchListResponse: z.ZodType<AdminSmsMessageBatchListResponse> =
  z
    .object({
      data: z.array(AdminSmsMessageBatch),
      pagination: Pagination,
      meta: Meta,
    })
    .strict();
const AdminSmsDelivery: z.ZodType<AdminSmsDelivery> = z
  .object({
    hs_no: z.number().int(),
    wr_no: z.number().int().nullable(),
    wr_renum: z.number().int().nullable(),
    bg_no: z.number().int().nullable(),
    bg_name: z.string().nullable(),
    mb_id: z.string().nullable(),
    bk_no: z.number().int().nullable(),
    hs_name: z.string().nullable(),
    hs_hp: z.string().nullable(),
    hs_datetime: z.string().nullable(),
    hs_flag: z.number().int().nullable(),
    hs_code: z.string().nullable(),
    hs_memo: z.string().nullable(),
    hs_log: z.string().nullable(),
    wr_message: z.string().nullable(),
    wr_datetime: z.string().nullable(),
    wr_booking: z.string().nullable(),
  })
  .strict();
const AdminSmsDeliveryListResponse: z.ZodType<AdminSmsDeliveryListResponse> = z
  .object({
    data: z.array(AdminSmsDelivery),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminSmsRetryBatch: z.ZodType<AdminSmsRetryBatch> = z
  .object({
    wr_no: z.number().int(),
    wr_renum: z.number().int(),
    wr_total: z.number().int(),
    wr_success: z.number().int(),
    wr_failure: z.number().int(),
    wr_datetime: z.string().nullable(),
  })
  .strict();
const AdminSmsMessageBatchDetail: z.ZodType<AdminSmsMessageBatchDetail> = z
  .object({
    wr_no: z.number().int(),
    wr_renum: z.number().int(),
    wr_reply: z.string().nullable(),
    wr_message: z.string().nullable(),
    wr_booking: z.string().nullable(),
    wr_total: z.number().int(),
    wr_re_total: z.number().int(),
    wr_success: z.number().int(),
    wr_failure: z.number().int(),
    wr_datetime: z.string().nullable(),
    wr_memo: z.string().nullable(),
    duplicate_summary: AdminSmsDuplicateSummary.nullable(),
    retry_batches: z.array(AdminSmsRetryBatch),
    deliveries: z.array(AdminSmsDelivery),
    deliveries_pagination: Pagination,
  })
  .strict();
const AdminSmsMessageBatchDetailResponse: z.ZodType<AdminSmsMessageBatchDetailResponse> =
  z.object({ data: AdminSmsMessageBatchDetail, meta: Meta }).strict();
const AdminSmsResendRequest = z
  .object({
    wr_renum: z.number().int().gte(0),
    booking_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .strict();
const AdminSmsSendResult: z.ZodType<AdminSmsSendResult> = z
  .object({
    write_no: z.number().int(),
    write_renum: z.number().int(),
    reply: z.string().nullable(),
    message: z.string().nullable(),
    booking_at: z.string().nullable(),
    total: z.number().int(),
    success: z.number().int(),
    failure: z.number().int(),
    duplicate_summary: AdminSmsDuplicateSummary.nullable(),
    provider_ready: z.boolean(),
  })
  .strict();
const AdminSmsSendResponse: z.ZodType<AdminSmsSendResponse> = z
  .object({ data: AdminSmsSendResult, meta: Meta })
  .strict();
const AdminSmsMessageCreateRequest = z
  .union([z.unknown(), z.unknown(), z.unknown(), z.unknown()])
  .and(z.union([z.unknown(), z.unknown(), z.unknown(), z.unknown()]));
const AdminLayoutSummary: z.ZodType<AdminLayoutSummary> = z
  .object({
    sl_id: z.number().int().gte(0),
    sl_page_id: z.string(),
    sl_title: z.string(),
    sl_active: z.union([z.literal(0), z.literal(1)]),
    sl_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    sl_updated: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  })
  .strict();
const AdminLayoutListResponse: z.ZodType<AdminLayoutListResponse> = z
  .object({
    data: z.array(AdminLayoutSummary),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminLayoutDetail: z.ZodType<AdminLayoutDetail> = z
  .object({
    sl_id: z.number().int().gte(0),
    sl_page_id: z.string(),
    sl_title: z.string(),
    sl_schema: z.string(),
    sl_active: z.union([z.literal(0), z.literal(1)]),
    sl_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    sl_updated: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  })
  .strict();
const AdminLayoutDetailResponse: z.ZodType<AdminLayoutDetailResponse> = z
  .object({ data: AdminLayoutDetail, meta: Meta })
  .strict();
const AdminLayoutWidget: z.ZodType<AdminLayoutWidget> = z
  .object({
    widget_id: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/),
    type: z.enum([
      "latest_posts",
      "notice_banner",
      "popular_posts",
      "category_grid",
      "search_bar",
      "image_carousel",
      "ad_banner",
      "spacer",
      "html_block",
      "quick_menu",
    ]),
    title: z.string().optional(),
    order: z.number().int().gte(1).optional().default(1),
    config: z.object({}).partial().strict().passthrough().optional(),
    style: z.object({}).partial().strict().passthrough().optional(),
  })
  .strict();
const AdminLayoutSaveRequest: z.ZodType<AdminLayoutSaveRequest> = z
  .object({ title: z.string().optional(), widgets: z.array(AdminLayoutWidget) })
  .strict();
const AdminLayoutWidgetCreateRequest = z
  .object({
    widget_id: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    type: z.enum([
      "latest_posts",
      "notice_banner",
      "popular_posts",
      "category_grid",
      "search_bar",
      "image_carousel",
      "ad_banner",
      "spacer",
      "html_block",
      "quick_menu",
    ]),
    title: z.string().optional(),
    order: z.number().int().gte(1).optional().default(1),
    config: z.object({}).partial().strict().passthrough().optional(),
    style: z.object({}).partial().strict().passthrough().optional(),
  })
  .strict();
const AdminLayoutWidgetReorderRequest = z
  .object({
    widget_ids: z
      .array(
        z
          .string()
          .min(1)
          .max(80)
          .regex(/^[a-zA-Z0-9_-]+$/)
      )
      .min(1),
  })
  .strict();
const AdminLayoutWidgetUpdateRequest = z
  .object({
    type: z.enum([
      "latest_posts",
      "notice_banner",
      "popular_posts",
      "category_grid",
      "search_bar",
      "image_carousel",
      "ad_banner",
      "spacer",
      "html_block",
      "quick_menu",
    ]),
    title: z.string(),
    order: z.number().int().gte(1),
    config: z.object({}).partial().strict().passthrough(),
    style: z.object({}).partial().strict().passthrough(),
  })
  .partial()
  .strict();
const AdminReportItem: z.ZodType<AdminReportItem> = z
  .object({
    rp_id: z.number().int(),
    mb_id: z.string().nullable(),
    rp_target_type: z.string().nullable(),
    rp_target_id: z.string().nullable(),
    rp_reason: z.string().nullable(),
    rp_detail: z.string().nullable(),
    rp_status: z.string().nullable(),
    rp_admin_memo: z.string().nullable(),
    rp_datetime: z.string().nullable(),
    rp_processed_at: z.string().nullable(),
  })
  .strict();
const AdminReportListResponse: z.ZodType<AdminReportListResponse> = z
  .object({
    data: z.array(AdminReportItem),
    pagination: Pagination,
    meta: Meta,
  })
  .strict();
const AdminReportUpdateRequest = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "hold"]),
    admin_memo: z.string().optional(),
  })
  .strict();
const AdminReportDetailResponse: z.ZodType<AdminReportDetailResponse> = z
  .object({ data: AdminReportItem, meta: Meta })
  .strict();
const AdminReportStats: z.ZodType<AdminReportStats> = z
  .object({
    pending: z.number().int(),
    approved: z.number().int(),
    rejected: z.number().int(),
    hold: z.number().int(),
    total: z.number().int(),
  })
  .strict();
const AdminReportStatsResponse: z.ZodType<AdminReportStatsResponse> = z
  .object({ data: AdminReportStats, meta: Meta })
  .strict();
const createQaQuestion_Body = z
  .object({
    qa_category: z.string(),
    qa_subject: z.string(),
    qa_content: z.string(),
    qa_email: z.string().email().optional(),
    qa_hp: z.string().optional(),
    qa_email_recv: z.union([z.literal(0), z.literal(1)]).optional(),
    qa_sms_recv: z.union([z.literal(0), z.literal(1)]).optional(),
    qa_html: z.union([z.literal(0), z.literal(1)]).optional(),
    "bf_file[1]": z.instanceof(File).optional(),
    "bf_file[2]": z.instanceof(File).optional(),
  })
  .strict()
  .passthrough();
const updateQa_Body = z
  .object({
    qa_category: z.string(),
    qa_subject: z.string(),
    qa_content: z.string(),
    qa_email: z.string().email(),
    qa_hp: z.string(),
    qa_email_recv: z.union([z.literal(0), z.literal(1)]),
    qa_sms_recv: z.union([z.literal(0), z.literal(1)]),
    qa_html: z.union([z.literal(0), z.literal(1)]),
    "bf_file_del[1]": z.union([z.literal(0), z.literal(1)]),
    "bf_file_del[2]": z.union([z.literal(0), z.literal(1)]),
    "bf_file[1]": z.instanceof(File),
    "bf_file[2]": z.instanceof(File),
  })
  .partial()
  .strict()
  .passthrough();
const createQaAnswer_Body = z
  .object({
    qa_subject: z.string(),
    qa_content: z.string(),
    qa_html: z.union([z.literal(0), z.literal(1)]).optional(),
    "bf_file[1]": z.instanceof(File).optional(),
    "bf_file[2]": z.instanceof(File).optional(),
  })
  .strict()
  .passthrough();
const AdminQaBulkDeleteRequest = z
  .object({ qa_ids: z.array(z.number().int().gte(1)).min(1) })
  .strict();
const AdminQaBulkDeleteResult: z.ZodType<AdminQaBulkDeleteResult> = z
  .object({
    deleted_count: z.number().int(),
    qa_ids: z.array(z.number().int().gte(1)),
  })
  .strict();
const AdminQaBulkDeleteResponse: z.ZodType<AdminQaBulkDeleteResponse> = z
  .object({ data: AdminQaBulkDeleteResult, meta: Meta })
  .strict();
const AdminMemberUploadFile = z.union([
  z.instanceof(File),
  z.array(z.instanceof(File)),
]);
const MemberListResponse: z.ZodType<MemberListResponse> = z
  .object({ data: z.array(Member), pagination: Pagination, meta: Meta })
  .strict()
  .passthrough();
const MemberDetailResponse: z.ZodType<MemberDetailResponse> = z
  .object({ data: Member, meta: Meta })
  .strict()
  .passthrough();
const AdminAuthAssignmentInput = z
  .object({
    au_menu: z.string().regex(/^[0-9]{3,6}$/),
    au_auth: z.string().regex(/^[rwdRWD,]+$/),
  })
  .strict();
const PollNoInput = z.union([z.number(), z.string()]);
const FaqMasterImageUploadFile = z.union([
  z.instanceof(File),
  z.array(z.instanceof(File)),
]);
const AdminSmsContactImportFile = z.union([
  z.instanceof(File),
  z.array(z.instanceof(File)),
]);
const AdminSmsContactImportItem = z
  .object({
    name: z.string(),
    phone: z.string(),
    memo: z.string(),
    receipt: z.boolean(),
    bk_name: z.string(),
    bk_hp: z.string(),
    bk_memo: z.string(),
    bk_receipt: z.boolean(),
  })
  .partial()
  .strict();
const AdminSmsContactImportJsonRequest = z.union([z.unknown(), z.unknown()]);
const AdminSmsManualTarget = z.union([z.unknown(), z.unknown()]);

export const schemas = {
  Meta,
  HealthResponse,
  ErrorGuide,
  ProblemDetails,
  PluginHelloGreetResponse,
  PluginHelloInfoResponse,
  PluginPremiumPushStatusResponse,
  PluginPremiumPushSendRequest,
  PluginPremiumPushSendResponse,
  PluginBoardRewardBoard,
  PluginBoardRewardBoardResponse,
  PluginBoardRewardCommand,
  PluginBoardRewardResolvedCommand,
  PluginBoardRewardPreviewResponse,
  PluginBoardRewardGrantResponse,
  AuthLoginRequest,
  TokenResponse,
  AvailabilityCheck,
  AvailabilityResponse,
  AuthRefreshRequest,
  register_Body,
  RegisterResponse,
  AuthLogoutRequest,
  AuthLogoutRevoked,
  AuthLogoutResult,
  AuthLogoutResponse,
  requestPasswordReset_Body,
  MessageResponse,
  confirmPasswordReset_Body,
  createEmailReverificationRequest_Body,
  confirmEmailVerify_Body,
  ExternalAuthProviderDefinition,
  ExternalAuthProviderListResponse,
  ExternalAuthStartRequest,
  ExternalAuthStartResponse,
  ExternalAuthCompleteRequest,
  ExternalAuthProviderUser,
  ExternalAuthLinkedMember,
  ExternalAuthLinkage,
  ExternalAuthCompleteResponse,
  ExternalAuthTransitionTokenRequest,
  ExternalAuthLinkRecord,
  ExternalAuthSessionPayload,
  ExternalAuthSessionResponse,
  ExternalAuthClaimRequest,
  ExternalAuthClaimResponse,
  ExternalAuthRegistrationRequest,
  ExternalAuthRegistrationResponse,
  ExternalAuthLinkListResponse,
  ExternalAuthLinkResponse,
  ExternalAuthUnlinkResponse,
  BoardSummary,
  Pagination,
  BoardListResponse,
  NewPostListResponse,
  BoardDetail,
  BoardDetailResponse,
  Post,
  PostListResponse,
  PostNoticeInput,
  PostCreateRequest,
  PostCreated,
  PostCreateResponse,
  PostDetailResponse,
  PostUpdateRequest,
  PostReplyRequest,
  PostReplyCreated,
  PostReplyResponse,
  PostScrapCreated,
  PostScrapCreateResponse,
  PostFile,
  PostFileListResponse,
  PostFileUploadRequest,
  PostFileResponse,
  PostVoteRequest,
  PostVoteResult,
  PostVoteResponse,
  Comment,
  CommentListResponse,
  CommentCreateRequest,
  CommentDetailResponse,
  CommentUpdateRequest,
  Member,
  MemberMeResponse,
  updateMyProfile_Body,
  uploadMyIcon_Body,
  uploadMyImage_Body,
  PointItem,
  PointHistoryListResponse,
  sendMemo_Body,
  FileUploadRequest,
  Config,
  ConfigResponse,
  MenuItem,
  MenuListResponse,
  registerDevice_Body,
  updateNotificationSettings_Body,
  createReport_Body,
  PollChoice,
  PollEtcItem,
  PollPublicResult,
  PollActiveResult,
  PollActiveResponse,
  PollVoteRequest,
  PollVoteResult,
  PollVoteResponse,
  PollResultResponse,
  AdminDashboardMemberSummary,
  AdminDashboardPostSummary,
  AdminDashboardPointSummary,
  VisitStatsSummary,
  AdminDashboardSummary,
  AdminDashboardRecentMember,
  AdminDashboardRecentPost,
  AdminDashboardRecentPoint,
  AdminDashboardData,
  AdminDashboardResponse,
  AdminAuthAssignment,
  AdminAuthMember,
  AdminAuthMemberListResponse,
  AdminAuthUpsertRequest,
  AdminAuthMemberResponse,
  Poll,
  AdminPollListResponse,
  AdminPollCreateRequest,
  PollDetailResponse,
  AdminPollIntegerInput,
  AdminPollFlagInput,
  AdminPollUpdateRequest,
  Popup,
  PopupListResponse,
  PopupCreateRequest,
  PopupDetailResponse,
  PopupUpdateRequest,
  AdminMailTemplate,
  AdminMailListResponse,
  AdminMailSendRequest,
  AdminMailSendTarget,
  AdminMailSendResult,
  AdminMailSendResponse,
  AdminMailTemplateRequest,
  AdminMailLastOption,
  AdminMailDetail,
  AdminMailDetailResponse,
  AdminMailRecipient,
  AdminMailRecipientListResponse,
  AdminMailTestRequest,
  AdminMailTestResult,
  AdminMailTestResponse,
  AdminSchemaDomainSummary,
  AdminSchemaCatalog,
  AdminSchemaCatalogResponse,
  AdminSchemaLayout,
  AdminFieldOption,
  AdminFieldOptionSource,
  AdminFieldSchema,
  AdminSchemaSection,
  AdminSchemaDetail,
  AdminSchemaDetailResponse,
  AdminBoard,
  AdminBoardListResponse,
  AdminBoardCreateRequest,
  AdminBoardDetailResponse,
  AdminBoardUpdateRequest,
  AdminBoardCopyRequest,
  AdminNewPostsDeleteRequest,
  AdminNewPostsDeleteResult,
  AdminNewPostsDeleteResponse,
  Group,
  GroupListResponse,
  AdminGroupCreateRequest,
  GroupDetailResponse,
  AdminGroupUpdateRequest,
  AdminGroupMember,
  AdminGroupMemberListResponse,
  AdminGroupMemberCreateRequest,
  AdminGroupMemberResult,
  AdminGroupMemberResponse,
  AdminSystemPermission,
  AdminAuthListResponse,
  AdminSystemAuthSaveRequest,
  AdminSystemPermissionResponse,
  PollSummary,
  PollListResponse,
  AdminSystemPollCreateRequest,
  AdminSystemPollUpdateRequest,
  AdminSystemQaConfig,
  AdminSystemQaConfigResponse,
  AdminSystemQaConfigUpdateRequest,
  AdminSystemThemeConfig,
  AdminSystemThemeConfigResponse,
  AdminSystemThemeUpdateRequest,
  AdminSystemTheme,
  AdminSystemThemeListMeta,
  AdminSystemThemeListResponse,
  AdminSystemThemeDetailResponse,
  AdminSystemPhpInfo,
  AdminSystemPhpInfoResponse,
  AdminSystemMaintenanceResult,
  AdminSystemMaintenanceResponse,
  AdminSystemBrowscapStatus,
  AdminSystemBrowscapStatusResponse,
  AdminSystemBrowscapConvertRequest,
  AdminSystemBrowscapConvertResult,
  AdminSystemBrowscapConvertResponse,
  AdminSystemMailTemplate,
  AdminSystemMailTemplateListResponse,
  AdminSystemMailRecipient,
  AdminSystemMailRecipientListResponse,
  AdminSystemMailTestRequest,
  AdminSystemMailTestResult,
  AdminSystemMailTestResponse,
  AdminSystemMailSendRequest,
  AdminSystemMailSendRecipient,
  AdminSystemMailSendResult,
  AdminSystemMailSendResponse,
  AdminMember,
  AdminMemberListResponse,
  AdminMemberDetailResponse,
  AdminMemberUpdateRequest,
  AdminMemberLevelUpdateRequest,
  AdminMemberIconUploadRequest,
  AdminMemberMediaUploadResult,
  AdminMemberMediaUploadResponse,
  AdminMemberMediaDeleteResult,
  AdminMemberMediaDeleteResponse,
  AdminMemberImageUploadRequest,
  AdminConfig,
  AdminConfigResponse,
  AdminConfigFlagInput,
  AdminConfigIntegerInput,
  AdminConfigSocialServicesInput,
  AdminConfigDigitIntegerInput,
  AdminConfigUpdateRequest,
  ContentItem,
  ContentListResponse,
  ContentCreateRequest,
  ContentDetailResponse,
  ContentUpdateRequest,
  FaqItem,
  FaqListResponse,
  FaqCreateRequest,
  FaqDetailResponse,
  FaqUpdateRequest,
  FaqImage,
  FaqMasterSummary,
  FaqMasterListResponse,
  FaqMasterCreateRequest,
  FaqMasterDetail,
  FaqMasterDetailResponse,
  FaqMasterUpdateRequest,
  FaqMasterHeaderImageUploadRequest,
  FaqImageResponse,
  FaqMasterFooterImageUploadRequest,
  MenuCreateRequest,
  MenuDetailResponse,
  MenuReorderItem,
  MenuReorderRequest,
  MenuReorderResult,
  MenuReorderResponse,
  MenuUpdateRequest,
  AdminPopularItem,
  AdminPopularListResponse,
  AdminPopularResetRequest,
  AdminPopularResetResult,
  AdminPopularResetResponse,
  AdminPopularRankItem,
  AdminPopularRankResponse,
  VisitStatItem,
  VisitStatsData,
  VisitStatsResponse,
  VisitLogItem,
  VisitSearchResponse,
  AdminVisitDeleteRequest,
  VisitDeleteResult,
  VisitDeleteResponse,
  AdminWriteCountSummary,
  AdminWriteCountItem,
  AdminWriteCountStats,
  AdminWriteCountStatsResponse,
  PointActionRequest,
  PointChangeResult,
  PointExpireResult,
  PointActionResponse,
  PointDeleteRequest,
  PointDeleteResult,
  PointDeleteResponse,
  PointChangeRequest,
  PointChangeResponse,
  PointSummary,
  PointSummaryResponse,
  PointExpireRequest,
  PointExpireResponse,
  AdminPushSendRequest,
  AdminPushSendResult,
  AdminPushSendResponse,
  SmsConfig,
  SmsConfigResponse,
  AdminSmsConfigUpdateRequest,
  AdminSmsMemberSyncSummary,
  AdminSmsMemberSyncResult,
  AdminSmsMemberSyncResponse,
  AdminSmsTemplateGroup,
  AdminSmsTemplateGroupListResponse,
  AdminSmsTemplateGroupCreateRequest,
  AdminSmsTemplateGroupDetailResponse,
  AdminSmsTemplateGroupUpdateRequest,
  AdminSmsTemplateGroupMoveRequest,
  AdminSmsTemplateGroupMoveResult,
  AdminSmsTemplateGroupMoveResponse,
  AdminSmsTemplateGroupClearResult,
  AdminSmsTemplateGroupClearResponse,
  AdminSmsTemplate,
  AdminSmsTemplateListResponse,
  AdminSmsTemplateCreateRequest,
  AdminSmsTemplateDetailResponse,
  AdminSmsTemplateBatchRequest,
  AdminSmsTemplateBatchResult,
  AdminSmsTemplateBatchResponse,
  AdminSmsTemplateUpdateRequest,
  AdminSmsContactGroup,
  AdminSmsContactGroupListResponse,
  AdminSmsContactGroupRequest,
  AdminSmsContactGroupDetailResponse,
  AdminSmsContactGroupMoveRequest,
  AdminSmsContactGroupMoveResult,
  AdminSmsContactGroupMoveResponse,
  AdminSmsContactGroupClearResult,
  AdminSmsContactGroupClearResponse,
  AdminSmsContact,
  AdminSmsContactSummary,
  AdminSmsContactListResponse,
  AdminSmsContactCreateRequest,
  AdminSmsContactDetailResponse,
  AdminSmsContactBatchRequest,
  AdminSmsContactBatchResult,
  AdminSmsContactBatchResponse,
  AdminSmsContactImportMultipartRequest,
  AdminSmsContactImportResult,
  AdminSmsContactImportResponse,
  bg_no,
  AdminSmsContactExportItem,
  AdminSmsContactExportResponse,
  AdminSmsContactUpdateRequest,
  AdminSmsDuplicateSummary,
  AdminSmsMessageBatch,
  AdminSmsMessageBatchListResponse,
  AdminSmsDelivery,
  AdminSmsDeliveryListResponse,
  AdminSmsRetryBatch,
  AdminSmsMessageBatchDetail,
  AdminSmsMessageBatchDetailResponse,
  AdminSmsResendRequest,
  AdminSmsSendResult,
  AdminSmsSendResponse,
  AdminSmsMessageCreateRequest,
  AdminLayoutSummary,
  AdminLayoutListResponse,
  AdminLayoutDetail,
  AdminLayoutDetailResponse,
  AdminLayoutWidget,
  AdminLayoutSaveRequest,
  AdminLayoutWidgetCreateRequest,
  AdminLayoutWidgetReorderRequest,
  AdminLayoutWidgetUpdateRequest,
  AdminReportItem,
  AdminReportListResponse,
  AdminReportUpdateRequest,
  AdminReportDetailResponse,
  AdminReportStats,
  AdminReportStatsResponse,
  createQaQuestion_Body,
  updateQa_Body,
  createQaAnswer_Body,
  AdminQaBulkDeleteRequest,
  AdminQaBulkDeleteResult,
  AdminQaBulkDeleteResponse,
  AdminMemberUploadFile,
  MemberListResponse,
  MemberDetailResponse,
  AdminAuthAssignmentInput,
  PollNoInput,
  FaqMasterImageUploadFile,
  AdminSmsContactImportFile,
  AdminSmsContactImportItem,
  AdminSmsContactImportJsonRequest,
  AdminSmsManualTarget,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/admin-inspect/config",
    alias: "adminInspectGetConfig",
    requestFormat: "json",
    parameters: [
      {
        name: "X-G5-Admin-Inspect-Secret",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: ConfigResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin-inspect/schema",
    alias: "adminInspectListFieldSchemas",
    requestFormat: "json",
    parameters: [
      {
        name: "X-G5-Admin-Inspect-Secret",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: AdminSchemaCatalogResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin-inspect/schema/:domain",
    alias: "adminInspectGetFieldSchema",
    requestFormat: "json",
    parameters: [
      {
        name: "X-G5-Admin-Inspect-Secret",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "domain",
        type: "Path",
        schema: z.enum([
          "boards",
          "config",
          "contents",
          "faqs",
          "faq-masters",
          "groups",
          "members",
          "menus",
          "polls",
          "popups",
          "points",
          "theme",
          "sms-contacts",
          "sms-messages",
          "sms-templates",
          "mails",
          "system",
          "shop-catalog-category",
          "shop-catalog-product",
          "shop-catalog-review",
          "shop-catalog-inquiry",
          "shop-catalog-event",
          "shop-catalog-option",
          "shop-catalog-stocksms",
        ]),
      },
    ],
    response: AdminSchemaDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/auth",
    alias: "adminListAuth",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "mb_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminAuthMemberListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/auth/:mb_id",
    alias: "adminUpsertAuth",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminAuthMemberResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/auth/:mb_id",
    alias: "adminDeleteAuthByMember",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/board-groups",
    alias: "adminListBoardGroups",
    requestFormat: "json",
    response: GroupListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/board-groups",
    alias: "adminCreateBoardGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminGroupCreateRequest,
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/board-groups/:gr_id",
    alias: "adminGetBoardGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/board-groups/:gr_id",
    alias: "adminUpdateBoardGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminGroupUpdateRequest,
      },
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/board-groups/:gr_id",
    alias: "adminPatchBoardGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminGroupUpdateRequest,
      },
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/board-groups/:gr_id",
    alias: "adminDeleteBoardGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/board-groups/:gr_id/members",
    alias: "adminListBoardGroupMembers",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(50),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminGroupMemberListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/board-groups/:gr_id/members",
    alias: "adminAddBoardGroupMember",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({
            mb_id: z
              .string()
              .min(3)
              .max(20)
              .regex(/^[A-Za-z0-9_]+$/),
          })
          .strict(),
      },
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: AdminGroupMemberResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/board-groups/:gr_id/members/:mb_id",
    alias: "adminDeleteBoardGroupMember",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/boards",
    alias: "adminListBoards",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "gr_id",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sort_by",
        type: "Query",
        schema: z
          .enum([
            "bo_table",
            "bo_subject",
            "gr_id",
            "bo_count_write",
            "bo_count_comment",
          ])
          .optional()
          .default("bo_table"),
      },
      {
        name: "sort_direction",
        type: "Query",
        schema: z.enum(["ASC", "DESC"]).optional().default("ASC"),
      },
    ],
    response: AdminBoardListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/boards",
    alias: "adminCreateBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminBoardCreateRequest,
      },
    ],
    response: AdminBoardDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/boards/:bo_table",
    alias: "adminGetBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminBoardDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/boards/:bo_table",
    alias: "adminUpdateBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminBoardUpdateRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminBoardDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/boards/:bo_table",
    alias: "adminDeleteBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/boards/:bo_table/copy",
    alias: "adminCopyBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminBoardCopyRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminBoardDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/boards/new-posts",
    alias: "adminDeleteNewPosts",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminNewPostsDeleteRequest,
      },
    ],
    response: AdminNewPostsDeleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/config",
    alias: "adminGetConfig",
    requestFormat: "json",
    response: AdminConfigResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/config",
    alias: "adminUpdateConfig",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminConfigUpdateRequest,
      },
    ],
    response: AdminConfigResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/contents",
    alias: "adminListContents",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: ContentListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/contents",
    alias: "adminCreateContent",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ContentCreateRequest,
      },
    ],
    response: ContentDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/contents/:co_id",
    alias: "adminGetContent",
    requestFormat: "json",
    parameters: [
      {
        name: "co_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ContentDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/contents/:co_id",
    alias: "adminUpdateContent",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ContentUpdateRequest,
      },
      {
        name: "co_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ContentDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/contents/:co_id",
    alias: "adminDeleteContent",
    requestFormat: "json",
    parameters: [
      {
        name: "co_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/dashboard",
    alias: "adminGetDashboard",
    description: `레거시 &#x60;adm/index.php&#x60; 대체용 관리자 첫 화면 요약입니다. 신규 회원, 최근 게시물, 최근 포인트, 방문 요약을 단일 응답으로 반환합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().gte(1).lte(20).optional().default(5),
      },
    ],
    response: AdminDashboardResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/faq-masters",
    alias: "adminListFaqMasters",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
    ],
    response: FaqMasterListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/faq-masters",
    alias: "adminCreateFaqMaster",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FaqMasterCreateRequest,
      },
    ],
    response: FaqMasterDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/faq-masters/:fm_id",
    alias: "adminGetFaqMaster",
    requestFormat: "json",
    parameters: [
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqMasterDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/faq-masters/:fm_id",
    alias: "adminUpdateFaqMaster",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FaqMasterUpdateRequest,
      },
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqMasterDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/faq-masters/:fm_id",
    alias: "adminDeleteFaqMaster",
    requestFormat: "json",
    parameters: [
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/faq-masters/:fm_id/footer-image",
    alias: "adminUploadFaqMasterFooterImage",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown(), z.unknown(), z.unknown()]),
      },
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqImageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/faq-masters/:fm_id/footer-image",
    alias: "adminDeleteFaqMasterFooterImage",
    requestFormat: "json",
    parameters: [
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqImageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/faq-masters/:fm_id/header-image",
    alias: "adminUploadFaqMasterHeaderImage",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown(), z.unknown(), z.unknown()]),
      },
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqImageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/faq-masters/:fm_id/header-image",
    alias: "adminDeleteFaqMasterHeaderImage",
    requestFormat: "json",
    parameters: [
      {
        name: "fm_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqImageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/faqs",
    alias: "adminListFaqs",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "fm_id",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
    ],
    response: FaqListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/faqs",
    alias: "adminCreateFaq",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FaqCreateRequest,
      },
    ],
    response: FaqDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/faqs/:fa_id",
    alias: "adminGetFaq",
    requestFormat: "json",
    parameters: [
      {
        name: "fa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/faqs/:fa_id",
    alias: "adminUpdateFaq",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FaqUpdateRequest,
      },
      {
        name: "fa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: FaqDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/faqs/:fa_id",
    alias: "adminDeleteFaq",
    requestFormat: "json",
    parameters: [
      {
        name: "fa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/groups",
    alias: "adminLegacyListGroups",
    requestFormat: "json",
    response: GroupListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/groups",
    alias: "adminLegacyCreateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminGroupCreateRequest,
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/groups/:gr_id",
    alias: "adminLegacyGetGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/groups/:gr_id",
    alias: "adminLegacyUpdateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminGroupUpdateRequest,
      },
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: GroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/groups/:gr_id",
    alias: "adminLegacyDeleteGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/groups/:gr_id/members",
    alias: "adminLegacyListGroupMembers",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(50),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminGroupMemberListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/groups/:gr_id/members",
    alias: "adminLegacyAddGroupMember",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({
            mb_id: z
              .string()
              .min(3)
              .max(20)
              .regex(/^[A-Za-z0-9_]+$/),
          })
          .strict(),
      },
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
    ],
    response: AdminGroupMemberResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/groups/:gr_id/members/:mb_id",
    alias: "adminLegacyDeleteGroupMember",
    requestFormat: "json",
    parameters: [
      {
        name: "gr_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9_]{1,10}$/),
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/layouts",
    alias: "adminListLayouts",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
    ],
    response: AdminLayoutListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/layouts/:page_id",
    alias: "adminGetLayout",
    requestFormat: "json",
    parameters: [
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/layouts/:page_id",
    alias: "adminSaveLayout",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminLayoutSaveRequest,
      },
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/layouts/:page_id/reorder",
    alias: "adminReorderWidget",
    description: `표준 경로는 &#x60;/admin/layouts/{page_id}/widgets&#x60;의 &#x60;PATCH&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminLayoutWidgetReorderRequest,
      },
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/layouts/:page_id/widgets",
    alias: "adminAddWidget",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminLayoutWidgetCreateRequest,
      },
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/layouts/:page_id/widgets",
    alias: "adminReorderWidgetCollection",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminLayoutWidgetReorderRequest,
      },
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/layouts/:page_id/widgets/:widget_id",
    alias: "adminUpdateWidget",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminLayoutWidgetUpdateRequest,
      },
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
      {
        name: "widget_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(80)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/layouts/:page_id/widgets/:widget_id",
    alias: "adminDeleteWidget",
    requestFormat: "json",
    parameters: [
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
      {
        name: "widget_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(80)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminLayoutDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/mail-tests",
    alias: "adminCreateMailTest",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminMailTestResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/mails",
    alias: "adminListMails",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
    ],
    response: AdminMailListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/mails",
    alias: "adminSendMail",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminMailSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/mails/:ma_id",
    alias: "adminGetMail",
    requestFormat: "json",
    parameters: [
      {
        name: "ma_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminMailDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/mails/:ma_id",
    alias: "adminUpdateMailTemplate",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "ma_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminMailDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/mails/:ma_id",
    alias: "adminDeleteMail",
    requestFormat: "json",
    parameters: [
      {
        name: "ma_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/mails/recipients",
    alias: "adminListMailRecipients",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(1000).optional().default(50),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "level_min",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "level_max",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "gr_id",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "member_id_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "member_id_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "email_contains",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "mailling_only",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
    ],
    response: AdminMailRecipientListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/mails/templates",
    alias: "adminCreateMailTemplate",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminMailDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/mails/test",
    alias: "adminSendTestMail",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminMailTestResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/members",
    alias: "adminListMembers",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z
          .enum(["all", "mb_id", "mb_name", "mb_nick", "mb_email"])
          .optional(),
      },
      {
        name: "sort_by",
        type: "Query",
        schema: z
          .enum(["mb_id", "mb_level", "mb_point", "mb_datetime"])
          .optional()
          .default("mb_id"),
      },
      {
        name: "sort_direction",
        type: "Query",
        schema: z.enum(["ASC", "DESC"]).optional().default("ASC"),
      },
    ],
    response: AdminMemberListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/members/:mb_id",
    alias: "adminGetMember",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/members/:mb_id",
    alias: "adminUpdateMember",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminMemberUpdateRequest,
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/members/:mb_id",
    alias: "adminDeleteMember",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/members/:mb_id/icon",
    alias: "adminUploadMemberIcon",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown(), z.unknown()]),
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberMediaUploadResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/members/:mb_id/icon",
    alias: "adminDeleteMemberIcon",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberMediaDeleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/members/:mb_id/image",
    alias: "adminUploadMemberImage",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown(), z.unknown()]),
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberMediaUploadResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/members/:mb_id/image",
    alias: "adminDeleteMemberImage",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberMediaDeleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/members/:mb_id/level",
    alias: "adminUpdateMemberLevel",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ mb_level: z.number().int().gte(1).lte(10) })
          .strict(),
      },
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: AdminMemberDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/members/excel",
    alias: "adminExportMembersExcel",
    requestFormat: "json",
    parameters: [
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z
          .enum(["all", "mb_id", "mb_name", "mb_nick", "mb_email"])
          .optional(),
      },
    ],
    response: AdminMemberListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/menus",
    alias: "adminListMenus",
    requestFormat: "json",
    response: MenuListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/menus",
    alias: "adminCreateMenu",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MenuCreateRequest,
      },
    ],
    response: MenuDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/menus",
    alias: "adminReorderMenus",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MenuReorderRequest,
      },
    ],
    response: MenuReorderResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/menus/:me_id",
    alias: "adminGetMenu",
    requestFormat: "json",
    parameters: [
      {
        name: "me_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MenuDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/menus/:me_id",
    alias: "adminUpdateMenu",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MenuUpdateRequest,
      },
      {
        name: "me_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MenuDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/menus/:me_id",
    alias: "adminDeleteMenu",
    requestFormat: "json",
    parameters: [
      {
        name: "me_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/menus/reorder",
    alias: "adminReorderMenusLegacy",
    description: `표준 경로는 &#x60;/admin/menus&#x60;의 &#x60;PATCH&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MenuReorderRequest,
      },
    ],
    response: MenuReorderResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/points",
    alias: "adminListPoints",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "mb_id",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z.enum(["mb_id", "po_content"]).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PointHistoryListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/points",
    alias: "adminCreatePointAction",
    description: `표준 경로. &#x60;action&#x60;으로 &#x60;grant&#x60;, &#x60;deduct&#x60;, &#x60;expire&#x60;를 구분합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([
          z
            .object({ action: z.literal("grant") })
            .strict()
            .passthrough(),
          z
            .object({ action: z.literal("deduct") })
            .strict()
            .passthrough(),
          z
            .object({ action: z.literal("expire") })
            .strict()
            .passthrough(),
        ]),
      },
    ],
    response: PointActionResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/points",
    alias: "adminDeletePoints",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PointDeleteRequest,
      },
    ],
    response: PointDeleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/points/deduct",
    alias: "adminDeductPoint",
    description: `표준 경로는 &#x60;POST /admin/points&#x60; + &#x60;action&#x3D;deduct&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PointChangeRequest,
      },
    ],
    response: PointChangeResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/points/expire",
    alias: "adminExpirePoints",
    description: `표준 경로는 &#x60;POST /admin/points&#x60; + &#x60;action&#x3D;expire&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ base_date: z.string() })
          .partial()
          .strict()
          .optional(),
      },
    ],
    response: PointExpireResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/points/grant",
    alias: "adminGrantPoint",
    description: `표준 경로는 &#x60;POST /admin/points&#x60; + &#x60;action&#x3D;grant&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PointChangeRequest,
      },
    ],
    response: PointChangeResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/points/summary",
    alias: "adminPointSummary",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PointSummaryResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/polls",
    alias: "adminListPolls",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
    ],
    response: AdminPollListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/polls",
    alias: "adminCreatePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: PollDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/polls/:po_id",
    alias: "adminGetPoll",
    requestFormat: "json",
    parameters: [
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PollDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/polls/:po_id",
    alias: "adminUpdatePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminPollUpdateRequest,
      },
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PollDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/polls/:po_id",
    alias: "adminDeletePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/popular",
    alias: "adminListPopular",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
    ],
    response: AdminPopularListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/popular",
    alias: "adminResetPopular",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminPopularResetRequest.optional(),
      },
    ],
    response: AdminPopularResetResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/popular/rank",
    alias: "adminPopularRank",
    requestFormat: "json",
    parameters: [
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
    ],
    response: AdminPopularRankResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/popups",
    alias: "adminListPopups",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
    ],
    response: PopupListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/popups",
    alias: "adminCreatePopup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PopupCreateRequest,
      },
    ],
    response: PopupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/popups/:nw_id",
    alias: "adminGetPopup",
    requestFormat: "json",
    parameters: [
      {
        name: "nw_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PopupDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/popups/:nw_id",
    alias: "adminUpdatePopup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PopupUpdateRequest,
      },
      {
        name: "nw_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PopupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/popups/:nw_id",
    alias: "adminDeletePopup",
    requestFormat: "json",
    parameters: [
      {
        name: "nw_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/push/messages",
    alias: "adminCreatePushMessage",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminPushSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/push/send",
    alias: "adminSendPush",
    description: `표준 경로는 &#x60;/admin/push/messages&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminPushSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/qa",
    alias: "adminDeleteQaBulk",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminQaBulkDeleteRequest,
      },
    ],
    response: AdminQaBulkDeleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/reports",
    alias: "adminListReports",
    requestFormat: "json",
    parameters: [
      {
        name: "status",
        type: "Query",
        schema: z.enum(["pending", "approved", "rejected", "hold"]).optional(),
      },
      {
        name: "target_type",
        type: "Query",
        schema: z.enum(["post", "comment", "member"]).optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
    ],
    response: AdminReportListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/reports/:report_id",
    alias: "adminUpdateReport",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminReportUpdateRequest,
      },
      {
        name: "report_id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: AdminReportDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/reports/stats",
    alias: "adminReportStats",
    requestFormat: "json",
    response: AdminReportStatsResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/schema",
    alias: "adminListFieldSchemas",
    requestFormat: "json",
    response: AdminSchemaCatalogResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/schema/:domain",
    alias: "adminGetFieldSchema",
    requestFormat: "json",
    parameters: [
      {
        name: "domain",
        type: "Path",
        schema: z.enum([
          "boards",
          "config",
          "contents",
          "faqs",
          "faq-masters",
          "groups",
          "members",
          "menus",
          "polls",
          "popups",
          "points",
          "theme",
          "sms-contacts",
          "sms-messages",
          "sms-templates",
          "mails",
          "system",
          "shop-catalog-category",
          "shop-catalog-product",
          "shop-catalog-review",
          "shop-catalog-inquiry",
          "shop-catalog-event",
          "shop-catalog-option",
          "shop-catalog-stocksms",
        ]),
      },
    ],
    response: AdminSchemaDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/categories",
    alias: "adminListShopCatalogCategories",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/shop/catalog/categories",
    alias: "adminCreateShopCatalogCategory",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/categories/:category_id",
    alias: "adminGetShopCatalogCategory",
    requestFormat: "json",
    parameters: [
      {
        name: "category_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/categories/:category_id",
    alias: "adminUpdateShopCatalogCategory",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "category_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/shop/catalog/categories/:category_id",
    alias: "adminDeleteShopCatalogCategory",
    requestFormat: "json",
    parameters: [
      {
        name: "category_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/events",
    alias: "adminListShopCatalogEvents",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/shop/catalog/events",
    alias: "adminCreateShopCatalogEvent",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/events/:event_id",
    alias: "adminGetShopCatalogEvent",
    requestFormat: "json",
    parameters: [
      {
        name: "event_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/events/:event_id",
    alias: "adminUpdateShopCatalogEvent",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "event_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/shop/catalog/events/:event_id",
    alias: "adminDeleteShopCatalogEvent",
    requestFormat: "json",
    parameters: [
      {
        name: "event_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/inquiries",
    alias: "adminListShopCatalogInquiries",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/inquiries/:inquiry_id",
    alias: "adminAnswerShopCatalogInquiry",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "inquiry_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/products",
    alias: "adminListShopCatalogProducts",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/shop/catalog/products",
    alias: "adminCreateShopCatalogProduct",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/products/:product_id",
    alias: "adminGetShopCatalogProduct",
    requestFormat: "json",
    parameters: [
      {
        name: "product_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/products/:product_id",
    alias: "adminUpdateShopCatalogProduct",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "product_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/shop/catalog/products/:product_id",
    alias: "adminDeleteShopCatalogProduct",
    requestFormat: "json",
    parameters: [
      {
        name: "product_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/products/:product_id/options",
    alias: "adminGetShopCatalogProductOptions",
    requestFormat: "json",
    parameters: [
      {
        name: "product_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/products/:product_id/options",
    alias: "adminUpdateShopCatalogProductOptions",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.array(z.object({}).partial().strict().passthrough()),
      },
      {
        name: "product_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/products/:product_id/stock",
    alias: "adminUpdateShopCatalogProductStock",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "product_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/reviews",
    alias: "adminListShopCatalogReviews",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/reviews/:review_id",
    alias: "adminAnswerShopCatalogReview",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "review_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/shop/catalog/stocksms",
    alias: "adminListShopCatalogStockSms",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/admin/shop/catalog/stocksms/:stock_sms_id",
    alias: "adminUpdateShopCatalogStockSms",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().strict().passthrough(),
      },
      {
        name: "stock_sms_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/shop/catalog/stocksms/:stock_sms_id",
    alias: "adminDeleteShopCatalogStockSms",
    requestFormat: "json",
    parameters: [
      {
        name: "stock_sms_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/shop/catalog/stocksms/:stock_sms_id/send",
    alias: "adminSendShopCatalogStockSms",
    requestFormat: "json",
    parameters: [
      {
        name: "stock_sms_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/config",
    alias: "adminGetSmsConfig",
    requestFormat: "json",
    response: SmsConfigResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/sms/config",
    alias: "adminUpdateSmsConfig",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsConfigUpdateRequest,
      },
    ],
    response: SmsConfigResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/contact-groups",
    alias: "adminListSmsContactGroups",
    requestFormat: "json",
    response: AdminSmsContactGroupListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
      {
        status: 503,
        description: `SMS 저장소 또는 외부 공급자 미구성`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/contact-groups",
    alias: "adminCreateSmsContactGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ bg_name: z.string() }).strict(),
      },
    ],
    response: AdminSmsContactGroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/contact-groups/:bg_no",
    alias: "adminGetSmsContactGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "bg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsContactGroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/sms/contact-groups/:bg_no",
    alias: "adminUpdateSmsContactGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ bg_name: z.string() }).strict(),
      },
      {
        name: "bg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsContactGroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/sms/contact-groups/:bg_no",
    alias: "adminDeleteSmsContactGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "bg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/sms/contact-groups/:bg_no/contacts",
    alias: "adminClearSmsContactGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "bg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsContactGroupClearResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/contact-groups/:bg_no/move",
    alias: "adminMoveSmsContactGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ target_bg_no: z.number().int().gte(1) }).strict(),
      },
      {
        name: "bg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsContactGroupMoveResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/contacts",
    alias: "adminListSmsContacts",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "bg_no",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z.enum(["all", "name", "hp"]).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "with_phone_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "st",
        type: "Query",
        schema: z.enum(["all", "name", "hp"]).optional(),
      },
      {
        name: "sv",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "no_hp",
        type: "Query",
        schema: z.boolean().optional(),
      },
    ],
    response: AdminSmsContactListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
      {
        status: 503,
        description: `SMS 저장소 또는 외부 공급자 미구성`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/contacts",
    alias: "adminCreateSmsContact",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsContactCreateRequest,
      },
    ],
    response: AdminSmsContactDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/contacts/:bk_no",
    alias: "adminGetSmsContact",
    requestFormat: "json",
    parameters: [
      {
        name: "bk_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsContactDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/sms/contacts/:bk_no",
    alias: "adminUpdateSmsContact",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsContactUpdateRequest,
      },
      {
        name: "bk_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsContactDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/sms/contacts/:bk_no",
    alias: "adminDeleteSmsContact",
    requestFormat: "json",
    parameters: [
      {
        name: "bk_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/contacts/batch",
    alias: "adminBatchSmsContacts",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminSmsContactBatchResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/contacts/export",
    alias: "adminExportSmsContacts",
    requestFormat: "json",
    parameters: [
      {
        name: "bg_no",
        type: "Query",
        schema: bg_no,
      },
      {
        name: "include_no_phone",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "with_hyphen",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "group_id",
        type: "Query",
        schema: bg_no,
      },
      {
        name: "no_hp",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "hyphen",
        type: "Query",
        schema: z.boolean().optional(),
      },
    ],
    response: AdminSmsContactExportResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/contacts/import",
    alias: "adminImportSmsContacts",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsContactImportMultipartRequest,
      },
    ],
    response: AdminSmsContactImportResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/history/batches",
    alias: "adminListSmsMessageBatches",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sv",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminSmsMessageBatchListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
      {
        status: 503,
        description: `SMS 저장소 또는 외부 공급자 미구성`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/history/batches/:wr_no",
    alias: "adminGetSmsMessageBatch",
    requestFormat: "json",
    parameters: [
      {
        name: "wr_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "wr_renum",
        type: "Query",
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z.enum(["name", "hp"]).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sst",
        type: "Query",
        schema: z.enum(["name", "hp"]).optional(),
      },
      {
        name: "ssv",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminSmsMessageBatchDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/history/batches/:wr_no/resend-all",
    alias: "adminResendAllSmsBatch",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsResendRequest.optional(),
      },
      {
        name: "wr_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/history/batches/:wr_no/resend-failures",
    alias: "adminResendSmsFailures",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsResendRequest.optional(),
      },
      {
        name: "wr_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/history/deliveries",
    alias: "adminListSmsDeliveries",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z.enum(["name", "hp", "bk_no"]).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "st",
        type: "Query",
        schema: z.enum(["name", "hp", "bk_no"]).optional(),
      },
      {
        name: "sv",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminSmsDeliveryListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
      {
        status: 503,
        description: `SMS 저장소 또는 외부 공급자 미구성`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/member-sync",
    alias: "adminSyncSmsMembers",
    requestFormat: "json",
    response: AdminSmsMemberSyncResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/messages",
    alias: "adminCreateSmsMessage",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsMessageCreateRequest,
      },
    ],
    response: AdminSmsSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/template-groups",
    alias: "adminListSmsTemplateGroups",
    requestFormat: "json",
    response: AdminSmsTemplateGroupListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
      {
        status: 503,
        description: `SMS 저장소 또는 외부 공급자 미구성`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/template-groups",
    alias: "adminCreateSmsTemplateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsTemplateGroupCreateRequest,
      },
    ],
    response: AdminSmsTemplateGroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/template-groups/:fg_no",
    alias: "adminGetSmsTemplateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "fg_no",
        type: "Path",
        schema: z.number().int().gte(0),
      },
    ],
    response: AdminSmsTemplateGroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/sms/template-groups/:fg_no",
    alias: "adminUpdateSmsTemplateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsTemplateGroupUpdateRequest,
      },
      {
        name: "fg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsTemplateGroupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/sms/template-groups/:fg_no",
    alias: "adminDeleteSmsTemplateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "fg_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/template-groups/:fg_no/move",
    alias: "adminMoveSmsTemplateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ target_fg_no: z.number().int().gte(0) }).strict(),
      },
      {
        name: "fg_no",
        type: "Path",
        schema: z.number().int().gte(0),
      },
    ],
    response: AdminSmsTemplateGroupMoveResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/sms/template-groups/:fg_no/templates",
    alias: "adminClearSmsTemplateGroup",
    requestFormat: "json",
    parameters: [
      {
        name: "fg_no",
        type: "Path",
        schema: z.number().int().gte(0),
      },
    ],
    response: AdminSmsTemplateGroupClearResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/templates",
    alias: "adminListSmsTemplates",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "fg_no",
        type: "Query",
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z.enum(["all", "name", "content"]).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "st",
        type: "Query",
        schema: z.enum(["all", "name", "content"]).optional(),
      },
      {
        name: "sv",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminSmsTemplateListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
      {
        status: 503,
        description: `SMS 저장소 또는 외부 공급자 미구성`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/templates",
    alias: "adminCreateSmsTemplate",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsTemplateCreateRequest,
      },
    ],
    response: AdminSmsTemplateDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/sms/templates/:fo_no",
    alias: "adminGetSmsTemplate",
    requestFormat: "json",
    parameters: [
      {
        name: "fo_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsTemplateDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/sms/templates/:fo_no",
    alias: "adminUpdateSmsTemplate",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSmsTemplateUpdateRequest,
      },
      {
        name: "fo_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: AdminSmsTemplateDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/sms/templates/:fo_no",
    alias: "adminDeleteSmsTemplate",
    requestFormat: "json",
    parameters: [
      {
        name: "fo_no",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/sms/templates/batch",
    alias: "adminBatchSmsTemplates",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
    ],
    response: AdminSmsTemplateBatchResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/auths",
    alias: "adminSystemListAuths",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "mb_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminAuthListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/auths",
    alias: "adminSystemSaveAuth",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemAuthSaveRequest,
      },
    ],
    response: AdminSystemPermissionResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/system/auths/:mb_id/:au_menu",
    alias: "adminSystemDeleteAuth",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "au_menu",
        type: "Path",
        schema: z.string().regex(/^[A-Za-z0-9_]{1,50}$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/browscap",
    alias: "adminSystemBrowscapStatus",
    requestFormat: "json",
    response: AdminSystemBrowscapStatusResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/browscap/convert",
    alias: "adminSystemBrowscapConvert",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ rows: z.number().int().gte(1).default(100) })
          .partial()
          .strict()
          .optional(),
      },
      {
        name: "rows",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(100),
      },
    ],
    response: AdminSystemBrowscapConvertResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/browscap/update",
    alias: "adminSystemBrowscapUpdate",
    requestFormat: "json",
    response: AdminSystemBrowscapStatusResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/mail-recipients",
    alias: "adminSystemListMailRecipients",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(1000).optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AdminSystemMailRecipientListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/mails",
    alias: "adminSystemListMails",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
    ],
    response: AdminSystemMailTemplateListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/mails/send",
    alias: "adminSystemSendMemberMail",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemMailSendRequest,
      },
    ],
    response: AdminSystemMailSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/mails/test",
    alias: "adminSystemSendMailTest",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemMailTestRequest,
      },
    ],
    response: AdminSystemMailTestResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/maintenance/cache-files/purge",
    alias: "adminSystemPurgeCacheFiles",
    requestFormat: "json",
    response: AdminSystemMaintenanceResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/maintenance/captcha-files/purge",
    alias: "adminSystemPurgeCaptchaFiles",
    requestFormat: "json",
    response: AdminSystemMaintenanceResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/maintenance/member-list-files/purge",
    alias: "adminSystemPurgeMemberListFiles",
    requestFormat: "json",
    response: AdminSystemMaintenanceResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/maintenance/session-files/purge",
    alias: "adminSystemPurgeSessionFiles",
    requestFormat: "json",
    response: AdminSystemMaintenanceResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/maintenance/thumbnail-files/purge",
    alias: "adminSystemPurgeThumbnailFiles",
    requestFormat: "json",
    response: AdminSystemMaintenanceResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/phpinfo",
    alias: "adminSystemPhpInfo",
    requestFormat: "json",
    response: AdminSystemPhpInfoResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/polls",
    alias: "adminSystemListPolls",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
    ],
    response: PollListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/polls",
    alias: "adminSystemCreatePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemPollCreateRequest,
      },
    ],
    response: PollDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/polls/:po_id",
    alias: "adminSystemGetPoll",
    requestFormat: "json",
    parameters: [
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PollDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/system/polls/:po_id",
    alias: "adminSystemUpdatePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemPollUpdateRequest,
      },
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PollDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/system/polls/:po_id",
    alias: "adminSystemDeletePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/popups",
    alias: "adminSystemListPopups",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
    ],
    response: PopupListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/admin/system/popups",
    alias: "adminSystemCreatePopup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PopupCreateRequest,
      },
    ],
    response: PopupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/popups/:nw_id",
    alias: "adminSystemGetPopup",
    requestFormat: "json",
    parameters: [
      {
        name: "nw_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PopupDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/system/popups/:nw_id",
    alias: "adminSystemUpdatePopup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PopupUpdateRequest,
      },
      {
        name: "nw_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PopupDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/system/popups/:nw_id",
    alias: "adminSystemDeletePopup",
    requestFormat: "json",
    parameters: [
      {
        name: "nw_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/qa-config",
    alias: "adminSystemGetQaConfig",
    requestFormat: "json",
    response: AdminSystemQaConfigResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/system/qa-config",
    alias: "adminSystemUpdateQaConfig",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemQaConfigUpdateRequest,
      },
    ],
    response: AdminSystemQaConfigResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/theme",
    alias: "adminSystemGetTheme",
    requestFormat: "json",
    response: AdminSystemThemeConfigResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/admin/system/theme",
    alias: "adminSystemUpdateTheme",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminSystemThemeUpdateRequest,
      },
    ],
    response: AdminSystemThemeConfigResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/themes",
    alias: "adminSystemListThemes",
    requestFormat: "json",
    response: AdminSystemThemeListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/system/themes/:theme",
    alias: "adminSystemDetailTheme",
    requestFormat: "json",
    parameters: [
      {
        name: "theme",
        type: "Path",
        schema: z.string().regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: AdminSystemThemeDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/admin/visits",
    alias: "adminDeleteVisits",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AdminVisitDeleteRequest.optional(),
      },
      {
        name: "before",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: VisitDeleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/visits/search",
    alias: "adminSearchVisits",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "ip",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "referer",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "agent",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: VisitSearchResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/visits/stats",
    alias: "adminVisitStats",
    requestFormat: "json",
    parameters: [
      {
        name: "date_from",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
      {
        name: "type",
        type: "Query",
        schema: z
          .enum([
            "date",
            "hour",
            "week",
            "month",
            "year",
            "browser",
            "os",
            "device",
            "domain",
            "search",
          ])
          .optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().gte(1).lte(1000).optional(),
      },
    ],
    response: VisitStatsResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/admin/write-count/stats",
    alias: "adminWriteCountStats",
    requestFormat: "json",
    parameters: [
      {
        name: "period",
        type: "Query",
        schema: z
          .enum(["hour", "day", "week", "month", "year"])
          .optional()
          .default("day"),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z
          .string()
          .regex(/^([12]\d{3})-\d{2}-\d{2}$/)
          .optional(),
      },
      {
        name: "bo_table",
        type: "Query",
        schema: z
          .string()
          .regex(/^[A-Za-z0-9_]{1,20}$/)
          .optional(),
      },
    ],
    response: AdminWriteCountStatsResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/availability/email",
    alias: "checkEmailAvailability",
    requestFormat: "json",
    parameters: [
      {
        name: "value",
        type: "Query",
        schema: z.string().email(),
      },
    ],
    response: AvailabilityResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/availability/member-id",
    alias: "checkMemberIdAvailability",
    requestFormat: "json",
    parameters: [
      {
        name: "value",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: AvailabilityResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/availability/nick",
    alias: "checkNickAvailability",
    requestFormat: "json",
    parameters: [
      {
        name: "value",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: AvailabilityResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/availability/phone",
    alias: "checkPhoneAvailability",
    requestFormat: "json",
    parameters: [
      {
        name: "value",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: AvailabilityResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/availability/recommender",
    alias: "checkRecommenderAvailability",
    requestFormat: "json",
    parameters: [
      {
        name: "value",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: AvailabilityResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/email-reverification-requests",
    alias: "createEmailReverificationRequest",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createEmailReverificationRequest_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/email-verification-requests",
    alias: "createEmailVerificationRequest",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ mb_email: z.string().email() })
          .partial()
          .strict()
          .passthrough()
          .optional(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/email-verifications",
    alias: "createEmailVerification",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: confirmEmailVerify_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/email/verify/confirm",
    alias: "confirmEmailVerify",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: confirmEmailVerify_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/email/verify/request",
    alias: "requestEmailVerify",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ mb_email: z.string().email() })
          .partial()
          .strict()
          .passthrough()
          .optional(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/external/:provider/claims",
    alias: "claimExternalAuthToExistingMember",
    description: `&#x60;complete&#x60; 응답의 &#x60;transition_token&#x60;과 기존 회원 비밀번호를 사용해 외부 계정을 현재 회원에 연결하고 즉시 세션을 발급합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
    ],
    response: ExternalAuthClaimResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/external/:provider/complete",
    alias: "completeExternalAuth",
    description: `공급자 callback/code/payload를 내부 표준 결과로 정규화합니다. fake provider replay는 dev runtime에서만 허용됩니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ExternalAuthCompleteRequest,
      },
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
    ],
    response: ExternalAuthCompleteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/external/:provider/links",
    alias: "createExternalAuthLink",
    description: `&#x60;complete&#x60; 응답의 &#x60;transition_token&#x60;을 사용해 현재 로그인 회원에 외부 인증 계정을 연결합니다. &#x60;link_token&#x60;은 호환용 alias입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
    ],
    response: ExternalAuthLinkResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/auth/external/:provider/links/:provider_user_id",
    alias: "deleteExternalAuthLink",
    requestFormat: "json",
    parameters: [
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
      {
        name: "provider_user_id",
        type: "Path",
        schema: z.string().min(1).max(191),
      },
    ],
    response: ExternalAuthUnlinkResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/external/:provider/registrations",
    alias: "registerMemberWithExternalAuth",
    description: `&#x60;complete&#x60; 응답의 &#x60;transition_token&#x60;을 사용해 신규 회원을 만들고 외부 인증을 연결합니다. 공급자 이메일/표시 이름이 있으면 &#x60;mb_email&#x60;, &#x60;mb_name&#x60; 기본값으로 사용합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
    ],
    response: ExternalAuthRegistrationResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/external/:provider/sessions",
    alias: "createExternalAuthSession",
    description: `&#x60;complete&#x60; 응답의 &#x60;transition_token&#x60;으로 이미 연결된 회원 계정의 로그인 세션을 발급합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
    ],
    response: ExternalAuthSessionResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/external/:provider/start",
    alias: "startExternalAuth",
    description: `공급자 인증 시작용 request_token과 authorization_url을 발급합니다. 현재는 설정된 실제 공급자(&#x60;google&#x60;, &#x60;kakao&#x60;)와 dev runtime의 fake provider를 지원합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ExternalAuthStartRequest,
      },
      {
        name: "provider",
        type: "Path",
        schema: z
          .string()
          .min(2)
          .max(32)
          .regex(/^[a-z][a-z0-9_-]{1,31}$/),
      },
    ],
    response: ExternalAuthStartResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/external/links",
    alias: "listMyExternalAuthLinks",
    requestFormat: "json",
    response: ExternalAuthLinkListResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/auth/external/providers",
    alias: "listExternalAuthProviders",
    description: `현재 런타임에서 사용 가능한 외부 인증 공급자와 replay 지원 상태를 반환합니다. 설정된 실제 공급자(&#x60;google&#x60;, &#x60;kakao&#x60;)와, 개발 모드에서는 fake provider가 함께 노출될 수 있습니다.`,
    requestFormat: "json",
    response: ExternalAuthProviderListResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/login",
    alias: "login",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AuthLoginRequest,
      },
    ],
    response: TokenResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/logout",
    alias: "logout",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ refresh_token: z.string().min(1).nullable() })
          .partial()
          .strict()
          .optional(),
      },
    ],
    response: AuthLogoutResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/password-reset-requests",
    alias: "createPasswordResetRequest",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: requestPasswordReset_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/password-resets",
    alias: "createPasswordReset",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: confirmPasswordReset_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/password/reset/confirm",
    alias: "confirmPasswordReset",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: confirmPasswordReset_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/password/reset/request",
    alias: "requestPasswordReset",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: requestPasswordReset_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/refresh",
    alias: "refreshToken",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ refresh_token: z.string().min(1) }).strict(),
      },
    ],
    response: TokenResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/register",
    alias: "register",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: register_Body,
      },
    ],
    response: RegisterResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/blocks",
    alias: "listBlocks",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
    ],
    response: z
      .object({
        data: z.array(z.object({}).partial().strict().passthrough()),
        pagination: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/blocks",
    alias: "createBlock",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ blocked_mb_id: z.string() }).strict().passthrough(),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/blocks/:mb_id",
    alias: "deleteBlock",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards",
    alias: "listBoards",
    requestFormat: "json",
    parameters: [
      {
        name: "group_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: BoardListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table",
    alias: "getBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: BoardDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table/posts",
    alias: "listPosts",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "category",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z
          .enum(["title", "content", "title_content", "author", "comment"])
          .optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sort",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PostListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/boards/:bo_table/posts",
    alias: "createPost",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PostCreateRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: PostCreateResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table/posts/:wr_id",
    alias: "getPost",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/boards/:bo_table/posts/:wr_id",
    alias: "updatePost",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PostUpdateRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/boards/:bo_table/posts/:wr_id",
    alias: "deletePost",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table/posts/:wr_id/comments",
    alias: "listComments",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: CommentListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/boards/:bo_table/posts/:wr_id/comments",
    alias: "createComment",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CommentCreateRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: CommentDetailResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "put",
    path: "/boards/:bo_table/posts/:wr_id/comments/:comment_id",
    alias: "updateComment",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ wr_content: z.string().min(1) }).strict(),
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "comment_id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: CommentDetailResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/boards/:bo_table/posts/:wr_id/comments/:comment_id",
    alias: "deleteComment",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "comment_id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table/posts/:wr_id/files",
    alias: "listPostFiles",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostFileListResponse,
    errors: [
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/boards/:bo_table/posts/:wr_id/files",
    alias: "uploadPostFile",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ file: z.instanceof(File) }).strict(),
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostFileResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/boards/:bo_table/posts/:wr_id/files/:bf_no",
    alias: "deletePostFile",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "bf_no",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table/posts/:wr_id/files/:bf_no/download",
    alias: "downloadPostFile",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "bf_no",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/boards/:bo_table/posts/:wr_id/good",
    alias: "votePost",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PostVoteRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostVoteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/:bo_table/posts/:wr_id/link/:link_no",
    alias: "openPostLink",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "link_no",
        type: "Path",
        schema: z.union([z.literal(1), z.literal(2)]),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 302,
        description: `링크 리다이렉트`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/boards/:bo_table/posts/:wr_id/reply",
    alias: "createReplyPost",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PostReplyRequest,
      },
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostReplyResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/boards/:bo_table/posts/:wr_id/scrap",
    alias: "createPostScrap",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PostScrapCreateResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/boards/:bo_table/posts/:wr_id/scrap",
    alias: "deletePostScrap",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/boards/new-posts",
    alias: "listNewPosts",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional(),
      },
      {
        name: "cursor",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "gr_id",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "view",
        type: "Query",
        schema: z.enum(["w", "c"]).optional(),
      },
      {
        name: "mb_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: NewPostListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/config",
    alias: "getConfig",
    requestFormat: "json",
    response: ConfigResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/devices",
    alias: "registerDevice",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: registerDevice_Body,
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/devices/:token",
    alias: "unregisterDevice",
    requestFormat: "json",
    parameters: [
      {
        name: "token",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/files/:bo_table/:wr_id/:bf_no",
    alias: "downloadFile",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
      {
        name: "wr_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "bf_no",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/files/upload",
    alias: "uploadFile",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FileUploadRequest,
      },
    ],
    response: PostFileResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/health",
    alias: "getHealth",
    requestFormat: "json",
    response: HealthResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/layouts/:page_id",
    alias: "getLayout",
    requestFormat: "json",
    parameters: [
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/layouts/:page_id/widgets/:widget_id/data",
    alias: "getWidgetData",
    requestFormat: "json",
    parameters: [
      {
        name: "page_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
      {
        name: "widget_id",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(80)
          .regex(/^[A-Za-z0-9_-]+$/),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/members/:mb_id",
    alias: "getPublicProfile",
    requestFormat: "json",
    parameters: [
      {
        name: "mb_id",
        type: "Path",
        schema: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: z
      .object({
        data: z
          .object({
            mb_id: z.string(),
            mb_nick: z.string(),
            mb_level: z.number().int(),
            mb_point: z.number().int(),
            mb_open: z.number().int(),
            mb_homepage: z.string(),
            mb_profile: z.string(),
            mb_datetime: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
            mb_email: z.string().email(),
          })
          .partial()
          .strict()
          .passthrough(),
        meta: Meta.optional(),
      })
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/members/me",
    alias: "getMyProfile",
    requestFormat: "json",
    response: MemberMeResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/members/me",
    alias: "updateMyProfile",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: updateMyProfile_Body,
      },
    ],
    response: MemberMeResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/members/me",
    alias: "withdrawMyAccount",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ mb_password: z.string() }).strict().passthrough(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/members/me/icon",
    alias: "uploadMyIcon",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: uploadMyIcon_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/members/me/icon",
    alias: "deleteMyIcon",
    requestFormat: "json",
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/members/me/image",
    alias: "uploadMyImage",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: uploadMyImage_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/members/me/image",
    alias: "deleteMyImage",
    requestFormat: "json",
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/members/me/notifications",
    alias: "listMyNotifications",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "cursor",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        data: z.array(z.object({}).partial().strict().passthrough()),
        pagination: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/members/me/notifications/settings",
    alias: "updateNotificationSettings",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: updateNotificationSettings_Body,
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/members/me/points",
    alias: "listMyPoints",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "cursor",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PointHistoryListResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/members/me/scraps",
    alias: "listMyScraps",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "cursor",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/memos",
    alias: "listMemos",
    requestFormat: "json",
    parameters: [
      {
        name: "kind",
        type: "Query",
        schema: z.enum(["recv", "send"]).optional().default("recv"),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100000).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: "cursor",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/memos",
    alias: "sendMemo",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: sendMemo_Body,
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/memos/:me_id",
    alias: "getMemo",
    requestFormat: "json",
    parameters: [
      {
        name: "me_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "kind",
        type: "Query",
        schema: z.enum(["recv", "send"]).optional().default("recv"),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/memos/:me_id",
    alias: "deleteMemo",
    requestFormat: "json",
    parameters: [
      {
        name: "me_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/memos/unread-count",
    alias: "memoUnreadCount",
    requestFormat: "json",
    response: MessageResponse,
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/menus",
    alias: "getMenus",
    requestFormat: "json",
    response: MenuListResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/p/board-reward/boards/:bo_table",
    alias: "pluginBoardRewardShowBoard",
    requestFormat: "json",
    parameters: [
      {
        name: "bo_table",
        type: "Path",
        schema: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Za-z0-9_]+$/),
      },
    ],
    response: PluginBoardRewardBoardResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/p/board-reward/reward-grants",
    alias: "pluginBoardRewardCreateGrant",
    description: `표준 경로. &#x60;PLUGIN_BOARD_REWARD_ENABLE_GRANT&#x3D;1&#x60; 설정 시에만 동작합니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PluginBoardRewardCommand,
      },
    ],
    response: PluginBoardRewardGrantResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/p/board-reward/rewards/grant",
    alias: "pluginBoardRewardGrant",
    description: `샘플 엔드포인트이며 &#x60;PLUGIN_BOARD_REWARD_ENABLE_GRANT&#x3D;1&#x60; 설정 시에만 동작합니다. 표준 경로는 &#x60;/p/board-reward/reward-grants&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PluginBoardRewardCommand,
      },
    ],
    response: PluginBoardRewardGrantResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/p/board-reward/rewards/preview",
    alias: "pluginBoardRewardPreview",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PluginBoardRewardCommand,
      },
    ],
    response: PluginBoardRewardPreviewResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/p/hello/greet",
    alias: "pluginHelloGreet",
    requestFormat: "json",
    response: PluginHelloGreetResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/p/hello/info",
    alias: "pluginHelloInfo",
    requestFormat: "json",
    response: PluginHelloInfoResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/p/premium-push/messages",
    alias: "pluginPremiumPushCreateMessage",
    description: `표준 경로. 유효한 플러그인 라이선스가 있어야 호출할 수 있습니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PluginPremiumPushSendRequest.optional(),
      },
    ],
    response: PluginPremiumPushSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 402,
        description: `플러그인 라이선스 필요`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/p/premium-push/send",
    alias: "pluginPremiumPushSend",
    description: `유효한 플러그인 라이선스가 있어야 호출할 수 있는 샘플 엔드포인트입니다. 표준 경로는 &#x60;/p/premium-push/messages&#x60;이며 이 경로는 레거시 호환용입니다.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PluginPremiumPushSendRequest.optional(),
      },
    ],
    response: PluginPremiumPushSendResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 402,
        description: `플러그인 라이선스 필요`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/p/premium-push/status",
    alias: "pluginPremiumPushStatus",
    requestFormat: "json",
    response: PluginPremiumPushStatusResponse,
    errors: [
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/polls/:po_id/result",
    alias: "getPollResult",
    requestFormat: "json",
    parameters: [
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PollResultResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/polls/:po_id/vote",
    alias: "votePoll",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.union([z.unknown(), z.unknown()]),
      },
      {
        name: "po_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: PollVoteResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/polls/active",
    alias: "getActivePoll",
    requestFormat: "json",
    response: PollActiveResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/popups/active",
    alias: "getActivePopups",
    requestFormat: "json",
    parameters: [
      {
        name: "device",
        type: "Query",
        schema: z.enum(["both", "pc", "mobile"]).optional(),
      },
      {
        name: "division",
        type: "Query",
        schema: z.enum(["both", "comm", "shop", "layer", "new"]).optional(),
      },
    ],
    response: MessageResponse,
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/qa",
    alias: "listQa",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(15),
      },
      {
        name: "category",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "search_field",
        type: "Query",
        schema: z
          .enum(["qa_subject", "qa_content", "qa_name", "mb_id"])
          .optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        data: z.array(z.object({}).partial().strict().passthrough()),
        pagination: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/qa",
    alias: "createQaQuestion",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createQaQuestion_Body,
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/qa/:qa_id",
    alias: "getQaDetail",
    requestFormat: "json",
    parameters: [
      {
        name: "qa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/qa/:qa_id",
    alias: "updateQa",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: updateQa_Body.optional(),
      },
      {
        name: "qa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/qa/:qa_id",
    alias: "deleteQa",
    requestFormat: "json",
    parameters: [
      {
        name: "qa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/qa/:qa_id/answer",
    alias: "createQaAnswer",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createQaAnswer_Body,
      },
      {
        name: "qa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 403,
        description: `권한 없음`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/qa/:qa_id/files/:no/download",
    alias: "downloadQaFile",
    requestFormat: "json",
    parameters: [
      {
        name: "qa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
      {
        name: "no",
        type: "Path",
        schema: z.union([z.literal(1), z.literal(2)]),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/qa/:qa_id/related",
    alias: "createQaRelated",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createQaQuestion_Body,
      },
      {
        name: "qa_id",
        type: "Path",
        schema: z.number().int().gte(1),
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 404,
        description: `리소스 없음`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/reports",
    alias: "createReport",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createReport_Body,
      },
    ],
    response: z
      .object({
        data: z.object({}).partial().strict().passthrough(),
        meta: Meta,
      })
      .partial()
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `잘못된 요청`,
        schema: ProblemDetails,
      },
      {
        status: 401,
        description: `인증 실패`,
        schema: ProblemDetails,
      },
      {
        status: 409,
        description: `충돌`,
        schema: ProblemDetails,
      },
      {
        status: 429,
        description: `요청 횟수 초과`,
        schema: ProblemDetails,
      },
      {
        status: 500,
        description: `서버 내부 오류`,
        schema: ProblemDetails,
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
