use super::portable_backup::{
    decrypt_portable_backup, encrypt_portable_backup, looks_like_portable_backup,
    PortableBackupPayload,
};
use super::{
    load_site_settings_from_connection, load_sites_from_connection, normalize_api_base_url,
    open_backup_connection, open_connection, resolve_master_key, storage_error, table_exists,
    BackupImportSummary, SiteRepository,
};
use crate::error::AppError;
use crate::{Site, SshAuthType, SshProfile};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;

impl SiteRepository {
    pub fn export_backup(
        &self,
        destination_path: &Path,
        backup_password: &str,
    ) -> Result<(u64, usize), AppError> {
        if destination_path == self.config.path {
            return Err(AppError::Config {
                message: "현재 사용 중인 DB 파일에는 백업을 덮어쓸 수 없습니다.".to_string(),
            });
        }

        let normalized_backup_password = backup_password.trim();
        if normalized_backup_password.is_empty() {
            return Err(AppError::Config {
                message: "백업 암호를 입력해 주십시오.".to_string(),
            });
        }

        if let Some(parent) = destination_path.parent() {
            fs::create_dir_all(parent).map_err(|error| AppError::Storage {
                target: parent.display().to_string(),
                error: error.to_string(),
            })?;
        }

        let connection = open_connection(&self.config)?;
        connection
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(storage_error("backup.export_checkpoint"))?;
        let sites = load_sites_from_connection(&connection)?;
        let site_settings = if table_exists(&connection, "site_settings")? {
            load_site_settings_from_connection(&connection)?
        } else {
            Vec::new()
        };
        let ssh_profiles = if table_exists(&connection, "ssh_profiles")? {
            load_ssh_profiles_from_connection(&connection)?
        } else {
            Vec::new()
        };
        let payload = PortableBackupPayload::from_source(sites, site_settings, ssh_profiles);
        let payload_bytes = serde_json::to_vec(&payload).map_err(|error| AppError::Storage {
            target: "backup.payload.serialize".to_string(),
            error: error.to_string(),
        })?;
        let file_bytes = encrypt_portable_backup(
            &payload_bytes,
            normalized_backup_password,
            payload.site_count(),
        )?;
        fs::write(destination_path, &file_bytes).map_err(|error| AppError::Storage {
            target: destination_path.display().to_string(),
            error: format!("failed to export backup: {error}"),
        })?;

        Ok((file_bytes.len() as u64, payload.site_count()))
    }

    pub fn import_backup(
        &self,
        source_path: &Path,
        backup_password: &str,
    ) -> Result<BackupImportSummary, AppError> {
        if source_path == self.config.path {
            return Err(AppError::Config {
                message: "현재 사용 중인 DB 파일은 가져오기 대상으로 사용할 수 없습니다."
                    .to_string(),
            });
        }

        if !source_path.exists() {
            return Err(AppError::Storage {
                target: source_path.display().to_string(),
                error: "backup file does not exist".to_string(),
            });
        }

        let raw = fs::read(source_path).map_err(|error| AppError::Storage {
            target: source_path.display().to_string(),
            error: error.to_string(),
        })?;

        if looks_like_portable_backup(&raw) {
            let payload = decrypt_portable_backup(&raw, backup_password.trim())?;
            let (source_sites, source_settings, source_ssh_profiles) = payload.into_source();
            let mut target = open_connection(&self.config)?;
            return merge_backup_data(
                &mut target,
                source_sites,
                source_settings,
                source_ssh_profiles,
            );
        }

        let mut target = open_connection(&self.config)?;
        let master_key = resolve_master_key(&self.config, self.config.path.exists())?;
        let source = open_backup_connection(source_path, &master_key)?;
        if !table_exists(&source, "sites")? {
            return Err(AppError::Storage {
                target: source_path.display().to_string(),
                error: "backup file does not contain the sites table".to_string(),
            });
        }

        let source_sites = load_sites_from_connection(&source)?;
        let source_settings = if table_exists(&source, "site_settings")? {
            load_site_settings_from_connection(&source)?
        } else {
            Vec::new()
        };
        let source_ssh_profiles = if table_exists(&source, "ssh_profiles")? {
            load_ssh_profiles_from_connection(&source)?
        } else {
            Vec::new()
        };

        merge_backup_data(
            &mut target,
            source_sites,
            source_settings,
            source_ssh_profiles,
        )
    }
}

