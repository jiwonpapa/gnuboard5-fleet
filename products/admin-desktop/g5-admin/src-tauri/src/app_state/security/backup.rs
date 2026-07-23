use super::*;

impl AppState {
    pub async fn export_backup(
        &self,
        path: &str,
        current_password: &str,
        current_totp_code: Option<&str>,
        backup_password: &str,
    ) -> Result<(u64, usize), AppError> {
        self.security_settings_service()
            .export_backup(path, current_password, current_totp_code, backup_password)
            .await
    }

    pub async fn import_backup(
        &self,
        path: &str,
        current_password: &str,
        current_totp_code: Option<&str>,
        backup_password: &str,
    ) -> Result<BackupImportReport, AppError> {
        self.security_settings_service()
            .import_backup(path, current_password, current_totp_code, backup_password)
            .await
    }
}
