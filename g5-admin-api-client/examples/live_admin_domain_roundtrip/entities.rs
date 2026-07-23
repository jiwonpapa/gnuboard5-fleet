use super::core::{capture_domain, string_field, DomainEvidence, Harness};
use reqwest::Method;
use serde_json::{json, Value};

struct EntitySpec {
    domain: &'static str,
    list_operation: &'static str,
    list_path: &'static str,
    create_operation: &'static str,
    create_path: &'static str,
    resource_base: &'static str,
    update_operation: &'static str,
    update_method: Method,
    delete_operation: &'static str,
    read_operation: &'static str,
    id_field: &'static str,
    fixed_id: Option<String>,
    marker_field: &'static str,
    marker: String,
    create_body: Value,
    update_body: Value,
}

impl EntitySpec {
    fn operations(&self) -> Vec<&'static str> {
        vec![
            self.list_operation,
            self.create_operation,
            self.update_operation,
            self.read_operation,
            self.delete_operation,
        ]
    }
}

async fn run_entity(harness: &Harness, spec: EntitySpec) -> DomainEvidence {
    let mut evidence = DomainEvidence::new(spec.domain, "reversible_entity", &spec.operations());
    match harness
        .json(spec.list_operation, Method::GET, spec.list_path, None, None)
        .await
    {
        Ok(_) => evidence.baseline_verified = true,
        Err(error) => {
            evidence.failure("baseline", error);
            return evidence;
        }
    }

    evidence.mutation_attempted = true;
    let created = match harness
        .json(
            spec.create_operation,
            Method::POST,
            spec.create_path,
            None,
            Some(&spec.create_body),
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            evidence.failure("create", error);
            return evidence;
        }
    };
    let id = match spec.fixed_id {
        Some(id) => id,
        None => match created.get(spec.id_field) {
            Some(Value::String(value)) => value.clone(),
            Some(Value::Number(value)) => value.to_string(),
            _ => {
                evidence.failure("create", format!("missing id field {}", spec.id_field));
                return evidence;
            }
        },
    };
    let resource_path = format!("{}/{}", spec.resource_base, id);

    let flow_result: Result<(), String> = async {
        harness
            .json(
                spec.update_operation,
                spec.update_method,
                &resource_path,
                None,
                Some(&spec.update_body),
            )
            .await
            .map_err(|error| error.to_string())?;
        evidence.mutation_response_valid = true;
        let readback = harness
            .json(spec.read_operation, Method::GET, &resource_path, None, None)
            .await
            .map_err(|error| error.to_string())?;
        let actual = string_field(&readback, spec.marker_field)?;
        if actual != spec.marker {
            return Err(format!("{} mismatch after update", spec.marker_field));
        }
        evidence.readback_verified = true;
        Ok(())
    }
    .await;
    if let Err(error) = flow_result {
        evidence.failure("update/readback", error);
    }

    evidence.cleanup_attempted = true;
    match harness
        .empty(spec.delete_operation, Method::DELETE, &resource_path)
        .await
    {
        Ok(()) => match harness
            .expect_status(spec.read_operation, Method::GET, &resource_path, 404)
            .await
        {
            Ok(()) => evidence.cleanup_verified = true,
            Err(error) => evidence.failure("cleanup-readback", error),
        },
        Err(error) => evidence.failure("cleanup", error),
    }
    evidence.finalize();
    evidence
}

async fn create_dependency(
    harness: &Harness,
    operation_id: &'static str,
    path: &str,
    body: &Value,
    id_field: &str,
) -> Result<String, String> {
    let data = harness
        .json(operation_id, Method::POST, path, None, Some(body))
        .await
        .map_err(|error| error.to_string())?;
    match data.get(id_field) {
        Some(Value::String(value)) => Ok(value.clone()),
        Some(Value::Number(value)) => Ok(value.to_string()),
        _ => Err(format!("missing dependency id field {id_field}")),
    }
}

async fn run_groups(harness: &Harness) -> DomainEvidence {
    let id = format!("a{}", harness.short_nonce());
    let marker = harness.marker("groups", "updated");
    run_entity(
        harness,
        EntitySpec {
            domain: "groups",
            list_operation: "adminListBoardGroups",
            list_path: "/admin/board-groups",
            create_operation: "adminCreateBoardGroup",
            create_path: "/admin/board-groups",
            resource_base: "/admin/board-groups",
            update_operation: "adminUpdateBoardGroup",
            update_method: Method::PUT,
            delete_operation: "adminDeleteBoardGroup",
            read_operation: "adminGetBoardGroup",
            id_field: "gr_id",
            fixed_id: Some(id.clone()),
            marker_field: "gr_subject",
            marker: marker.clone(),
            create_body: json!({"gr_id": id, "gr_subject": harness.marker("groups", "created")}),
            update_body: json!({"gr_subject": marker}),
        },
    )
    .await
}

