mod contract;
mod payload;
mod serde_impl;

pub use contract::{
    AdminBoard, AdminBoardDetailEnvelope, AdminBoardDetailResponse, AdminBoardListEnvelope,
    AdminBoardListQuery, AdminBoardListResponse, AdminBoardNewPostDeleteEnvelope,
    AdminBoardNewPostDeleteResponse, AdminBoardNewPostDeleteResult,
};
pub use payload::{
    AdminBoardCopyInput, AdminBoardCreateInput, AdminBoardDeleteInput,
    AdminBoardNewPostDeleteInput, AdminBoardUpdateInput,
};

use serde::de;
use serde_json::{Map, Value};
use std::collections::BTreeMap;

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

fn insert_extra_strings(payload: &mut Map<String, Value>, values: &BTreeMap<String, String>) {
    for (key, value) in values {
        payload.insert(key.clone(), Value::String(value.trim().to_string()));
    }
}

fn read_required_string_like<E>(raw: &mut Map<String, Value>, key: &str) -> Result<String, E>
where
    E: de::Error,
{
    match read_string_like::<E>(raw, key)? {
        Some(value) => Ok(value),
        None => Err(E::custom(format!("{key} is required"))),
    }
}

fn read_string_like<E>(raw: &mut Map<String, Value>, key: &str) -> Result<Option<String>, E>
where
    E: de::Error,
{
    match raw.remove(key) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(value)) => Ok(Some(value)),
        Some(Value::Number(value)) => Ok(Some(value.to_string())),
        Some(Value::Bool(value)) => Ok(Some(if value { "1" } else { "0" }.to_string())),
        Some(other) => Err(E::custom(format!(
            "{key} must be string/number/bool/null, got {other}"
        ))),
    }
}

fn read_i32_like<E>(raw: &mut Map<String, Value>, key: &str) -> Result<Option<i32>, E>
where
    E: de::Error,
{
    match raw.remove(key) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Number(value)) => value
            .as_i64()
            .and_then(|value| i32::try_from(value).ok())
            .map(Some)
            .ok_or_else(|| E::custom(format!("{key} must fit into i32"))),
        Some(Value::String(value)) => {
            let normalized = value.trim();
            if normalized.is_empty() {
                Ok(None)
            } else {
                normalized
                    .parse::<i32>()
                    .map(Some)
                    .map_err(|_| E::custom(format!("{key} must be an integer string")))
            }
        }
        Some(Value::Bool(value)) => Ok(Some(if value { 1 } else { 0 })),
        Some(other) => Err(E::custom(format!(
            "{key} must be number/string/bool/null, got {other}"
        ))),
    }
}

fn collect_extra_scalars<E>(raw: &Map<String, Value>) -> Result<BTreeMap<String, String>, E>
where
    E: de::Error,
{
    let mut extra = BTreeMap::new();
    for (key, value) in raw {
        let normalized = match value {
            Value::Null => String::new(),
            Value::String(value) => value.clone(),
            Value::Number(value) => value.to_string(),
            Value::Bool(value) => {
                if *value {
                    "1".to_string()
                } else {
                    "0".to_string()
                }
            }
            other => {
                return Err(E::custom(format!(
                    "{key} must be scalar/null for board parity, got {other}"
                )));
            }
        };
        extra.insert(key.clone(), normalized);
    }

    Ok(extra)
}
