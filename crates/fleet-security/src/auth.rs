use std::{
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use aes_gcm::{
    Aes256Gcm, KeyInit,
    aead::{Aead, Payload},
};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use g5_fleet_store::{FleetStore, StoreError, WebPushSubscriptionSummary};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use totp_rs::{Algorithm, Secret, TOTP};

const SESSION_TTL: Duration = Duration::from_secs(12 * 60 * 60);
const STEP_UP_TTL: Duration = Duration::from_secs(10 * 60);
const INSTALL_CHALLENGE_TTL: Duration = Duration::from_secs(10 * 60);
const RECOVERY_CODE_COUNT: usize = 10;
const KEY_VERSION: i64 = 1;
const CIPHER_NAME: &str = "AES-256-GCM";
const TOTP_ISSUER: &str = "G5 Fleet";
type RecoveryCodeRecord = (String, Vec<u8>);
type RecoveryCodeMaterial = (Vec<String>, Vec<RecoveryCodeRecord>);

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("invalid credentials")]
    InvalidCredentials,
    #[error("authentication is required")]
    Unauthorized,
    #[error("CSRF validation failed")]
    Csrf,
    #[error("recent step-up authentication is required")]
    StepUpRequired,
    #[error("TOTP or recovery code is required")]
    SecondFactorRequired,
    #[error("invalid TOTP or recovery code")]
    InvalidSecondFactor,
    #[error("Fleet installation setup is incomplete")]
    InstallIncomplete,
    #[error("authentication is temporarily locked for {retry_after_seconds} seconds")]
    RateLimited { retry_after_seconds: u64 },
    #[error("password policy requires 12-128 characters")]
    PasswordPolicy,
    #[error("session idle timeout must be between 5 and 1440 minutes")]
    IdleTimeoutPolicy,
    #[error("invalid master key")]
    InvalidMasterKey,
    #[error("invalid secret purpose")]
    InvalidSecretPurpose,
    #[error("secret encryption failed")]
    Encryption,
    #[error("secret decryption failed")]
    Decryption,
    #[error("web push subscription is invalid")]
    InvalidWebPushSubscription,
    #[error(transparent)]
    Store(#[from] StoreError),
    #[error(transparent)]
    PasswordHash(#[from] argon2::password_hash::Error),
}

pub type AuthResult<T> = Result<T, AuthError>;

#[derive(Clone)]
pub struct AuthService {
    store: FleetStore,
    cipher: Arc<Aes256Gcm>,
    dummy_hash: Arc<String>,
}

impl std::fmt::Debug for AuthService {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("AuthService")
            .field("store", &self.store)
            .finish_non_exhaustive()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SessionTokens {
    pub session_token: String,
    pub csrf_token: String,
    pub expires_at_unix: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PrincipalSession {
    pub principal_id: String,
    pub web_session_id: String,
    pub csrf_hash: Vec<u8>,
    pub expires_at_unix: i64,
    pub step_up_verified_at_unix: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InstallStatus {
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TotpEnrollmentChallenge {
    pub setup_token: Option<String>,
    pub manual_entry_key: String,
    pub otpauth_uri: String,
    pub expires_at_unix: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InstallCompletion {
    pub principal_id: String,
    pub recovery_codes: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserBootstrap {
    pub principal_id: String,
    pub manual_entry_key: String,
    pub otpauth_uri: String,
    pub recovery_codes: Vec<String>,
}

#[derive(Clone, PartialEq, Eq)]
pub struct WebPushSubscriptionMaterial {
    pub subscription_id: String,
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
}

impl std::fmt::Debug for WebPushSubscriptionMaterial {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("WebPushSubscriptionMaterial")
            .field("subscription_id", &self.subscription_id)
            .field("endpoint", &"<redacted>")
            .field("p256dh", &"<redacted>")
            .field("auth", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SecretPurpose {
    G5Api,
    Ssh,
    Sftp,
    Notification,
}

impl SecretPurpose {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::G5Api => "g5_api",
            Self::Ssh => "ssh",
            Self::Sftp => "sftp",
            Self::Notification => "notification",
        }
    }
}

impl AuthService {
    pub fn new(store: FleetStore, master_key: &[u8]) -> AuthResult<Self> {
        let cipher =
            Aes256Gcm::new_from_slice(master_key).map_err(|_| AuthError::InvalidMasterKey)?;
        let dummy_hash = hash_password("timing-only-not-a-real-password")?;
        Ok(Self {
            store,
            cipher: Arc::new(cipher),
            dummy_hash: Arc::new(dummy_hash),
        })
    }

    pub fn store(&self) -> &FleetStore {
        &self.store
    }

    pub async fn install_status(&self) -> AuthResult<InstallStatus> {
        let state = self.store.installation_security_state().await?;
        Ok(InstallStatus { state: state.state })
    }

    pub async fn start_install_challenge(
        &self,
        login_name: &str,
    ) -> AuthResult<TotpEnrollmentChallenge> {
        validate_login_name(login_name)?;
        if self.store.installation_security_state().await?.state != "setup_required" {
            return Err(StoreError::Conflict("Fleet installation is complete".to_owned()).into());
        }
        let (secret, manual_entry_key, otpauth_uri) =
            create_totp_enrollment_challenge(TOTP_ISSUER, login_name)?;
        let setup_token = random_token(32)?;
        let expires_at_unix = unix_timestamp()? + INSTALL_CHALLENGE_TTL.as_secs() as i64;
        let (nonce, ciphertext) =
            self.encrypt_bound(&install_totp_aad(login_name), secret.as_bytes())?;
        self.store
            .put_install_challenge(
                login_name,
                &digest(setup_token.as_bytes()),
                &nonce,
                &ciphertext,
                expires_at_unix,
            )
            .await?;
        Ok(TotpEnrollmentChallenge {
            setup_token: Some(setup_token),
            manual_entry_key,
            otpauth_uri,
            expires_at_unix: Some(expires_at_unix),
        })
    }

    pub async fn complete_install(
        &self,
        setup_token: &str,
        login_name: &str,
        password: &str,
        totp_code: &str,
    ) -> AuthResult<InstallCompletion> {
        validate_login_name(login_name)?;
        validate_password(password)?;
        if !(32..=128).contains(&setup_token.len()) {
            return Err(AuthError::InstallIncomplete);
        }
        let now = unix_timestamp()?;
        let setup_token_hash = digest(setup_token.as_bytes());
        let pending = self
            .store
            .pending_install_challenge(&setup_token_hash, now)
            .await?
            .ok_or(AuthError::InstallIncomplete)?;
        if pending.login_name != login_name {
            return Err(AuthError::InstallIncomplete);
        }
        let secret = String::from_utf8(self.decrypt_bound(
            &install_totp_aad(login_name),
            &pending.totp_nonce,
            &pending.totp_ciphertext,
        )?)
        .map_err(|_| AuthError::Decryption)?;
        if !verify_totp_code(&secret, TOTP_ISSUER, login_name, totp_code)? {
            return Err(AuthError::InvalidSecondFactor);
        }
        let user_id = random_id("usr", 18)?;
        let password_hash = hash_password(password)?;
        let (totp_nonce, totp_ciphertext) =
            self.encrypt_bound(&user_totp_aad(&user_id), secret.as_bytes())?;
        let (recovery_codes, recovery_records) = recovery_code_material()?;
        self.store
            .complete_initial_install(
                &setup_token_hash,
                now,
                &user_id,
                login_name,
                password_hash.as_bytes(),
                &totp_nonce,
                &totp_ciphertext,
                &recovery_records,
            )
            .await?;
        Ok(InstallCompletion {
            principal_id: user_id,
            recovery_codes,
        })
    }

    pub async fn login(&self, login_name: &str, password: &str) -> AuthResult<SessionTokens> {
        self.login_with_factor(login_name, password, None, None)
            .await
    }

    pub async fn login_with_factor(
        &self,
        login_name: &str,
        password: &str,
        totp_code: Option<&str>,
        recovery_code: Option<&str>,
    ) -> AuthResult<SessionTokens> {
        if self.store.installation_security_state().await?.state != "complete" {
            return Err(AuthError::InstallIncomplete);
        }
        let scope_hash = login_scope_hash(login_name);
        let now = unix_timestamp()?;
        if let Some(locked_until) = self.store.login_locked_until(&scope_hash, now).await? {
            return Err(AuthError::RateLimited {
                retry_after_seconds: locked_until.saturating_sub(now) as u64,
            });
        }
        let credential = self.store.credential_by_login(login_name).await?;
        let encoded = credential
            .as_ref()
            .and_then(|value| std::str::from_utf8(&value.password_hash).ok())
            .unwrap_or(&self.dummy_hash);
        let verified = verify_password(encoded, password);
        let Some(credential) = credential else {
            return self.login_failure(&scope_hash, now, None).await;
        };
        if !verified || credential.status != "active" {
            return self
                .login_failure(&scope_hash, now, Some(&credential.user_id))
                .await;
        }
        let settings = self
            .store
            .user_security_settings(&credential.user_id)
            .await?;
        if settings.totp_enabled
            && let Err(error) = self
                .verify_second_factor(
                    &credential.user_id,
                    &credential.login_name,
                    totp_code,
                    recovery_code,
                )
                .await
        {
            if matches!(error, AuthError::InvalidSecondFactor) {
                return self
                    .login_failure(&scope_hash, now, Some(&credential.user_id))
                    .await;
            }
            return Err(error);
        }

        let session_id = random_id("ses", 18)?;
        let session_token = random_token(32)?;
        let csrf_token = random_token(32)?;
        let configured_ttl = Duration::from_secs(settings.session_idle_timeout_minutes as u64 * 60);
        let expires_at_unix = now + configured_ttl.min(SESSION_TTL).as_secs() as i64;
        self.store
            .create_web_session(
                &session_id,
                &credential.user_id,
                &digest(session_token.as_bytes()),
                &digest(csrf_token.as_bytes()),
                expires_at_unix,
            )
            .await?;
        self.store.clear_login_failures(&scope_hash).await?;
        self.store
            .append_audit(
                None,
                Some(&credential.user_id),
                None,
                "auth.login",
                "success",
                &serde_json::json!({"factor":"password_and_totp_or_recovery"}),
            )
            .await?;
        Ok(SessionTokens {
            session_token,
            csrf_token,
            expires_at_unix,
        })
    }

    async fn login_failure<T>(
        &self,
        scope_hash: &[u8],
        now: i64,
        principal_id: Option<&str>,
    ) -> AuthResult<T> {
        let locked_until = self.store.record_login_failure(scope_hash, now).await?;
        self.store
            .append_audit(
                None,
                principal_id,
                None,
                "auth.login",
                if locked_until.is_some() {
                    "denied"
                } else {
                    "failed"
                },
                &serde_json::json!({"reason":"invalid_credentials"}),
            )
            .await?;
        if let Some(locked_until) = locked_until {
            return Err(AuthError::RateLimited {
                retry_after_seconds: locked_until.saturating_sub(now) as u64,
            });
        }
        Err(AuthError::InvalidCredentials)
    }

    pub async fn create_user(
        &self,
        actor: &PrincipalSession,
        login_name: &str,
        password: &str,
    ) -> AuthResult<UserBootstrap> {
        self.require_recent_step_up(actor)?;
        validate_password(password)?;
        validate_login_name(login_name)?;
        let user_id = random_id("usr", 18)?;
        let password_hash = hash_password(password)?;
        let (secret, manual_entry_key, otpauth_uri) =
            create_totp_enrollment_challenge(TOTP_ISSUER, login_name)?;
        let (totp_nonce, totp_ciphertext) =
            self.encrypt_bound(&user_totp_aad(&user_id), secret.as_bytes())?;
        let (recovery_codes, recovery_records) = recovery_code_material()?;
        self.store
            .create_user_with_totp(
                &actor.principal_id,
                &user_id,
                login_name,
                password_hash.as_bytes(),
                &totp_nonce,
                &totp_ciphertext,
                &recovery_records,
            )
            .await?;
        Ok(UserBootstrap {
            principal_id: user_id,
            manual_entry_key,
            otpauth_uri,
            recovery_codes,
        })
    }

    pub async fn authenticate(&self, session_token: &str) -> AuthResult<PrincipalSession> {
        if session_token.len() < 32 || session_token.len() > 128 {
            return Err(AuthError::Unauthorized);
        }
        let Some(session) = self
            .store
            .resolve_web_session(&digest(session_token.as_bytes()), unix_timestamp()?)
            .await?
        else {
            return Err(AuthError::Unauthorized);
        };
        Ok(PrincipalSession {
            principal_id: session.user_id,
            web_session_id: session.session_id,
            csrf_hash: session.csrf_hash,
            expires_at_unix: session.expires_at_unix,
            step_up_verified_at_unix: session.step_up_verified_at_unix,
        })
    }

    pub fn verify_csrf(&self, session: &PrincipalSession, token: &str) -> AuthResult<()> {
        let actual = digest(token.as_bytes());
        if session.csrf_hash.len() != actual.len()
            || session.csrf_hash.ct_eq(actual.as_slice()).unwrap_u8() != 1
        {
            return Err(AuthError::Csrf);
        }
        Ok(())
    }

    pub async fn logout(&self, session: &PrincipalSession) -> AuthResult<()> {
        self.store
            .revoke_web_session(
                &session.web_session_id,
                &session.principal_id,
                unix_timestamp()?,
            )
            .await?;
        Ok(())
    }

    pub async fn step_up(&self, session: &PrincipalSession, password: &str) -> AuthResult<()> {
        self.step_up_with_factor(session, password, None, None)
            .await
    }

    pub async fn step_up_with_factor(
        &self,
        session: &PrincipalSession,
        password: &str,
        totp_code: Option<&str>,
        recovery_code: Option<&str>,
    ) -> AuthResult<()> {
        let Some(credential) = self.store.credential_by_user(&session.principal_id).await? else {
            return Err(AuthError::InvalidCredentials);
        };
        let encoded = std::str::from_utf8(&credential.password_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;
        if !verify_password(encoded, password) {
            return Err(AuthError::InvalidCredentials);
        }
        if self
            .store
            .user_security_settings(&session.principal_id)
            .await?
            .totp_enabled
        {
            self.verify_second_factor(
                &session.principal_id,
                &credential.login_name,
                totp_code,
                recovery_code,
            )
            .await?;
        }
        self.store
            .mark_step_up(
                &session.web_session_id,
                &session.principal_id,
                unix_timestamp()?,
            )
            .await?;
        Ok(())
    }

    pub async fn rotate_csrf(&self, session: &PrincipalSession) -> AuthResult<String> {
        let csrf_token = random_token(32)?;
        self.store
            .rotate_session_csrf(
                &session.web_session_id,
                &session.principal_id,
                &digest(csrf_token.as_bytes()),
            )
            .await?;
        Ok(csrf_token)
    }

    pub async fn security_settings(
        &self,
        session: &PrincipalSession,
    ) -> AuthResult<g5_fleet_store::UserSecuritySettings> {
        self.store
            .user_security_settings(&session.principal_id)
            .await
            .map_err(Into::into)
    }

    pub async fn start_totp_enrollment(
        &self,
        session: &PrincipalSession,
    ) -> AuthResult<TotpEnrollmentChallenge> {
        self.require_recent_step_up(session)?;
        let credential = self
            .store
            .credential_by_user(&session.principal_id)
            .await?
            .ok_or(AuthError::InvalidCredentials)?;
        let (secret, manual_entry_key, otpauth_uri) =
            create_totp_enrollment_challenge(TOTP_ISSUER, &credential.login_name)?;
        let (nonce, ciphertext) = self.encrypt_bound(
            &user_pending_totp_aad(&session.principal_id),
            secret.as_bytes(),
        )?;
        self.store
            .put_pending_totp(&session.principal_id, &nonce, &ciphertext)
            .await?;
        Ok(TotpEnrollmentChallenge {
            setup_token: None,
            manual_entry_key,
            otpauth_uri,
            expires_at_unix: None,
        })
    }

    pub async fn enable_totp(
        &self,
        session: &PrincipalSession,
        code: &str,
    ) -> AuthResult<Vec<String>> {
        self.require_recent_step_up(session)?;
        let credential = self
            .store
            .credential_by_user(&session.principal_id)
            .await?
            .ok_or(AuthError::InvalidCredentials)?;
        let pending = self
            .store
            .pending_totp_secret(&session.principal_id)
            .await?
            .ok_or(AuthError::InvalidSecondFactor)?;
        let secret = String::from_utf8(self.decrypt_bound(
            &user_pending_totp_aad(&session.principal_id),
            &pending.nonce,
            &pending.ciphertext,
        )?)
        .map_err(|_| AuthError::Decryption)?;
        if !verify_totp_code(&secret, TOTP_ISSUER, &credential.login_name, code)? {
            return Err(AuthError::InvalidSecondFactor);
        }
        let (nonce, ciphertext) =
            self.encrypt_bound(&user_totp_aad(&session.principal_id), secret.as_bytes())?;
        let (codes, records) = recovery_code_material()?;
        self.store
            .enable_totp(&session.principal_id, &nonce, &ciphertext, &records)
            .await?;
        Ok(codes)
    }

    pub async fn disable_totp(
        &self,
        session: &PrincipalSession,
        current_password: &str,
        totp_code: Option<&str>,
        recovery_code: Option<&str>,
    ) -> AuthResult<()> {
        self.verify_sensitive_action(session, current_password, totp_code, recovery_code)
            .await?;
        self.store.disable_totp(&session.principal_id).await?;
        Ok(())
    }

    pub async fn change_password(
        &self,
        session: &PrincipalSession,
        current_password: &str,
        new_password: &str,
        totp_code: Option<&str>,
        recovery_code: Option<&str>,
    ) -> AuthResult<()> {
        validate_password(new_password)?;
        self.verify_sensitive_action(session, current_password, totp_code, recovery_code)
            .await?;
        let password_hash = hash_password(new_password)?;
        self.store
            .update_password_hash(&session.principal_id, password_hash.as_bytes())
            .await?;
        Ok(())
    }

    pub async fn update_idle_timeout(
        &self,
        session: &PrincipalSession,
        minutes: i64,
    ) -> AuthResult<()> {
        self.require_recent_step_up(session)?;
        if !(5..=1440).contains(&minutes) {
            return Err(AuthError::IdleTimeoutPolicy);
        }
        self.store
            .update_idle_timeout(&session.principal_id, minutes)
            .await?;
        Ok(())
    }

    pub async fn regenerate_recovery_codes(
        &self,
        session: &PrincipalSession,
    ) -> AuthResult<Vec<String>> {
        self.require_recent_step_up(session)?;
        if !self
            .store
            .user_security_settings(&session.principal_id)
            .await?
            .totp_enabled
        {
            return Err(AuthError::SecondFactorRequired);
        }
        let (codes, records) = recovery_code_material()?;
        self.store
            .replace_recovery_codes(&session.principal_id, &records)
            .await?;
        Ok(codes)
    }

    async fn verify_sensitive_action(
        &self,
        session: &PrincipalSession,
        current_password: &str,
        totp_code: Option<&str>,
        recovery_code: Option<&str>,
    ) -> AuthResult<()> {
        let credential = self
            .store
            .credential_by_user(&session.principal_id)
            .await?
            .ok_or(AuthError::InvalidCredentials)?;
        let encoded = std::str::from_utf8(&credential.password_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;
        if !verify_password(encoded, current_password) {
            return Err(AuthError::InvalidCredentials);
        }
        if self
            .store
            .user_security_settings(&session.principal_id)
            .await?
            .totp_enabled
        {
            self.verify_second_factor(
                &session.principal_id,
                &credential.login_name,
                totp_code,
                recovery_code,
            )
            .await?;
        }
        Ok(())
    }

    async fn verify_second_factor(
        &self,
        user_id: &str,
        login_name: &str,
        totp_code: Option<&str>,
        recovery_code: Option<&str>,
    ) -> AuthResult<()> {
        if let Some(code) = totp_code {
            let encrypted = self
                .store
                .encrypted_totp_secret(user_id)
                .await?
                .ok_or(AuthError::InvalidSecondFactor)?;
            let secret = String::from_utf8(self.decrypt_bound(
                &user_totp_aad(user_id),
                &encrypted.nonce,
                &encrypted.ciphertext,
            )?)
            .map_err(|_| AuthError::Decryption)?;
            return verify_totp_code(&secret, TOTP_ISSUER, login_name, code)?
                .then_some(())
                .ok_or(AuthError::InvalidSecondFactor);
        }
        if let Some(code) = recovery_code {
            if self
                .store
                .consume_recovery_code(user_id, &recovery_code_hash(code))
                .await?
            {
                return Ok(());
            }
            return Err(AuthError::InvalidSecondFactor);
        }
        Err(AuthError::SecondFactorRequired)
    }

    fn encrypt_bound(&self, aad: &str, plaintext: &[u8]) -> AuthResult<(Vec<u8>, Vec<u8>)> {
        let nonce = random_bytes(12)?;
        let ciphertext = self
            .cipher
            .encrypt(
                nonce.as_slice().into(),
                Payload {
                    msg: plaintext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| AuthError::Encryption)?;
        Ok((nonce, ciphertext))
    }

    fn decrypt_bound(&self, aad: &str, nonce: &[u8], ciphertext: &[u8]) -> AuthResult<Vec<u8>> {
        if nonce.len() != 12 {
            return Err(AuthError::Decryption);
        }
        self.cipher
            .decrypt(
                nonce.into(),
                Payload {
                    msg: ciphertext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| AuthError::Decryption)
    }

    pub fn require_recent_step_up(&self, session: &PrincipalSession) -> AuthResult<()> {
        let now = unix_timestamp()?;
        if session
            .step_up_verified_at_unix
            .is_some_and(|verified| now.saturating_sub(verified) <= STEP_UP_TTL.as_secs() as i64)
        {
            return Ok(());
        }
        Err(AuthError::StepUpRequired)
    }

    pub async fn put_secret(
        &self,
        principal_id: &str,
        site_id: &str,
        purpose: SecretPurpose,
        plaintext: &[u8],
    ) -> AuthResult<()> {
        if plaintext.is_empty() || plaintext.len() > 64 * 1024 {
            return Err(AuthError::Encryption);
        }
        let nonce = random_bytes(12)?;
        let aad = secret_aad(principal_id, site_id, purpose);
        let ciphertext = self
            .cipher
            .encrypt(
                nonce.as_slice().into(),
                Payload {
                    msg: plaintext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| AuthError::Encryption)?;
        self.store
            .put_encrypted_secret(
                &random_id("sec", 18)?,
                principal_id,
                site_id,
                purpose.as_str(),
                CIPHER_NAME,
                KEY_VERSION,
                &nonce,
                &ciphertext,
            )
            .await?;
        Ok(())
    }

    pub async fn decrypt_secret_for_connector(
        &self,
        principal_id: &str,
        site_id: &str,
        purpose: SecretPurpose,
    ) -> AuthResult<Vec<u8>> {
        let record = self
            .store
            .encrypted_secret(principal_id, site_id, purpose.as_str())
            .await?
            .ok_or(StoreError::NotFound)?;
        if record.algorithm != CIPHER_NAME
            || record.key_version != KEY_VERSION
            || record.nonce.len() != 12
        {
            return Err(AuthError::Decryption);
        }
        let aad = secret_aad(principal_id, site_id, purpose);
        self.cipher
            .decrypt(
                record.nonce.as_slice().into(),
                Payload {
                    msg: &record.ciphertext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| AuthError::Decryption)
    }

    pub async fn create_web_push_subscription(
        &self,
        principal_id: &str,
        site_id: &str,
        endpoint: &str,
        p256dh: &str,
        auth: &str,
    ) -> AuthResult<WebPushSubscriptionSummary> {
        validate_web_push_material(endpoint, p256dh, auth)?;
        let subscription_id = random_id("wps", 18)?;
        let (nonce, ciphertext) = self.encrypt_web_push_material(
            principal_id,
            site_id,
            &subscription_id,
            endpoint,
            p256dh,
            auth,
        )?;
        self.store
            .put_encrypted_web_push_subscription(
                &subscription_id,
                principal_id,
                site_id,
                &digest(endpoint.as_bytes()),
                CIPHER_NAME,
                KEY_VERSION,
                &nonce,
                &ciphertext,
            )
            .await
            .map_err(Into::into)
    }

    pub async fn rotate_web_push_subscription(
        &self,
        principal_id: &str,
        site_id: &str,
        subscription_id: &str,
        endpoint: &str,
        p256dh: &str,
        auth: &str,
    ) -> AuthResult<WebPushSubscriptionSummary> {
        if subscription_id.is_empty() || subscription_id.len() > 128 {
            return Err(AuthError::InvalidWebPushSubscription);
        }
        validate_web_push_material(endpoint, p256dh, auth)?;
        let (nonce, ciphertext) = self.encrypt_web_push_material(
            principal_id,
            site_id,
            subscription_id,
            endpoint,
            p256dh,
            auth,
        )?;
        self.store
            .rotate_encrypted_web_push_subscription(
                subscription_id,
                principal_id,
                site_id,
                &digest(endpoint.as_bytes()),
                CIPHER_NAME,
                KEY_VERSION,
                &nonce,
                &ciphertext,
            )
            .await
            .map_err(Into::into)
    }

    pub async fn list_web_push_subscriptions(
        &self,
        principal_id: &str,
        site_id: &str,
    ) -> AuthResult<Vec<WebPushSubscriptionSummary>> {
        self.store
            .owned_web_push_subscriptions(principal_id, site_id)
            .await
            .map_err(Into::into)
    }

    pub async fn active_web_push_subscription_materials(
        &self,
        principal_id: &str,
        site_id: &str,
    ) -> AuthResult<Vec<WebPushSubscriptionMaterial>> {
        let records = self
            .store
            .active_encrypted_web_push_subscriptions(principal_id, site_id)
            .await?;
        records
            .into_iter()
            .map(|record| {
                if record.algorithm != CIPHER_NAME
                    || record.key_version != KEY_VERSION
                    || record.nonce.len() != 12
                {
                    return Err(AuthError::Decryption);
                }
                let aad = web_push_subscription_aad(principal_id, site_id, &record.subscription_id);
                let plaintext = self
                    .cipher
                    .decrypt(
                        record.nonce.as_slice().into(),
                        Payload {
                            msg: &record.ciphertext,
                            aad: aad.as_bytes(),
                        },
                    )
                    .map_err(|_| AuthError::Decryption)?;
                let value: serde_json::Value =
                    serde_json::from_slice(&plaintext).map_err(|_| AuthError::Decryption)?;
                let endpoint = value
                    .get("endpoint")
                    .and_then(serde_json::Value::as_str)
                    .ok_or(AuthError::Decryption)?;
                let p256dh = value
                    .get("p256dh")
                    .and_then(serde_json::Value::as_str)
                    .ok_or(AuthError::Decryption)?;
                let auth = value
                    .get("auth")
                    .and_then(serde_json::Value::as_str)
                    .ok_or(AuthError::Decryption)?;
                validate_web_push_material(endpoint, p256dh, auth)
                    .map_err(|_| AuthError::Decryption)?;
                Ok(WebPushSubscriptionMaterial {
                    subscription_id: record.subscription_id,
                    endpoint: endpoint.to_owned(),
                    p256dh: p256dh.to_owned(),
                    auth: auth.to_owned(),
                })
            })
            .collect()
    }

    pub async fn revoke_web_push_subscription(
        &self,
        principal_id: &str,
        site_id: &str,
        subscription_id: &str,
    ) -> AuthResult<()> {
        self.store
            .revoke_owned_web_push_subscription(principal_id, site_id, subscription_id)
            .await?;
        Ok(())
    }

    fn encrypt_web_push_material(
        &self,
        principal_id: &str,
        site_id: &str,
        subscription_id: &str,
        endpoint: &str,
        p256dh: &str,
        auth: &str,
    ) -> AuthResult<(Vec<u8>, Vec<u8>)> {
        let plaintext = serde_json::to_vec(&serde_json::json!({
            "endpoint": endpoint,
            "p256dh": p256dh,
            "auth": auth,
        }))
        .map_err(|_| AuthError::Encryption)?;
        let nonce = random_bytes(12)?;
        let aad = web_push_subscription_aad(principal_id, site_id, subscription_id);
        let ciphertext = self
            .cipher
            .encrypt(
                nonce.as_slice().into(),
                Payload {
                    msg: &plaintext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| AuthError::Encryption)?;
        Ok((nonce, ciphertext))
    }

    pub async fn delete_secret(
        &self,
        principal_id: &str,
        site_id: &str,
        purpose: SecretPurpose,
    ) -> AuthResult<()> {
        self.store
            .delete_encrypted_secret(principal_id, site_id, purpose.as_str())
            .await?;
        Ok(())
    }
}

fn validate_password(password: &str) -> AuthResult<()> {
    if (12..=128).contains(&password.chars().count()) {
        Ok(())
    } else {
        Err(AuthError::PasswordPolicy)
    }
}

fn validate_login_name(login_name: &str) -> AuthResult<()> {
    if (3..=64).contains(&login_name.len())
        && login_name
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "._-".contains(character))
    {
        Ok(())
    } else {
        Err(AuthError::InvalidCredentials)
    }
}

fn hash_password(password: &str) -> AuthResult<String> {
    let salt = SaltString::encode_b64(&random_bytes(16)?)?;
    Ok(Argon2::default()
        .hash_password(password.as_bytes(), &salt)?
        .to_string())
}

fn verify_password(encoded: &str, password: &str) -> bool {
    PasswordHash::new(encoded).ok().is_some_and(|hash| {
        Argon2::default()
            .verify_password(password.as_bytes(), &hash)
            .is_ok()
    })
}

fn digest(value: &[u8]) -> Vec<u8> {
    Sha256::digest(value).to_vec()
}

fn random_id(prefix: &str, bytes: usize) -> AuthResult<String> {
    Ok(format!("{prefix}_{}", random_token(bytes)?))
}

fn random_token(bytes: usize) -> AuthResult<String> {
    Ok(URL_SAFE_NO_PAD.encode(random_bytes(bytes)?))
}

fn random_bytes(length: usize) -> AuthResult<Vec<u8>> {
    let mut bytes = vec![0_u8; length];
    getrandom::fill(&mut bytes).map_err(|_| AuthError::Encryption)?;
    Ok(bytes)
}

fn secret_aad(principal_id: &str, site_id: &str, purpose: SecretPurpose) -> String {
    format!(
        "g5-fleet/v1\0{principal_id}\0{site_id}\0{}",
        purpose.as_str()
    )
}

fn web_push_subscription_aad(principal_id: &str, site_id: &str, subscription_id: &str) -> String {
    format!("g5-fleet/web-push/v1\0{principal_id}\0{site_id}\0{subscription_id}")
}

fn validate_web_push_material(endpoint: &str, p256dh: &str, auth: &str) -> AuthResult<()> {
    let p256dh = URL_SAFE_NO_PAD
        .decode(p256dh)
        .map_err(|_| AuthError::InvalidWebPushSubscription)?;
    let auth = URL_SAFE_NO_PAD
        .decode(auth)
        .map_err(|_| AuthError::InvalidWebPushSubscription)?;
    if endpoint.is_empty()
        || endpoint.len() > 4096
        || p256dh.len() != 65
        || p256dh.first() != Some(&4)
        || auth.len() != 16
    {
        return Err(AuthError::InvalidWebPushSubscription);
    }
    Ok(())
}

fn install_totp_aad(login_name: &str) -> String {
    format!("g5-fleet/install/v1\0{login_name}\0totp")
}

fn user_totp_aad(user_id: &str) -> String {
    format!("g5-fleet/security/v1\0{user_id}\0totp")
}

fn user_pending_totp_aad(user_id: &str) -> String {
    format!("g5-fleet/security/v1\0{user_id}\0pending-totp")
}

fn login_scope_hash(login_name: &str) -> Vec<u8> {
    digest(login_name.trim().to_ascii_lowercase().as_bytes())
}

fn recovery_code_hash(code: &str) -> Vec<u8> {
    let normalized: String = code
        .chars()
        .filter(|character| *character != '-')
        .flat_map(char::to_uppercase)
        .collect();
    digest(normalized.as_bytes())
}

fn recovery_code_material() -> AuthResult<RecoveryCodeMaterial> {
    let mut clear = Vec::with_capacity(RECOVERY_CODE_COUNT);
    let mut records = Vec::with_capacity(RECOVERY_CODE_COUNT);
    for _ in 0..RECOVERY_CODE_COUNT {
        let encoded = URL_SAFE_NO_PAD
            .encode(random_bytes(9)?)
            .to_ascii_uppercase();
        let code = format!("{}-{}-{}", &encoded[0..4], &encoded[4..8], &encoded[8..12]);
        clear.push(code.clone());
        records.push((random_id("rcv", 12)?, recovery_code_hash(&code)));
    }
    Ok((clear, records))
}

fn create_totp_enrollment_challenge(
    issuer: &str,
    account_name: &str,
) -> AuthResult<(String, String, String)> {
    let secret = Secret::generate_secret()
        .to_bytes()
        .map_err(|_| AuthError::Encryption)?;
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret,
        Some(issuer.to_owned()),
        account_name.to_owned(),
    )
    .map_err(|_| AuthError::Encryption)?;
    let manual_entry_key = totp.get_secret_base32();
    let otpauth_uri = totp.get_url();
    Ok((manual_entry_key.clone(), manual_entry_key, otpauth_uri))
}

pub fn verify_totp_code(
    encoded_secret: &str,
    issuer: &str,
    account_name: &str,
    code: &str,
) -> AuthResult<bool> {
    let normalized = normalize_totp_code(code)?;
    build_totp(encoded_secret, issuer, account_name)?
        .check_current(&normalized)
        .map_err(|_| AuthError::InvalidSecondFactor)
}

pub fn generate_current_totp_code(
    encoded_secret: &str,
    issuer: &str,
    account_name: &str,
) -> AuthResult<String> {
    build_totp(encoded_secret, issuer, account_name)?
        .generate_current()
        .map_err(|_| AuthError::InvalidSecondFactor)
}

pub fn generate_fast_unlock_secret() -> AuthResult<String> {
    Ok(hex::encode(random_bytes(32)?))
}

fn build_totp(encoded_secret: &str, issuer: &str, account_name: &str) -> AuthResult<TOTP> {
    let secret = Secret::Encoded(encoded_secret.to_owned())
        .to_bytes()
        .map_err(|_| AuthError::InvalidSecondFactor)?;
    TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret,
        Some(issuer.to_owned()),
        account_name.to_owned(),
    )
    .map_err(|_| AuthError::InvalidSecondFactor)
}

fn normalize_totp_code(code: &str) -> AuthResult<String> {
    let normalized = code.trim();
    if normalized.len() != 6
        || !normalized
            .chars()
            .all(|character| character.is_ascii_digit())
    {
        return Err(AuthError::InvalidSecondFactor);
    }
    Ok(normalized.to_owned())
}

fn unix_timestamp() -> AuthResult<i64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| AuthError::Unauthorized)?
        .as_secs() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fast_unlock_secret_is_32_bytes_hex() {
        let secret = generate_fast_unlock_secret().expect("fast unlock secret");
        assert_eq!(secret.len(), 64);
        assert!(
            secret
                .chars()
                .all(|character| character.is_ascii_hexdigit())
        );
    }

    #[test]
    fn generated_totp_code_verifies_against_same_secret() {
        let (secret, _, _) =
            create_totp_enrollment_challenge("G5 Fleet", "admin").expect("challenge");
        let code = generate_current_totp_code(&secret, "G5 Fleet", "admin").expect("current code");
        assert!(verify_totp_code(&secret, "G5 Fleet", "admin", &code).expect("verify"));
    }

    #[test]
    fn invalid_totp_shape_is_rejected_before_totp_verify() {
        let (secret, _, _) =
            create_totp_enrollment_challenge("G5 Fleet", "admin").expect("challenge");
        assert!(matches!(
            verify_totp_code(&secret, "G5 Fleet", "admin", "12-ab"),
            Err(AuthError::InvalidSecondFactor)
        ));
    }
}
