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
use g5_fleet_store::{FleetStore, StoreError};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

const SESSION_TTL: Duration = Duration::from_secs(12 * 60 * 60);
const STEP_UP_TTL: Duration = Duration::from_secs(10 * 60);
const KEY_VERSION: i64 = 1;
const CIPHER_NAME: &str = "AES-256-GCM";

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
    #[error("password policy requires 12-128 characters")]
    PasswordPolicy,
    #[error("invalid master key")]
    InvalidMasterKey,
    #[error("invalid secret purpose")]
    InvalidSecretPurpose,
    #[error("secret encryption failed")]
    Encryption,
    #[error("secret decryption failed")]
    Decryption,
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

    pub async fn bootstrap_admin(&self, login_name: &str, password: &str) -> AuthResult<String> {
        validate_password(password)?;
        validate_login_name(login_name)?;
        let user_id = random_id("usr", 18)?;
        let password_hash = hash_password(password)?;
        self.store
            .create_initial_user(&user_id, login_name, password_hash.as_bytes())
            .await?;
        Ok(user_id)
    }

    pub async fn login(&self, login_name: &str, password: &str) -> AuthResult<SessionTokens> {
        let credential = self.store.credential_by_login(login_name).await?;
        let encoded = credential
            .as_ref()
            .and_then(|value| std::str::from_utf8(&value.password_hash).ok())
            .unwrap_or(&self.dummy_hash);
        let verified = verify_password(encoded, password);
        let Some(credential) = credential else {
            return Err(AuthError::InvalidCredentials);
        };
        if !verified || credential.status != "active" {
            return Err(AuthError::InvalidCredentials);
        }

        let session_id = random_id("ses", 18)?;
        let session_token = random_token(32)?;
        let csrf_token = random_token(32)?;
        let now = unix_timestamp()?;
        let expires_at_unix = now + SESSION_TTL.as_secs() as i64;
        self.store
            .create_web_session(
                &session_id,
                &credential.user_id,
                &digest(session_token.as_bytes()),
                &digest(csrf_token.as_bytes()),
                expires_at_unix,
            )
            .await?;
        Ok(SessionTokens {
            session_token,
            csrf_token,
            expires_at_unix,
        })
    }

    pub async fn create_user(
        &self,
        actor: &PrincipalSession,
        login_name: &str,
        password: &str,
    ) -> AuthResult<String> {
        self.require_recent_step_up(actor)?;
        validate_password(password)?;
        validate_login_name(login_name)?;
        let user_id = random_id("usr", 18)?;
        let password_hash = hash_password(password)?;
        self.store
            .create_user(&user_id, login_name, password_hash.as_bytes())
            .await?;
        Ok(user_id)
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
        let Some(credential) = self.store.credential_by_user(&session.principal_id).await? else {
            return Err(AuthError::InvalidCredentials);
        };
        let encoded = std::str::from_utf8(&credential.password_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;
        if !verify_password(encoded, password) {
            return Err(AuthError::InvalidCredentials);
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

fn unix_timestamp() -> AuthResult<i64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| AuthError::Unauthorized)?
        .as_secs() as i64)
}