fn merge_backup_data(
    target: &mut Connection,
    source_sites: Vec<Site>,
    source_settings: Vec<(String, String, String)>,
    source_ssh_profiles: Vec<SshProfile>,
) -> Result<BackupImportSummary, AppError> {
    let had_default_site = target
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sites WHERE is_default = 1)",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(storage_error("backup.import_has_default"))?
        == 1;
    let target_site_count: i64 = target
        .query_row("SELECT COUNT(*) FROM sites", [], |row| row.get(0))
        .map_err(storage_error("backup.import_site_count"))?;

    let transaction = target
        .transaction()
        .map_err(storage_error("backup.import_transaction"))?;
    let mut summary = BackupImportSummary::default();
    let mut source_to_target_site_ids = HashMap::new();
    let mut assigned_default_site = had_default_site;

    for source_site in source_sites {
        let normalized_url = normalize_api_base_url(&source_site.api_base_url)?;
        if let Some(existing_site_id) = transaction
            .query_row(
                "SELECT id FROM sites WHERE api_base_url = ?1 LIMIT 1",
                params![normalized_url],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(storage_error("backup.import_find_site_by_url"))?
        {
            source_to_target_site_ids.insert(source_site.id, existing_site_id);
            summary.reused_site_count += 1;
            continue;
        }

        let next_site_id = transaction
            .query_row(
                "SELECT id FROM sites WHERE id = ?1 LIMIT 1",
                params![source_site.id.clone()],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(storage_error("backup.import_find_site_by_id"))?
            .map(|_| Uuid::new_v4().to_string())
            .unwrap_or_else(|| source_site.id.clone());
        let should_be_default = !assigned_default_site
            && (source_site.is_default
                || (target_site_count == 0 && summary.imported_site_count == 0));
        if should_be_default {
            transaction
                .execute("UPDATE sites SET is_default = 0", [])
                .map_err(storage_error("backup.import_clear_default"))?;
            assigned_default_site = true;
        }

        transaction
            .execute(
                "INSERT INTO sites (
                   id,
                   name,
                   api_base_url,
                   is_default,
                   created_at,
                   updated_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    next_site_id,
                    source_site.name.trim(),
                    normalized_url,
                    if should_be_default { 1 } else { 0 },
                    source_site.created_at,
                    source_site.updated_at,
                ],
            )
            .map_err(storage_error("backup.import_insert_site"))?;
        source_to_target_site_ids.insert(source_site.id, next_site_id);
        summary.imported_site_count += 1;
    }

    for (source_site_id, key, value) in source_settings {
        let Some(target_site_id) = source_to_target_site_ids.get(&source_site_id) else {
            continue;
        };
        transaction
            .execute(
                "INSERT INTO site_settings (site_id, key, value)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(site_id, key) DO UPDATE SET value = excluded.value",
                params![target_site_id, key, value],
            )
            .map_err(storage_error("backup.import_site_setting"))?;
        summary.copied_setting_count += 1;
    }

    for source_profile in source_ssh_profiles {
        let Some(target_site_id) = source_to_target_site_ids.get(&source_profile.site_id) else {
            continue;
        };
        let next_profile_id = transaction
            .query_row(
                "SELECT id FROM ssh_profiles WHERE id = ?1 LIMIT 1",
                params![source_profile.id.clone()],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(storage_error("backup.import_find_ssh_profile_by_id"))?
            .map(|_| Uuid::new_v4().to_string())
            .unwrap_or_else(|| source_profile.id.clone());

        transaction
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
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    next_profile_id,
                    target_site_id,
                    source_profile.name.trim(),
                    source_profile.host.trim(),
                    i64::from(source_profile.port),
                    source_profile.username.trim(),
                    auth_type_to_db(&source_profile.auth_type),
                    source_profile.key_path,
                    source_profile.created_at,
                    source_profile.updated_at,
                ],
            )
            .map_err(storage_error("backup.import_ssh_profile"))?;
    }

    transaction
        .commit()
        .map_err(storage_error("backup.import_commit"))?;

    Ok(summary)
}

fn load_ssh_profiles_from_connection(connection: &Connection) -> Result<Vec<SshProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, site_id, name, host, port, username, auth_type, key_path, created_at, updated_at
             FROM ssh_profiles
             ORDER BY site_id ASC, created_at ASC, name ASC",
        )
        .map_err(storage_error("backup.load_ssh_profiles_prepare"))?;
    let rows = statement
        .query_map([], |row| {
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
                id: row.get(0)?,
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
        })
        .map_err(storage_error("backup.load_ssh_profiles_query"))?;

    let mut profiles = Vec::new();
    for row in rows {
        profiles.push(row.map_err(storage_error("backup.load_ssh_profiles_row"))?);
    }

    Ok(profiles)
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
