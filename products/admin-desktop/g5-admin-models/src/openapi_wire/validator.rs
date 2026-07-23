use super::generated::ACTIVE_CONTRACT_JSON;
use regex::Regex;
use serde::Deserialize;
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::fmt::{Display, Formatter};
use std::sync::OnceLock;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveWireContractError {
    pub operation: String,
    pub location: String,
    pub detail: String,
}

impl Display for ActiveWireContractError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "{} contract violation at {}: {}",
            self.operation, self.location, self.detail
        )
    }
}

impl std::error::Error for ActiveWireContractError {}

#[derive(Debug, Deserialize)]
struct ContractManifest {
    operations: Vec<OperationContract>,
    schemas: BTreeMap<String, Value>,
}

#[derive(Debug, Deserialize)]
struct OperationContract {
    method: String,
    path: String,
    operation_id: Option<String>,
    #[serde(rename = "security")]
    _security: Option<Vec<BTreeMap<String, Vec<String>>>>,
    parameters: Vec<ParameterContract>,
    request: Option<BodyContract>,
    responses: BTreeMap<String, BodyContract>,
}

#[derive(Debug, Deserialize)]
struct ParameterContract {
    name: String,
    #[serde(rename = "in")]
    location: String,
    #[serde(default)]
    required: bool,
    #[serde(default)]
    schema: Value,
}

#[derive(Debug, Deserialize)]
struct BodyContract {
    #[serde(default)]
    required: bool,
    media_type: Option<String>,
    schema: Option<Value>,
    #[serde(default)]
    content: BTreeMap<String, MediaContract>,
}

#[derive(Debug, Deserialize)]
struct MediaContract {
    schema: Option<Value>,
}

static CONTRACT: OnceLock<ContractManifest> = OnceLock::new();

fn contract() -> &'static ContractManifest {
    CONTRACT.get_or_init(|| {
        serde_json::from_str(ACTIVE_CONTRACT_JSON)
            .expect("generated active OpenAPI contract manifest must be valid JSON")
    })
}

pub fn validate_active_request(
    method: &str,
    target: &str,
    media_type: Option<&str>,
    query: Option<&Value>,
    body: Option<&Value>,
) -> Result<(), ActiveWireContractError> {
    let (operation, path_values) = find_operation(method, target)?;
    let query_values = query.and_then(Value::as_object);
    for parameter in &operation.parameters {
        let value = match parameter.location.as_str() {
            "path" => path_values.get(&parameter.name),
            "query" => query_values.and_then(|values| values.get(&parameter.name)),
            _ => None,
        };
        if parameter.required && value.is_none_or(Value::is_null) {
            return Err(contract_error(
                operation,
                format!("{}.{}", parameter.location, parameter.name),
                "required parameter is missing",
            ));
        }
        if let Some(value) = value.filter(|value| !value.is_null()) {
            let normalized = normalize_parameter_value(value, &parameter.schema);
            validate_schema(
                normalized.as_ref().unwrap_or(value),
                &parameter.schema,
                &format!("{}.{}", parameter.location, parameter.name),
                &contract().schemas,
            )
            .map_err(|detail| {
                contract_error(
                    operation,
                    format!("{}.{}", parameter.location, parameter.name),
                    detail,
                )
            })?;
        }
    }

    match (&operation.request, body) {
        (Some(request), None) if request.required => Err(contract_error(
            operation,
            "request.body",
            "required request body is missing",
        )),
        (Some(request), Some(value)) => {
            if let (Some(expected), Some(actual)) = (request.media_type.as_deref(), media_type) {
                if expected != actual {
                    return Err(contract_error(
                        operation,
                        "request.media_type",
                        format!("expected {expected}, got {actual}"),
                    ));
                }
            }
            if let Some(schema) = &request.schema {
                validate_schema(value, schema, "request.body", &contract().schemas)
                    .map_err(|detail| contract_error(operation, "request.body", detail))?;
            }
            Ok(())
        }
        (None, Some(_)) => Err(contract_error(
            operation,
            "request.body",
            "body is not declared by OpenAPI",
        )),
        _ => Ok(()),
    }
}

fn normalize_parameter_value(value: &Value, schema: &Value) -> Option<Value> {
    let text = value.as_str()?;
    match schema.get("type").and_then(Value::as_str) {
        Some("integer") => text.parse::<i64>().ok().map(Value::from),
        Some("number") => text.parse::<f64>().ok().map(Value::from),
        Some("boolean") => text.parse::<bool>().ok().map(Value::from),
        _ => None,
    }
}

