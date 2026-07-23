use super::core::{capture_domain, integer_field, string_field, DomainEvidence, Harness};
use reqwest::Method;
use serde_json::{json, Value};

async fn run_config(harness: &Harness) -> DomainEvidence {
    let operations = ["adminGetConfig", "adminUpdateConfig"];
    let mut evidence = DomainEvidence::new("config", "reversible_snapshot", &operations);
    let baseline = match harness
        .json("adminGetConfig", Method::GET, "/admin/config", None, None)
        .await
    {
        Ok(value) => {
            evidence.baseline_verified = true;
            value
        }
        Err(error) => {
            evidence.failure("baseline", error);
            return evidence;
        }
    };
    let original = baseline
        .get("cf_10")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let marker = harness.marker("config", "updated");
    evidence.mutation_attempted = true;
    let flow: Result<(), String> = async {
        harness
            .json(
                "adminUpdateConfig",
                Method::PUT,
                "/admin/config",
                None,
                Some(&json!({"cf_10": marker})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = harness
            .json("adminGetConfig", Method::GET, "/admin/config", None, None)
            .await
            .map_err(|error| error.to_string())?;
        if string_field(&readback, "cf_10")? != marker {
            return Err("cf_10 mismatch after update".to_string());
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow {
        evidence.failure("update/readback", error);
    }
    evidence.cleanup_attempted = true;
    let cleanup: Result<(), String> = async {
        harness
            .json(
                "adminUpdateConfig",
                Method::PUT,
                "/admin/config",
                None,
                Some(&json!({"cf_10": original})),
            )
            .await
            .map_err(|error| error.to_string())?;
        let restored = harness
            .json("adminGetConfig", Method::GET, "/admin/config", None, None)
            .await
            .map_err(|error| error.to_string())?;
        if restored
            .get("cf_10")
            .and_then(Value::as_str)
            .unwrap_or_default()
            != original
        {
            return Err("cf_10 rollback mismatch".to_string());
        }
        evidence.cleanup_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = cleanup {
        evidence.failure("cleanup", error);
    }
    evidence.finalize();
    evidence
}

async fn run_members(harness: &Harness) -> DomainEvidence {
    let operations = ["adminListMembers", "adminGetMember", "adminUpdateMember"];
    let mut evidence = DomainEvidence::new("members", "reversible_snapshot", &operations);
    let members = match harness
        .json(
            "adminListMembers",
            Method::GET,
            "/admin/members",
            None,
            None,
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("baseline-list", error);
            return evidence;
        }
    };
    let member_id = members
        .as_array()
        .and_then(|items| {
            items
                .iter()
                .filter_map(|item| item.get("mb_id").and_then(Value::as_str))
                .find(|id| *id != "admin")
                .or_else(|| {
                    items
                        .iter()
                        .filter_map(|item| item.get("mb_id").and_then(Value::as_str))
                        .next()
                })
        })
        .unwrap_or("admin")
        .to_string();
    let path = format!("/admin/members/{member_id}");
    let baseline = match harness
        .json("adminGetMember", Method::GET, &path, None, None)
        .await
    {
        Ok(value) => {
            evidence.baseline_verified = true;
            value
        }
        Err(error) => {
            evidence.failure("baseline-detail", error);
            return evidence;
        }
    };
    let original = baseline
        .get("mb_1")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let marker = harness.marker("members", "updated");
    evidence.mutation_attempted = true;
    let flow: Result<(), String> = async {
        harness
            .json(
                "adminUpdateMember",
                Method::PATCH,
                &path,
                None,
                Some(&json!({"mb_1": marker})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = harness
            .json("adminGetMember", Method::GET, &path, None, None)
            .await
            .map_err(|error| error.to_string())?;
        if readback
            .get("mb_1")
            .and_then(Value::as_str)
            .unwrap_or_default()
            != marker
        {
            return Err("mb_1 mismatch after update".to_string());
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow {
        evidence.failure("update/readback", error);
    }
    evidence.cleanup_attempted = true;
    let cleanup: Result<(), String> = async {
        harness
            .json(
                "adminUpdateMember",
                Method::PATCH,
                &path,
                None,
                Some(&json!({"mb_1": original})),
            )
            .await
            .map_err(|error| error.to_string())?;
        let restored = harness
            .json("adminGetMember", Method::GET, &path, None, None)
            .await
            .map_err(|error| error.to_string())?;
        if restored
            .get("mb_1")
            .and_then(Value::as_str)
            .unwrap_or_default()
            != original
        {
            return Err("mb_1 rollback mismatch".to_string());
        }
        evidence.cleanup_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = cleanup {
        evidence.failure("cleanup", error);
    }
    evidence.finalize();
    evidence
}

async fn run_points(harness: &Harness) -> DomainEvidence {
    let operations = [
        "adminPointSummary",
        "adminListPoints",
        "adminCreatePointAction",
        "adminDeletePoints",
    ];
    let mut evidence = DomainEvidence::new("points", "reversible_ledger", &operations);
    let member_id = "admin";
    let query = json!({"mb_id": member_id});
    let baseline = match harness
        .json(
            "adminPointSummary",
            Method::GET,
            "/admin/points/summary",
            Some(&query),
            None,
        )
        .await
    {
        Ok(value) => {
            evidence.baseline_verified = true;
            value
        }
        Err(error) => {
            evidence.failure("baseline", error);
            return evidence;
        }
    };
    let original_total = integer_field(&baseline, "total_point").unwrap_or_default();
    let marker = harness.marker("points", "grant");
    evidence.mutation_attempted = true;
    let mut point_id = None;
    let flow: Result<(), String> = async {
        harness
            .json(
                "adminCreatePointAction",
                Method::POST,
                "/admin/points",
                None,
                Some(&json!({"action": "grant", "mb_id": member_id, "point": 1, "po_content": marker})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let list_query = json!({
            "page": 1,
            "per_page": 20,
            "mb_id": member_id,
            "search_field": "po_content",
            "search": marker
        });
        let list = harness
            .json(
                "adminListPoints",
                Method::GET,
                "/admin/points",
                Some(&list_query),
                None,
            )
            .await
            .map_err(|error| error.to_string())?;
        point_id = list.as_array().and_then(|items| {
            items.iter().find_map(|item| {
                (item.get("po_content").and_then(Value::as_str) == Some(marker.as_str()))
                    .then(|| item.get("po_id").and_then(Value::as_i64))
                    .flatten()
            })
        });
        if point_id.is_none() {
            return Err("created point ledger row not found".to_string());
        }
        let summary = harness
            .json(
                "adminPointSummary",
                Method::GET,
                "/admin/points/summary",
                Some(&query),
                None,
            )
            .await
            .map_err(|error| error.to_string())?;
        if integer_field(&summary, "total_point")? != original_total + 1 {
            return Err("point total did not increase by one".to_string());
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow {
        evidence.failure("grant/readback", error);
    }
    evidence.cleanup_attempted = true;
    match point_id {
        Some(point_id) => {
            let cleanup: Result<(), String> = async {
                harness
                    .json(
                        "adminDeletePoints",
                        Method::DELETE,
                        "/admin/points",
                        None,
                        Some(&json!({"po_ids": [point_id]})),
                    )
                    .await
                    .map_err(|error| error.to_string())?;
                let summary = harness
                    .json(
                        "adminPointSummary",
                        Method::GET,
                        "/admin/points/summary",
                        Some(&query),
                        None,
                    )
                    .await
                    .map_err(|error| error.to_string())?;
                if integer_field(&summary, "total_point")? != original_total {
                    return Err("point total rollback mismatch".to_string());
                }
                evidence.cleanup_verified = true;
                Ok(())
            }
            .await;
            if let Err(error) = cleanup {
                evidence.failure("cleanup", error);
            }
        }
        None => evidence.failure("cleanup", "point id unavailable"),
    }
    evidence.finalize();
    evidence
}

async fn run_theme(harness: &Harness) -> DomainEvidence {
    let operations = [
        "adminSystemGetTheme",
        "adminSystemListThemes",
        "adminSystemUpdateTheme",
    ];
    let mut evidence = DomainEvidence::new("theme", "reversible_snapshot", &operations);
    let baseline = match harness
        .json(
            "adminSystemGetTheme",
            Method::GET,
            "/admin/system/theme",
            None,
            None,
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("baseline", error);
            return evidence;
        }
    };
    let themes = match harness
        .json(
            "adminSystemListThemes",
            Method::GET,
            "/admin/system/themes",
            None,
            None,
        )
        .await
    {
        Ok(value) => {
            evidence.baseline_verified = true;
            value
        }
        Err(error) => {
            evidence.failure("theme-list", error);
            return evidence;
        }
    };
    let original = string_field(&baseline, "cf_theme")
        .unwrap_or_default()
        .to_string();
    let original_mobile = string_field(&baseline, "cf_mobile_theme")
        .unwrap_or_default()
        .to_string();
    let candidate = themes
        .as_array()
        .and_then(|items| {
            items
                .iter()
                .filter_map(|item| item.get("id").and_then(Value::as_str))
                .find(|id| *id != original)
        })
        .unwrap_or(&original)
        .to_string();
    evidence.mutation_attempted = true;
    let flow: Result<(), String> = async {
        harness
            .json(
                "adminSystemUpdateTheme",
                Method::PUT,
                "/admin/system/theme",
                None,
                Some(&json!({"cf_theme": candidate, "cf_mobile_theme": original_mobile})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = harness
            .json(
                "adminSystemGetTheme",
                Method::GET,
                "/admin/system/theme",
                None,
                None,
            )
            .await
            .map_err(|error| error.to_string())?;
        if string_field(&readback, "cf_theme")? != candidate {
            return Err("theme readback mismatch".to_string());
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow {
        evidence.failure("update/readback", error);
    }
    evidence.cleanup_attempted = true;
    let cleanup: Result<(), String> = async {
        harness
            .json(
                "adminSystemUpdateTheme",
                Method::PUT,
                "/admin/system/theme",
                None,
                Some(&json!({"cf_theme": original, "cf_mobile_theme": original_mobile})),
            )
            .await
            .map_err(|error| error.to_string())?;
        let restored = harness
            .json(
                "adminSystemGetTheme",
                Method::GET,
                "/admin/system/theme",
                None,
                None,
            )
            .await
            .map_err(|error| error.to_string())?;
        if string_field(&restored, "cf_theme")? != original
            || string_field(&restored, "cf_mobile_theme")? != original_mobile
        {
            return Err("theme rollback mismatch".to_string());
        }
        evidence.cleanup_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = cleanup {
        evidence.failure("cleanup", error);
    }
    evidence.finalize();
    evidence
}

pub async fn run(harness: &Harness) -> Vec<DomainEvidence> {
    vec![
        capture_domain(harness, run_config(harness)).await,
        capture_domain(harness, run_members(harness)).await,
        capture_domain(harness, run_points(harness)).await,
        capture_domain(harness, run_theme(harness)).await,
    ]
}
