use super::*;
use crate::core::store_records::{model_session_from_record, session_record_from_model};
use g5_admin_models::models::auth::StoredSession;

pub(crate) struct SessionService<'a> {
    session_store: &'a (dyn SessionStorePort + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
}

impl<'a> SessionService<'a> {
    pub(crate) fn new(
        session_store: &'a (dyn SessionStorePort + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    ) -> Self {
        Self {
            session_store,
            site_catalog_store,
        }
    }

    pub(crate) async fn load_active_site_session(&self) -> Result<Option<StoredSession>, AppError> {
        Ok(self
            .session_store
            .load_active_site_session()
            .await?
            .map(|session| model_session_from_record(&session)))
    }

    pub(crate) async fn save_active_site_session(
        &self,
        session: &StoredSession,
    ) -> Result<(), AppError> {
        let session = session_record_from_model(session.clone());
        self.session_store
            .save_active_site_session(&session)
            .await?;
        self.set_active_site_session_hint(true).await
    }

    pub(crate) async fn clear_active_site_session(&self) -> Result<(), AppError> {
        self.session_store.clear_active_site_session().await?;
        self.set_active_site_session_hint(false).await
    }

    pub(crate) async fn set_active_site_session_hint(
        &self,
        has_session: bool,
    ) -> Result<(), AppError> {
        let Some(site_id) = self.session_store.active_site_id().await else {
            return Ok(());
        };

        self.site_catalog_store
            .set_site_session_hint(&site_id, has_session)
    }
}
