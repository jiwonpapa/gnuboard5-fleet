use reqwest::header::HeaderMap;

pub(crate) fn extract_response_correlation_id(headers: &HeaderMap) -> Option<String> {
    extract_header(headers, "x-correlation-id").or_else(|| extract_header(headers, "x-request-id"))
}

pub(crate) fn extract_response_server_request_id(headers: &HeaderMap) -> Option<String> {
    extract_header(headers, "x-server-request-id")
}

fn extract_header(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned)
}
