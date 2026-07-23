#[cfg(test)]
use super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn security_settings(&self, request_id: &str) -> Result<SecuritySettings, AppError> {
        self.security_settings_service()
            .security_settings(request_id)
            .await
    }

    pub async fn change_master_password(
        &self,
        request_id: &str,
        input: MasterPasswordChangeInput,
    ) -> Result<SecuritySettings, AppError> {
        self.security_settings_service()
            .change_master_password(request_id, input)
            .await
    }

    pub async fn update_idle_timeout(
        &self,
        request_id: &str,
        input: SecurityIdleTimeoutUpdateInput,
    ) -> Result<SecuritySettings, AppError> {
        self.security_settings_service()
            .update_idle_timeout(request_id, input)
            .await
    }
}