pub fn validate_active_response(
    method: &str,
    target: &str,
    status: u16,
    media_type: Option<&str>,
    body_text: &str,
) -> Result<(), ActiveWireContractError> {
    let (operation, _) = find_operation(method, target)?;
    let response = operation
        .responses
        .get(&status.to_string())
        .or_else(|| operation.responses.get("default"))
        .ok_or_else(|| {
            contract_error(
                operation,
                format!("response.{status}"),
                "success status is not declared by OpenAPI",
            )
        })?;
    let actual_media_type = media_type
        .and_then(|value| value.split(';').next())
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let schema = actual_media_type
        .and_then(|value| response.content.get(value))
        .and_then(|media| media.schema.as_ref())
        .or(response.schema.as_ref());
    if !response.content.is_empty() && !body_text.trim().is_empty() {
        let Some(actual) = actual_media_type else {
            return Err(contract_error(
                operation,
                format!("response.{status}.media_type"),
                "response body has no Content-Type",
            ));
        };
        if !response.content.contains_key(actual) {
            return Err(contract_error(
                operation,
                format!("response.{status}.media_type"),
                format!("undeclared media type {actual}"),
            ));
        }
    }
    let Some(schema) = schema else {
        if body_text.trim().is_empty() {
            return Ok(());
        }
        return Err(contract_error(
            operation,
            format!("response.{status}"),
            "OpenAPI declares no response body but the server returned one",
        ));
    };
    let value: Value = serde_json::from_str(body_text).map_err(|error| {
        contract_error(
            operation,
            format!("response.{status}"),
            format!("invalid JSON: {error}"),
        )
    })?;
    validate_schema(
        &value,
        schema,
        &format!("response.{status}"),
        &contract().schemas,
    )
    .map_err(|detail| contract_error(operation, format!("response.{status}"), detail))
}

fn find_operation(
    method: &str,
    target: &str,
) -> Result<(&'static OperationContract, BTreeMap<String, Value>), ActiveWireContractError> {
    let method = method.to_ascii_uppercase();
    for operation in &contract().operations {
        if operation.method == method {
            if let Some(values) = match_path(&operation.path, target) {
                return Ok((operation, values));
            }
        }
    }
    Err(ActiveWireContractError {
        operation: format!("{method} {target}"),
        location: "operation".to_string(),
        detail: "operation is outside the active OpenAPI contract".to_string(),
    })
}

fn match_path(template: &str, target: &str) -> Option<BTreeMap<String, Value>> {
    let target = target.split('?').next().unwrap_or(target);
    let template_parts: Vec<_> = template.trim_matches('/').split('/').collect();
    let target_parts: Vec<_> = target.trim_matches('/').split('/').collect();
    if template_parts.len() != target_parts.len() {
        return None;
    }
    let mut values = BTreeMap::new();
    for (expected, actual) in template_parts.iter().zip(target_parts.iter()) {
        if expected.starts_with('{') && expected.ends_with('}') {
            values.insert(
                expected.trim_matches(['{', '}']).to_string(),
                Value::String((*actual).to_string()),
            );
        } else if expected != actual {
            return None;
        }
    }
    Some(values)
}

fn contract_error(
    operation: &OperationContract,
    location: impl Into<String>,
    detail: impl Into<String>,
) -> ActiveWireContractError {
    ActiveWireContractError {
        operation: operation
            .operation_id
            .clone()
            .unwrap_or_else(|| format!("{} {}", operation.method, operation.path)),
        location: location.into(),
        detail: detail.into(),
    }
}

fn validate_schema(
    value: &Value,
    schema: &Value,
    path: &str,
    components: &BTreeMap<String, Value>,
) -> Result<(), String> {
    let Some(schema) = schema.as_object() else {
        return Err(format!("{path}: schema is not an object"));
    };
    if let Some(reference) = schema.get("$ref").and_then(Value::as_str) {
        let name = reference.rsplit('/').next().unwrap_or(reference);
        let resolved = components
            .get(name)
            .ok_or_else(|| format!("{path}: unresolved schema reference {reference}"))?;
        return validate_schema(value, resolved, path, components);
    }
    if value.is_null() && schema.get("nullable").and_then(Value::as_bool) == Some(true) {
        return Ok(());
    }

    for key in ["allOf", "anyOf", "oneOf"] {
        if let Some(branches) = schema.get(key).and_then(Value::as_array) {
            let successes = branches
                .iter()
                .filter(|branch| validate_schema(value, branch, path, components).is_ok())
                .count();
            let valid = match key {
                "allOf" => successes == branches.len(),
                "oneOf" => successes == 1,
                _ => successes >= 1,
            };
            if !valid {
                return Err(format!(
                    "{path}: {key} matched {successes} of {} branches",
                    branches.len()
                ));
            }
        }
    }

    if let Some(allowed) = schema.get("enum").and_then(Value::as_array) {
        if !allowed.contains(value) {
            return Err(format!("{path}: value is outside enum {allowed:?}"));
        }
    }

    let raw_type = schema.get("type");
    let type_matches = match raw_type {
        None => true,
        Some(Value::String(kind)) => matches_type(value, kind),
        Some(Value::Array(kinds)) => kinds.iter().any(|kind| {
            kind.as_str()
                .map(|kind| matches_type(value, kind))
                .unwrap_or(false)
        }),
        _ => false,
    };
    if !type_matches {
        return Err(format!("{path}: value does not match type {raw_type:?}"));
    }

    if let Some(object) = value.as_object() {
        validate_object(object, schema, path, components)?;
    }
    if let Some(items) = value.as_array() {
        validate_array(items, schema, path, components)?;
    }
    if let Some(text) = value.as_str() {
        validate_string(text, schema, path)?;
    }
    if let Some(number) = value.as_f64() {
        validate_number(number, schema, path)?;
    }
    Ok(())
}

