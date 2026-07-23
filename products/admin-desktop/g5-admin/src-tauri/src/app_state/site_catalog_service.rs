use super::active_request_context::ActiveApiContext;
use super::*;
use crate::core::store_records::{model_activity_from_record, model_site_from_record};
use crate::site_manager::{model_site_from_manager, site_manager_site_from_model};

#[async_trait::async_trait]
pub(super) trait SiteCatalogAccessGate: Send + Sync {
    async fn require_unlocked(&self) -> Result<(), AppError>;
    fn authorize_sensitive_action(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
    ) -> Result<(), AppError>;
}

pub(super) struct SiteCatalogRuntime<'a> {
    manager: &'a RwLock<SiteManager>,
    initialized: &'a RwLock<bool>,
}

impl<'a> SiteCatalogRuntime<'a> {
    pub(super) fn new(manager: &'a RwLock<SiteManager>, initialized: &'a RwLock<bool>) -> Self {
        Self {
            manager,
            initialized,
        }
    }

    async fn active_site_snapshot(&self) -> (Option<String>, Vec<Site>) {
        let manager = self.manager.read().await;
        (
            manager.active_site_id(),
            manager
                .list()
                .into_iter()
                .map(model_site_from_manager)
                .collect(),
        )
    }

    async fn active_site(&self) -> Option<Site> {
        self.manager
            .read()
            .await
            .active_site()
            .map(model_site_from_manager)
    }

    async fn has_sites(&self) -> bool {
        self.manager.read().await.has_sites()
    }

    async fn switch_site(&self, site_id: &str) -> Result<Site, AppError> {
        let mut manager = self.manager.write().await;
        Ok(model_site_from_manager(manager.switch_site(site_id)?))
    }

    async fn find_site(&self, site_id: &str) -> Option<Site> {
        let manager = self.manager.read().await;
        manager
            .list()
            .into_iter()
            .map(model_site_from_manager)
            .find(|site| site.id == site_id)
    }

    async fn requested_active_site_id(&self) -> Option<String> {
        self.manager.read().await.active_site_id()
    }

    async fn replace_sites(
        &self,
        sites: Vec<Site>,
        requested_active_site_id: Option<String>,
    ) -> Result<Option<Site>, AppError> {
        let active_site = {
            let mut manager = self.manager.write().await;
            manager.replace_all(
                sites
                    .into_iter()
                    .map(site_manager_site_from_model)
                    .collect(),
                requested_active_site_id,
            )?;
            manager.active_site().map(model_site_from_manager)
        };
        Ok(active_site)
    }

    async fn is_initialized(&self) -> bool {
        *self.initialized.read().await
    }

    async fn mark_initialized(&self) {
        let mut initialized = self.initialized.write().await;
        *initialized = true;
    }
}

pub(crate) struct SiteCatalogService<'a> {
    access_gate: &'a (dyn SiteCatalogAccessGate + Send + Sync),
    admin_api: &'a (dyn AdminApiPort + Send + Sync),
    session_store: &'a (dyn SessionStorePort + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    active_request_context: &'a Arc<RwLock<ActiveApiContext>>,
    runtime: SiteCatalogRuntime<'a>,
}

impl<'a> SiteCatalogService<'a> {
    pub(super) fn new(
        access_gate: &'a (dyn SiteCatalogAccessGate + Send + Sync),
        admin_api: &'a (dyn AdminApiPort + Send + Sync),
        session_store: &'a (dyn SessionStorePort + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        active_request_context: &'a Arc<RwLock<ActiveApiContext>>,
        runtime: SiteCatalogRuntime<'a>,
    ) -> Self {
        Self {
            access_gate,
            admin_api,
            session_store,
            site_catalog_store,
            active_request_context,
            runtime,
        }
    }

    pub(crate) async fn catalog(&self, request_id: &str) -> Result<SiteCatalog, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_sites_loaded().await?;
        let trace = ResponseTrace::local(request_id.to_string());
        let (active_site_id, sites) = self.runtime.active_site_snapshot().await;

        let mut entries = Vec::with_capacity(sites.len());
        for site in sites {
            let has_session_hint = self.site_catalog_store.site_has_session_hint(&site.id)?;
            let status = if has_session_hint {
                SiteSessionStatus::Authenticated
            } else {
                SiteSessionStatus::SignedOut
            };
            entries.push(SiteCatalogEntry { site, status });
        }

