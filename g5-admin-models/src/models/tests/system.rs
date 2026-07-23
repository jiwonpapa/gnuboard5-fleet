use crate::models::system_tools::{
    AdminBrowscapConvertInput, AdminBrowscapConvertResponse, AdminBrowscapConvertResult,
    AdminBrowscapStatus, AdminBrowscapStatusResponse, AdminPhpInfo, AdminPhpInfoResponse,
};
use crate::models::theme::{
    AdminTheme, AdminThemeConfig, AdminThemeConfigResponse, AdminThemeConfigUpdateInput,
    AdminThemeDetailResponse, AdminThemeListResponse,
};
use std::error::Error;
use ts_rs::{Config, TS};

pub(super) fn export(config: &Config) -> Result<(), Box<dyn Error>> {
    AdminPhpInfo::export(config)?;
    AdminPhpInfoResponse::export(config)?;
    AdminBrowscapStatus::export(config)?;
    AdminBrowscapStatusResponse::export(config)?;
    AdminBrowscapConvertInput::export(config)?;
    AdminBrowscapConvertResult::export(config)?;
    AdminBrowscapConvertResponse::export(config)?;
    AdminThemeConfig::export(config)?;
    AdminThemeConfigResponse::export(config)?;
    AdminThemeConfigUpdateInput::export(config)?;
    AdminTheme::export(config)?;
    AdminThemeListResponse::export(config)?;
    AdminThemeDetailResponse::export(config)?;
    Ok(())
}