async fn run_boards(harness: &Harness) -> DomainEvidence {
    if let Err(error) = harness
        .json(
            "adminListBoardGroups",
            Method::GET,
            "/admin/board-groups",
            None,
            None,
        )
        .await
    {
        let mut evidence = DomainEvidence::new("boards", "reversible_entity", &[]);
        evidence.failure("dependency-baseline", error);
        return evidence;
    }
    let group_id = format!("b{}", harness.short_nonce());
    let group_path = format!("/admin/board-groups/{group_id}");
    let setup = create_dependency(
        harness,
        "adminCreateBoardGroup",
        "/admin/board-groups",
        &json!({"gr_id": group_id, "gr_subject": harness.marker("boards", "group")}),
        "gr_id",
    )
    .await;
    let Ok(group_id) = setup else {
        let mut evidence = DomainEvidence::new("boards", "reversible_entity", &[]);
        evidence.failure("setup", setup.unwrap_err());
        return evidence;
    };
    let table = format!("audit{}", harness.short_nonce());
    let marker = harness.marker("boards", "updated");
    let mut evidence = run_entity(
        harness,
        EntitySpec {
            domain: "boards",
            list_operation: "adminListBoards",
            list_path: "/admin/boards",
            create_operation: "adminCreateBoard",
            create_path: "/admin/boards",
            resource_base: "/admin/boards",
            update_operation: "adminUpdateBoard",
            update_method: Method::PUT,
            delete_operation: "adminDeleteBoard",
            read_operation: "adminGetBoard",
            id_field: "bo_table",
            fixed_id: Some(table.clone()),
            marker_field: "bo_subject",
            marker: marker.clone(),
            create_body: json!({
                "bo_table": table,
                "bo_subject": harness.marker("boards", "created"),
                "gr_id": group_id
            }),
            update_body: json!({"bo_subject": marker}),
        },
    )
    .await;
    evidence.planned_operation_ids.extend([
        "adminListBoardGroups",
        "adminCreateBoardGroup",
        "adminDeleteBoardGroup",
    ]);
    if let Err(error) = harness
        .empty("adminDeleteBoardGroup", Method::DELETE, &group_path)
        .await
    {
        evidence.cleanup_verified = false;
        evidence.failure("dependency-cleanup", error);
    }
    evidence.finalize();
    evidence
}

async fn run_contents(harness: &Harness) -> DomainEvidence {
    let id = format!("audit_{}", harness.short_nonce());
    let marker = harness.marker("contents", "updated");
    run_entity(
        harness,
        EntitySpec {
            domain: "contents",
            list_operation: "adminListContents",
            list_path: "/admin/contents",
            create_operation: "adminCreateContent",
            create_path: "/admin/contents",
            resource_base: "/admin/contents",
            update_operation: "adminUpdateContent",
            update_method: Method::PUT,
            delete_operation: "adminDeleteContent",
            read_operation: "adminGetContent",
            id_field: "co_id",
            fixed_id: Some(id.clone()),
            marker_field: "co_subject",
            marker: marker.clone(),
            create_body: json!({"co_id": id, "co_subject": harness.marker("contents", "created"), "co_content": "audit fixture"}),
            update_body: json!({"co_subject": marker}),
        },
    )
    .await
}

async fn run_faq_master(harness: &Harness) -> DomainEvidence {
    let marker = harness.marker("faq-masters", "updated");
    run_entity(
        harness,
        EntitySpec {
            domain: "faq-masters",
            list_operation: "adminListFaqMasters",
            list_path: "/admin/faq-masters",
            create_operation: "adminCreateFaqMaster",
            create_path: "/admin/faq-masters",
            resource_base: "/admin/faq-masters",
            update_operation: "adminUpdateFaqMaster",
            update_method: Method::PUT,
            delete_operation: "adminDeleteFaqMaster",
            read_operation: "adminGetFaqMaster",
            id_field: "fm_id",
            fixed_id: None,
            marker_field: "fm_subject",
            marker: marker.clone(),
            create_body: json!({"fm_subject": harness.marker("faq-masters", "created")}),
            update_body: json!({"fm_subject": marker}),
        },
    )
    .await
}

