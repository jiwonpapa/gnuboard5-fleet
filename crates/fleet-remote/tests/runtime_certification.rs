use std::{env, fs, time::Duration};

use g5_fleet_remote::{OpenSshExecutor, RemoteError, SftpCommand, SshProfile, TransferCoordinator};
use g5_fleet_store::FleetStore;
use serde_json::json;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    task::yield_now,
    time::timeout,
};

#[tokio::test]
#[ignore = "requires an explicitly configured remote SSH certification host"]
async fn managed_remote_survives_terminal_interrupt_reconnect_and_sftp_roundtrip() {
    let host = required("G5_FLEET_REMOTE_HOST");
    let username = required("G5_FLEET_REMOTE_USER");
    let port = required("G5_FLEET_REMOTE_PORT")
        .parse::<u16>()
        .expect("valid remote port");
    let private_key_path = required("G5_FLEET_REMOTE_PRIVATE_KEY_FILE");
    let private_key = fs::read_to_string(private_key_path).expect("read private key");
    let executor = OpenSshExecutor;
    let inspection = executor
        .inspect_host_key(&host, port)
        .await
        .expect("inspect current host key");
    let profile = SshProfile {
        username,
        host,
        port,
        private_key,
        known_hosts: inspection.known_hosts_line,
    };
    executor
        .validate_target(&profile)
        .await
        .expect("managed remote target is allowed and pinned");

    let mut interrupted = executor
        .spawn_terminal(&profile)
        .await
        .expect("open terminal before interruption");
    interrupted.terminate().await;

    let mut reconnected = executor
        .spawn_terminal(&profile)
        .await
        .expect("reconnect terminal");
    let mut stdin = reconnected.take_stdin().expect("terminal stdin");
    let mut stdout = reconnected.take_stdout().expect("terminal stdout");
    stdin
        .write_all(b"printf 'G5_FLEET_TERMINAL_RECONNECTED\\n'; exit\n")
        .await
        .expect("write terminal command");
    drop(stdin);
    let mut terminal_output = Vec::new();
    timeout(
        Duration::from_secs(15),
        stdout.read_to_end(&mut terminal_output),
    )
    .await
    .expect("terminal reconnect output deadline")
    .expect("terminal reconnect output");
    reconnected.terminate().await;
    assert!(String::from_utf8_lossy(&terminal_output).contains("G5_FLEET_TERMINAL_RECONNECTED"));

    let suffix = std::process::id();
    let remote_dir = format!("/tmp/g5-fleet-r04-{suffix}");
    let uploaded = format!("{remote_dir}/upload.txt");
    let copied = format!("{remote_dir}/copy.txt");
    let moved = format!("{remote_dir}/moved.txt");
    let cancelled = format!("{remote_dir}/cancelled.bin");
    executor
        .sftp(
            &profile,
            &SftpCommand::Mkdir {
                path: remote_dir.clone(),
            },
        )
        .await
        .expect("create remote directory");

    let local = tempfile::tempdir().expect("local transfer directory");
    let source = local.path().join("source.txt");
    let downloaded = local.path().join("downloaded.txt");
    fs::write(&source, b"g5-fleet-r04-sftp-roundtrip\n").expect("write source");
    executor
        .upload(&profile, &source, &uploaded)
        .await
        .expect("upload over product SFTP executor");
    executor
        .sftp(
            &profile,
            &SftpCommand::Stat {
                path: uploaded.clone(),
            },
        )
        .await
        .expect("stat uploaded file");
    executor
        .sftp(
            &profile,
            &SftpCommand::Chmod {
                path: uploaded.clone(),
                mode: "0640".to_owned(),
            },
        )
        .await
        .expect("chmod uploaded file");
    executor
        .sftp(
            &profile,
            &SftpCommand::Copy {
                from: uploaded.clone(),
                to: copied.clone(),
            },
        )
        .await
        .expect("copy uploaded file");
    executor
        .sftp(
            &profile,
            &SftpCommand::Rename {
                from: copied,
                to: moved.clone(),
            },
        )
        .await
        .expect("move copied file");
    executor
        .download(&profile, &moved, &downloaded)
        .await
        .expect("download over product SFTP executor");
    assert_eq!(
        fs::read(&downloaded).expect("read downloaded file"),
        fs::read(&source).expect("read source file")
    );

    let cancellation_data = tempfile::tempdir().expect("cancellation store directory");
    let store = FleetStore::initialize(cancellation_data.path(), "remote-runtime-cert")
        .await
        .expect("initialize cancellation store");
    store
        .create_user("runtime-user", "runtime-admin", b"fixture-password-hash")
        .await
        .expect("create runtime user");
    store
        .create_site(
            "runtime-site",
            "runtime-user",
            "Runtime Site",
            "https://example.com",
        )
        .await
        .expect("create runtime site");
    let transfers = TransferCoordinator::new(store);
    let cancellation_source = local.path().join("cancellation-source.bin");
    fs::File::create(&cancellation_source)
        .expect("create sparse cancellation source")
        .set_len(512 * 1024 * 1024)
        .expect("size sparse cancellation source");
    let job = transfers
        .queue(
            "runtime-user",
            "runtime-site",
            "sftp_upload",
            &json!({"remote_path": cancelled.clone()}),
        )
        .await
        .expect("queue cancellable upload");
    let cancellation = transfers
        .start("runtime-user", &job.job_id)
        .await
        .expect("start cancellable upload");
    let transfer_profile = profile.clone();
    let transfer_source = cancellation_source.clone();
    let transfer_target = cancelled.clone();
    let transfer = tokio::spawn(async move {
        OpenSshExecutor
            .upload_cancellable(
                &transfer_profile,
                &transfer_source,
                &transfer_target,
                cancellation,
            )
            .await
    });
    yield_now().await;
    transfers
        .pause("runtime-user", &job.job_id)
        .await
        .expect("pause running upload");
    let cancelled_result = timeout(Duration::from_secs(15), transfer)
        .await
        .expect("cancelled transfer deadline")
        .expect("cancelled transfer task");
    assert!(matches!(cancelled_result, Err(RemoteError::Cancelled)));
    transfers
        .finish_controlled("runtime-user", &job.job_id)
        .await;
    let _ = executor
        .sftp(
            &profile,
            &SftpCommand::DeleteFile {
                path: cancelled.clone(),
            },
        )
        .await;

    for remote_file in [uploaded, moved] {
        executor
            .sftp(&profile, &SftpCommand::DeleteFile { path: remote_file })
            .await
            .expect("delete remote fixture file");
    }
    executor
        .sftp(&profile, &SftpCommand::DeleteDirectory { path: remote_dir })
        .await
        .expect("delete remote fixture directory");
}

fn required(name: &str) -> String {
    env::var(name).unwrap_or_else(|_| panic!("{name} is required"))
}
