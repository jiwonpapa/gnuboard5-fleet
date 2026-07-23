mod contract;
mod payload;
mod serde_impl;

#[cfg(test)]
mod tests;

pub use contract::{AdminConfig, AdminConfigEnvelope, AdminConfigResponse};
pub use payload::AdminConfigUpdateInput;

use serde::de;
use serde_json::{Map, Value};
use std::collections::BTreeMap;

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}

fn insert_extra_strings(payload: &mut Map<String, Value>, values: &BTreeMap<String, String>) {
    for (key, value) in values {
        payload.insert(key.clone(), Value::String(value.trim().to_string()));
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
                    "{key} must be string/number/bool/null, got {other}"
                )));
            }
        };
        extra.insert(key.clone(), normalized);
    }

    Ok(extra)
}
