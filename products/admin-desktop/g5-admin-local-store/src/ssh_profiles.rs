use super::*;
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

impl SiteRepository {
    pub fn load_ssh_profiles(&self, site_id: &str) -> Result<Vec<SshProfile>, AppError> {
        let connection = open_connection(&self.config)?;
        ensure_site_exists(&connection, site_id)?;
        let mut statement = connection
            .prepare(
                "SELECT id, site_id, name, host, port, username, auth_type, key_path, created_at, updated_at
                 FROM ssh_profiles
                 WHERE site_id = ?1
                 ORDER BY created_at ASC, name ASC",
            )
            .map_err(storage_error("ssh_profiles.prepare_list"))?;
        let rows = statement
            .query_map(params![site_id], map_ssh_profile_row)
            .map_err(storage_error("ssh_profiles.query_list"))?;

        let mut profiles = Vec::new();
        for row in rows {
            let mut profile = row.map_err(storage_error("ssh_profiles.row"))?;
            hydrate_ssh_profile_secret_flags(&connection, &mut profile)?;
            profiles.push(profile);
        }

        Ok(profiles)
    }

    pub fn load_ssh_profile_connection_record(
        &self,
        site_id: &str,
        ssh_profile_id: &str,
    ) -> Result<SshProfileConnectionRecord, AppError> {
        let connection = open_connection(&self.config)?;
        ensure_site_exists(&connection, site_id)?;
        let profile = connection
            .query_row(
                "SELECT id, site_id, name, host, port, username, auth_type, key_path, created_at, updated_at
                 FROM ssh_profiles
                 WHERE site_id = ?1 AND id = ?2",
                params![site_id, ssh_profile_id],
                map_ssh_profile_row,
            )
            .optional()
            .map_err(storage_error("ssh_profiles.connection_profile"))?
            .ok_or_else(|| AppError::Config {
                message: "요청한 SSH 프로필을 찾을 수 없습니다.".to_string(),
            })?;
        let password = load_or_migrate_ssh_secret(
            &connection,
            ssh_password_setting_key(ssh_profile_id).as_str(),
            ssh_password_account(ssh_profile_id).as_str(),
        )?;
        let key_passphrase = load_or_migrate_ssh_secret(
            &connection,
            ssh_key_passphrase_setting_key(ssh_profile_id).as_str(),
            ssh_key_passphrase_account(ssh_profile_id).as_str(),
        )?;

        if matches!(profile.auth_type, SshAuthType::Password) && password.is_none() {
            return Err(AppError::Config {
                message:
                    "SSH 비밀번호가 저장되어 있지 않습니다. 프로필에서 비밀번호를 다시 입력해 주십시오."
                        .to_string(),
            });
        }

        Ok(SshProfileConnectionRecord {
            profile,
            password,
            key_passphrase,
        })
    }

    pub fn insert_ssh_profile(&self, input: SshProfileInsert) -> Result<SshProfile, AppError> {
        let normalized = normalize_ssh_profile_insert(input)?;
        let connection = open_connection(&self.config)?;
        ensure_site_exists(&connection, &normalized.site_id)?;
        let profile_id = Uuid::new_v4().to_string();

        connection
            .execute(
                "INSERT INTO ssh_profiles (
                   id,
                   site_id,
                   name,
                   host,
                   port,
                   username,
                   auth_type,
                   key_path,
                   created_at,
                   updated_at
                 ) VALUES (
                   ?1,
                   ?2,
                   ?3,
                   ?4,
                   ?5,
                   ?6,
                   ?7,
                   ?8,
                   datetime('now'),
                   datetime('now')
                 )",
                params![
                    profile_id,
                    normalized.site_id,
                    normalized.name,
                    normalized.host,
                    i64::from(normalized.port),
                    normalized.username,
                    auth_type_to_db(&normalized.auth_type),
                    normalized.key_path,
                ],
            )
            .map_err(storage_error("ssh_profiles.insert"))?;

        store_ssh_profile_secrets(
            &connection,
            &profile_id,
            &normalized.password,
            &normalized.key_passphrase,
        )?;

