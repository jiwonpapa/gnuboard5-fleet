use super::*;

#[test]
fn read_tail_returns_log_content() {
    let (temp_dir, log_path) = prepare_temp_log("read-tail");
    fs::write(&log_path, "alpha\nbeta\ngamma\n").expect("test log should write");

    let tail = read_tail(&log_path).expect("tail should read");

    assert_eq!(tail, "alpha\nbeta\ngamma\n");
    let _ = fs::remove_dir_all(temp_dir);
}

#[test]
fn read_tail_reports_missing_file_as_config_error() {
    let (temp_dir, log_path) = prepare_temp_log("missing-tail");

    let error = read_tail(&log_path).expect_err("missing log should fail");

    assert!(matches!(error, DebugSupportError::Config { .. }));
    let _ = fs::remove_dir_all(temp_dir);
}

fn prepare_temp_log(name: &str) -> (PathBuf, PathBuf) {
    let temp_dir = std::env::temp_dir().join(format!(
        "g5-admin-debug-support-{name}-{}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir).expect("temp dir should be created");
    let log_path = temp_dir.join("g5-admin.log");
    (temp_dir, log_path)
}
