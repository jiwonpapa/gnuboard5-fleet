use super::super::ssh_host_verification_service::{
    SshHostVerificationAccessGate, SshHostVerificationService,
};
use crate::core::ports::{
    SiteActivityLogRecord, SiteCatalogInsertInput, SiteCatalogStorePort, SiteRecord,
    SshHostVerificationPort, SshHostVerificationResult, SshKnownHostTrustStateResult,
    SshProfileAuthType, SshProfileConnectionTarget, SshProfileInsertInput, SshProfileRecord,
    SshProfileStorePort, SshProfileUpdateRecord,
};
use crate::core::store_records::{site_record_from_model, ssh_profile_record_from_model};
use crate::error::AppError;
use g5_admin_models::models::site::Site;
use g5_admin_models::models::ssh::{
    SshAuthType, SshHostTrustInput, SshHostVerificationInput, SshKnownHostTrustState, SshProfile,
};
use std::sync::Mutex;

struct AllowAllGate;

#[async_trait::async_trait]
impl SshHostVerificationAccessGate for AllowAllGate {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        Ok(())
    }
}

struct FakeSiteStore {
    activities: Mutex<Vec<String>>,
    sites: Vec<Site>,
}

impl SiteCatalogStorePort for FakeSiteStore {
    fn load_sites(&self) -> Result<Vec<SiteRecord>, AppError> {
        Ok(self
            .sites
            .clone()
            .into_iter()
            .map(site_record_from_model)
            .collect())
    }

    fn insert_site(&self, _input: SiteCatalogInsertInput) -> Result<SiteRecord, AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn update_site(
        &self,
        _input: crate::core::ports::SiteCatalogUpdateInput,
    ) -> Result<SiteRecord, AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn delete_site(&self, _site_id: &str) -> Result<(), AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn site_has_session_hint(&self, _site_id: &str) -> Result<bool, AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn set_site_session_hint(&self, _site_id: &str, _has_session: bool) -> Result<(), AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn add_activity(
        &self,
        _site_id: Option<&str>,
        action: &str,
        _detail: Option<&str>,
    ) -> Result<(), AppError> {
        self.activities
            .lock()
            .expect("activity lock")
            .push(action.to_string());
        Ok(())
    }

    fn list_activity(
        &self,
        _site_id: Option<&str>,
        _limit: usize,
    ) -> Result<Vec<SiteActivityLogRecord>, AppError> {
        unreachable!("unused in ssh host verification test")
    }
}

struct FakeProfileStore {
    target: SshProfileConnectionTarget,
}

impl SshProfileStorePort for FakeProfileStore {
    fn load_ssh_profiles(&self, _site_id: &str) -> Result<Vec<SshProfileRecord>, AppError> {
        Ok(vec![ssh_profile_record_from_model(build_profile())])
    }

    fn load_ssh_profile_connection_target(
        &self,
        _site_id: &str,
        _ssh_profile_id: &str,
    ) -> Result<SshProfileConnectionTarget, AppError> {
        Ok(self.target.clone())
    }

    fn insert_ssh_profile(
        &self,
        _input: SshProfileInsertInput,
    ) -> Result<SshProfileRecord, AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn update_ssh_profile(
        &self,
        _input: SshProfileUpdateRecord,
    ) -> Result<SshProfileRecord, AppError> {
        unreachable!("unused in ssh host verification test")
    }

    fn delete_ssh_profile(&self, _site_id: &str, _ssh_profile_id: &str) -> Result<(), AppError> {
        unreachable!("unused in ssh host verification test")
    }
}

struct FakeHostVerifier {
    inspect_calls: Mutex<Vec<(String, u16)>>,
    inspect_result: SshHostVerificationResult,
    trust_calls: Mutex<Vec<(String, u16, String)>>,
    trust_result: SshHostVerificationResult,
}

#[async_trait::async_trait]
impl SshHostVerificationPort for FakeHostVerifier {
    async fn inspect_host_verification(
        &self,
        host: &str,
        port: u16,
    ) -> Result<SshHostVerificationResult, AppError> {
        self.inspect_calls
            .lock()
            .expect("inspect calls lock")
            .push((host.to_string(), port));
        Ok(self.inspect_result.clone())
    }

    async fn trust_host_verification(
        &self,
        host: &str,
        port: u16,
        expected_fingerprint: &str,
    ) -> Result<SshHostVerificationResult, AppError> {
        self.trust_calls.lock().expect("trust calls lock").push((
            host.to_string(),
            port,
            expected_fingerprint.to_string(),
        ));
        Ok(self.trust_result.clone())
    }
}