        Ok(SiteCatalog {
            needs_onboarding: entries.is_empty(),
            active_site_id,
            sites: entries,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(crate) async fn active_site(&self) -> Result<Option<Site>, AppError> {
        self.ensure_sites_loaded().await?;
        Ok(self.runtime.active_site().await)
    }

    pub(crate) async fn switch_site(&self, site_id: &str) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_sites_loaded().await?;
        let next_active_site = self.runtime.switch_site(site_id).await?;
        self.sync_active_site_runtime(Some(&next_active_site))
            .await?;
        self.site_catalog_store.add_activity(
            Some(site_id),
            "site.switch",
            Some(&format!(
                "switched active site to {}",
                next_active_site.name
            )),
        )?;
        Ok(())
    }

    pub(crate) async fn add_site(&self, input: SiteAddInput) -> Result<Site, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_sites_loaded().await?;
        let should_be_default = !self.runtime.has_sites().await;
        let site = model_site_from_record(self.site_catalog_store.insert_site(
            SiteCatalogInsertInput {
                name: input.name,
                api_base_url: input.api_base_url,
                is_default: should_be_default,
            },
        )?);
        self.reload_sites(Some(site.id.clone())).await?;
        self.site_catalog_store.add_activity(
            Some(&site.id),
            "site.add",
            Some(&format!("registered site {}", site.name)),
        )?;
        Ok(site)
    }

    pub(crate) async fn update_site(&self, input: SiteUpdateInput) -> Result<Site, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_sites_loaded().await?;
        let site = model_site_from_record(self.site_catalog_store.update_site(
            SiteCatalogUpdateInput {
                site_id: input.site_id,
                name: input.name,
                api_base_url: input.api_base_url,
                is_default: input.is_default,
            },
        )?);
        self.reload_sites(Some(site.id.clone())).await?;
        self.site_catalog_store.add_activity(
            Some(&site.id),
            "site.update",
            Some(&format!("updated site {}", site.name)),
        )?;
        Ok(site)
    }

    pub(crate) async fn delete_site(&self, input: &SiteDeleteInput) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.access_gate.authorize_sensitive_action(
            &input.auth.current_password,
            input.auth.current_totp_code.as_deref(),
        )?;
        self.ensure_sites_loaded().await?;
        let deleted_site = self.runtime.find_site(&input.site_id).await;
        self.session_store
            .clear_session_for_site(&input.site_id)
            .await?;
        self.site_catalog_store.delete_site(&input.site_id)?;
        self.reload_sites(None).await?;
        let detail = deleted_site
            .map(|site| format!("removed site registration {}", site.name))
            .unwrap_or_else(|| format!("removed site registration {}", input.site_id));
        self.site_catalog_store
            .add_activity(None, "site.delete", Some(&detail))?;
        Ok(())
    }

    pub(crate) async fn activity_list(
        &self,
        request_id: &str,
        site_id: Option<String>,
        limit: usize,
    ) -> Result<SiteActivityListResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        let trace = ResponseTrace::local(request_id.to_string());
        let activities = self
            .site_catalog_store
            .list_activity(site_id.as_deref(), limit)?
            .into_iter()
            .map(model_activity_from_record)
            .collect();
        Ok(SiteActivityListResponse {
            activities,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(super) async fn reload_sites(
        &self,
        requested_active_site_id: Option<String>,
    ) -> Result<(), AppError> {
        let sites = self
            .site_catalog_store
            .load_sites()?
            .into_iter()
            .map(model_site_from_record)
            .collect();
        let active_site = self
            .runtime
            .replace_sites(sites, requested_active_site_id)
            .await?;
        self.runtime.mark_initialized().await;
        self.sync_active_site_runtime(active_site.as_ref()).await
    }

    pub(super) async fn ensure_sites_loaded(&self) -> Result<(), AppError> {
        if self.runtime.is_initialized().await {
            return Ok(());
        }

        let requested_active_site_id = self.runtime.requested_active_site_id().await;
        let sites = self
            .site_catalog_store
            .load_sites()?
            .into_iter()
            .map(model_site_from_record)
            .collect();
        self.runtime
            .replace_sites(sites, requested_active_site_id)
            .await?;
        self.runtime.mark_initialized().await;
        Ok(())
    }

    pub(super) async fn sync_active_site_runtime(
        &self,
        active_site: Option<&Site>,
    ) -> Result<(), AppError> {
        let mut context = self.active_request_context.write().await;
        self.admin_api
            .set_base_url(active_site.map(|site| site.api_base_url.clone()))
            .await?;
        self.session_store
            .set_active_site_id(active_site.map(|site| site.id.clone()))
            .await;
        *context = ActiveApiContext::from_site(active_site);
        Ok(())
    }
}
