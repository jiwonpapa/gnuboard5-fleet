use g5_admin_api_client::{error::AppError, ApiClient};
use g5_admin_models::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use g5_admin_transport::RequestConfig;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use std::future::Future;
use std::net::SocketAddr;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};

#[derive(Debug, Deserialize)]
struct ValueEnvelope {
    data: Value,
    #[serde(default)]
    meta: ApiTraceMeta,
}

impl HasApiTraceMeta for ValueEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

pub struct Harness {
    client: ApiClient,
    token: String,
    nonce: String,
    request_sequence: AtomicU64,
    executed_operation_ids: Mutex<Vec<String>>,
}

impl Harness {
    pub fn new(
        base_url: &str,
        token: String,
        nonce: String,
        resolve: Option<SocketAddr>,
    ) -> Result<Self, String> {
        let client = match resolve {
            Some(address) => ApiClient::new_with_resolve(base_url.to_string(), address),
            None => ApiClient::new(Some(base_url.to_string())),
        }
        .map_err(|error| error.to_string())?;
        Ok(Self {
            client,
            token,
            nonce,
            request_sequence: AtomicU64::new(1),
            executed_operation_ids: Mutex::new(Vec::new()),
        })
    }

    pub fn short_nonce(&self) -> String {
        self.nonce.chars().rev().take(7).collect::<String>()
    }

    pub fn marker(&self, domain: &str, phase: &str) -> String {
        format!("codex-audit-{domain}-{phase}-{}", self.short_nonce())
    }

    fn request_id(&self, operation_id: &str) -> String {
        let sequence = self.request_sequence.fetch_add(1, Ordering::Relaxed);
        format!("audit-{}-{operation_id}-{sequence}", self.short_nonce())
    }

    fn record_operation(&self, operation_id: &str) {
        self.executed_operation_ids
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .push(operation_id.to_string());
    }

    pub fn executed_operation_ids(&self) -> Vec<String> {
        self.executed_operation_ids
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .iter()
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect()
    }

    pub fn operation_checkpoint(&self) -> usize {
        self.executed_operation_ids
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .len()
    }

    pub fn executed_since(&self, checkpoint: usize) -> Vec<String> {
        self.executed_operation_ids
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .iter()
            .skip(checkpoint)
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect()
    }

    pub async fn json(
        &self,
        operation_id: &str,
        method: Method,
        target: &str,
        query: Option<&Value>,
        body: Option<&Value>,
    ) -> Result<Value, AppError> {
        self.record_operation(operation_id);
        let response = self
            .client
            .transport()
            .send_json::<Value, Value, ValueEnvelope>(
                &self.request_id(operation_id),
                method,
                target,
                RequestConfig {
                    query,
                    body,
                    access_token: Some(&self.token),
                    retryable: body.is_none(),
                },
            )
            .await?;
        Ok(response.value.data)
    }

    pub async fn empty(
        &self,
        operation_id: &str,
        method: Method,
        target: &str,
    ) -> Result<(), AppError> {
        self.record_operation(operation_id);
        self.client
            .transport()
            .send_empty::<(), ()>(
                &self.request_id(operation_id),
                method,
                target,
                RequestConfig {
                    query: None,
                    body: None,
                    access_token: Some(&self.token),
                    retryable: false,
                },
            )
            .await?;
        Ok(())
    }

    pub async fn expect_status(
        &self,
        operation_id: &str,
        method: Method,
        target: &str,
        expected_status: u16,
    ) -> Result<(), String> {
        self.expect_status_with_body(operation_id, method, target, None, expected_status)
            .await
    }

    async fn expect_status_with_body(
        &self,
        operation_id: &str,
        method: Method,
        target: &str,
        body: Option<&Value>,
        expected_status: u16,
    ) -> Result<(), String> {
        match self.json(operation_id, method, target, None, body).await {
            Err(AppError::Api(failure)) if failure.status == expected_status => Ok(()),
            Err(error) => Err(format!("expected status {expected_status}, got {error}")),
            Ok(_) => Err(format!(
                "expected status {expected_status}, request succeeded"
            )),
        }
    }

