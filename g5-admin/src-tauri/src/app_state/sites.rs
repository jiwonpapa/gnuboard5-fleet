#[cfg(test)]
use super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn site_catalog(&self, request_id: &str) -> Result<SiteCatalog, AppError> {
        self.ensure_master_unlocked().await?;
        self.site_catalog_service().catalog(request_id).await
    }

    pub async fn active_site(&self) -> Result<Option<Site>, AppError> {
        self.site_catalog_service().active_site().await
    }

    pub async fn switch_site(&self, site_id: &str) -> Result<(), AppError> {
        self.ensure_master_unlocked().await?;
        self.site_catalog_service().switch_site(site_id).await
    }

    pub async fn add_site(&self, input: SiteAddInput) -> Result<Site, AppError> {
        self.ensure_master_unlocked().await?;
        self.site_catalog_service().add_site(input).await
    }

    pub async fn update_site(&self, input: SiteUpdateInput) -> Result<Site, AppError> {
        self.ensure_master_unlocked().await?;
        self.site_catalog_service().update_site(input).await
    }

    pub async fn delete_site(&self, input: SiteDeleteInput) -> Result<(), AppError> {
        self.site_catalog_service().delete_site(&input).await
    }

    pub async fn activity_list(
        &self,
        request_id: &str,
        site_id: Option<String>,
        limit: usize,
    ) -> Result<SiteActivityListResponse, AppError> {
        self.site_catalog_service()
            .activity_list(request_id, site_id, limit)
            .await
    }
}
