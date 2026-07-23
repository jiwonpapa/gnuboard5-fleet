use super::*;

const TEST_SECRET: &str = "OBWGC2LOFVZXI4TJNZTS243FMNZGK5BNGEZDG";

#[test]
fn generated_totp_code_verifies_against_same_secret() {
    let code = generate_current_totp_code(TEST_SECRET, "G5Admin", "local-master")
        .expect("test totp should generate");

    let verified = verify_totp_code(TEST_SECRET, "G5Admin", "local-master", &code)
        .expect("test totp should verify");

    assert!(verified);
}

#[test]
fn invalid_totp_shape_is_rejected_before_totp_verify() {
    let error = verify_totp_code(TEST_SECRET, "G5Admin", "local-master", "12-ab")
        .expect_err("malformed code should reject");

    assert!(matches!(error, SecurityCoreError::Config { .. }));
}

#[test]
fn fast_unlock_secret_is_32_bytes_hex() {
    let secret = generate_fast_unlock_secret().expect("fast unlock secret should generate");

    assert_eq!(secret.len(), 64);
    assert!(secret.chars().all(|char| char.is_ascii_hexdigit()));
}
