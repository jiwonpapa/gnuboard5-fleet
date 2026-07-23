pub use g5_admin_runtime_types::{
    DatabaseMasterStorageMode, RuntimeSshAuthType, SessionStorageMode,
};
use serde::Deserialize;
use std::fs;
use thiserror::Error;

mod resolve;

use resolve::{
    default_db_master_storage, default_session_storage, normalize_api_base_url,
    resolve_config_path, resolve_db_master_storage, resolve_debug_overlay, resolve_session_storage,
};

#[derive(Debug, Error)]
pub enum RuntimeConfigError {
    #[error("{message}")]
    Config { message: String },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeConfigFile {
    #[serde(default)]
    api_base_url: Option<String>,
    #[serde(default)]
    debug_overlay: bool,
    #[serde(default = "default_session_storage")]
    session_storage: SessionStorageMode,
    #[serde(default = "default_db_master_storage")]
    db_master_storage: DatabaseMasterStorageMode,
    #[serde(default)]
    dev_bootstrap: Option<DevBootstrapConfigFile>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DevBootstrapConfigFile {
    #[serde(default)]
    master_password: Option<String>,
    #[serde(default)]
    site: Option<DevBootstrapSiteFile>,
    #[serde(default)]
    site_auth: Option<DevBootstrapSiteAuthFile>,
    #[serde(default)]
    ssh_profiles: Vec<DevBootstrapSshProfileFile>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DevBootstrapSiteFile {
    name: String,
    api_base_url: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DevBootstrapSiteAuthFile {
    mb_id: String,
    mb_password: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DevBootstrapSshProfileFile {
    name: String,
    host: String,
    #[serde(default)]
    port: Option<u16>,
    username: String,
    #[serde(default)]
    auth_type: Option<RuntimeSshAuthType>,
    #[serde(default)]
    key_path: Option<String>,
    #[serde(default)]
    password: Option<String>,
    #[serde(default)]
    key_passphrase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DevBootstrapConfig {
    pub master_password: Option<String>,
    pub site: Option<DevBootstrapSiteConfig>,
    pub site_auth: Option<DevBootstrapSiteAuthConfig>,
    pub ssh_profiles: Vec<DevBootstrapSshProfileConfig>,
}

impl DevBootstrapConfig {
    pub fn is_enabled(&self) -> bool {
        self.master_password.is_some()
            || self.site.is_some()
            || self.site_auth.is_some()
            || !self.ssh_profiles.is_empty()
    }
}

#[derive(Debug, Clone)]
pub struct DevBootstrapSiteConfig {
    pub name: String,
    pub api_base_url: String,
}

#[derive(Debug, Clone)]
pub struct DevBootstrapSiteAuthConfig {
    pub mb_id: String,
    pub mb_password: String,
}

#[derive(Debug, Clone)]
pub struct DevBootstrapSshProfileConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: RuntimeSshAuthType,
    pub key_path: Option<String>,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    pub legacy_api_base_url: Option<String>,
    pub debug_overlay: bool,
    pub session_storage: SessionStorageMode,
    pub db_master_storage: DatabaseMasterStorageMode,
    pub dev_bootstrap: Option<DevBootstrapConfig>,
}

impl RuntimeConfig {
    pub fn load() -> Result<Self, RuntimeConfigError> {
        if let Ok(raw_base_url) = std::env::var(resolve::API_BASE_URL_ENV_KEY) {
            return Self::from_parts(
                Some(raw_base_url),
                resolve_debug_overlay(cfg!(debug_assertions))?,
                resolve_session_storage(default_session_storage())?,
                resolve_db_master_storage(default_db_master_storage())?,
                None,
                resolve::API_BASE_URL_ENV_KEY,
            );
        }

        let Some(config_path) = resolve_config_path()? else {
            let config = Self {
                legacy_api_base_url: None,
                debug_overlay: resolve_debug_overlay(cfg!(debug_assertions))?,
                session_storage: resolve_session_storage(default_session_storage())?,
                db_master_storage: resolve_db_master_storage(default_db_master_storage())?,
                dev_bootstrap: None,
            };

            tracing::info!(
                component = "g5_admin::runtime_config",
                operation = "load",
                target = "defaults",
                debug_overlay = config.debug_overlay,
                session_storage = config.session_storage.as_str(),
                db_master_storage = config.db_master_storage.as_str(),
                "loaded runtime config without legacy apiBaseUrl"
            );

            return Ok(config);
        };

        let config_body =
            fs::read_to_string(&config_path).map_err(|error| RuntimeConfigError::Config {
                message: format!(
                    "failed to read runtime config at {}: {error}",
                    config_path.display()
                ),
            })?;
        let parsed: RuntimeConfigFile =
            serde_json::from_str(&config_body).map_err(|error| RuntimeConfigError::Config {
                message: format!(
                    "failed to parse runtime config at {}: {error}",
                    config_path.display()
                ),
            })?;
        let config = Self::from_parts(
            parsed.api_base_url,
            resolve_debug_overlay(parsed.debug_overlay)?,
            resolve_session_storage(parsed.session_storage)?,
            resolve_db_master_storage(parsed.db_master_storage)?,
            normalize_dev_bootstrap(parsed.dev_bootstrap, &config_path.to_string_lossy())?,
            &config_path.to_string_lossy(),
        )?;

        tracing::info!(
            component = "g5_admin::runtime_config",
            operation = "load",
            target = "app-config.json",
            config_path = %config_path.display(),
            legacy_api_base_url = config.legacy_api_base_url.as_deref().unwrap_or("-"),
            debug_overlay = config.debug_overlay,
            session_storage = config.session_storage.as_str(),
            db_master_storage = config.db_master_storage.as_str(),
            "loaded runtime config from file"
        );

        Ok(config)
    }

    fn from_parts(
        raw_base_url: Option<String>,
        debug_overlay: bool,
        session_storage: SessionStorageMode,
        db_master_storage: DatabaseMasterStorageMode,
        dev_bootstrap: Option<DevBootstrapConfig>,
        source: &str,
    ) -> Result<Self, RuntimeConfigError> {
        let legacy_api_base_url = raw_base_url
            .map(|value| normalize_api_base_url(&value, source))
            .transpose()?;

        tracing::info!(
            component = "g5_admin::runtime_config",
            operation = "resolve_api_base_url",
            target = source,
            legacy_api_base_url = legacy_api_base_url.as_deref().unwrap_or("-"),
            debug_overlay,
            session_storage = session_storage.as_str(),
            db_master_storage = db_master_storage.as_str(),
            "resolved runtime config"
        );

        Ok(Self {
            legacy_api_base_url,
            debug_overlay,
            session_storage,
            db_master_storage,
            dev_bootstrap,
        })
    }
}

fn normalize_dev_bootstrap(
    raw: Option<DevBootstrapConfigFile>,
    source: &str,
) -> Result<Option<DevBootstrapConfig>, RuntimeConfigError> {
    let Some(raw) = raw else {
        return Ok(None);
    };

    let master_password = normalize_optional_field(raw.master_password);
    let site = match raw.site {
        Some(site) => Some(DevBootstrapSiteConfig {
            name: require_non_empty(site.name, source, "devBootstrap.site.name")?,
            api_base_url: normalize_api_base_url(&site.api_base_url, source)?,
        }),
        None => None,
    };
    let site_auth = match raw.site_auth {
        Some(site_auth) => Some(DevBootstrapSiteAuthConfig {
            mb_id: require_non_empty(site_auth.mb_id, source, "devBootstrap.siteAuth.mbId")?,
            mb_password: require_non_empty(
                site_auth.mb_password,
                source,
                "devBootstrap.siteAuth.mbPassword",
            )?,
        }),
        None => None,
    };
    if site_auth.is_some() && site.is_none() {
        return Err(RuntimeConfigError::Config {
            message: format!(
                "{source} devBootstrap.siteAuth는 devBootstrap.site와 함께 설정해야 합니다."
            ),
        });
    }

    let mut ssh_profiles = Vec::with_capacity(raw.ssh_profiles.len());
    for (index, profile) in raw.ssh_profiles.into_iter().enumerate() {
        let auth_type = profile.auth_type.unwrap_or_else(|| {
            if profile
                .key_path
                .as_ref()
                .is_some_and(|value| !value.trim().is_empty())
            {
                RuntimeSshAuthType::Key
            } else {
                RuntimeSshAuthType::Password
            }
        });
        if matches!(auth_type, RuntimeSshAuthType::Agent) {
            return Err(RuntimeConfigError::Config {
                message: format!(
                    "{source} devBootstrap.sshProfiles[{index}]는 아직 지원하지 않는 SSH agent 인증을 사용할 수 없습니다."
                ),
            });
        }

        let key_path = normalize_optional_field(profile.key_path);
        let password = normalize_optional_field(profile.password);
        let key_passphrase = normalize_optional_field(profile.key_passphrase);
        match auth_type {
            RuntimeSshAuthType::Password => {
                if password.is_none() {
                    return Err(RuntimeConfigError::Config {
                        message: format!(
                            "{source} devBootstrap.sshProfiles[{index}]는 password 인증일 때 password가 필요합니다."
                        ),
                    });
                }
            }
            RuntimeSshAuthType::Key => {
                if key_path.is_none() {
                    return Err(RuntimeConfigError::Config {
                        message: format!(
                            "{source} devBootstrap.sshProfiles[{index}]는 key 인증일 때 keyPath가 필요합니다."
                        ),
                    });
                }
            }
            RuntimeSshAuthType::Agent => {}
        }

        ssh_profiles.push(DevBootstrapSshProfileConfig {
            name: require_non_empty(profile.name, source, "devBootstrap.sshProfiles[].name")?,
            host: require_non_empty(profile.host, source, "devBootstrap.sshProfiles[].host")?,
            port: profile.port.unwrap_or(22),
            username: require_non_empty(
                profile.username,
                source,
                "devBootstrap.sshProfiles[].username",
            )?,
            auth_type,
            key_path,
            password,
            key_passphrase,
        });
    }

    let config = DevBootstrapConfig {
        master_password,
        site,
        site_auth,
        ssh_profiles,
    };

    if config.is_enabled() {
        return Ok(Some(config));
    }

    Ok(None)
}

fn normalize_optional_field(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let normalized = raw.trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}

fn require_non_empty(
    value: String,
    source: &str,
    field: &str,
) -> Result<String, RuntimeConfigError> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        return Err(RuntimeConfigError::Config {
            message: format!("{source} {field} must not be empty"),
        });
    }

    Ok(normalized)
}

#[cfg(test)]
mod tests;
