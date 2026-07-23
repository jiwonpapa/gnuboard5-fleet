use crate::core::ports::SshProfileAuthType;
use g5_admin_models::models::ssh::SshAuthType;

pub(crate) fn model_to_port_auth_type(auth_type: SshAuthType) -> SshProfileAuthType {
    match auth_type {
        SshAuthType::Password => SshProfileAuthType::Password,
        SshAuthType::Key => SshProfileAuthType::Key,
        SshAuthType::Agent => SshProfileAuthType::Agent,
    }
}

pub(crate) fn port_to_model_auth_type(auth_type: SshProfileAuthType) -> SshAuthType {
    match auth_type {
        SshProfileAuthType::Password => SshAuthType::Password,
        SshProfileAuthType::Key => SshAuthType::Key,
        SshProfileAuthType::Agent => SshAuthType::Agent,
    }
}