        self.find_ssh_profile(&normalized.site_id, &profile_id)?
            .ok_or_else(|| AppError::Storage {
                target: "ssh_profiles.find_after_insert".to_string(),
                error: "failed to read inserted SSH profile".to_string(),
            })
    }

    pub fn update_ssh_profile(
        &self,
        input: SshProfileUpdateRecord,
    ) -> Result<SshProfile, AppError> {
        let normalized = normalize_ssh_profile_update(input)?;
        let connection = open_connection(&self.config)?;
        ensure_site_exists(&connection, &normalized.site_id)?;
        ensure_ssh_profile_exists(&connection, &normalized.site_id, &normalized.ssh_profile_id)?;

        connection
            .execute(
                "UPDATE ssh_profiles
                 SET name = ?3,
                     host = ?4,
                     port = ?5,
                     username = ?6,
                     auth_type = ?7,
                     key_path = ?8,
                     updated_at = datetime('now')
                 WHERE site_id = ?1 AND id = ?2",
                params![
                    normalized.site_id,
                    normalized.ssh_profile_id,
                    normalized.name,
                    normalized.host,
                    i64::from(normalized.port),
                    normalized.username,
                    auth_type_to_db(&normalized.auth_type),
                    normalized.key_path,
                ],
            )
            .map_err(storage_error("ssh_profiles.update"))?;

        update_ssh_profile_secrets(
            &connection,
            &normalized.ssh_profile_id,
            &normalized.auth_type,
            normalized.password.as_deref(),
            normalized.key_passphrase.as_deref(),
            normalized.clear_password,
            normalized.clear_key_passphrase,
        )?;

        self.find_ssh_profile(&normalized.site_id, &normalized.ssh_profile_id)?
            .ok_or_else(|| AppError::Storage {
                target: "ssh_profiles.find_after_update".to_string(),
                error: format!(
                    "failed to read updated SSH profile {}",
                    normalized.ssh_profile_id
                ),
            })
    }

    pub fn delete_ssh_profile(&self, site_id: &str, ssh_profile_id: &str) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        ensure_site_exists(&connection, site_id)?;
        ensure_ssh_profile_exists(&connection, site_id, ssh_profile_id)?;
        clear_ssh_profile_secrets(&connection, ssh_profile_id)?;
        connection
            .execute(
                "DELETE FROM ssh_profiles WHERE site_id = ?1 AND id = ?2",
                params![site_id, ssh_profile_id],
            )
            .map_err(storage_error("ssh_profiles.delete"))?;
        Ok(())
    }

    pub(super) fn delete_ssh_profiles_for_site(&self, site_id: &str) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        let mut statement = connection
            .prepare("SELECT id FROM ssh_profiles WHERE site_id = ?1")
            .map_err(storage_error("ssh_profiles.prepare_list_for_site_delete"))?;
        let rows = statement
            .query_map(params![site_id], |row| row.get::<_, String>(0))
            .map_err(storage_error("ssh_profiles.query_list_for_site_delete"))?;

        for row in rows {
            let profile_id = row.map_err(storage_error("ssh_profiles.row_for_site_delete"))?;
            clear_ssh_profile_secrets(&connection, &profile_id)?;
        }

        Ok(())
    }

    pub(super) fn find_ssh_profile(
        &self,
        site_id: &str,
        ssh_profile_id: &str,
    ) -> Result<Option<SshProfile>, AppError> {
        let connection = open_connection(&self.config)?;
        let profile = connection
            .query_row(
                "SELECT id, site_id, name, host, port, username, auth_type, key_path, created_at, updated_at
                 FROM ssh_profiles
                 WHERE site_id = ?1 AND id = ?2",
                params![site_id, ssh_profile_id],
                map_ssh_profile_row,
            )
            .optional()
            .map_err(storage_error("ssh_profiles.find"))?;

        let Some(mut profile) = profile else {
            return Ok(None);
        };
        hydrate_ssh_profile_secret_flags(&connection, &mut profile)?;
        Ok(Some(profile))
    }
}

