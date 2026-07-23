use crate::models::member::Pagination;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroup {
    pub gr_id: String,
    pub gr_subject: Option<String>,
    pub gr_admin: Option<String>,
    pub gr_device: Option<String>,
    pub gr_use_access: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupListResponse {
    pub groups: Vec<AdminBoardGroup>,
    pub pagination: Pagination,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupDetailResponse {
    pub group: AdminBoardGroup,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupCreateInput {
    pub gr_id: String,
    pub gr_subject: String,
    pub gr_admin: Option<String>,
    pub gr_device: Option<String>,
    pub gr_use_access: Option<i32>,
}

impl AdminBoardGroupCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("gr_id".to_string(), Value::String(self.gr_id.clone()));
        payload.insert(
            "gr_subject".to_string(),
            Value::String(self.gr_subject.clone()),
        );
        if let Some(gr_admin) = &self.gr_admin {
            payload.insert("gr_admin".to_string(), Value::String(gr_admin.clone()));
        }
        if let Some(gr_device) = &self.gr_device {
            payload.insert("gr_device".to_string(), Value::String(gr_device.clone()));
        }
        if let Some(gr_use_access) = self.gr_use_access {
            payload.insert("gr_use_access".to_string(), Value::from(gr_use_access));
        }

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupUpdateInput {
    pub gr_id: String,
    pub gr_subject: String,
    pub gr_admin: Option<String>,
    pub gr_device: Option<String>,
    pub gr_use_access: Option<i32>,
}

impl AdminBoardGroupUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "gr_subject".to_string(),
            Value::String(self.gr_subject.clone()),
        );
        if let Some(gr_admin) = &self.gr_admin {
            payload.insert("gr_admin".to_string(), Value::String(gr_admin.clone()));
        }
        if let Some(gr_device) = &self.gr_device {
            payload.insert("gr_device".to_string(), Value::String(gr_device.clone()));
        }
        if let Some(gr_use_access) = self.gr_use_access {
            payload.insert("gr_use_access".to_string(), Value::from(gr_use_access));
        }

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupDeleteInput {
    pub gr_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMemberListQuery {
    pub gr_id: String,
    pub page: i32,
    pub per_page: i32,
    pub search: Option<String>,
}

impl Default for AdminBoardGroupMemberListQuery {
    fn default() -> Self {
        Self {
            gr_id: String::new(),
            page: 1,
            per_page: 50,
            search: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMember {
    pub gm_id: i32,
    pub gr_id: String,
    pub mb_id: String,
    pub gm_datetime: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_today_login: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMemberListResponse {
    pub members: Vec<AdminBoardGroupMember>,
    pub pagination: Pagination,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMemberAddInput {
    pub gr_id: String,
    pub mb_id: String,
}

impl AdminBoardGroupMemberAddInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("mb_id".to_string(), Value::String(self.mb_id.clone()));

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMemberResult {
    pub gr_id: String,
    pub mb_id: String,
    pub gm_datetime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMemberResponse {
    pub result: AdminBoardGroupMemberResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardGroupMemberDeleteInput {
    pub gr_id: String,
    pub mb_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardGroupListEnvelope {
    pub data: Vec<AdminBoardGroup>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardGroupListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardGroupDetailEnvelope {
    pub data: AdminBoardGroup,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardGroupDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardGroupMemberListEnvelope {
    pub data: Vec<AdminBoardGroupMember>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardGroupMemberListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardGroupMemberEnvelope {
    pub data: AdminBoardGroupMemberResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardGroupMemberEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
