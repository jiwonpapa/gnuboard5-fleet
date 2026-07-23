use super::master_key::quarantine_unrecoverable_database;
use super::resolve_master_key;
use super::DatabaseConfig;
use crate::error::AppError;
use crate::Site;
use rusqlite::{params, Connection};
use std::fs;
use std::path::{Path, PathBuf};

pub(super) fn open_connection(config: &DatabaseConfig) -> Result<Connection, AppError> {
    if let Some(parent) = config.path.parent() {
        fs::create_dir_all(parent).map_err(|error| AppError::Storage {
            target: parent.display().to_string(),
            error: error.to_string(),
        })?;
    }

    let database_exists = config.path.exists();
    let master_key = resolve_master_key(config, database_exists)?;
    match open_connection_with_master_key(config, &master_key) {
        Ok(connection) => Ok(connection),
        Err(error)
            if should_try_orphan_recovery(config, &error)
                && recover_matching_orphaned_database(&config.path, &master_key)? =>
        {
            open_connection_with_master_key(config, &master_key)
        }
        Err(error) => Err(error),
    }
}

pub(super) fn open_backup_connection(
    path: &Path,
    master_key: &str,
) -> Result<Connection, AppError> {
    let connection = Connection::open(path).map_err(|error| AppError::Storage {
        target: path.display().to_string(),
        error: format!("failed to open backup database: {error}"),
    })?;
    connection
        .pragma_update(None, "key", master_key)
        .map_err(storage_error("backup.db.key"))?;
    connection
        .pragma_update(None, "foreign_keys", 1)
        .map_err(storage_error("backup.db.foreign_keys"))?;
    Ok(connection)
}

fn migrate(connection: &Connection, allow_duplicate_sites: bool) -> Result<(), AppError> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS sites (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              api_base_url TEXT NOT NULL,
              is_default INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS site_settings (
              site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
              key TEXT NOT NULL,
              value TEXT NOT NULL,
              PRIMARY KEY (site_id, key)
            );

            CREATE TABLE IF NOT EXISTS ssh_profiles (
              id TEXT PRIMARY KEY,
              site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              host TEXT NOT NULL,
              port INTEGER NOT NULL DEFAULT 22,
              username TEXT NOT NULL,
              auth_type TEXT NOT NULL,
              key_path TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS site_runtime_state (
              site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
              has_session INTEGER NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS site_sessions (
              site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
              session_payload TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS app_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_lock (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              password_verifier TEXT NOT NULL,
              password_salt TEXT NOT NULL,
              passkey_enabled INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
              action TEXT NOT NULL,
              detail TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_activity_logs_site_created_at
              ON activity_logs(site_id, created_at DESC);
            ",
        )
        .map_err(storage_error("db.migrate"))?;

    if allow_duplicate_sites {
        connection
            .execute_batch("DROP INDEX IF EXISTS idx_sites_api_base_url_unique;")
            .map_err(storage_error("db.drop_duplicate_index"))?;
    } else {
        connection
            .execute_batch(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_api_base_url_unique
                 ON sites(api_base_url);",
            )
            .map_err(storage_error("db.create_duplicate_index"))?;
    }

    Ok(())
}

fn open_connection_with_master_key(
    config: &DatabaseConfig,
    master_key: &str,
) -> Result<Connection, AppError> {
    let connection = Connection::open(&config.path).map_err(storage_error("db.open"))?;
    connection
        .pragma_update(None, "key", master_key)
        .map_err(storage_error("db.key"))?;
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(storage_error("db.journal_mode"))?;
    connection
        .pragma_update(None, "foreign_keys", 1)
        .map_err(storage_error("db.foreign_keys"))?;
    migrate(&connection, config.allow_duplicate_sites)?;
    Ok(connection)
}

fn should_try_orphan_recovery(config: &DatabaseConfig, error: &AppError) -> bool {
    config.master_key_storage == crate::runtime_config::DatabaseMasterStorageMode::File
        && matches!(
            error,
            AppError::Storage { error, .. } if error.contains("file is not a database")
        )
}

fn recover_matching_orphaned_database(
    database_path: &Path,
    master_key: &str,
) -> Result<bool, AppError> {
    for candidate in orphaned_database_candidates(database_path)? {
        if !can_open_database_with_master_key(&candidate, master_key) {
            continue;
        }

        quarantine_unrecoverable_database(
            database_path,
            "recovering active database from matching orphaned database",
        )?;
        fs::rename(&candidate, database_path).map_err(|error| AppError::Storage {
            target: candidate.display().to_string(),
            error: format!(
                "failed to restore matching orphaned database to {}: {error}",
                database_path.display()
            ),
        })?;

        tracing::warn!(
            component = "g5_admin::db::connection",
            operation = "recover_matching_orphaned_database",
            target = %database_path.display(),
            recovered_path = %candidate.display(),
            "restored active database from matching orphaned database"
        );
        return Ok(true);
    }

    Ok(false)
}

fn orphaned_database_candidates(database_path: &Path) -> Result<Vec<PathBuf>, AppError> {
    let parent = database_path.parent().ok_or_else(|| AppError::Storage {
        target: database_path.display().to_string(),
        error: "database path does not have a parent directory".to_string(),
    })?;
    let prefix = format!(
        "{}{}",
        database_path
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| AppError::Storage {
                target: database_path.display().to_string(),
                error: "database file name is not valid unicode".to_string(),
            })?,
        ".orphaned-"
    );

    let mut candidates = fs::read_dir(parent)
        .map_err(|error| AppError::Storage {
            target: parent.display().to_string(),
            error: error.to_string(),
        })?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|value| value.to_str())
                .is_some_and(|value| value.starts_with(&prefix))
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| right.cmp(left));
    Ok(candidates)
}

