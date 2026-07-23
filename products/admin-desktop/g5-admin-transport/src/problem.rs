use crate::{ApiClientError, ApiFailure};
use g5_admin_error_contract::{
    ApiTraceMeta, ErrorGuide, ProblemDetails, ProblemMeta, ResponseTrace,
};
use reqwest::StatusCode;

pub(crate) fn api_error_from_response(
    request_id: &str,
    target: &str,
    status: StatusCode,
    body_text: String,
    header_correlation_id: Option<String>,
    header_server_request_id: Option<String>,
    fallback_title: &str,
) -> ApiClientError {
    let problem = serde_json::from_str::<ProblemDetails>(&body_text).ok();
    let trace = trace_from_problem(
        request_id,
        header_correlation_id,
        header_server_request_id,
        problem.as_ref(),
    );

    ApiClientError::Api(Box::new(ApiFailure {
        target: target.to_string(),
        status: status.as_u16(),
        title: problem
            .as_ref()
            .map(|details| details.title.clone())
            .unwrap_or_else(|| {
                status
                    .canonical_reason()
                    .unwrap_or(fallback_title)
                    .to_string()
            }),
        detail: problem
            .as_ref()
            .map(|details| details.detail.clone())
            .unwrap_or(body_text),
        trace,
        error_code: problem_string_field(
            problem.as_ref(),
            |details| details.error_code.clone(),
            |meta| meta.error_code.clone(),
        ),
        error_category: problem_string_field(
            problem.as_ref(),
            |details| details.error_category.clone(),
            |meta| meta.error_category.clone(),
        ),
        fault_domain: problem_string_field(
            problem.as_ref(),
            |details| details.fault_domain.clone(),
            |meta| meta.fault_domain.clone(),
        ),
        owner: problem_string_field(
            problem.as_ref(),
            |details| details.owner.clone(),
            |meta| meta.owner.clone(),
        ),
        retryable: problem_bool_field(
            problem.as_ref(),
            |details| details.retryable,
            |meta| meta.retryable,
        ),
        user_actionable: problem_bool_field(
            problem.as_ref(),
            |details| details.user_actionable,
            |meta| meta.user_actionable,
        ),
        guide: problem
            .as_ref()
            .and_then(problem_guide_for_status)
            .or_else(|| guide_for_status(status)),
    }))
}

fn trace_from_problem(
    request_id: &str,
    header_correlation_id: Option<String>,
    header_server_request_id: Option<String>,
    problem: Option<&ProblemDetails>,
) -> ResponseTrace {
    let meta = problem.map(problem_trace_meta);

    ResponseTrace::from_api(
        request_id.to_string(),
        header_correlation_id,
        header_server_request_id,
        meta.as_ref(),
    )
}

fn problem_trace_meta(problem: &ProblemDetails) -> ApiTraceMeta {
    ApiTraceMeta {
        request_id: problem.request_id.clone().or_else(|| {
            problem
                .meta
                .as_ref()
                .and_then(|meta| meta.request_id.clone())
        }),
        correlation_id: problem
            .correlation_id
            .clone()
            .or_else(|| {
                problem
                    .meta
                    .as_ref()
                    .and_then(|meta| meta.correlation_id.clone())
            })
            .or_else(|| problem.request_id.clone())
            .or_else(|| {
                problem
                    .meta
                    .as_ref()
                    .and_then(|meta| meta.request_id.clone())
            }),
        server_request_id: problem.server_request_id.clone().or_else(|| {
            problem
                .meta
                .as_ref()
                .and_then(|meta| meta.server_request_id.clone())
        }),
        server_time: None,
        version: None,
        error_code: problem_string_field(
            Some(problem),
            |details| details.error_code.clone(),
            |meta| meta.error_code.clone(),
        ),
        error_category: problem_string_field(
            Some(problem),
            |details| details.error_category.clone(),
            |meta| meta.error_category.clone(),
        ),
        fault_domain: problem_string_field(
            Some(problem),
            |details| details.fault_domain.clone(),
            |meta| meta.fault_domain.clone(),
        ),
        owner: problem_string_field(
            Some(problem),
            |details| details.owner.clone(),
            |meta| meta.owner.clone(),
        ),
        retryable: problem_bool_field(
            Some(problem),
            |details| details.retryable,
            |meta| meta.retryable,
        ),
        user_actionable: problem_bool_field(
            Some(problem),
            |details| details.user_actionable,
            |meta| meta.user_actionable,
        ),
    }
}

fn problem_string_field<T, U>(
    problem: Option<&ProblemDetails>,
    top_level: T,
    meta_level: U,
) -> Option<String>
where
    T: Fn(&ProblemDetails) -> Option<String>,
    U: Fn(&ProblemMeta) -> Option<String>,
{
    problem.and_then(|details| {
        top_level(details).or_else(|| details.meta.as_ref().and_then(meta_level))
    })
}

fn problem_bool_field<T, U>(
    problem: Option<&ProblemDetails>,
    top_level: T,
    meta_level: U,
) -> Option<bool>
where
    T: Fn(&ProblemDetails) -> Option<bool>,
    U: Fn(&ProblemMeta) -> Option<bool>,
{
    problem.and_then(|details| {
        top_level(details).or_else(|| details.meta.as_ref().and_then(meta_level))
    })
}

fn guide_for_status(status: StatusCode) -> Option<ErrorGuide> {
    match status {
        StatusCode::UNAUTHORIZED => Some(ErrorGuide {
            action: Some("다시 로그인하세요.".to_string()),
            reason: Some("인증 정보가 없거나 만료되었습니다.".to_string()),
        }),
        StatusCode::FORBIDDEN => Some(ErrorGuide {
            action: Some("관리자 권한을 확인하세요.".to_string()),
            reason: Some("현재 계정에 필요한 권한이 없습니다.".to_string()),
        }),
        StatusCode::BAD_REQUEST | StatusCode::UNPROCESSABLE_ENTITY => Some(ErrorGuide {
            action: Some("입력값과 요청 필드를 확인하세요.".to_string()),
            reason: Some("서버가 현재 요청 데이터를 처리할 수 없습니다.".to_string()),
        }),
        StatusCode::NOT_FOUND => Some(ErrorGuide {
            action: Some("대상 리소스 존재 여부를 확인하세요.".to_string()),
            reason: Some("요청한 리소스를 서버에서 찾지 못했습니다.".to_string()),
        }),
        StatusCode::INTERNAL_SERVER_ERROR => Some(ErrorGuide {
            action: Some("요청 경로와 request_id를 서버 로그에서 조회하세요.".to_string()),
            reason: Some(
                "서버에서 예외가 발생했습니다. 앱 입력보다 서버 구현 또는 데이터 상태 문제일 가능성이 큽니다."
                    .to_string(),
            ),
        }),
        StatusCode::SERVICE_UNAVAILABLE => Some(ErrorGuide {
            action: Some("잠시 후 다시 시도하세요.".to_string()),
            reason: Some("서버가 일시적으로 요청을 처리할 수 없습니다.".to_string()),
        }),
        _ => None,
    }
}

fn problem_guide_for_status(problem: &ProblemDetails) -> Option<ErrorGuide> {
    if let Some(guide) = &problem.guide {
        return Some(guide.clone());
    }

    StatusCode::from_u16(problem.status)
        .ok()
        .and_then(guide_for_status)
}
