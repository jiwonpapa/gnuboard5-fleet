use super::*;
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

impl SiteRepository {
    pub fn load_sites(&self) -> Result<Vec<Site>, AppError> {
        let connection = open_connection(&self.config)?;
        let mut statement = connection
            .prepare(
                "SELECT id, name, api_base_url, is_default, created_at, updated_at
                 FROM sites
                 ORDER BY is_default DESC, created_at ASC, name ASC",
            )
            .map_err(storage_error("sites.prepare_list"))?;
        let rows = statement
            .query_map([], map_site_row)
            .map_err(storage_error("sites.query_list"))?;

        let mut sites = Vec::new();
        for row in rows {
            sites.push(row.map_err(storage_error("sites.row"))?);
        }
        Ok(sites)
    }

    pub fn insert_site(&self, input: SiteInsert) -> Result<Site, AppError> {
        let connection = open_connection(&self.config)?;
        let site_id = Uuid::new_v4().to_string();
        let timestamp = "datetime('now')";

        if input.is_default {
            connection
                .execute("UPDATE sites SET is_default = 0", [])
                .map_err(storage_error("sites.clear_default"))?;
        }

        connection
            .execute(
                &format!(
                    "INSERT INTO sites (id, name, api_base_url, is_default, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, {timestamp}, {timestamp})"
                ),
                params![
                    site_id,
                    input.name.trim(),
                    normalize_api_base_url(&input.api_base_url)?,
                    if input.is_default { 1 } else { 0 },
                ],
            )
            .map_err(storage_error("sites.insert"))?;

        self.find_site(&site_id)?.ok_or_else(|| AppError::Storage {
            target: "sites.find_after_insert".to_string(),
            error: "failed to read inserted site".to_string(),
        })
    }

    pub fn update_site(&self, input: SiteUpdateRecord) -> Result<Site, AppError> {
        let connection = open_connection(&self.config)?;

        if input.is_default {
            connection
                .execute("UPDATE sites SET is_default = 0", [])
                .map_err(storage_error("sites.clear_default"))?;
        }

        connection
            .execute(
                "UPDATE sites
                 SET name = ?2,
                     api_base_url = ?3,
                     is_default = ?4,
                     updated_at = datetime('now')
                 WHERE id = ?1",
                params![
                    input.site_id,
                    input.name.trim(),
                    normalize_api_base_url(&input.api_base_url)?,
                    if input.is_default { 1 } else { 0 },
                ],
            )
            .map_err(storage_error("sites.update"))?;

        self.find_site(&input.site_id)?
            .ok_or_else(|| AppError::Storage {
                target: "sites.update".to_string(),
                error: format!("site not found after update: {}", input.site_id),
            })
    }

    pub fn delete_site(&self, site_id: &str) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        self.delete_ssh_profiles_for_site(site_id)?;
        connection
            .execute("DELETE FROM sites WHERE id = ?1", params![site_id])
            .map_err(storage_error("sites.delete"))?;

        let remaining_default = connection
            .query_row(
                "SELECT id FROM sites WHERE is_default = 1 ORDER BY created_at ASC LIMIT 1",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(storage_error("sites.select_default"))?;

        if remaining_default.is_none() {
            connection
                .execute(
                    "UPDATE sites
                     SET is_default = 1, updated_at = datetime('now')
                     WHERE id = (
                       SELECT id FROM sites ORDER BY created_at ASC LIMIT 1
                     )",
                    [],
                )
                .map_err(storage_error("sites.promote_default"))?;
        }

        Ok(())
    }

    pub(super) fn find_site(&self, site_id: &str) -> Result<Option<Site>, AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .query_row(
                "SELECT id, name, api_base_url, is_default, created_at, updated_at
                 FROM sites WHERE id = ?1",
                params![site_id],
                map_site_row,
            )
            .optional()
            .map_err(storage_error("sites.find"))
    }
}
