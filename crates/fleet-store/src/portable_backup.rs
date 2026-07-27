use std::time::{SystemTime, UNIX_EPOCH};

use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};

use crate::{SiteImportRecord, SiteRecord, StoreError, StoreResult};

const FORMAT: &str = "g5-fleet-portable-backup-v1";
const CIPHER: &str = "aes-256-gcm";
const KDF: &str = "argon2id";
const MEMORY_KIB: u32 = 19_456;
const ITERATIONS: u32 = 2;
const LANES: u32 = 1;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct PortableBackupEnvelope {
    pub format: String,
    pub version: u8,
    pub cipher: String,
    pub kdf: String,
    pub kdf_memory_kib: u32,
    pub kdf_iterations: u32,
    pub kdf_lanes: u32,
    pub created_at_unix: u64,
    pub site_count: usize,
    pub salt_b64: String,
    pub nonce_b64: String,
    pub ciphertext_b64: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct PortableBackupPayload {
    sites: Vec<SiteImportRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PortableBackupImport {
    pub sites: Vec<SiteImportRecord>,
}

pub fn encrypt_portable_backup(
    sites: &[SiteRecord],
    password: &str,
) -> StoreResult<PortableBackupEnvelope> {
    validate_password(password)?;
    if sites.len() > 1_000 {
        return Err(StoreError::PortableBackup(
            "site count exceeds the 1000 site safety limit".to_owned(),
        ));
    }
    let payload = PortableBackupPayload {
        sites: sites
            .iter()
            .map(|site| SiteImportRecord {
                site_id: site.site_id.clone(),
                display_name: site.display_name.clone(),
                base_url: site.base_url.clone(),
                status: site.status.clone(),
            })
            .collect(),
    };
    let plaintext = serde_json::to_vec(&payload)?;
    let mut salt = [0_u8; SALT_LEN];
    getrandom::fill(&mut salt)
        .map_err(|error| StoreError::PortableBackup(format!("salt generation failed: {error}")))?;
    let mut nonce = [0_u8; NONCE_LEN];
    getrandom::fill(&mut nonce)
        .map_err(|error| StoreError::PortableBackup(format!("nonce generation failed: {error}")))?;
    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|_| StoreError::PortableBackup("cipher initialization failed".to_owned()))?;
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext.as_ref())
        .map_err(|_| StoreError::PortableBackup("backup encryption failed".to_owned()))?;
    Ok(PortableBackupEnvelope {
        format: FORMAT.to_owned(),
        version: 1,
        cipher: CIPHER.to_owned(),
        kdf: KDF.to_owned(),
        kdf_memory_kib: MEMORY_KIB,
        kdf_iterations: ITERATIONS,
        kdf_lanes: LANES,
        created_at_unix: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| StoreError::PortableBackup("system clock is invalid".to_owned()))?
            .as_secs(),
        site_count: sites.len(),
        salt_b64: STANDARD.encode(salt),
        nonce_b64: STANDARD.encode(nonce),
        ciphertext_b64: STANDARD.encode(ciphertext),
    })
}

pub fn decrypt_portable_backup(
    envelope: &PortableBackupEnvelope,
    password: &str,
) -> StoreResult<PortableBackupImport> {
    validate_password(password)?;
    if envelope.format != FORMAT
        || envelope.version != 1
        || envelope.cipher != CIPHER
        || envelope.kdf != KDF
        || envelope.kdf_memory_kib != MEMORY_KIB
        || envelope.kdf_iterations != ITERATIONS
        || envelope.kdf_lanes != LANES
        || envelope.site_count > 1_000
    {
        return Err(StoreError::PortableBackup(
            "unsupported or unsafe backup metadata".to_owned(),
        ));
    }
    let salt = decode_fixed::<SALT_LEN>(&envelope.salt_b64, "salt")?;
    let nonce = decode_fixed::<NONCE_LEN>(&envelope.nonce_b64, "nonce")?;
    let ciphertext = STANDARD
        .decode(&envelope.ciphertext_b64)
        .map_err(|_| StoreError::PortableBackup("ciphertext is not valid base64".to_owned()))?;
    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|_| StoreError::PortableBackup("cipher initialization failed".to_owned()))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|_| {
            StoreError::PortableBackup(
                "backup password is wrong or the backup is damaged".to_owned(),
            )
        })?;
    let payload: PortableBackupPayload = serde_json::from_slice(&plaintext)?;
    if payload.sites.len() != envelope.site_count {
        return Err(StoreError::PortableBackup(
            "site count does not match encrypted payload".to_owned(),
        ));
    }
    for site in &payload.sites {
        if site.site_id.is_empty()
            || site.site_id.len() > 128
            || site.display_name.is_empty()
            || site.display_name.len() > 200
            || site.base_url.len() < 8
            || site.base_url.len() > 2_048
            || !matches!(site.status.as_str(), "pending" | "active" | "disabled")
        {
            return Err(StoreError::PortableBackup(
                "backup contains an invalid site record".to_owned(),
            ));
        }
    }
    Ok(PortableBackupImport {
        sites: payload.sites,
    })
}

fn validate_password(password: &str) -> StoreResult<()> {
    if password.trim().len() < 12 {
        return Err(StoreError::PortableBackup(
            "backup password must contain at least 12 characters".to_owned(),
        ));
    }
    Ok(())
}

fn derive_key(password: &str, salt: &[u8]) -> StoreResult<[u8; KEY_LEN]> {
    let params = Params::new(MEMORY_KIB, ITERATIONS, LANES, Some(KEY_LEN))
        .map_err(|error| StoreError::PortableBackup(format!("invalid KDF parameters: {error}")))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0_u8; KEY_LEN];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|error| StoreError::PortableBackup(format!("KDF failed: {error}")))?;
    Ok(key)
}

fn decode_fixed<const N: usize>(encoded: &str, field: &str) -> StoreResult<[u8; N]> {
    let decoded = STANDARD
        .decode(encoded)
        .map_err(|_| StoreError::PortableBackup(format!("{field} is not valid base64")))?;
    decoded
        .try_into()
        .map_err(|_| StoreError::PortableBackup(format!("{field} has an invalid length")))
}
