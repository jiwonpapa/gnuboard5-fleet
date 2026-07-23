use super::*;

fn site(id: &str, name: &str, is_default: bool, created_at: &str) -> SiteManagerSite {
    SiteManagerSite {
        id: id.to_string(),
        name: name.to_string(),
        api_base_url: format!("https://{id}.example.com/api"),
        is_default,
        created_at: created_at.to_string(),
        updated_at: created_at.to_string(),
    }
}

#[test]
fn default_site_becomes_active_when_requested_site_is_missing() {
    let manager = SiteManager::new(
        vec![
            site("older", "Older", false, "2026-01-01T00:00:00Z"),
            site("default", "Default", true, "2026-01-02T00:00:00Z"),
        ],
        Some("missing".to_string()),
    )
    .expect("site manager");

    assert_eq!(manager.active_site_id(), Some("default".to_string()));
    assert!(manager.has_sites());
}

#[test]
fn switch_site_rejects_unknown_site() {
    let mut manager = SiteManager::new(vec![site("known", "Known", false, "2026-01-01")], None)
        .expect("site manager");

    let error = manager
        .switch_site("missing")
        .expect_err("unknown site should fail");

    assert!(error.to_string().contains("unknown site id: missing"));
    assert_eq!(manager.active_site_id(), Some("known".to_string()));
}
