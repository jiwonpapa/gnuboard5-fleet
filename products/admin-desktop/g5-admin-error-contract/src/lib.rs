mod types;

pub use types::{
    ApiTraceMeta, AppErrorPayload, ErrorGuide, HasApiTraceMeta, ProblemDetails, ProblemMeta,
    ResponseTrace, Traced,
};

pub type CommandResult<T> = Result<T, AppErrorPayload>;

#[derive(Debug, Clone)]
pub struct ErrorClassification {
    code: String,
    error_category: String,
    fault_domain: String,
    owner: String,
    retryable: bool,
    user_actionable: bool,
}

impl ErrorClassification {
    pub fn into_payload(
        self,
        message: String,
        guide: Option<ErrorGuide>,
        trace: ResponseTrace,
        status: Option<u16>,
        target: Option<String>,
        detail: Option<String>,
    ) -> AppErrorPayload {
        AppErrorPayload {
            code: self.code,
            message,
            guide,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
            status,
            target,
            detail,
            error_category: self.error_category,
            fault_domain: self.fault_domain,
            owner: self.owner,
            retryable: self.retryable,
            user_actionable: self.user_actionable,
        }
    }
}

pub fn config_classification() -> ErrorClassification {
    ErrorClassification {
        code: "config_error".to_string(),
        error_category: "config".to_string(),
        fault_domain: "client_runtime".to_string(),
        owner: "rust_tauri".to_string(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn host_verification_classification() -> ErrorClassification {
    ErrorClassification {
        code: "ssh_host_verification_error".to_string(),
        error_category: "security".to_string(),
        fault_domain: "transport".to_string(),
        owner: "infra".to_string(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn auth_classification() -> ErrorClassification {
    ErrorClassification {
        code: "auth_error".to_string(),
        error_category: "auth".to_string(),
        fault_domain: "auth".to_string(),
        owner: "rust_tauri".to_string(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn transport_classification() -> ErrorClassification {
    ErrorClassification {
        code: "transport_error".to_string(),
        error_category: "transport".to_string(),
        fault_domain: "transport".to_string(),
        owner: "infra".to_string(),
        retryable: true,
        user_actionable: true,
    }
}

pub fn serialization_classification() -> ErrorClassification {
    ErrorClassification {
        code: "serialization_error".to_string(),
        error_category: "contract".to_string(),
        fault_domain: "contract".to_string(),
        owner: "shared_contract".to_string(),
        retryable: false,
        user_actionable: false,
    }
}

pub fn token_store_classification() -> ErrorClassification {
    ErrorClassification {
        code: "token_store_error".to_string(),
        error_category: "storage".to_string(),
        fault_domain: "storage".to_string(),
        owner: "rust_tauri".to_string(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn storage_classification() -> ErrorClassification {
    ErrorClassification {
        code: "storage_error".to_string(),
        error_category: "storage".to_string(),
        fault_domain: "storage".to_string(),
        owner: "rust_tauri".to_string(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn api_classification(
    status: u16,
    error_code: Option<String>,
    error_category: Option<String>,
    fault_domain: Option<String>,
    owner: Option<String>,
    retryable: Option<bool>,
    user_actionable: Option<bool>,
) -> ErrorClassification {
    let fallback = match status {
        400 | 422 => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "bad_request".to_string(),
            fault_domain: "client_input".to_string(),
            owner: "rust_tauri".to_string(),
            retryable: false,
            user_actionable: true,
        },
        401 | 403 => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "auth".to_string(),
            fault_domain: "auth".to_string(),
            owner: "php_api".to_string(),
            retryable: false,
            user_actionable: true,
        },
        404 | 409 => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "server_business".to_string(),
            fault_domain: "server_business".to_string(),
            owner: "php_api".to_string(),
            retryable: false,
            user_actionable: true,
        },
        429 => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "rate_limit".to_string(),
            fault_domain: "infra".to_string(),
            owner: "php_api".to_string(),
            retryable: true,
            user_actionable: true,
        },
        502..=504 => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "upstream".to_string(),
            fault_domain: "external_dependency".to_string(),
            owner: "infra".to_string(),
            retryable: true,
            user_actionable: false,
        },
        500..=599 => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "server_error".to_string(),
            fault_domain: "server_business".to_string(),
            owner: "php_api".to_string(),
            retryable: false,
            user_actionable: false,
        },
        _ => ErrorClassification {
            code: format!("api_{status}"),
            error_category: "http_error".to_string(),
            fault_domain: "server_business".to_string(),
            owner: "php_api".to_string(),
            retryable: false,
            user_actionable: false,
        },
    };

    ErrorClassification {
        code: error_code.unwrap_or(fallback.code),
        error_category: error_category.unwrap_or(fallback.error_category),
        fault_domain: fault_domain.unwrap_or(fallback.fault_domain),
        owner: owner.unwrap_or(fallback.owner),
        retryable: retryable.unwrap_or(fallback.retryable),
        user_actionable: user_actionable.unwrap_or(fallback.user_actionable),
    }
}

#[cfg(test)]
mod tests;