fn matches_type(value: &Value, kind: &str) -> bool {
    match kind {
        "null" => value.is_null(),
        "object" => value.is_object(),
        "array" => value.is_array(),
        "string" => value.is_string(),
        "integer" => value.as_i64().is_some() || value.as_u64().is_some(),
        "number" => value.is_number(),
        "boolean" => value.is_boolean(),
        _ => false,
    }
}

fn validate_object(
    object: &Map<String, Value>,
    schema: &Map<String, Value>,
    path: &str,
    components: &BTreeMap<String, Value>,
) -> Result<(), String> {
    let properties = schema
        .get("properties")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let required: BTreeSet<_> = schema
        .get("required")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    for field in required {
        if !object.contains_key(field) {
            return Err(format!("{path}.{field}: required field is missing"));
        }
    }
    if let Some(minimum) = schema.get("minProperties").and_then(Value::as_u64) {
        if object.len() < minimum as usize {
            return Err(format!("{path}: requires at least {minimum} properties"));
        }
    }
    for (field, value) in object {
        if let Some(field_schema) = properties.get(field) {
            validate_schema(value, field_schema, &format!("{path}.{field}"), components)?;
        } else {
            match schema.get("additionalProperties") {
                Some(Value::Bool(false)) => {
                    return Err(format!("{path}.{field}: additional property is forbidden"));
                }
                Some(additional @ Value::Object(_)) => {
                    validate_schema(value, additional, &format!("{path}.{field}"), components)?;
                }
                _ => {}
            }
        }
    }
    Ok(())
}

fn validate_array(
    items: &[Value],
    schema: &Map<String, Value>,
    path: &str,
    components: &BTreeMap<String, Value>,
) -> Result<(), String> {
    if let Some(minimum) = schema.get("minItems").and_then(Value::as_u64) {
        if items.len() < minimum as usize {
            return Err(format!("{path}: requires at least {minimum} items"));
        }
    }
    if let Some(maximum) = schema.get("maxItems").and_then(Value::as_u64) {
        if items.len() > maximum as usize {
            return Err(format!("{path}: allows at most {maximum} items"));
        }
    }
    if schema.get("uniqueItems").and_then(Value::as_bool) == Some(true) {
        let unique: BTreeSet<_> = items.iter().map(Value::to_string).collect();
        if unique.len() != items.len() {
            return Err(format!("{path}: items must be unique"));
        }
    }
    if let Some(item_schema) = schema.get("items") {
        for (index, item) in items.iter().enumerate() {
            validate_schema(item, item_schema, &format!("{path}[{index}]"), components)?;
        }
    }
    Ok(())
}

fn validate_string(text: &str, schema: &Map<String, Value>, path: &str) -> Result<(), String> {
    if let Some(minimum) = schema.get("minLength").and_then(Value::as_u64) {
        if text.chars().count() < minimum as usize {
            return Err(format!("{path}: string is shorter than {minimum}"));
        }
    }
    if let Some(maximum) = schema.get("maxLength").and_then(Value::as_u64) {
        if text.chars().count() > maximum as usize {
            return Err(format!("{path}: string is longer than {maximum}"));
        }
    }
    if let Some(pattern) = schema.get("pattern").and_then(Value::as_str) {
        let regex =
            Regex::new(pattern).map_err(|error| format!("{path}: invalid pattern: {error}"))?;
        if !regex.is_match(text) {
            return Err(format!("{path}: string does not match {pattern}"));
        }
    }
    Ok(())
}

fn validate_number(number: f64, schema: &Map<String, Value>, path: &str) -> Result<(), String> {
    if let Some(minimum) = schema.get("minimum").and_then(Value::as_f64) {
        if number < minimum {
            return Err(format!("{path}: number is less than {minimum}"));
        }
    }
    if let Some(maximum) = schema.get("maximum").and_then(Value::as_f64) {
        if number > maximum {
            return Err(format!("{path}: number is greater than {maximum}"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests;
