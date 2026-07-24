use std::{env, net::SocketAddr, path::PathBuf};

use g5_fleet_admin_server::{AppConfig, build_router};
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

    let address: SocketAddr = env::var("G5_FLEET_BIND")
        .unwrap_or_else(|_| "127.0.0.1:8080".to_owned())
        .parse()?;
    let web_root = env::var_os("G5_FLEET_WEB_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("apps/admin-web/dist"));
    let listener = TcpListener::bind(address).await?;
    info!(address = %listener.local_addr()?, web_root = %web_root.display(), "G5 Fleet server ready");
    axum::serve(listener, build_router(AppConfig { web_root })).await?;
    Ok(())
}
