#[cfg(test)]
use super::*;

#[cfg(test)]
#[allow(dead_code)]
impl AppState {
    pub async fn ssh_profile_list(
        &self,
        request_id: &str,
        site_id: &str,
    ) -> Result<SshProfileListResponse, AppError> {
        self.ssh_profile_service().list(request_id, site_id).await
    }

    pub async fn add_ssh_profile(&self, input: SshProfileAddInput) -> Result<(), AppError> {
        self.ssh_profile_service().add(input).await
    }

    pub async fn update_ssh_profile(&self, input: SshProfileUpdateInput) -> Result<(), AppError> {
        self.ssh_profile_service().update(input).await
    }

    pub async fn delete_ssh_profile(&self, input: SshProfileDeleteInput) -> Result<(), AppError> {
        self.ssh_profile_service().delete(input).await
    }
}
