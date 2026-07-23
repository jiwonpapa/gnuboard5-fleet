use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SiteManagerError {
    #[error("{message}")]
    Config { message: String },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SiteManagerSite {
    pub id: String,
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default)]
pub struct SiteManager {
    sites: HashMap<String, SiteManagerSite>,
    ordered_site_ids: Vec<String>,
    active_site_id: Option<String>,
}

impl SiteManager {
    pub fn new(
        sites: Vec<SiteManagerSite>,
        active_site_id: Option<String>,
    ) -> Result<Self, SiteManagerError> {
        let mut next = Self::default();
        next.replace_all(sites, active_site_id)?;
        Ok(next)
    }

    pub fn replace_all(
        &mut self,
        sites: Vec<SiteManagerSite>,
        requested_active_site_id: Option<String>,
    ) -> Result<(), SiteManagerError> {
        self.sites.clear();
        self.ordered_site_ids.clear();

        let mut normalized_sites = sites;
        normalized_sites.sort_by(|left, right| {
            right
                .is_default
                .cmp(&left.is_default)
                .then_with(|| left.created_at.cmp(&right.created_at))
                .then_with(|| left.name.cmp(&right.name))
        });

        for site in normalized_sites {
            self.ordered_site_ids.push(site.id.clone());
            self.sites.insert(site.id.clone(), site);
        }

        self.active_site_id = requested_active_site_id
            .filter(|site_id| self.sites.contains_key(site_id))
            .or_else(|| {
                self.sites
                    .values()
                    .find(|site| site.is_default)
                    .map(|site| site.id.clone())
            })
            .or_else(|| self.ordered_site_ids.first().cloned());

        Ok(())
    }

    pub fn list(&self) -> Vec<SiteManagerSite> {
        self.ordered_site_ids
            .iter()
            .filter_map(|site_id| self.sites.get(site_id).cloned())
            .collect()
    }

    pub fn active_site_id(&self) -> Option<String> {
        self.active_site_id.clone()
    }

    pub fn active_site(&self) -> Option<SiteManagerSite> {
        self.active_site_id
            .as_ref()
            .and_then(|site_id| self.sites.get(site_id))
            .cloned()
    }

    pub fn switch_site(&mut self, site_id: &str) -> Result<SiteManagerSite, SiteManagerError> {
        let Some(site) = self.sites.get(site_id).cloned() else {
            return Err(SiteManagerError::Config {
                message: format!("unknown site id: {site_id}"),
            });
        };

        self.active_site_id = Some(site_id.to_string());
        Ok(site)
    }

    pub fn has_sites(&self) -> bool {
        !self.sites.is_empty()
    }
}

#[cfg(test)]
mod tests;
