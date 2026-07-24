use std::{env, net::SocketAddr, path::PathBuf, sync::Arc};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use g5_fleet_admin_server::{AppConfig, build_router};
use g5_fleet_connector::ProductionConnectorGateway;
use g5_fleet_security::AuthService;
use g5_fleet_store::FleetStore;
use tokio::net::TcpListener;
use tracing::info;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("g5_fleet_admin_server=info,tower_http=info")),
        )
        .init();

    let data_dir = env::var_os("G5_FLEET_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("data"));
    let command = env::args().nth(1).unwrap_or_else(|| "serve".to_owned());
    if command == "init-store" {
        let installation_id = env::var("G5_FLEET_INSTALLATION_ID")
            .map_err(|_| "G5_FLEET_INSTALLATION_ID is required for init-store")?;
        let store = FleetStore::initialize(&data_dir, &installation_id).await?;
        store.full_integrity_check().await?;
        info!(
            data_dir = %store.data_dir().display(),
            installation_id = %store.identity().installation_id,
            "G5 Fleet store initialized"
        );
        store.close().await;
        return Ok(());
    }
    if command != "serve" {
        return Err(format!("unknown command: {command}").into());
    }
    let store = FleetStore::open_existing(&data_dir).await?;
    let master_key = STANDARD.decode(
        env::var("G5_FLEET_MASTER_KEY_BASE64")
            .map_err(|_| "G5_FLEET_MASTER_KEY_BASE64 is required for serve")?,
    )?;
    let auth = AuthService::new(store, &master_key)?;
    let address: SocketAddr = env::var("G5_FLEET_BIND")
        .unwrap_or_else(|_| "127.0.0.1:8080".to_owned())
        .parse()?;
    let web_root = env::var_os("G5_FLEET_WEB_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("apps/admin-web/dist"));
    let listener = TcpListener::bind(address).await?;
    info!(address = %listener.local_addr()?, web_root = %web_root.display(), "G5 Fleet server ready");
    axum::serve(
        listener,
        build_router(AppConfig {
            web_root,
            auth,
            connector: Arc::new(ProductionConnectorGateway),
        }),
    )
    .await?;
    Ok(())
}
