#[cfg(test)]
use super::super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn master_lock_status(&self, request_id: &str) -> Result<MasterLockStatus, AppError> {
        self.master_lock_service()
            .master_lock_status(request_id)
            .await
    }

    pub async fn setup_master_lock(
        &self,
        request_id: &str,
        input: MasterLockSetupInput,
    ) -> Result<MasterLockStatus, AppError> {
        self.master_lock_service()
            .setup_master_lock(request_id, input)
            .await
    }

    pub async fn lock_master(&self, request_id: &str) -> Result<MasterLockStatus, AppError> {
        self.master_lock_service().lock_master(request_id).await
    }
}
