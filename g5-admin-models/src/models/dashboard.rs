use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use crate::models::visit::AdminVisitStatsSummary;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardMemberSummary {
    pub total_members: Option<i32>,
    pub blocked_members: Option<i32>,
    pub leave_members: Option<i32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardPostSummary {
    pub total_rows: Option<i32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardPointSummary {
    pub total_rows: Option<i32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardSummary {
    pub members: Option<AdminDashboardMemberSummary>,
    pub posts: Option<AdminDashboardPostSummary>,
    pub points: Option<AdminDashboardPointSummary>,
    pub visits: Option<AdminVisitStatsSummary>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardRecentMember {
    pub mb_id: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_point: Option<i32>,
    pub mb_datetime: Option<String>,
    pub mb_mailling: Option<bool>,
    pub mb_open: Option<bool>,
    pub email_certified: Option<bool>,
    pub intercepted: Option<bool>,
    pub group_count: Option<i32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardRecentPost {
    pub bn_id: Option<i32>,
    pub gr_id: Option<String>,
    pub gr_subject: Option<String>,
    pub bo_table: Option<String>,
    pub bo_subject: Option<String>,
    pub wr_id: Option<i32>,
    pub wr_parent: Option<i32>,
    pub view_type: Option<String>,
    pub wr_subject: Option<String>,
    pub parent_wr_subject: Option<String>,
    pub wr_name: Option<String>,
    pub wr_datetime: Option<String>,
    pub post_mb_id: Option<String>,
    pub post_exists: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardRecentPoint {
    pub po_id: Option<i32>,
    pub mb_id: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub po_datetime: Option<String>,
    pub po_content: Option<String>,
    pub po_point: Option<i32>,
    pub po_mb_point: Option<i32>,
    pub po_rel_table: Option<String>,
    pub po_rel_id: Option<String>,
    pub po_rel_action: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardData {
    pub limit: Option<i32>,
    pub summary: Option<AdminDashboardSummary>,
    #[serde(default)]
    pub recent_members: Vec<AdminDashboardRecentMember>,
    #[serde(default)]
    pub recent_posts: Vec<AdminDashboardRecentPost>,
    #[serde(default)]
    pub recent_points: Vec<AdminDashboardRecentPoint>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminDashboardResponse {
    pub data: AdminDashboardData,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminDashboardResponse {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