async fn run_faqs(harness: &Harness) -> DomainEvidence {
    if let Err(error) = harness
        .json(
            "adminListFaqMasters",
            Method::GET,
            "/admin/faq-masters",
            None,
            None,
        )
        .await
    {
        let mut evidence = DomainEvidence::new("faqs", "reversible_entity", &[]);
        evidence.failure("dependency-baseline", error);
        return evidence;
    }
    let master_id = match create_dependency(
        harness,
        "adminCreateFaqMaster",
        "/admin/faq-masters",
        &json!({"fm_subject": harness.marker("faqs", "master")}),
        "fm_id",
    )
    .await
    {
        Ok(value) => value,
        Err(error) => {
            let mut evidence = DomainEvidence::new("faqs", "reversible_entity", &[]);
            evidence.failure("setup", error);
            return evidence;
        }
    };
    let marker = harness.marker("faqs", "updated");
    let mut evidence = run_entity(
        harness,
        EntitySpec {
            domain: "faqs",
            list_operation: "adminListFaqs",
            list_path: "/admin/faqs",
            create_operation: "adminCreateFaq",
            create_path: "/admin/faqs",
            resource_base: "/admin/faqs",
            update_operation: "adminUpdateFaq",
            update_method: Method::PUT,
            delete_operation: "adminDeleteFaq",
            read_operation: "adminGetFaq",
            id_field: "fa_id",
            fixed_id: None,
            marker_field: "fa_subject",
            marker: marker.clone(),
            create_body: json!({"fm_id": master_id.parse::<i64>().unwrap_or_default(), "fa_subject": harness.marker("faqs", "created"), "fa_content": "audit fixture"}),
            update_body: json!({"fa_subject": marker}),
        },
    )
    .await;
    evidence.planned_operation_ids.extend([
        "adminListFaqMasters",
        "adminCreateFaqMaster",
        "adminDeleteFaqMaster",
    ]);
    let master_path = format!("/admin/faq-masters/{master_id}");
    if let Err(error) = harness
        .empty("adminDeleteFaqMaster", Method::DELETE, &master_path)
        .await
    {
        evidence.cleanup_verified = false;
        evidence.failure("dependency-cleanup", error);
    }
    evidence.finalize();
    evidence
}

fn simple_auto_specs(harness: &Harness) -> Vec<EntitySpec> {
    let mail_marker = harness.marker("mails", "updated");
    let menu_marker = harness.marker("menus", "updated");
    let poll_marker = harness.marker("polls", "updated");
    let popup_marker = harness.marker("popups", "updated");
    vec![
        EntitySpec {
            domain: "mails",
            list_operation: "adminListMails",
            list_path: "/admin/mails",
            create_operation: "adminCreateMailTemplate",
            create_path: "/admin/mails/templates",
            resource_base: "/admin/mails",
            update_operation: "adminUpdateMailTemplate",
            update_method: Method::PUT,
            delete_operation: "adminDeleteMail",
            read_operation: "adminGetMail",
            id_field: "ma_id",
            fixed_id: None,
            marker_field: "ma_subject",
            marker: mail_marker.clone(),
            create_body: json!({"ma_subject": harness.marker("mails", "created"), "ma_content": "audit fixture"}),
            update_body: json!({"ma_subject": mail_marker, "ma_content": "audit fixture updated"}),
        },
        EntitySpec {
            domain: "menus",
            list_operation: "adminListMenus",
            list_path: "/admin/menus",
            create_operation: "adminCreateMenu",
            create_path: "/admin/menus",
            resource_base: "/admin/menus",
            update_operation: "adminUpdateMenu",
            update_method: Method::PUT,
            delete_operation: "adminDeleteMenu",
            read_operation: "adminGetMenu",
            id_field: "me_id",
            fixed_id: None,
            marker_field: "me_name",
            marker: menu_marker.clone(),
            create_body: json!({"me_code": format!("99{}", harness.short_nonce()), "me_name": harness.marker("menus", "created"), "me_link": "/"}),
            update_body: json!({"me_name": menu_marker}),
        },
        EntitySpec {
            domain: "polls",
            list_operation: "adminListPolls",
            list_path: "/admin/polls",
            create_operation: "adminCreatePoll",
            create_path: "/admin/polls",
            resource_base: "/admin/polls",
            update_operation: "adminUpdatePoll",
            update_method: Method::PATCH,
            delete_operation: "adminDeletePoll",
            read_operation: "adminGetPoll",
            id_field: "po_id",
            fixed_id: None,
            marker_field: "po_subject",
            marker: poll_marker.clone(),
            create_body: json!({"po_subject": harness.marker("polls", "created"), "options": ["yes", "no"]}),
            update_body: json!({"po_subject": poll_marker}),
        },
        EntitySpec {
            domain: "popups",
            list_operation: "adminListPopups",
            list_path: "/admin/popups",
            create_operation: "adminCreatePopup",
            create_path: "/admin/popups",
            resource_base: "/admin/popups",
            update_operation: "adminUpdatePopup",
            update_method: Method::PATCH,
            delete_operation: "adminDeletePopup",
            read_operation: "adminGetPopup",
            id_field: "nw_id",
            fixed_id: None,
            marker_field: "nw_subject",
            marker: popup_marker.clone(),
            create_body: json!({"nw_subject": harness.marker("popups", "created"), "nw_content": "audit fixture"}),
            update_body: json!({"nw_subject": popup_marker}),
        },
    ]
}

pub async fn run(harness: &Harness) -> Vec<DomainEvidence> {
    let mut reports = vec![
        capture_domain(harness, run_groups(harness)).await,
        capture_domain(harness, run_boards(harness)).await,
        capture_domain(harness, run_contents(harness)).await,
        capture_domain(harness, run_faq_master(harness)).await,
        capture_domain(harness, run_faqs(harness)).await,
    ];
    for spec in simple_auto_specs(harness) {
        reports.push(capture_domain(harness, run_entity(harness, spec)).await);
    }
    reports
}