fn build_site() -> Site {
    Site {
        id: "site-alpha".to_string(),
        name: "알파몰".to_string(),
        api_base_url: "https://alpha.example.com/api/v1".to_string(),
        is_default: true,
        created_at: "2026-03-10T00:00:00Z".to_string(),
        updated_at: "2026-03-10T00:00:00Z".to_string(),
    }
}

fn build_profile() -> SshProfile {
    SshProfile {
        id: "ssh-profile-1".to_string(),
        site_id: "site-alpha".to_string(),
        name: "운영 SSH".to_string(),
        host: "gnurestapi.cc".to_string(),
        port: 22,
        username: "neojins".to_string(),
        auth_type: SshAuthType::Password,
        key_path: None,
        has_password: true,
        has_key_passphrase: false,
        created_at: "2026-03-10T00:00:00Z".to_string(),
        updated_at: "2026-03-10T00:00:00Z".to_string(),
    }
}

fn build_connection_profile() -> crate::core::ports::SshConnectionProfile {
    crate::core::ports::SshConnectionProfile {
        id: "ssh-profile-1".to_string(),
        site_id: "site-alpha".to_string(),
        name: "운영 SSH".to_string(),
        host: "gnurestapi.cc".to_string(),
        port: 22,
        username: "neojins".to_string(),
        auth_type: SshProfileAuthType::Password,
        key_path: None,
    }
}

#[tokio::test]
async fn inspect_returns_current_host_fingerprint_for_profile() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let profile_store = FakeProfileStore {
        target: SshProfileConnectionTarget {
            profile: build_connection_profile(),
            password: Some("secret".to_string()),
            key_passphrase: None,
        },
    };
    let verifier = FakeHostVerifier {
        inspect_calls: Mutex::new(Vec::new()),
        inspect_result: SshHostVerificationResult {
            server_key_algorithm: "Ed25519".to_string(),
            server_key_fingerprint: "SHA256:missing".to_string(),
            trust_state: SshKnownHostTrustStateResult::Missing,
        },
        trust_calls: Mutex::new(Vec::new()),
        trust_result: SshHostVerificationResult {
            server_key_algorithm: "Ed25519".to_string(),
            server_key_fingerprint: "SHA256:missing".to_string(),
            trust_state: SshKnownHostTrustStateResult::Trusted,
        },
    };
    let service = SshHostVerificationService::new(&gate, &site_store, &profile_store, &verifier);

    let response = service
        .inspect(
            "req-inspect",
            SshHostVerificationInput {
                site_id: "site-alpha".to_string(),
                ssh_profile_id: "ssh-profile-1".to_string(),
            },
        )
        .await
        .expect("host verification inspect should succeed");

    assert_eq!(response.trust_state, SshKnownHostTrustState::Missing);
    assert_eq!(response.server_key_fingerprint, "SHA256:missing");
    assert_eq!(
        verifier
            .inspect_calls
            .lock()
            .expect("inspect calls lock")
            .as_slice(),
        [("gnurestapi.cc".to_string(), 22)].as_slice()
    );
}

#[tokio::test]
async fn trust_records_activity_and_returns_trusted_state() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let profile_store = FakeProfileStore {
        target: SshProfileConnectionTarget {
            profile: build_connection_profile(),
            password: Some("secret".to_string()),
            key_passphrase: None,
        },
    };
    let verifier = FakeHostVerifier {
        inspect_calls: Mutex::new(Vec::new()),
        inspect_result: SshHostVerificationResult {
            server_key_algorithm: "Ed25519".to_string(),
            server_key_fingerprint: "SHA256:missing".to_string(),
            trust_state: SshKnownHostTrustStateResult::Missing,
        },
        trust_calls: Mutex::new(Vec::new()),
        trust_result: SshHostVerificationResult {
            server_key_algorithm: "Ed25519".to_string(),
            server_key_fingerprint: "SHA256:missing".to_string(),
            trust_state: SshKnownHostTrustStateResult::Trusted,
        },
    };
    let service = SshHostVerificationService::new(&gate, &site_store, &profile_store, &verifier);

    let response = service
        .trust(
            "req-trust",
            SshHostTrustInput {
                site_id: "site-alpha".to_string(),
                ssh_profile_id: "ssh-profile-1".to_string(),
                expected_fingerprint: "SHA256:missing".to_string(),
            },
        )
        .await
        .expect("host verification trust should succeed");

    assert_eq!(response.trust_state, SshKnownHostTrustState::Trusted);
    assert_eq!(
        verifier
            .trust_calls
            .lock()
            .expect("trust calls lock")
            .as_slice(),
        [(
            "gnurestapi.cc".to_string(),
            22,
            "SHA256:missing".to_string()
        )]
        .as_slice()
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.ssh.host.trust"]
    );
}
