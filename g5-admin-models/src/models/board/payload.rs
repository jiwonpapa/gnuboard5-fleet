use super::{insert_extra_strings, insert_i32, insert_string};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardCreateInput {
    pub bo_table: String,
    pub bo_subject: String,
    pub gr_id: String,
    pub bo_read_level: Option<i32>,
    pub bo_write_level: Option<i32>,
    pub bo_comment_level: Option<i32>,
    pub bo_download_level: Option<i32>,
    pub bo_use_category: Option<i32>,
    pub bo_category_list: Option<String>,
    pub bo_use_secret: Option<i32>,
    pub bo_upload_count: Option<i32>,
    pub bo_upload_size: Option<i32>,
    pub extra: BTreeMap<String, String>,
}

impl AdminBoardCreateInput {
    pub fn to_create_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        payload.insert("bo_table".to_string(), Value::String(self.bo_table.clone()));
        payload.insert(
            "bo_subject".to_string(),
            Value::String(self.bo_subject.clone()),
        );
        payload.insert("gr_id".to_string(), Value::String(self.gr_id.clone()));

        insert_i32(&mut payload, "bo_read_level", self.bo_read_level);
        insert_i32(&mut payload, "bo_write_level", self.bo_write_level);
        insert_i32(&mut payload, "bo_comment_level", self.bo_comment_level);
        insert_i32(&mut payload, "bo_download_level", self.bo_download_level);
        insert_i32(&mut payload, "bo_use_category", self.bo_use_category);
        insert_string(
            &mut payload,
            "bo_category_list",
            self.bo_category_list.clone(),
        );
        insert_i32(&mut payload, "bo_use_secret", self.bo_use_secret);
        insert_i32(&mut payload, "bo_upload_count", self.bo_upload_count);
        insert_i32(&mut payload, "bo_upload_size", self.bo_upload_size);
        insert_extra_strings(&mut payload, &self.extra);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardUpdateInput {
    pub bo_table: String,
    pub bo_subject: Option<String>,
    pub gr_id: Option<String>,
    pub bo_read_level: Option<i32>,
    pub bo_write_level: Option<i32>,
    pub bo_comment_level: Option<i32>,
    pub bo_download_level: Option<i32>,
    pub bo_use_category: Option<i32>,
    pub bo_category_list: Option<String>,
    pub bo_use_secret: Option<i32>,
    pub bo_upload_count: Option<i32>,
    pub bo_upload_size: Option<i32>,
    pub extra: BTreeMap<String, String>,
}

impl AdminBoardUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "bo_subject", self.bo_subject.clone());
        insert_string(&mut payload, "gr_id", self.gr_id.clone());
        insert_i32(&mut payload, "bo_read_level", self.bo_read_level);
        insert_i32(&mut payload, "bo_write_level", self.bo_write_level);
        insert_i32(&mut payload, "bo_comment_level", self.bo_comment_level);
        insert_i32(&mut payload, "bo_download_level", self.bo_download_level);
        insert_i32(&mut payload, "bo_use_category", self.bo_use_category);
        insert_string(
            &mut payload,
            "bo_category_list",
            self.bo_category_list.clone(),
        );
        insert_i32(&mut payload, "bo_use_secret", self.bo_use_secret);
        insert_i32(&mut payload, "bo_upload_count", self.bo_upload_count);
        insert_i32(&mut payload, "bo_upload_size", self.bo_upload_size);
        insert_extra_strings(&mut payload, &self.extra);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardDeleteInput {
    pub bo_table: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardCopyInput {
    pub bo_table: String,
    pub target_bo_table: String,
    pub target_bo_subject: Option<String>,
}

impl AdminBoardCopyInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "target_bo_table".to_string(),
            Value::String(self.target_bo_table.clone()),
        );
        if let Some(target_bo_subject) = &self.target_bo_subject {
            payload.insert(
                "target_bo_subject".to_string(),
                Value::String(target_bo_subject.clone()),
            );
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
pub struct AdminBoardNewPostDeleteInput {
    pub bn_ids: Vec<i32>,
}

impl AdminBoardNewPostDeleteInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "bn_ids".to_string(),
            Value::Array(self.bn_ids.iter().copied().map(Value::from).collect()),
        );

        payload
    }
}
