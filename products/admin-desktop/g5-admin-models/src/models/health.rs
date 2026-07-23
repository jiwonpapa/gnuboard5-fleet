use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: i64,
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for HealthResponse {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[cfg(test)]
mod tests {
    use super::HealthResponse;

    #[test]
    fn health_response_consumes_all_contract_fields() {
        let response: HealthResponse = serde_json::from_value(serde_json::json!({
            "status": "ok",
            "version": "1.0.0",
            "timestamp": 1_784_086_400,
            "meta": {
                "request_id": "req-health",
                "correlation_id": "corr-health",
                "server_request_id": "srv-health"
            }
        }))
        .expect("health response should deserialize");

        assert_eq!(response.status, "ok");
        assert_eq!(response.version, "1.0.0");
        assert_eq!(response.timestamp, 1_784_086_400);
        assert_eq!(response.meta.request_id.as_deref(), Some("req-health"));
    }
}