fn can_open_database_with_master_key(database_path: &Path, master_key: &str) -> bool {
    let connection = match Connection::open(database_path) {
        Ok(connection) => connection,
        Err(_) => return false,
    };
    if connection.pragma_update(None, "key", master_key).is_err() {
        return false;
    }

    connection
        .query_row("SELECT COUNT(*) FROM sqlite_master", [], |row| {
            row.get::<_, i64>(0)
        })
        .is_ok()
}

pub(super) fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, AppError> {
    connection
        .query_row(
            "SELECT EXISTS(
               SELECT 1 FROM sqlite_master
               WHERE type = 'table' AND name = ?1
             )",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .map(|value| value == 1)
        .map_err(storage_error("db.table_exists"))
}

pub(super) fn load_sites_from_connection(connection: &Connection) -> Result<Vec<Site>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, api_base_url, is_default, created_at, updated_at
             FROM sites
             ORDER BY created_at ASC, name ASC",
        )
        .map_err(storage_error("backup.load_sites_prepare"))?;
    let rows = statement
        .query_map([], |row| {
            Ok(Site {
                id: row.get(0)?,
                name: row.get(1)?,
                api_base_url: row.get(2)?,
                is_default: row.get::<_, i64>(3)? == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(storage_error("backup.load_sites_query"))?;

    let mut sites = Vec::new();
    for row in rows {
        sites.push(row.map_err(storage_error("backup.load_sites_row"))?);
    }
    Ok(sites)
}

pub(super) fn load_site_settings_from_connection(
    connection: &Connection,
) -> Result<Vec<(String, String, String)>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT site_id, key, value
             FROM site_settings
             ORDER BY site_id ASC, key ASC",
        )
        .map_err(storage_error("backup.load_site_settings_prepare"))?;
    let rows = statement
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(storage_error("backup.load_site_settings_query"))?;

    let mut settings = Vec::new();
    for row in rows {
        settings.push(row.map_err(storage_error("backup.load_site_settings_row"))?);
    }
    Ok(settings)
}

pub(super) fn normalize_api_base_url(raw: &str) -> Result<String, AppError> {
    let normalized = raw.trim().trim_end_matches('/').to_string();
    if normalized.is_empty() {
        return Err(AppError::Config {
            message: "API base URL must not be empty".to_string(),
        });
    }
    Ok(normalized)
}

pub(super) fn storage_error(target: &'static str) -> impl Fn(rusqlite::Error) -> AppError {
    move |error| AppError::Storage {
        target: target.to_string(),
        error: error.to_string(),
    }
}
