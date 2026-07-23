use super::*;

mod activity;
mod catalog;
mod runtime_state;

fn map_site_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Site> {
    Ok(Site {
        id: row.get(0)?,
        name: row.get(1)?,
        api_base_url: row.get(2)?,
        is_default: row.get::<_, i64>(3)? == 1,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}
