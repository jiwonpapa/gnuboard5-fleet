#[cfg(test)]
use super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn fast_unlock_enabled(&self) -> Result<bool, AppError> {
        self.security_settings_service().fast_unlock_enabled().await
    }

    pub async fn enable_fast_unlock(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
        secret: &str,
    ) -> Result<(), AppError> {
        self.security_settings_service()
            .enable_fast_unlock(current_password, current_totp_code, secret)
            .await
    }

    pub async fn disable_fast_unlock(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
    ) -> Result<(), AppError> {
        self.security_settings_service()
            .disable_fast_unlock(current_password, current_totp_code)
            .await
    }
}
