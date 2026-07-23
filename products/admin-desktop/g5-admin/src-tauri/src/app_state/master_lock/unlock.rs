#[cfg(test)]
use super::super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn unlock_master_lock(
        &self,
        request_id: &str,
        input: MasterLockUnlockInput,
    ) -> Result<MasterLockStatus, AppError> {
        self.master_lock_service()
            .unlock_master_lock(request_id, input)
            .await
    }

    pub async fn unlock_master_lock_fast(
        &self,
        request_id: &str,
        secret: &str,
    ) -> Result<MasterLockStatus, AppError> {
        self.master_lock_service()
            .unlock_master_lock_fast(request_id, secret)
            .await
    }
}
