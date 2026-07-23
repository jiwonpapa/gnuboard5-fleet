use crate::core::ports::{
    SiteActivityLogRecord, SiteCatalogInsertInput, SiteCatalogUpdateInput, SiteRecord,
    SshConnectionProfile, SshProfileInsertInput, SshProfileRecord,
    SshProfileUpdateRecord as PortSshProfileUpdateRecord, StoredSessionRecord,
};
#[cfg(test)]
use crate::core::ssh_auth::model_to_port_auth_type;
use crate::core::ssh_auth::port_to_model_auth_type;
use crate::db::{
    SiteInsert, SiteUpdateRecord, SshProfileInsert,
    SshProfileUpdateRecord as DbSshProfileUpdateRecord,
};
use g5_admin_models::models::auth::StoredSession;
use g5_admin_models::models::site::{Site, SiteActivityLog};
use g5_admin_models::models::ssh::SshProfile;

pub(crate) fn session_record_from_model(session: StoredSession) -> StoredSessionRecord {
    StoredSessionRecord {
        mb_id: session.mb_id,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
    }
}

pub(crate) fn model_session_from_record(session: &StoredSessionRecord) -> StoredSession {
    StoredSession {
        mb_id: session.mb_id.clone(),
        access_token: session.access_token.clone(),
        refresh_token: session.refresh_token.clone(),
        expires_in: session.expires_in,
    }
}

#[cfg(test)]
pub(crate) fn site_record_from_model(site: Site) -> SiteRecord {
    SiteRecord {
        id: site.id,
        name: site.name,
        api_base_url: site.api_base_url,
        is_default: site.is_default,
        created_at: site.created_at,
        updated_at: site.updated_at,
    }
}

pub(crate) fn model_site_from_record(site: SiteRecord) -> Site {
    Site {
        id: site.id,
        name: site.name,
        api_base_url: site.api_base_url,
        is_default: site.is_default,
        created_at: site.created_at,
        updated_at: site.updated_at,
    }
}

pub(crate) fn model_activity_from_record(activity: SiteActivityLogRecord) -> SiteActivityLog {
    SiteActivityLog {
        id: activity.id,
        site_id: activity.site_id,
        action: activity.action,
        detail: activity.detail,
        created_at: activity.created_at,
    }
}

pub(crate) fn site_insert_from_port(input: SiteCatalogInsertInput) -> SiteInsert {
    SiteInsert {
        name: input.name,
        api_base_url: input.api_base_url,
        is_default: input.is_default,
    }
}

pub(crate) fn site_update_from_port(input: SiteCatalogUpdateInput) -> SiteUpdateRecord {
    SiteUpdateRecord {
        site_id: input.site_id,
        name: input.name,
        api_base_url: input.api_base_url,
        is_default: input.is_default,
    }
}

#[cfg(test)]
pub(crate) fn ssh_profile_record_from_model(profile: SshProfile) -> SshProfileRecord {
    SshProfileRecord {
        id: profile.id,
        site_id: profile.site_id,
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        auth_type: model_to_port_auth_type(profile.auth_type),
        key_path: profile.key_path,
        has_password: profile.has_password,
        has_key_passphrase: profile.has_key_passphrase,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    }
}

pub(crate) fn ssh_connection_profile_from_record(
    profile: SshProfileRecord,
) -> SshConnectionProfile {
    SshConnectionProfile {
        id: profile.id,
        site_id: profile.site_id,
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        auth_type: profile.auth_type,
        key_path: profile.key_path,
    }
}

pub(crate) fn ssh_profile_insert_from_port(input: SshProfileInsertInput) -> SshProfileInsert {
    SshProfileInsert {
        site_id: input.site_id,
        name: input.name,
        host: input.host,
        port: input.port,
        username: input.username,
        auth_type: input.auth_type,
        key_path: input.key_path,
        password: input.password,
        key_passphrase: input.key_passphrase,
    }
}

pub(crate) fn ssh_profile_update_from_port(
    input: PortSshProfileUpdateRecord,
) -> DbSshProfileUpdateRecord {
    DbSshProfileUpdateRecord {
        site_id: input.site_id,
        ssh_profile_id: input.ssh_profile_id,
        name: input.name,
        host: input.host,
        port: input.port,
        username: input.username,
        auth_type: input.auth_type,
        key_path: input.key_path,
        password: input.password,
        key_passphrase: input.key_passphrase,
        clear_password: input.clear_password,
        clear_key_passphrase: input.clear_key_passphrase,
    }
}

pub(crate) fn model_ssh_profile_from_record(profile: SshProfileRecord) -> SshProfile {
    SshProfile {
        id: profile.id,
        site_id: profile.site_id,
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        auth_type: port_to_model_auth_type(profile.auth_type),
        key_path: profile.key_path,
        has_password: profile.has_password,
        has_key_passphrase: profile.has_key_passphrase,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    }
}
