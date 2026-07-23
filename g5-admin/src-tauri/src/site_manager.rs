pub use g5_admin_site_manager::*;

use g5_admin_models::models::site::Site;

#[cfg(test)]
pub(crate) fn site_manager_from_model_sites(
    sites: Vec<Site>,
    active_site_id: Option<String>,
) -> Result<SiteManager, SiteManagerError> {
    SiteManager::new(
        sites
            .into_iter()
            .map(site_manager_site_from_model)
            .collect(),
        active_site_id,
    )
}

pub(crate) fn site_manager_site_from_model(site: Site) -> SiteManagerSite {
    SiteManagerSite {
        id: site.id,
        name: site.name,
        api_base_url: site.api_base_url,
        is_default: site.is_default,
        created_at: site.created_at,
        updated_at: site.updated_at,
    }
}

pub(crate) fn model_site_from_manager(site: SiteManagerSite) -> Site {
    Site {
        id: site.id,
        name: site.name,
        api_base_url: site.api_base_url,
        is_default: site.is_default,
        created_at: site.created_at,
        updated_at: site.updated_at,
    }
}
