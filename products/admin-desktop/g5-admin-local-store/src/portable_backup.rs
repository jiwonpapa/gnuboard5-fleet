use crate::error::AppError;
use crate::{Site, SshAuthType, SshProfile};
use argon2::{
    Algorithm as Argon2Algorithm, Argon2, Params as Argon2Params, Version as Argon2Version,
};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

const PORTABLE_BACKUP_FORMAT: &str = "g5-admin-portable-backup-v1";
const PORTABLE_BACKUP_VERSION: u8 = 1;
const PORTABLE_BACKUP_CIPHER: &str = "xchacha20poly1305";
const PORTABLE_BACKUP_KDF: &str = "argon2id";
const PORTABLE_BACKUP_KEY_LEN: usize = 32;
const PORTABLE_BACKUP_NONCE_LEN: usize = 24;
const PORTABLE_BACKUP_SALT_LEN: usize = 16;
const PORTABLE_BACKUP_MEMORY_KIB: u32 = 19_456;
const PORTABLE_BACKUP_ITERATIONS: u32 = 2;
const PORTABLE_BACKUP_LANES: u32 = 1;

type PortableBackupSource = (Vec<Site>, Vec<(String, String, String)>, Vec<SshProfile>);

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortableBackupEnvelope {
    format: String,
    version: u8,
    cipher: String,
    kdf: String,
    kdf_memory_kib: u32,
    kdf_iterations: u32,
    kdf_lanes: u32,
    created_at_epoch: u64,
    site_count: usize,
    salt_b64: String,
    nonce_b64: String,
    ciphertext_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(super) struct PortableBackupPayload {
    sites: Vec<PortableBackupSite>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortableBackupSite {
    site: PortableBackupSiteRecord,
    #[serde(default)]
    ssh_profiles: Vec<PortableBackupSshProfile>,
    settings: Vec<PortableBackupSetting>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortableBackupSiteRecord {
    id: String,
    name: String,
    api_base_url: String,
    is_default: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortableBackupSshProfile {
    id: String,
    name: String,
    host: String,
    port: u16,
    username: String,
    auth_type: String,
    key_path: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortableBackupSetting {
    key: String,
    value: String,
}

impl PortableBackupPayload {
    pub(super) fn from_source(
        sites: Vec<Site>,
        site_settings: Vec<(String, String, String)>,
        ssh_profiles: Vec<SshProfile>,
    ) -> Self {
        let mut settings_by_site: HashMap<String, Vec<PortableBackupSetting>> = HashMap::new();
        for (site_id, key, value) in site_settings {
            settings_by_site
                .entry(site_id)
                .or_default()
                .push(PortableBackupSetting { key, value });
        }
        let mut ssh_profiles_by_site: HashMap<String, Vec<PortableBackupSshProfile>> =
            HashMap::new();
        for profile in ssh_profiles {
            ssh_profiles_by_site
                .entry(profile.site_id.clone())
                .or_default()
                .push(PortableBackupSshProfile {
                    id: profile.id,
                    name: profile.name,
                    host: profile.host,
                    port: profile.port,
                    username: profile.username,
                    auth_type: backup_auth_type(&profile.auth_type).to_string(),
                    key_path: profile.key_path,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at,
                });
        }

        let sites = sites
            .into_iter()
            .map(|site| PortableBackupSite {
                ssh_profiles: ssh_profiles_by_site.remove(&site.id).unwrap_or_default(),
                settings: settings_by_site.remove(&site.id).unwrap_or_default(),
                site: PortableBackupSiteRecord::from_site(site),
            })
            .collect();

        Self { sites }
    }

    pub(super) fn into_source(self) -> PortableBackupSource {
        let mut sites = Vec::with_capacity(self.sites.len());
        let mut settings = Vec::new();
        let mut ssh_profiles = Vec::new();

        for item in self.sites {
            let site = item.site.into_site();
            let site_id = site.id.clone();
            for setting in item.settings {
                settings.push((site_id.clone(), setting.key, setting.value));
            }
            for profile in item.ssh_profiles {
                ssh_profiles.push(SshProfile {
                    id: profile.id,
                    site_id: site_id.clone(),
                    name: profile.name,
                    host: profile.host,
                    port: profile.port,
                    username: profile.username,
                    auth_type: backup_auth_type_from_str(&profile.auth_type),
                    key_path: profile.key_path,
                    has_password: false,
                    has_key_passphrase: false,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at,
                });
            }
            sites.push(site);
        }

        (sites, settings, ssh_profiles)
    }

    pub(super) fn site_count(&self) -> usize {
        self.sites.len()
    }
}

impl PortableBackupSiteRecord {
    fn from_site(site: Site) -> Self {
        Self {
            id: site.id,
            name: site.name,
            api_base_url: site.api_base_url,
            is_default: site.is_default,
            created_at: site.created_at,
            updated_at: site.updated_at,
        }
    }

    fn into_site(self) -> Site {
        Site {
            id: self.id,
            name: self.name,
            api_base_url: self.api_base_url,
            is_default: self.is_default,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

fn backup_auth_type(auth_type: &SshAuthType) -> &'static str {
    match auth_type {
        SshAuthType::Password => "Password",
        SshAuthType::Key => "Key",
        SshAuthType::Agent => "Agent",
    }
}

fn backup_auth_type_from_str(raw: &str) -> SshAuthType {
    match raw {
        "Password" | "password" => SshAuthType::Password,
        "Key" | "key" => SshAuthType::Key,
        _ => SshAuthType::Agent,
    }
}

pub(super) fn looks_like_portable_backup(raw: &[u8]) -> bool {
    raw.iter()
        .copied()
        .find(|byte| !byte.is_ascii_whitespace())
        .is_some_and(|byte| byte == b'{')
}

pub(super) fn encrypt_portable_backup(
    payload_bytes: &[u8],
    backup_password: &str,
    site_count: usize,
) -> Result<Vec<u8>, AppError> {
    let mut salt = [0_u8; PORTABLE_BACKUP_SALT_LEN];
    getrandom::fill(&mut salt).map_err(|error| AppError::Storage {
        target: "backup.encrypt.salt".to_string(),
        error: error.to_string(),
    })?;
    let mut nonce = [0_u8; PORTABLE_BACKUP_NONCE_LEN];
    getrandom::fill(&mut nonce).map_err(|error| AppError::Storage {
        target: "backup.encrypt.nonce".to_string(),
        error: error.to_string(),
    })?;
    let key = derive_backup_key(backup_password, &salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|error| AppError::Storage {
        target: "backup.encrypt.cipher_init".to_string(),
        error: error.to_string(),
    })?;
    let nonce = XNonce::try_from(nonce.as_slice()).map_err(|error| AppError::Storage {
        target: "backup.encrypt.nonce_shape".to_string(),
        error: error.to_string(),
    })?;
    let ciphertext = cipher
        .encrypt(&nonce, payload_bytes)
        .map_err(|error| AppError::Storage {
            target: "backup.encrypt.ciphertext".to_string(),
            error: error.to_string(),
        })?;

    let envelope = PortableBackupEnvelope {
        format: PORTABLE_BACKUP_FORMAT.to_string(),
        version: PORTABLE_BACKUP_VERSION,
        cipher: PORTABLE_BACKUP_CIPHER.to_string(),
        kdf: PORTABLE_BACKUP_KDF.to_string(),
        kdf_memory_kib: PORTABLE_BACKUP_MEMORY_KIB,
        kdf_iterations: PORTABLE_BACKUP_ITERATIONS,
        kdf_lanes: PORTABLE_BACKUP_LANES,
        created_at_epoch: current_backup_epoch_seconds(),
        site_count,
        salt_b64: BASE64_STANDARD.encode(salt),
        nonce_b64: BASE64_STANDARD.encode(nonce),
        ciphertext_b64: BASE64_STANDARD.encode(ciphertext),
    };

    serde_json::to_vec_pretty(&envelope).map_err(|error| AppError::Storage {
        target: "backup.envelope.serialize".to_string(),
        error: error.to_string(),
    })
}

pub(super) fn decrypt_portable_backup(
    raw: &[u8],
    backup_password: &str,
) -> Result<PortableBackupPayload, AppError> {
    if backup_password.is_empty() {
        return Err(AppError::Config {
            message: "휴대용 백업을 가져오려면 백업 암호를 입력해 주십시오.".to_string(),
        });
    }

    let envelope: PortableBackupEnvelope =
        serde_json::from_slice(raw).map_err(|error| AppError::Storage {
            target: "backup.envelope.parse".to_string(),
            error: error.to_string(),
        })?;
    if envelope.format != PORTABLE_BACKUP_FORMAT || envelope.version != PORTABLE_BACKUP_VERSION {
        return Err(AppError::Storage {
            target: "backup.envelope.version".to_string(),
            error: "지원하지 않는 휴대용 백업 포맷입니다.".to_string(),
        });
    }

    let salt = BASE64_STANDARD
        .decode(envelope.salt_b64)
        .map_err(|error| AppError::Storage {
            target: "backup.envelope.salt".to_string(),
            error: error.to_string(),
        })?;
    let nonce = BASE64_STANDARD
        .decode(envelope.nonce_b64)
        .map_err(|error| AppError::Storage {
            target: "backup.envelope.nonce".to_string(),
            error: error.to_string(),
        })?;
    let ciphertext = BASE64_STANDARD
        .decode(envelope.ciphertext_b64)
        .map_err(|error| AppError::Storage {
            target: "backup.envelope.ciphertext".to_string(),
            error: error.to_string(),
        })?;

    if salt.len() != PORTABLE_BACKUP_SALT_LEN || nonce.len() != PORTABLE_BACKUP_NONCE_LEN {
        return Err(AppError::Storage {
            target: "backup.envelope.shape".to_string(),
            error: "휴대용 백업 메타데이터가 손상되었습니다.".to_string(),
        });
    }

    let key = derive_backup_key(backup_password, &salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|error| AppError::Storage {
        target: "backup.decrypt.cipher_init".to_string(),
        error: error.to_string(),
    })?;
    let nonce = XNonce::try_from(nonce.as_slice()).map_err(|error| AppError::Storage {
        target: "backup.decrypt.nonce_shape".to_string(),
        error: error.to_string(),
    })?;
    let plaintext = cipher
        .decrypt(&nonce, ciphertext.as_ref())
        .map_err(|_| AppError::Auth {
            message: "백업 암호가 올바르지 않거나 백업 파일이 손상되었습니다.".to_string(),
        })?;

    serde_json::from_slice(&plaintext).map_err(|error| AppError::Storage {
        target: "backup.payload.parse".to_string(),
        error: error.to_string(),
    })
}

fn derive_backup_key(
    backup_password: &str,
    salt: &[u8],
) -> Result<[u8; PORTABLE_BACKUP_KEY_LEN], AppError> {
    let params = Argon2Params::new(
        PORTABLE_BACKUP_MEMORY_KIB,
        PORTABLE_BACKUP_ITERATIONS,
        PORTABLE_BACKUP_LANES,
        Some(PORTABLE_BACKUP_KEY_LEN),
    )
    .map_err(|error| AppError::Storage {
        target: "backup.kdf.params".to_string(),
        error: error.to_string(),
    })?;
    let argon2 = Argon2::new(Argon2Algorithm::Argon2id, Argon2Version::V0x13, params);
    let mut key = [0_u8; PORTABLE_BACKUP_KEY_LEN];
    argon2
        .hash_password_into(backup_password.as_bytes(), salt, &mut key)
        .map_err(|error| AppError::Storage {
            target: "backup.kdf.derive".to_string(),
            error: error.to_string(),
        })?;
    Ok(key)
}

fn current_backup_epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}
