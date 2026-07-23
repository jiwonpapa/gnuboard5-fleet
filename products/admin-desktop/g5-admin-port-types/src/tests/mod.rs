use super::*;

#[test]
fn shell_read_result_defaults_to_open_empty_output() {
    let result = SshShellReadResult::default();

    assert!(result.stdout.is_empty());
    assert!(result.stderr.is_empty());
    assert!(!result.closed);
    assert_eq!(result.exit_status, None);
    assert_eq!(result.exit_signal, None);
}

#[test]
fn sftp_metadata_kind_is_value_comparable() {
    let metadata = SftpPathMetadataResult {
        kind: SftpEntryKindResult::Directory,
        size_bytes: None,
        permissions_octal: Some("0755".to_string()),
        modified_at_epoch: None,
    };

    assert_eq!(metadata.kind, SftpEntryKindResult::Directory);
    assert_eq!(metadata.permissions_octal.as_deref(), Some("0755"));
}
