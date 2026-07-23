mod faqs;
mod images;
mod masters;

pub use faqs::*;
pub use images::*;
pub use masters::*;

use serde_json::{Map, Value};

fn insert_optional_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}
