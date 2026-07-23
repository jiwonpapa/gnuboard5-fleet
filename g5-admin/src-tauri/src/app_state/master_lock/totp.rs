use super::super::*;

impl AppState {
    #[cfg(test)]
    #[allow(dead_code)]
    pub async fn verify_master_lock_totp(
        &self,
        request_id: &str,
        input: MasterLockTotpInput,
    ) -> Result<MasterLockStatus, AppError> {
        self.master_lock_service()
            .verify_master_lock_totp(request_id, input)
            .await
    }

    fn load_totp_secret_for_verification(&self) -> Result<String, AppError> {
        let secret = self
            .security_store()
            .load_totp_secret()?
            .ok_or_else(|| AppError::Auth {
                message: "등록된 OTP 비밀이 없습니다.".to_string(),
            })?;
        Ok(secret)
    }

    pub(in crate::app_state) fn verify_totp_code(&self, code: &str) -> Result<bool, AppError> {
        let secret = self.load_totp_secret_for_verification()?;
        g5_admin_security_core::verify_totp_code(&secret, TOTP_ISSUER, TOTP_ACCOUNT_NAME, code)
            .map_err(AppError::from)
    }
}
