use super::*;
use tokio::sync::OwnedRwLockReadGuard;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(super) struct ActiveApiContext {
    site_id: Option<String>,
    base_url: Option<String>,
}

impl ActiveApiContext {
    pub(super) fn from_site(site: Option<&Site>) -> Self {
        Self {
            site_id: site.map(|value| value.id.clone()),
            base_url: site.map(|value| value.api_base_url.clone()),
        }
    }
}

pub(crate) struct ActiveRequestContextGuard {
    context: OwnedRwLockReadGuard<ActiveApiContext>,
}

impl ActiveRequestContextGuard {
    pub(crate) fn site_id(&self) -> Option<&str> {
        self.context.site_id.as_deref()
    }

    pub(crate) fn base_url(&self) -> Option<&str> {
        self.context.base_url.as_deref()
    }
}

impl AppState {
    pub(crate) async fn acquire_active_request_context(
        &self,
    ) -> Result<ActiveRequestContextGuard, AppError> {
        let context = self.active_request_context.clone().read_owned().await;
        let actual_site_id = self.session_store.active_site_id().await;
        let actual_base_url = self.admin_api.current_base_url().await;
        if context.site_id != actual_site_id || context.base_url != actual_base_url {
            return Err(AppError::Config {
                message: "active site request context is inconsistent".to_string(),
            });
        }
        Ok(ActiveRequestContextGuard { context })
    }
}
