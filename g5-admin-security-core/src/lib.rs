use thiserror::Error;
use totp_rs::{Algorithm, Secret, TOTP};

#[cfg(test)]
mod tests;

#[derive(Debug, Error)]
pub enum SecurityCoreError {
    #[error("{message}")]
    Config { message: String },
    #[error("storage error on {target}: {error}")]
    Storage { target: String, error: String },
}

pub struct TotpEnrollmentChallengeParts {
    pub manual_entry_key: String,
    pub otpauth_uri: String,
}

pub fn create_totp_enrollment_challenge(
    issuer: &str,
    account_name: &str,
) -> Result<TotpEnrollmentChallengeParts, SecurityCoreError> {
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        Secret::generate_secret()
            .to_bytes()
            .map_err(|error| SecurityCoreError::Storage {
                target: "totp.secret.generate".to_string(),
                error: error.to_string(),
            })?,
        Some(issuer.to_string()),
        account_name.to_string(),
    )
    .map_err(|error| SecurityCoreError::Storage {
        target: "totp.challenge".to_string(),
        error: error.to_string(),
    })?;

    Ok(TotpEnrollmentChallengeParts {
        manual_entry_key: totp.get_secret_base32(),
        otpauth_uri: totp.get_url(),
    })
}

pub fn verify_totp_code(
    encoded_secret: &str,
    issuer: &str,
    account_name: &str,
    code: &str,
) -> Result<bool, SecurityCoreError> {
    let normalized = normalize_totp_code(code)?;
    build_totp(encoded_secret, issuer, account_name)?
        .check_current(&normalized)
        .map_err(|error| SecurityCoreError::Storage {
            target: "totp.verify".to_string(),
            error: error.to_string(),
        })
}

pub fn generate_current_totp_code(
    encoded_secret: &str,
    issuer: &str,
    account_name: &str,
) -> Result<String, SecurityCoreError> {
    build_totp(encoded_secret, issuer, account_name)?
        .generate_current()
        .map_err(|error| SecurityCoreError::Storage {
            target: "totp.generate".to_string(),
            error: error.to_string(),
        })
}

pub fn generate_fast_unlock_secret() -> Result<String, SecurityCoreError> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| SecurityCoreError::Storage {
        target: "fast_unlock.secret.generate".to_string(),
        error: error.to_string(),
    })?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn build_totp(
    encoded_secret: &str,
    issuer: &str,
    account_name: &str,
) -> Result<TOTP, SecurityCoreError> {
    let secret_bytes = Secret::Encoded(encoded_secret.to_string())
        .to_bytes()
        .map_err(|error| SecurityCoreError::Storage {
            target: "totp.secret.parse".to_string(),
            error: error.to_string(),
        })?;
    TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        Some(issuer.to_string()),
        account_name.to_string(),
    )
    .map_err(|error| SecurityCoreError::Storage {
        target: "totp.instance".to_string(),
        error: error.to_string(),
    })
}

fn normalize_totp_code(code: &str) -> Result<String, SecurityCoreError> {
    let normalized = code.trim();
    if normalized.len() != 6 || !normalized.chars().all(|char| char.is_ascii_digit()) {
        return Err(SecurityCoreError::Config {
            message: "OTP 코드는 6자리 숫자로 입력해 주십시오.".to_string(),
        });
    }
    Ok(normalized.to_string())
}
