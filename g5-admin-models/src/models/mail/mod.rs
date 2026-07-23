mod recipients;
mod send;
mod system;
mod templates;

pub use recipients::*;
pub use send::*;
pub use system::*;
pub use templates::*;

use serde_json::{Map, Value};

fn insert_optional_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}

fn insert_optional_i32(payload: &mut Map<String, Value>, key: &str, value: Option<i32>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::from(value));
    }
}
