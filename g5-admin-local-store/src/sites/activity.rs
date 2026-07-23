use super::*;
use rusqlite::params;

impl SiteRepository {
    pub fn add_activity(
        &self,
        site_id: Option<&str>,
        action: &str,
        detail: Option<&str>,
    ) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "INSERT INTO activity_logs (site_id, action, detail, created_at)
                 VALUES (?1, ?2, ?3, datetime('now'))",
                params![site_id, action, detail],
            )
            .map_err(storage_error("activity.insert"))?;
        Ok(())
    }

    pub fn list_activity(
        &self,
        site_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<SiteActivityLog>, AppError> {
        let connection = open_connection(&self.config)?;
        let sql = if site_id.is_some() {
            "SELECT id, site_id, action, detail, created_at
             FROM activity_logs
             WHERE site_id = ?1
             ORDER BY created_at DESC, id DESC
             LIMIT ?2"
        } else {
            "SELECT id, site_id, action, detail, created_at
             FROM activity_logs
             ORDER BY created_at DESC, id DESC
             LIMIT ?1"
        };
        let mut statement = connection
            .prepare(sql)
            .map_err(storage_error("activity.prepare_list"))?;
        let mapper = |row: &rusqlite::Row<'_>| {
            Ok(SiteActivityLog {
                id: row.get(0)?,
                site_id: row.get(1)?,
                action: row.get(2)?,
                detail: row.get(3)?,
                created_at: row.get(4)?,
            })
        };

        let rows = if let Some(current_site_id) = site_id {
            statement
                .query_map(params![current_site_id, limit as i64], mapper)
                .map_err(storage_error("activity.query_list_by_site"))?
        } else {
            statement
                .query_map(params![limit as i64], mapper)
                .map_err(storage_error("activity.query_list"))?
        };

        let mut items = Vec::new();
        for row in rows {
            items.push(row.map_err(storage_error("activity.row"))?);
        }
        Ok(items)
    }
}
