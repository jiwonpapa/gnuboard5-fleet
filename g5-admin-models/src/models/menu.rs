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
pub struct AdminMenu {
    pub me_id: i32,
    pub me_code: String,
    pub me_name: String,
    pub me_link: String,
    pub me_target: Option<String>,
    pub me_order: i32,
    pub me_use: i32,
    pub me_mobile_use: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMenuListResponse {
    pub menus: Vec<AdminMenu>,
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
pub struct AdminMenuDetailResponse {
    pub menu: AdminMenu,
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
pub struct AdminMenuCreateInput {
    pub me_code: String,
    pub me_name: String,
    pub me_link: String,
    pub me_target: Option<String>,
    pub me_order: Option<i32>,
    pub me_use: Option<i32>,
    pub me_mobile_use: Option<i32>,
}

impl AdminMenuCreateInput {
    pub fn to_create_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        payload.insert("me_code".to_string(), Value::String(self.me_code.clone()));
        payload.insert("me_name".to_string(), Value::String(self.me_name.clone()));
        payload.insert("me_link".to_string(), Value::String(self.me_link.clone()));
        insert_string(&mut payload, "me_target", self.me_target.clone());
        insert_i32(&mut payload, "me_order", self.me_order);
        insert_i32(&mut payload, "me_use", self.me_use);
        insert_i32(&mut payload, "me_mobile_use", self.me_mobile_use);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMenuUpdateInput {
    pub me_id: i32,
    pub me_code: Option<String>,
    pub me_name: Option<String>,
    pub me_link: Option<String>,
    pub me_target: Option<String>,
    pub me_order: Option<i32>,
    pub me_use: Option<i32>,
    pub me_mobile_use: Option<i32>,
}

impl AdminMenuUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "me_code", self.me_code.clone());
        insert_string(&mut payload, "me_name", self.me_name.clone());
        insert_string(&mut payload, "me_link", self.me_link.clone());
        insert_string(&mut payload, "me_target", self.me_target.clone());
        insert_i32(&mut payload, "me_order", self.me_order);
        insert_i32(&mut payload, "me_use", self.me_use);
        insert_i32(&mut payload, "me_mobile_use", self.me_mobile_use);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMenuDeleteInput {
    pub me_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMenuReorderItem {
    pub me_id: i32,
    pub me_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMenuReorderInput {
    pub orders: Vec<AdminMenuReorderItem>,
}

impl AdminMenuReorderInput {
    pub fn to_reorder_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        let orders = self
            .orders
            .iter()
            .map(|item| {
                let mut row = Map::new();
                row.insert("me_id".to_string(), Value::from(item.me_id));
                row.insert("me_order".to_string(), Value::from(item.me_order));
                Value::Object(row)
            })
            .collect::<Vec<_>>();

        payload.insert("orders".to_string(), Value::Array(orders));
        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMenuReorderResponse {
    pub result: String,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMenuListEnvelope {
    pub data: Vec<AdminMenu>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMenuListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMenuDetailEnvelope {
    pub data: AdminMenu,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMenuDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMenuReorderPayload {
    pub result: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMenuReorderEnvelope {
    pub data: AdminMenuReorderPayload,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMenuReorderEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}

fn insert_i32(payload: &mut Map<String, Value>, key: &str, value: Option<i32>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::from(value));
    }
}
