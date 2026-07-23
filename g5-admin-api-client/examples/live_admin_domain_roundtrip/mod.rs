mod core;
mod entities;
mod sms;
mod stateful;

use core::{DomainEvidence, Harness};
use serde::Serialize;
use std::collections::BTreeSet;
use std::fs;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const EXPECTED_DOMAINS: [&str; 17] = [
    "boards",
    "config",
    "contents",
    "faq-masters",
    "faqs",
    "groups",
    "mails",
    "members",
    "menus",
    "points",
    "polls",
    "popups",
    "sms-contacts",
    "sms-messages",
    "sms-templates",
    "system",
    "theme",
];
const EXTERNAL_DELIVERY_OPERATIONS: [&str; 8] = [
    "adminCreateMailTest",
    "adminCreateSmsMessage",
    "adminResendAllSmsBatch",
    "adminResendSmsFailures",
    "adminSendMail",
    "adminSendTestMail",
    "adminSystemSendMailTest",
    "adminSystemSendMemberMail",
];

pub struct Args {
    base_url: String,
    output_json: PathBuf,
    audit_run_id: String,
    resolve_ip: Option<IpAddr>,
}

impl Args {
    pub fn parse() -> Result<Self, String> {
        let mut base_url = None;
        let mut output_json = None;
        let mut audit_run_id = String::new();
        let mut resolve_ip = None;
        let mut args = std::env::args().skip(1);
        while let Some(argument) = args.next() {
            match argument.as_str() {
                "--base-url" => base_url = args.next(),
                "--output-json" => output_json = args.next().map(PathBuf::from),
                "--audit-run-id" => audit_run_id = args.next().unwrap_or_default(),
                "--resolve-ip" => {
                    resolve_ip = Some(
                        args.next()
                            .ok_or_else(|| "--resolve-ip requires a value".to_string())?
                            .parse()
                            .map_err(|error| format!("invalid --resolve-ip: {error}"))?,
                    )
                }
                _ => return Err(format!("unknown argument: {argument}")),
            }
        }
        Ok(Self {
            base_url: base_url
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "--base-url is required".to_string())?,
            output_json: output_json.ok_or_else(|| "--output-json is required".to_string())?,
            audit_run_id,
            resolve_ip,
        })
    }
}

#[derive(Serialize)]
struct Report {
    schema: &'static str,
    audit_run_id: String,
    status: &'static str,
    expected_domain_count: usize,
    domain_count: usize,
    preflight_failures: Vec<String>,
    proof: Proof,
    preflight_operation_ids: Vec<String>,
    executed_operation_ids: Vec<String>,
    unavailable_accounted_operation_ids: Vec<String>,
    domains: Vec<DomainEvidence>,
}

#[derive(Serialize)]
struct Proof {
    production_api_client: bool,
    canonical_wire_validation: bool,
    current_run: bool,
    mutation_method_preflight: bool,
    all_domains_accounted_for: bool,
    all_operations_accounted_for: bool,
    all_requests_attributed: bool,
    all_mutations_read_back: bool,
    all_cleanup_verified: bool,
    external_delivery_operations_executed: usize,
}

