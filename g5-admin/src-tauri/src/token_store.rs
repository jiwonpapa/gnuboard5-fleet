pub use g5_admin_session_store::*;

use crate::core::store_records::{model_session_from_record, session_record_from_model};
use crate::db::SiteRepository;
use g5_admin_models::models::auth::StoredSession as ModelStoredSession;
use g5_admin_session_store::error::AppError as TokenStoreError;
use g5_admin_session_store::StoredSession as TokenStoredSession;

#[derive(Clone)]
pub(crate) struct SiteSessionRepository {
    inner: SiteRepository,
}

impl SiteSessionRepository {
    pub(crate) fn new(inner: SiteRepository) -> Self {
        Self { inner }
    }
}

impl FileSessionRepository for SiteSessionRepository {
    fn load_site_session(
        &self,
        site_id: &str,
    ) -> Result<Option<TokenStoredSession>, TokenStoreError> {
        self.inner
            .load_site_session(site_id)
            .map(|session| {
                session.map(|session| token_session_from_model(model_session_from_record(&session)))
            })
            .map_err(token_store_error_from_local_store)
    }

    fn save_site_session(
        &self,
        site_id: &str,
        session: &TokenStoredSession,
    ) -> Result<(), TokenStoreError> {
        let session = session_record_from_model(model_session_from_token(session));
        self.inner
            .save_site_session(site_id, &session)
            .map_err(token_store_error_from_local_store)
    }

    fn clear_site_session(&self, site_id: &str) -> Result<(), TokenStoreError> {
        self.inner
            .clear_site_session(site_id)
            .map_err(token_store_error_from_local_store)
    }

    fn describe_site_session_target(&self, site_id: &str) -> String {
        format!(
            "{}#site-session:{site_id}",
            self.inner.config().path.display()
        )
    }
}

pub(crate) fn token_session_from_model(session: ModelStoredSession) -> TokenStoredSession {
    TokenStoredSession {
        mb_id: session.mb_id,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
    }
}

pub(crate) fn model_session_from_token(session: &TokenStoredSession) -> ModelStoredSession {
    ModelStoredSession {
        mb_id: session.mb_id.clone(),
        access_token: session.access_token.clone(),
        refresh_token: session.refresh_token.clone(),
        expires_in: session.expires_in,
    }
}

fn token_store_error_from_local_store(error: crate::db::error::AppError) -> TokenStoreError {
    match error {
        crate::db::error::AppError::Config { message } => TokenStoreError::Config { message },
        crate::db::error::AppError::Auth { message } => TokenStoreError::Auth { message },
        crate::db::error::AppError::Storage { target, error } => {
            TokenStoreError::Storage { target, error }
        }
    }
}
