use g5_admin_api_client::ApiClient;
use g5_admin_models::models::config::AdminConfigUpdateInput;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::{SystemTime, UNIX_EPOCH};

const FIELD: &str = "cf_10";

struct Args {
    base_url: String,
    output_json: PathBuf,
}

fn parse_args() -> Result<Args, String> {
    let mut args = env::args().skip(1);
    let mut base_url = None;
    let mut output_json = None;
    while let Some(argument) = args.next() {
        match argument.as_str() {
            "--base-url" => base_url = args.next(),
            "--output-json" => output_json = args.next().map(PathBuf::from),
            unknown => return Err(format!("unknown argument: {unknown}")),
        }
    }
    Ok(Args {
        base_url: base_url.ok_or("--base-url is required")?,
        output_json: output_json.ok_or("--output-json is required")?,
    })
}

fn update_input(value: String) -> AdminConfigUpdateInput {
    AdminConfigUpdateInput {
        extra: BTreeMap::from([(FIELD.to_string(), value)]),
        ..AdminConfigUpdateInput::default()
    }
}

fn field_value(config: &g5_admin_models::models::config::AdminConfig) -> Option<&str> {
    config.extra.get(FIELD).map(String::as_str)
}

fn write_report(path: &Path, report: &Value) -> Result<(), String> {
    let parent = path.parent().ok_or("output path has no parent")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    let payload = serde_json::to_vec_pretty(report).map_err(|error| error.to_string())?;
    fs::write(&temporary, payload).map_err(|error| error.to_string())?;
    fs::rename(temporary, path).map_err(|error| error.to_string())
}

async fn execute(args: &Args, access_token: &str) -> Result<Value, String> {
    let client = ApiClient::new(Some(args.base_url.clone())).map_err(|error| error.to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let baseline = client
        .get_admin_config(&format!("live-config-baseline-{nonce}"), access_token)
        .await
        .map_err(|error| error.to_string())?;
    let original = field_value(&baseline.value)
        .ok_or("live config response does not contain cf_10")?
        .to_string();
    let sentinel = format!("g5-live-audit-{nonce}");

    let update = client
        .update_admin_config(
            &format!("live-config-update-{nonce}"),
            access_token,
            &update_input(sentinel.clone()),
        )
        .await;
    let readback = client
        .get_admin_config(&format!("live-config-readback-{nonce}"), access_token)
        .await;
    let readback_verified = readback
        .as_ref()
        .ok()
        .and_then(|response| field_value(&response.value))
        == Some(sentinel.as_str());

    // The rollback is unconditional after the mutation attempt. A server may have
    // committed the write even when response validation or the network later fails.
    let rollback = client
        .update_admin_config(
            &format!("live-config-rollback-{nonce}"),
            access_token,
            &update_input(original.clone()),
        )
        .await;
    let rollback_readback = client
        .get_admin_config(
            &format!("live-config-rollback-readback-{nonce}"),
            access_token,
        )
        .await;
    let rollback_verified = rollback_readback
        .as_ref()
        .ok()
        .and_then(|response| field_value(&response.value))
        == Some(original.as_str());
    let passed = update.is_ok()
        && readback.is_ok()
        && readback_verified
        && rollback.is_ok()
        && rollback_readback.is_ok()
        && rollback_verified;

    Ok(json!({
        "schema": "gnuboard5.rust.live-config-roundtrip/v1",
        "audit_run_id": env::var("API_PIPELINE_AUDIT_RUN_ID").unwrap_or_default(),
        "status": if passed { "passed" } else { "failed" },
        "operation": {
            "method": "PUT",
            "path": "/admin/config",
            "field": FIELD
        },
        "proof": {
            "rust_wire_client": true,
            "mutation_response_valid": update.is_ok(),
            "readback_response_valid": readback.is_ok(),
            "readback_verified": readback_verified,
            "rollback_response_valid": rollback.is_ok(),
            "rollback_readback_response_valid": rollback_readback.is_ok(),
            "rollback_verified": rollback_verified
        }
    }))
}

#[tokio::main]
async fn main() -> ExitCode {
    let args = match parse_args() {
        Ok(args) => args,
        Err(error) => {
            eprintln!("live config roundtrip argument error: {error}");
            return ExitCode::FAILURE;
        }
    };
    let access_token = match env::var("G5_LIVE_ACCESS_TOKEN") {
        Ok(token) if !token.trim().is_empty() => token,
        _ => {
            eprintln!("G5_LIVE_ACCESS_TOKEN is required");
            return ExitCode::FAILURE;
        }
    };
    let report = match execute(&args, access_token.trim()).await {
        Ok(report) => report,
        Err(error) => {
            eprintln!("live config roundtrip failed before report: {error}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(error) = write_report(&args.output_json, &report) {
        eprintln!("failed to write live config roundtrip report: {error}");
        return ExitCode::FAILURE;
    }
    if report.get("status").and_then(Value::as_str) == Some("passed") {
        println!("PASS: Rust API client live config write/readback/rollback");
        ExitCode::SUCCESS
    } else {
        eprintln!("FAIL: live config rollback report was written without sensitive values");
        ExitCode::FAILURE
    }
}