pub async fn run(args: Args) -> Result<bool, String> {
    let token = std::env::var("G5_LIVE_ACCESS_TOKEN")
        .map_err(|_| "G5_LIVE_ACCESS_TOKEN is required".to_string())?;
    if token.trim().is_empty() {
        return Err("G5_LIVE_ACCESS_TOKEN must not be empty".to_string());
    }
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let resolve = match args.resolve_ip {
        Some(ip) => {
            let parsed = reqwest::Url::parse(&args.base_url)
                .map_err(|error| format!("invalid --base-url: {error}"))?;
            let port = parsed
                .port_or_known_default()
                .ok_or_else(|| "--base-url scheme has no known port".to_string())?;
            Some(SocketAddr::new(ip, port))
        }
        None => None,
    };
    let harness = Harness::new(&args.base_url, token, format!("{nonce:x}"), resolve)?;

    let preflight_checkpoint = harness.operation_checkpoint();
    let preflight_failures = harness.mutation_method_preflight().await;
    let preflight_operation_ids = harness
        .executed_since(preflight_checkpoint)
        .into_iter()
        .collect::<BTreeSet<_>>();
    let mutation_method_preflight = preflight_failures.is_empty();
    let mut domains = Vec::new();
    if mutation_method_preflight {
        domains.extend(entities::run(&harness).await);
        domains.extend(stateful::run(&harness).await);
        domains.extend(sms::run(&harness).await);
    }
    domains.sort_by(|left, right| left.domain.cmp(&right.domain));

    let actual = domains
        .iter()
        .map(|item| item.domain.as_str())
        .collect::<BTreeSet<_>>();
    let expected = EXPECTED_DOMAINS.into_iter().collect::<BTreeSet<_>>();
    let all_domains_accounted_for = actual == expected && domains.len() == expected.len();
    let all_mutations_read_back = domains
        .iter()
        .all(|item| !item.mutation_attempted || item.readback_verified);
    let all_cleanup_verified = domains
        .iter()
        .all(|item| !item.cleanup_required || item.cleanup_verified);
    let planned_operation_ids = domains
        .iter()
        .flat_map(|item| item.planned_operation_ids.iter().copied())
        .map(str::to_string)
        .collect::<BTreeSet<_>>();
    let executed_operation_ids = domains
        .iter()
        .flat_map(|item| item.executed_operation_ids.iter().cloned())
        .collect::<BTreeSet<_>>();
    let unavailable_accounted_operation_ids = domains
        .iter()
        .flat_map(|item| item.unavailable_accounted_operation_ids.iter().copied())
        .map(str::to_string)
        .collect::<BTreeSet<_>>();
    let accounted_operation_ids = executed_operation_ids
        .union(&unavailable_accounted_operation_ids)
        .cloned()
        .collect::<BTreeSet<_>>();
    let all_operations_accounted_for = planned_operation_ids == accounted_operation_ids
        && executed_operation_ids.is_disjoint(&unavailable_accounted_operation_ids);
    let attributed_operation_ids = preflight_operation_ids
        .union(&executed_operation_ids)
        .cloned()
        .collect::<BTreeSet<_>>();
    let all_requests_attributed = harness
        .executed_operation_ids()
        .into_iter()
        .collect::<BTreeSet<_>>()
        == attributed_operation_ids;
    let external_delivery_operations_executed = EXTERNAL_DELIVERY_OPERATIONS
        .iter()
        .filter(|operation_id| attributed_operation_ids.contains(**operation_id))
        .count();
    let passed = mutation_method_preflight
        && all_domains_accounted_for
        && all_operations_accounted_for
        && all_requests_attributed
        && all_mutations_read_back
        && all_cleanup_verified
        && domains.iter().all(DomainEvidence::passed);
    let report = Report {
        schema: "gnuboard5.rust.live-admin-domain-roundtrip/v1",
        audit_run_id: args.audit_run_id,
        status: if passed { "passed" } else { "failed" },
        expected_domain_count: expected.len(),
        domain_count: domains.len(),
        preflight_failures,
        proof: Proof {
            production_api_client: true,
            canonical_wire_validation: true,
            current_run: true,
            mutation_method_preflight,
            all_domains_accounted_for,
            all_operations_accounted_for,
            all_requests_attributed,
            all_mutations_read_back,
            all_cleanup_verified,
            external_delivery_operations_executed,
        },
        preflight_operation_ids: preflight_operation_ids.into_iter().collect(),
        executed_operation_ids: executed_operation_ids.into_iter().collect(),
        unavailable_accounted_operation_ids: unavailable_accounted_operation_ids
            .into_iter()
            .collect(),
        domains,
    };
    if let Some(parent) = args.output_json.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(
        &args.output_json,
        serde_json::to_vec_pretty(&report).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    println!("domains={}", report.domain_count);
    println!("status={}", report.status);
    Ok(passed)
}
