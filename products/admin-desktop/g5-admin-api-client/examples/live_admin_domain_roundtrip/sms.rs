use super::core::{capture_domain, integer_field, string_field, DomainEvidence, Harness};
use reqwest::Method;
use serde_json::{json, Value};

async fn sms_config(harness: &Harness) -> Result<Value, String> {
    harness
        .json(
            "adminGetSmsConfig",
            Method::GET,
            "/admin/sms/config",
            None,
            None,
        )
        .await
        .map_err(|error| error.to_string())
}

fn storage_ready(config: &Value) -> bool {
    config
        .get("storage_ready")
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

fn with_sms_config_execution(mut evidence: DomainEvidence) -> DomainEvidence {
    evidence.record_shared_executed(["adminGetSmsConfig"]);
    evidence
}

async fn unavailable_domain(
    harness: &Harness,
    domain: &str,
    operation_id: &'static str,
    path: &str,
    operations: &[&'static str],
) -> DomainEvidence {
    let mut evidence = DomainEvidence::new(domain, "optional_reversible_entity", operations);
    evidence.baseline_verified = true;
    evidence.cleanup_required = false;
    evidence.cleanup_verified = true;
    evidence.account_unavailable(
        operations
            .iter()
            .copied()
            .filter(|candidate| *candidate != "adminGetSmsConfig" && *candidate != operation_id),
    );
    match harness
        .expect_status(operation_id, Method::GET, path, 503)
        .await
    {
        Ok(()) => {
            evidence.optional_unavailable_verified = true;
            evidence.readback_verified = true;
        }
        Err(error) => evidence.failure("unavailable-probe", error),
    }
    evidence.finalize();
    evidence
}

async fn run_system(harness: &Harness, config: &Value) -> DomainEvidence {
    let operations = ["adminGetSmsConfig", "adminUpdateSmsConfig"];
    let mut evidence = DomainEvidence::new("system", "optional_reversible_snapshot", &operations);
    evidence.baseline_verified = true;
    if !storage_ready(config) {
        evidence.cleanup_required = false;
        evidence.cleanup_verified = true;
        evidence.readback_verified = true;
        evidence.optional_unavailable_verified = true;
        evidence.account_unavailable(["adminUpdateSmsConfig"]);
        evidence.finalize();
        return evidence;
    }

    let original = config
        .get("cf_phone")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let marker = "0212345678";
    evidence.mutation_attempted = true;
    let flow: Result<(), String> = async {
        harness
            .json(
                "adminUpdateSmsConfig",
                Method::PUT,
                "/admin/sms/config",
                None,
                Some(&json!({"cf_phone": marker})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = sms_config(harness).await?;
        if string_field(&readback, "cf_phone").unwrap_or_default() != marker {
            return Err("cf_phone readback mismatch".to_string());
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
                "adminUpdateSmsConfig",
                Method::PUT,
                "/admin/sms/config",
                None,
                Some(&json!({"cf_phone": original})),
            )
            .await
            .map_err(|error| error.to_string())?;
        let restored = sms_config(harness).await?;
        if restored
            .get("cf_phone")
            .and_then(Value::as_str)
            .unwrap_or_default()
            != original
        {
            return Err("cf_phone rollback mismatch".to_string());
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

async fn run_contacts(harness: &Harness, ready: bool) -> DomainEvidence {
    let operations = [
        "adminGetSmsConfig",
        "adminListSmsContacts",
        "adminCreateSmsContactGroup",
        "adminCreateSmsContact",
        "adminUpdateSmsContact",
        "adminGetSmsContact",
        "adminDeleteSmsContact",
        "adminDeleteSmsContactGroup",
    ];
    if !ready {
        return unavailable_domain(
            harness,
            "sms-contacts",
            "adminListSmsContacts",
            "/admin/sms/contacts",
            &operations,
        )
        .await;
    }
    let mut evidence =
        DomainEvidence::new("sms-contacts", "optional_reversible_entity", &operations);
    if let Err(error) = harness
        .json(
            "adminListSmsContacts",
            Method::GET,
            "/admin/sms/contacts",
            None,
            None,
        )
        .await
    {
        evidence.failure("baseline", error);
        return evidence;
    }
    evidence.baseline_verified = true;
    let group = match harness
        .json(
            "adminCreateSmsContactGroup",
            Method::POST,
            "/admin/sms/contact-groups",
            None,
            Some(&json!({"bg_name": harness.marker("sms-contacts", "group")})),
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("group-create", error);
            return evidence;
        }
    };
    let group_id = match integer_field(&group, "bg_no") {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("group-create", error);
            return evidence;
        }
    };
    evidence.mutation_attempted = true;
    let mut contact_id = None;
    let marker = harness.marker("sms-contacts", "updated");
    let flow: Result<(), String> = async {
        let contact = harness
            .json(
                "adminCreateSmsContact",
                Method::POST,
                "/admin/sms/contacts",
                None,
                Some(&json!({
                    "bg_no": group_id,
                    "bk_name": harness.marker("sms-contacts", "created"),
                    "bk_hp": "01000000000",
                    "bk_receipt": 0
                })),
            )
            .await
            .map_err(|error| error.to_string())?;
        let id = integer_field(&contact, "bk_no")?;
        contact_id = Some(id);
        let path = format!("/admin/sms/contacts/{id}");
        harness
            .json(
                "adminUpdateSmsContact",
                Method::PUT,
                &path,
                None,
                Some(&json!({"bk_name": marker})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = harness
            .json("adminGetSmsContact", Method::GET, &path, None, None)
            .await
            .map_err(|error| error.to_string())?;
        if string_field(&readback, "bk_name")? != marker {
            return Err("bk_name readback mismatch".to_string());
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow {
        evidence.failure("create/update/readback", error);
    }
    evidence.cleanup_attempted = true;
    let cleanup: Result<(), String> = async {
        if let Some(id) = contact_id {
            let path = format!("/admin/sms/contacts/{id}");
            harness
                .empty("adminDeleteSmsContact", Method::DELETE, &path)
                .await
                .map_err(|error| error.to_string())?;
            harness
                .expect_status("adminGetSmsContact", Method::GET, &path, 404)
                .await?;
        }
        harness
            .empty(
                "adminDeleteSmsContactGroup",
                Method::DELETE,
                &format!("/admin/sms/contact-groups/{group_id}"),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.cleanup_verified = contact_id.is_some();
        Ok(())
    }
    .await;
    if let Err(error) = cleanup {
        evidence.failure("cleanup", error);
    }
    evidence.finalize();
    evidence
}

async fn run_templates(harness: &Harness, ready: bool) -> DomainEvidence {
    let operations = [
        "adminGetSmsConfig",
        "adminListSmsTemplates",
        "adminCreateSmsTemplateGroup",
        "adminCreateSmsTemplate",
        "adminUpdateSmsTemplate",
        "adminGetSmsTemplate",
        "adminDeleteSmsTemplate",
        "adminDeleteSmsTemplateGroup",
    ];
    if !ready {
        return unavailable_domain(
            harness,
            "sms-templates",
            "adminListSmsTemplates",
            "/admin/sms/templates",
            &operations,
        )
        .await;
    }
    let mut evidence =
        DomainEvidence::new("sms-templates", "optional_reversible_entity", &operations);
    if let Err(error) = harness
        .json(
            "adminListSmsTemplates",
            Method::GET,
            "/admin/sms/templates",
            None,
            None,
        )
        .await
    {
        evidence.failure("baseline", error);
        return evidence;
    }
    evidence.baseline_verified = true;
    let group = match harness
        .json(
            "adminCreateSmsTemplateGroup",
            Method::POST,
            "/admin/sms/template-groups",
            None,
            Some(&json!({"fg_name": harness.marker("sms-templates", "group")})),
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("group-create", error);
            return evidence;
        }
    };
    let group_id = match integer_field(&group, "fg_no") {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("group-create", error);
            return evidence;
        }
    };
    evidence.mutation_attempted = true;
    let marker = harness.marker("sms-templates", "updated");
    let mut template_id = None;
    let flow: Result<(), String> = async {
        let template = harness
            .json(
                "adminCreateSmsTemplate",
                Method::POST,
                "/admin/sms/templates",
                None,
                Some(&json!({
                    "fg_no": group_id,
                    "fo_name": harness.marker("sms-templates", "created"),
                    "fo_content": "audit fixture"
                })),
            )
            .await
            .map_err(|error| error.to_string())?;
        let id = integer_field(&template, "fo_no")?;
        template_id = Some(id);
        let path = format!("/admin/sms/templates/{id}");
        harness
            .json(
                "adminUpdateSmsTemplate",
                Method::PUT,
                &path,
                None,
                Some(&json!({"fo_name": marker, "fo_content": "audit fixture updated"})),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = harness
            .json("adminGetSmsTemplate", Method::GET, &path, None, None)
            .await
            .map_err(|error| error.to_string())?;
        if string_field(&readback, "fo_name")? != marker {
            return Err("fo_name readback mismatch".to_string());
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow {
        evidence.failure("create/update/readback", error);
    }
    evidence.cleanup_attempted = true;
    let cleanup: Result<(), String> = async {
        if let Some(id) = template_id {
            let path = format!("/admin/sms/templates/{id}");
            harness
                .empty("adminDeleteSmsTemplate", Method::DELETE, &path)
                .await
                .map_err(|error| error.to_string())?;
            harness
                .expect_status("adminGetSmsTemplate", Method::GET, &path, 404)
                .await?;
        }
        harness
            .empty(
                "adminDeleteSmsTemplateGroup",
                Method::DELETE,
                &format!("/admin/sms/template-groups/{group_id}"),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.cleanup_verified = template_id.is_some();
        Ok(())
    }
    .await;
    if let Err(error) = cleanup {
        evidence.failure("cleanup", error);
    }
    evidence.finalize();
    evidence
}

async fn run_messages(harness: &Harness, ready: bool) -> DomainEvidence {
    let operations = [
        "adminGetSmsConfig",
        "adminListSmsMessageBatches",
        "adminListSmsDeliveries",
    ];
    let mut evidence = DomainEvidence::new("sms-messages", "read_only_external_guard", &operations);
    evidence.cleanup_required = false;
    evidence.cleanup_verified = true;
    evidence.baseline_verified = true;
    if !ready {
        let batches = harness
            .expect_status(
                "adminListSmsMessageBatches",
                Method::GET,
                "/admin/sms/history/batches",
                503,
            )
            .await;
        let deliveries = harness
            .expect_status(
                "adminListSmsDeliveries",
                Method::GET,
                "/admin/sms/history/deliveries",
                503,
            )
            .await;
        match (batches, deliveries) {
            (Ok(()), Ok(())) => {
                evidence.optional_unavailable_verified = true;
                evidence.readback_verified = true;
            }
            (left, right) => evidence.failure(
                "unavailable-probe",
                format!("batches={left:?} deliveries={right:?}"),
            ),
        }
    } else {
        let batches = harness
            .json(
                "adminListSmsMessageBatches",
                Method::GET,
                "/admin/sms/history/batches",
                None,
                None,
            )
            .await;
        let deliveries = harness
            .json(
                "adminListSmsDeliveries",
                Method::GET,
                "/admin/sms/history/deliveries",
                None,
                None,
            )
            .await;
        match (batches, deliveries) {
            (Ok(_), Ok(_)) => evidence.readback_verified = true,
            (left, right) => {
                evidence.failure("readback", format!("batches={left:?} deliveries={right:?}"))
            }
        }
    }
    evidence.finalize();
    evidence
}

pub async fn run(harness: &Harness) -> Vec<DomainEvidence> {
    let config = match sms_config(harness).await {
        Ok(value) => value,
        Err(error) => {
            return ["system", "sms-contacts", "sms-templates", "sms-messages"]
                .into_iter()
                .map(|domain| {
                    let mut evidence = DomainEvidence::new(
                        domain,
                        "optional_reversible_entity",
                        &["adminGetSmsConfig"],
                    );
                    evidence.record_shared_executed(["adminGetSmsConfig"]);
                    evidence.failure("sms-config", &error);
                    evidence
                })
                .collect();
        }
    };
    let ready = storage_ready(&config);
    vec![
        with_sms_config_execution(capture_domain(harness, run_system(harness, &config)).await),
        with_sms_config_execution(capture_domain(harness, run_contacts(harness, ready)).await),
        with_sms_config_execution(capture_domain(harness, run_templates(harness, ready)).await),
        with_sms_config_execution(capture_domain(harness, run_messages(harness, ready)).await),
    ]
}