fn map_ssh_profile_row(row: &rusqlite::Row<'_>) -> Result<SshProfile, rusqlite::Error> {
    let id: String = row.get(0)?;
    let auth_type_raw: String = row.get(6)?;
    let auth_type = db_to_auth_type(&auth_type_raw).map_err(|message| {
        rusqlite::Error::FromSqlConversionFailure(
            6,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                message,
            )),
        )
    })?;

    Ok(SshProfile {
        id: id.clone(),
        site_id: row.get(1)?,
        name: row.get(2)?,
        host: row.get(3)?,
        port: row.get::<_, u16>(4)?,
        username: row.get(5)?,
        auth_type,
        key_path: row.get(7)?,
        has_password: false,
        has_key_passphrase: false,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn normalize_ssh_profile_insert(input: SshProfileInsert) -> Result<SshProfileInsert, AppError> {
    let normalized = SshProfileInsert {
        site_id: normalize_required_text(
            "ssh_profiles.site_id",
            &input.site_id,
            "사이트를 선택해 주십시오.",
        )?,
        name: normalize_required_text(
            "ssh_profiles.name",
            &input.name,
            "SSH 프로필 이름을 입력해 주십시오.",
        )?,
        host: normalize_required_text(
            "ssh_profiles.host",
            &input.host,
            "SSH 호스트를 입력해 주십시오.",
        )?,
        port: normalize_port(input.port)?,
        username: normalize_required_text(
            "ssh_profiles.username",
            &input.username,
            "SSH 계정을 입력해 주십시오.",
        )?,
        auth_type: input.auth_type,
        key_path: normalize_optional_text(input.key_path),
        password: normalize_optional_secret(input.password),
        key_passphrase: normalize_optional_secret(input.key_passphrase),
    };

    validate_ssh_profile_secret_rules(
        &normalized.auth_type,
        normalized.key_path.as_deref(),
        normalized.password.as_deref(),
        normalized.key_passphrase.as_deref(),
    )?;

    Ok(normalized)
}

fn normalize_ssh_profile_update(
    input: SshProfileUpdateRecord,
) -> Result<SshProfileUpdateRecord, AppError> {
    let normalized = SshProfileUpdateRecord {
        site_id: normalize_required_text(
            "ssh_profiles.site_id",
            &input.site_id,
            "사이트를 선택해 주십시오.",
        )?,
        ssh_profile_id: normalize_required_text(
            "ssh_profiles.id",
            &input.ssh_profile_id,
            "SSH 프로필을 선택해 주십시오.",
        )?,
        name: normalize_required_text(
            "ssh_profiles.name",
            &input.name,
            "SSH 프로필 이름을 입력해 주십시오.",
        )?,
        host: normalize_required_text(
            "ssh_profiles.host",
            &input.host,
            "SSH 호스트를 입력해 주십시오.",
        )?,
        port: normalize_port(input.port)?,
        username: normalize_required_text(
            "ssh_profiles.username",
            &input.username,
            "SSH 계정을 입력해 주십시오.",
        )?,
        auth_type: input.auth_type,
        key_path: normalize_optional_text(input.key_path),
        password: normalize_optional_secret(input.password),
        key_passphrase: normalize_optional_secret(input.key_passphrase),
        clear_password: input.clear_password,
        clear_key_passphrase: input.clear_key_passphrase,
    };

    validate_ssh_profile_secret_rules(
        &normalized.auth_type,
        normalized.key_path.as_deref(),
        normalized.password.as_deref(),
        normalized.key_passphrase.as_deref(),
    )?;

    Ok(normalized)
}

fn validate_ssh_profile_secret_rules(
    auth_type: &SshAuthType,
    key_path: Option<&str>,
    password: Option<&str>,
    key_passphrase: Option<&str>,
) -> Result<(), AppError> {
    match auth_type {
        SshAuthType::Password => {
            if password.is_none() {
                return Err(AppError::Config {
                    message: "비밀번호 인증에는 SSH 비밀번호를 입력해 주십시오.".to_string(),
                });
            }
        }
        SshAuthType::Key => {
            if key_path.is_none() {
                return Err(AppError::Config {
                    message: "키 인증에는 개인키 경로를 입력해 주십시오.".to_string(),
                });
            }
        }
        SshAuthType::Agent => {}
    }

    if matches!(auth_type, SshAuthType::Agent | SshAuthType::Password) && key_passphrase.is_some() {
        return Err(AppError::Config {
            message: "키 passphrase는 키 인증 프로필에서만 저장할 수 있습니다.".to_string(),
        });
    }

    Ok(())
}

fn normalize_required_text(_target: &str, raw: &str, message: &str) -> Result<String, AppError> {
    let normalized = raw.trim();
    if normalized.is_empty() {
        return Err(AppError::Config {
            message: message.to_string(),
        });
    }

    Ok(normalized.to_string())
}

fn normalize_optional_text(raw: Option<String>) -> Option<String> {
    raw.map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn normalize_optional_secret(raw: Option<String>) -> Option<String> {
    raw.map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn normalize_port(port: u16) -> Result<u16, AppError> {
    if port == 0 {
        return Err(AppError::Config {
            message: "SSH 포트는 1 이상이어야 합니다.".to_string(),
        });
    }

    Ok(port)
}

fn auth_type_to_db(auth_type: &SshAuthType) -> &'static str {
    match auth_type {
        SshAuthType::Password => "password",
        SshAuthType::Key => "key",
        SshAuthType::Agent => "agent",
    }
}

fn db_to_auth_type(raw: &str) -> Result<SshAuthType, String> {
    match raw {
        "password" => Ok(SshAuthType::Password),
        "key" => Ok(SshAuthType::Key),
        "agent" => Ok(SshAuthType::Agent),
        _ => Err(format!("unknown SSH auth type: {raw}")),
    }
}

fn ensure_site_exists(connection: &rusqlite::Connection, site_id: &str) -> Result<(), AppError> {
    let exists = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sites WHERE id = ?1)",
            params![site_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(storage_error("ssh_profiles.site_exists"))?;

    if exists == 1 {
        return Ok(());
    }

    Err(AppError::Config {
        message: format!("등록되지 않은 사이트입니다: {site_id}"),
    })
}

fn ensure_ssh_profile_exists(
    connection: &rusqlite::Connection,
    site_id: &str,
    ssh_profile_id: &str,
) -> Result<(), AppError> {
    let exists = connection
        .query_row(
            "SELECT EXISTS(
               SELECT 1 FROM ssh_profiles
               WHERE site_id = ?1 AND id = ?2
             )",
            params![site_id, ssh_profile_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(storage_error("ssh_profiles.exists"))?;

    if exists == 1 {
        return Ok(());
    }

    Err(AppError::Config {
        message: "요청한 SSH 프로필을 찾을 수 없습니다.".to_string(),
    })
}

fn update_ssh_profile_secrets(
    connection: &rusqlite::Connection,
    ssh_profile_id: &str,
    auth_type: &SshAuthType,
    password: Option<&str>,
    key_passphrase: Option<&str>,
    clear_password: bool,
    clear_key_passphrase: bool,
) -> Result<(), AppError> {
    match auth_type {
        SshAuthType::Password => {
            if let Some(password) = password {
                set_db_secret(
                    connection,
                    ssh_password_setting_key(ssh_profile_id).as_str(),
                    password,
                )?;
            } else if clear_password {
                clear_db_secret(
                    connection,
                    ssh_password_setting_key(ssh_profile_id).as_str(),
                )?;
            }

            maybe_clear_key_passphrase(
                connection,
                ssh_key_passphrase_setting_key(ssh_profile_id).as_str(),
                true,
            )?;
        }
        SshAuthType::Key => {
            clear_db_secret(
                connection,
                ssh_password_setting_key(ssh_profile_id).as_str(),
            )?;
            if let Some(key_passphrase) = key_passphrase {
                set_db_secret(
                    connection,
                    ssh_key_passphrase_setting_key(ssh_profile_id).as_str(),
                    key_passphrase,
                )?;
            } else {
                maybe_clear_key_passphrase(
                    connection,
                    ssh_key_passphrase_setting_key(ssh_profile_id).as_str(),
                    clear_key_passphrase,
                )?;
            }
        }
        SshAuthType::Agent => {
            clear_ssh_profile_secrets(connection, ssh_profile_id)?;
        }
    }

    Ok(())
}

fn store_ssh_profile_secrets(
    connection: &rusqlite::Connection,
    ssh_profile_id: &str,
    password: &Option<String>,
    key_passphrase: &Option<String>,
) -> Result<(), AppError> {
    if let Some(password) = password {
        set_db_secret(
            connection,
            ssh_password_setting_key(ssh_profile_id).as_str(),
            password,
        )?;
    }

    if let Some(key_passphrase) = key_passphrase {
        set_db_secret(
            connection,
            ssh_key_passphrase_setting_key(ssh_profile_id).as_str(),
            key_passphrase,
        )?;
    }

    Ok(())
}

fn maybe_clear_key_passphrase(
    connection: &rusqlite::Connection,
    key: &str,
    should_clear: bool,
) -> Result<(), AppError> {
    if should_clear {
        clear_db_secret(connection, key)?;
    }

    Ok(())
}

fn clear_ssh_profile_secrets(
    connection: &rusqlite::Connection,
    ssh_profile_id: &str,
) -> Result<(), AppError> {
    clear_db_secret(
        connection,
        ssh_password_setting_key(ssh_profile_id).as_str(),
    )?;
    clear_db_secret(
        connection,
        ssh_key_passphrase_setting_key(ssh_profile_id).as_str(),
    )?;
    Ok(())
}

fn ssh_password_account(ssh_profile_id: &str) -> String {
    format!("{SSH_PASSWORD_ACCOUNT_PREFIX}{ssh_profile_id}")
}

fn ssh_key_passphrase_account(ssh_profile_id: &str) -> String {
    format!("{SSH_KEY_PASSPHRASE_ACCOUNT_PREFIX}{ssh_profile_id}")
}

fn ssh_password_setting_key(ssh_profile_id: &str) -> String {
    format!("ssh.secret.password.{ssh_profile_id}")
}

fn ssh_key_passphrase_setting_key(ssh_profile_id: &str) -> String {
    format!("ssh.secret.key_passphrase.{ssh_profile_id}")
}

fn hydrate_ssh_profile_secret_flags(
    connection: &rusqlite::Connection,
    profile: &mut SshProfile,
) -> Result<(), AppError> {
    profile.has_password =
        load_db_secret(connection, ssh_password_setting_key(&profile.id).as_str())?.is_some();
    profile.has_key_passphrase = load_db_secret(
        connection,
        ssh_key_passphrase_setting_key(&profile.id).as_str(),
    )?
    .is_some();
    Ok(())
}

fn load_db_secret(
    connection: &rusqlite::Connection,
    key: &str,
) -> Result<Option<String>, AppError> {
    connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(storage_error("ssh_profiles.secret_load"))
}

fn set_db_secret(
    connection: &rusqlite::Connection,
    key: &str,
    value: &str,
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO app_settings (key, value)
             VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )
        .map_err(storage_error("ssh_profiles.secret_set"))?;
    Ok(())
}

fn clear_db_secret(connection: &rusqlite::Connection, key: &str) -> Result<(), AppError> {
    connection
        .execute("DELETE FROM app_settings WHERE key = ?1", params![key])
        .map_err(storage_error("ssh_profiles.secret_clear"))?;
    Ok(())
}

fn load_or_migrate_ssh_secret(
    connection: &rusqlite::Connection,
    setting_key: &str,
    legacy_keyring_account: &str,
) -> Result<Option<String>, AppError> {
    if let Some(value) = load_db_secret(connection, setting_key)? {
        return Ok(Some(value));
    }

    let Some(value) = load_keyring_secret(legacy_keyring_account)? else {
        return Ok(None);
    };
    set_db_secret(connection, setting_key, &value)?;
    clear_keyring_secret(legacy_keyring_account)?;
    Ok(Some(value))
}
