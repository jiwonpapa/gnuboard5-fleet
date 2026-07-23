#[cfg(test)]
use super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn start_totp_enrollment(
        &self,
        request_id: &str,
        input: TotpSetupStartInput,
    ) -> Result<TotpEnrollmentChallenge, AppError> {
        self.security_settings_service()
            .start_totp_enrollment(request_id, input)
            .await
    }

    pub async fn verify_enable_totp(
        &self,
        request_id: &str,
        input: TotpVerifyEnableInput,
    ) -> Result<SecuritySettings, AppError> {
        self.security_settings_service()
            .verify_enable_totp(request_id, input)
            .await
    }

    pub async fn disable_totp(
        &self,
        request_id: &str,
        input: TotpDisableInput,
    ) -> Result<SecuritySettings, AppError> {
        self.security_settings_service()
            .disable_totp(request_id, input)
            .await
    }
}
