mod board_content;
mod core;
mod members_access;
mod messaging;
mod operations;
mod system;

use std::fs;
use ts_rs::Config;

#[test]
fn export_ts_bindings() -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all("../g5-admin/src/types")?;
    let config = Config::new().with_out_dir(format!("{}/bindings", env!("CARGO_MANIFEST_DIR")));

    core::export(&config)?;
    board_content::export(&config)?;
    members_access::export(&config)?;
    operations::export(&config)?;
    messaging::export(&config)?;
    system::export(&config)?;

    Ok(())
}
