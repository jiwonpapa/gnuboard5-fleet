use std::{
    env, fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use g5_fleet_admin_server::{AppConfig, build_revision, build_router, image_version};
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
    if command == "healthcheck" {
        return healthcheck();
    }
    if command == "version" {
        println!(
            "{}",
            serde_json::json!({
                "schema": "g5-fleet.version/v1",
                "image_version": image_version(),
                "build_revision": build_revision(),
                "server_version": env!("CARGO_PKG_VERSION"),
            })
        );
        return Ok(());
    }
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
    if command == "backup" {
        let snapshot = required_argument(2, "backup requires SNAPSHOT_PATH")?;
        let store = FleetStore::open_existing(&data_dir).await?;
        let artifact = store
            .create_verified_backup(snapshot, &image_version(), &build_revision())
            .await?;
        println!("{}", serde_json::to_string(&artifact.manifest)?);
        store.close().await;
        return Ok(());
    }
    if command == "readback" {
        let store = FleetStore::open_existing(&data_dir).await?;
        let readback = store.readback().await?;
        println!("{}", serde_json::to_string(&readback)?);
        store.close().await;
        return Ok(());
    }
    if command == "restore" {
        let snapshot = required_argument(2, "restore requires SNAPSHOT_PATH")?;
        let manifest = required_argument(3, "restore requires MANIFEST_PATH")?;
        let restore_dir = required_argument(4, "restore requires RESTORE_DIRECTORY")?;
        let readback = FleetStore::restore_verified_backup(snapshot, manifest, restore_dir).await?;
        println!("{}", serde_json::to_string(&readback)?);
        return Ok(());
    }
    if command != "serve" {
        return Err(format!("unknown command: {command}").into());
    }
    let store = FleetStore::open_existing(&data_dir).await?;
    let master_key = STANDARD.decode(read_secret(
        "G5_FLEET_MASTER_KEY_BASE64",
        "G5_FLEET_MASTER_KEY_FILE",
    )?)?;
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
            notification_worker: None,
        }),
    )
    .await?;
    Ok(())
}

fn required_argument(
    index: usize,
    message: &'static str,
) -> Result<String, Box<dyn std::error::Error>> {
    env::args().nth(index).ok_or_else(|| message.into())
}

fn read_secret(value_name: &str, file_name: &str) -> Result<String, Box<dyn std::error::Error>> {
    let value = env::var(value_name).ok();
    let file = env::var_os(file_name).map(PathBuf::from);
    match (value, file) {
        (Some(_), Some(_)) => {
            Err(format!("{value_name} and {file_name} are mutually exclusive").into())
        }
        (Some(value), None) if !value.trim().is_empty() => Ok(value),
        (None, Some(path)) => read_secret_file(&path, file_name),
        _ => Err(format!("{value_name} or {file_name} is required for serve").into()),
    }
}

fn read_secret_file(
    path: &Path,
    variable_name: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    if !path.is_absolute() || path.is_symlink() {
        return Err(format!("{variable_name} must reference an absolute regular file").into());
    }
    let metadata = fs::metadata(path)?;
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > 4096 {
        return Err(format!("{variable_name} secret file is invalid").into());
    }
    let value = fs::read_to_string(path)?;
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{variable_name} secret file is empty").into());
    }
    Ok(value.to_owned())
}

fn healthcheck() -> Result<(), Box<dyn std::error::Error>> {
    let bind: SocketAddr = env::var("G5_FLEET_BIND")
        .unwrap_or_else(|_| "127.0.0.1:8080".to_owned())
        .parse()?;
    let target = SocketAddr::new("127.0.0.1".parse()?, bind.port());
    let mut stream = TcpStream::connect_timeout(&target, Duration::from_secs(2))?;
    stream.set_read_timeout(Some(Duration::from_secs(2)))?;
    stream.set_write_timeout(Some(Duration::from_secs(2)))?;
    stream.write_all(b"GET /readyz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")?;
    let mut response = [0_u8; 256];
    let read = stream.read(&mut response)?;
    let status = std::str::from_utf8(&response[..read])?;
    if !status.starts_with("HTTP/1.1 200") {
        return Err("G5 Fleet readiness check failed".into());
    }
    Ok(())
}
