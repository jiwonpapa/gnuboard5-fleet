use std::{
    collections::VecDeque,
    net::{IpAddr, Ipv4Addr},
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use g5_fleet_security::{
    AuthError, AuthService, Resolver, SecretPurpose, SsrfError, UrlGuard,
    generate_current_totp_code,
};
use g5_fleet_store::FleetStore;
use tempfile::TempDir;

const ADMIN_PASSWORD: &str = "correct horse battery staple";
const USER_PASSWORD: &str = "another durable password";

#[tokio::test]
async fn two_users_two_sites_sessions_csrf_and_secrets_are_isolated() {
    let data = TempDir::new().expect("data");
    let store = FleetStore::initialize(data.path(), "security-test-installation")
        .await
        .expect("store");
    let auth = AuthService::new(store.clone(), &[9_u8; 32]).expect("auth");
    let challenge = auth
        .start_install_challenge("admin")
        .await
        .expect("install challenge");
    let totp_secret = challenge.manual_entry_key;
    let totp_code =
        generate_current_totp_code(&totp_secret, "G5 Fleet", "admin").expect("install TOTP");
    let completion = auth
        .complete_install(
            challenge.setup_token.as_deref().expect("setup token"),
            "admin",
            ADMIN_PASSWORD,
            &totp_code,
        )
        .await
        .expect("complete install");
    let admin_id = completion.principal_id;
    assert!(auth.start_install_challenge("second-admin").await.is_err());

    let totp_code =
        generate_current_totp_code(&totp_secret, "G5 Fleet", "admin").expect("login TOTP");
    let admin_tokens = auth
        .login_with_factor("admin", ADMIN_PASSWORD, Some(&totp_code), None)
        .await
        .expect("admin login");
    let mut admin = auth
        .authenticate(&admin_tokens.session_token)
        .await
        .expect("admin session");
    assert_eq!(admin.principal_id, admin_id);
    auth.verify_csrf(&admin, &admin_tokens.csrf_token)
        .expect("valid csrf");
    assert!(matches!(
        auth.verify_csrf(&admin, "wrong-csrf"),
        Err(AuthError::Csrf)
    ));
    assert!(matches!(
        auth.require_recent_step_up(&admin),
        Err(AuthError::StepUpRequired)
    ));
    let totp_code =
        generate_current_totp_code(&totp_secret, "G5 Fleet", "admin").expect("step-up TOTP");
    auth.step_up_with_factor(&admin, ADMIN_PASSWORD, Some(&totp_code), None)
        .await
        .expect("step up");
    admin = auth
        .authenticate(&admin_tokens.session_token)
        .await
        .expect("refreshed admin session");
    let user_id = auth
        .create_user(&admin, "operator", USER_PASSWORD)
        .await
        .expect("second user");
    let user_tokens = auth
        .login("operator", USER_PASSWORD)
        .await
        .expect("user login");
    let user = auth
        .authenticate(&user_tokens.session_token)
        .await
        .expect("user session");
    assert_eq!(user.principal_id, user_id);
    assert_ne!(admin.web_session_id, user.web_session_id);

    store
        .create_site(
            "site-admin",
            &admin.principal_id,
            "Admin site",
            "https://admin.example",
        )
        .await
        .expect("admin site");
    store
        .create_site(
            "site-user",
            &user.principal_id,
            "User site",
            "https://user.example",
        )
        .await
        .expect("user site");
    assert_eq!(
        store
            .list_owned_sites(&admin.principal_id)
            .await
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        store
            .list_owned_sites(&user.principal_id)
            .await
            .unwrap()
            .len(),
        1
    );
    assert!(
        store
            .owned_site(&admin.principal_id, "site-user")
            .await
            .unwrap()
            .is_none()
    );
    assert!(
        store
            .owned_site(&user.principal_id, "site-admin")
            .await
            .unwrap()
            .is_none()
    );

    auth.put_secret(
        &admin.principal_id,
        "site-admin",
        SecretPurpose::G5Api,
        b"admin-g5-jwt",
    )
    .await
    .expect("admin secret");
    auth.put_secret(
        &user.principal_id,
        "site-user",
        SecretPurpose::Ssh,
        b"user-ssh-private-key",
    )
    .await
    .expect("user secret");
    assert_eq!(
        auth.decrypt_secret_for_connector(&admin.principal_id, "site-admin", SecretPurpose::G5Api)
            .await
            .unwrap(),
        b"admin-g5-jwt"
    );
    assert!(
        auth.decrypt_secret_for_connector(&admin.principal_id, "site-user", SecretPurpose::Ssh)
            .await
            .is_err()
    );
    assert!(
        auth.decrypt_secret_for_connector(&user.principal_id, "site-admin", SecretPurpose::G5Api)
            .await
            .is_err()
    );

    auth.logout(&user).await.expect("logout");
    assert!(matches!(
        auth.authenticate(&user_tokens.session_token).await,
        Err(AuthError::Unauthorized)
    ));
}

#[tokio::test]
async fn ssrf_metadata_redirect_and_dns_rebinding_are_rejected() {
    let metadata = UrlGuard::new(FakeResolver::new(vec![]))
        .resolve_initial("http://169.254.169.254/latest/meta-data")
        .await
        .unwrap_err();
    assert!(matches!(metadata, SsrfError::NonPublicAddress(_)));

    let localhost = UrlGuard::new(FakeResolver::new(vec![vec![IpAddr::V4(
        Ipv4Addr::LOCALHOST,
    )]]))
    .resolve_initial("https://localhost.example")
    .await
    .unwrap_err();
    assert!(matches!(localhost, SsrfError::NonPublicAddress(_)));

    let guard = UrlGuard::new(FakeResolver::new(vec![
        vec![IpAddr::V4(Ipv4Addr::new(93, 184, 216, 34))],
        vec![IpAddr::V4(Ipv4Addr::new(1, 1, 1, 1))],
    ]));
    let pinned = guard
        .resolve_initial("https://connector.example/api")
        .await
        .expect("public initial DNS");
    assert!(matches!(
        guard.revalidate_before_connect(&pinned).await,
        Err(SsrfError::DnsRebinding)
    ));
    assert!(matches!(
        guard.reject_redirect("https://other.example"),
        Err(SsrfError::RedirectForbidden)
    ));

    let credentials = UrlGuard::new(FakeResolver::new(vec![]))
        .resolve_initial("https://user:password@example.com")
        .await
        .unwrap_err();
    assert_eq!(credentials, SsrfError::UserInfoOrFragment);
}

#[cfg(feature = "local-certification")]
#[tokio::test]
async fn local_certification_guard_is_explicit_and_still_dns_pinned() {
    let guard = UrlGuard::local_certification(FakeResolver::new(vec![
        vec![IpAddr::V4(Ipv4Addr::LOCALHOST)],
        vec![IpAddr::V4(Ipv4Addr::LOCALHOST)],
    ]));
    let target = guard
        .resolve_initial("http://local-certification.invalid:8080")
        .await
        .expect("test-only private target");
    guard
        .revalidate_before_connect(&target)
        .await
        .expect("same private address remains pinned");

    let production = UrlGuard::new(FakeResolver::new(vec![vec![IpAddr::V4(
        Ipv4Addr::LOCALHOST,
    )]]))
    .resolve_initial("http://local-certification.invalid:8080")
    .await
    .unwrap_err();
    assert!(matches!(production, SsrfError::NonPublicAddress(_)));
}

#[derive(Clone, Debug)]
struct FakeResolver {
    answers: Arc<Mutex<VecDeque<Vec<IpAddr>>>>,
}

impl FakeResolver {
    fn new(answers: Vec<Vec<IpAddr>>) -> Self {
        Self {
            answers: Arc::new(Mutex::new(answers.into())),
        }
    }
}

#[async_trait]
impl Resolver for FakeResolver {
    async fn resolve(&self, _host: &str, _port: u16) -> Result<Vec<IpAddr>, SsrfError> {
        self.answers
            .lock()
            .expect("resolver lock")
            .pop_front()
            .ok_or(SsrfError::ResolutionEmpty)
    }
}