    pub async fn mutation_method_preflight(&self) -> Vec<String> {
        let missing_content = "__audit_missing__";
        let missing_poll = "2147483647";
        let content_body = json!({"co_subject": "audit preflight"});
        let poll_body = json!({"po_subject": "audit preflight"});
        let probes = [
            self.expect_status_with_body(
                "adminUpdateContent",
                Method::PUT,
                &format!("/admin/contents/{missing_content}"),
                Some(&content_body),
                404,
            )
            .await
            .map_err(|error| format!("PUT: {error}")),
            self.expect_status_with_body(
                "adminUpdatePoll",
                Method::PATCH,
                &format!("/admin/polls/{missing_poll}"),
                Some(&poll_body),
                404,
            )
            .await
            .map_err(|error| format!("PATCH: {error}")),
            self.expect_status(
                "adminDeletePoll",
                Method::DELETE,
                &format!("/admin/polls/{missing_poll}"),
                404,
            )
            .await
            .map_err(|error| format!("DELETE: {error}")),
        ];
        probes.into_iter().filter_map(Result::err).collect()
    }
}

#[derive(Debug, Serialize)]
pub struct DomainEvidence {
    pub domain: String,
    pub status: &'static str,
    pub mode: &'static str,
    pub baseline_verified: bool,
    pub mutation_attempted: bool,
    pub mutation_response_valid: bool,
    pub readback_verified: bool,
    pub cleanup_required: bool,
    pub cleanup_attempted: bool,
    pub cleanup_verified: bool,
    pub optional_unavailable_verified: bool,
    pub no_external_delivery: bool,
    pub planned_operation_ids: Vec<&'static str>,
    pub executed_operation_ids: Vec<String>,
    pub unavailable_accounted_operation_ids: Vec<&'static str>,
    pub failures: Vec<String>,
}

impl DomainEvidence {
    pub fn new(domain: &str, mode: &'static str, operations: &[&'static str]) -> Self {
        Self {
            domain: domain.to_string(),
            status: "failed",
            mode,
            baseline_verified: false,
            mutation_attempted: false,
            mutation_response_valid: false,
            readback_verified: false,
            cleanup_required: mode != "read_only_external_guard",
            cleanup_attempted: false,
            cleanup_verified: false,
            optional_unavailable_verified: false,
            no_external_delivery: true,
            planned_operation_ids: operations.to_vec(),
            executed_operation_ids: Vec::new(),
            unavailable_accounted_operation_ids: Vec::new(),
            failures: Vec::new(),
        }
    }

    pub fn account_unavailable(&mut self, operation_ids: impl IntoIterator<Item = &'static str>) {
        self.unavailable_accounted_operation_ids
            .extend(operation_ids);
        self.unavailable_accounted_operation_ids.sort_unstable();
        self.unavailable_accounted_operation_ids.dedup();
    }

    pub fn record_executed(&mut self, operation_ids: impl IntoIterator<Item = String>) {
        self.executed_operation_ids.extend(operation_ids);
        self.executed_operation_ids.sort_unstable();
        self.executed_operation_ids.dedup();
    }

    pub fn record_shared_executed(
        &mut self,
        operation_ids: impl IntoIterator<Item = &'static str>,
    ) {
        self.record_executed(operation_ids.into_iter().map(str::to_string));
    }

    pub fn failure(&mut self, phase: &str, error: impl ToString) {
        self.failures
            .push(format!("{phase}: {}", error.to_string()));
    }

    pub fn finalize(&mut self) {
        self.planned_operation_ids.sort_unstable();
        self.planned_operation_ids.dedup();
        if self.failures.is_empty()
            && self.baseline_verified
            && (!self.mutation_attempted || self.readback_verified)
            && (!self.cleanup_required || self.cleanup_verified)
            && self.no_external_delivery
        {
            self.status = "passed";
        }
    }

    pub fn passed(&self) -> bool {
        self.status == "passed"
    }
}

pub async fn capture_domain<F>(harness: &Harness, future: F) -> DomainEvidence
where
    F: Future<Output = DomainEvidence>,
{
    let checkpoint = harness.operation_checkpoint();
    let mut evidence = future.await;
    evidence.record_executed(harness.executed_since(checkpoint));
    evidence
}

pub fn string_field<'a>(value: &'a Value, field: &str) -> Result<&'a str, String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("missing string field {field}"))
}

pub fn integer_field(value: &Value, field: &str) -> Result<i64, String> {
    value
        .get(field)
        .and_then(Value::as_i64)
        .ok_or_else(|| format!("missing integer field {field}"))
}
