use crate::error::AppError;
use tauri::{AppHandle, Runtime};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_biometry::{
    BiometryExt, BiometryType, DataOptions, GetDataOptions, SetDataOptions,
};

const FAST_UNLOCK_DOMAIN: &str = "g5-admin-desktop";
const FAST_UNLOCK_NAME: &str = "local-master-fast-unlock";

#[derive(Debug, Clone)]
pub struct FastUnlockCapability {
    pub available: bool,
    pub label: String,
    pub error: Option<String>,
}

impl FastUnlockCapability {
    pub fn unavailable(error: Option<String>) -> Self {
        Self {
            available: false,
            label: default_fast_unlock_label(),
            error,
        }
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn detect_capability<R: Runtime>(app: &AppHandle<R>) -> FastUnlockCapability {
    match app.biometry().status() {
        Ok(status) => {
            let label = biometry_label(status.biometry_type.clone());
            if status.is_available {
                FastUnlockCapability {
                    available: true,
                    label,
                    error: None,
                }
            } else {
                FastUnlockCapability {
                    available: false,
                    label,
                    error: status.error.or(status.error_code),
                }
            }
        }
        Err(error) => FastUnlockCapability::unavailable(Some(error.to_string())),
    }
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn detect_capability<R: Runtime>(_app: &AppHandle<R>) -> FastUnlockCapability {
    FastUnlockCapability::unavailable(Some(
        "모바일 환경에서는 현재 지원하지 않습니다.".to_string(),
    ))
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn has_registered_secret<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.biometry()
        .has_data(DataOptions {
            domain: FAST_UNLOCK_DOMAIN.to_string(),
            name: FAST_UNLOCK_NAME.to_string(),
        })
        .unwrap_or(false)
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn has_registered_secret<R: Runtime>(_app: &AppHandle<R>) -> bool {
    false
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn store_secret<R: Runtime>(app: &AppHandle<R>, secret: &str) -> Result<(), AppError> {
    app.biometry()
        .set_data(SetDataOptions {
            domain: FAST_UNLOCK_DOMAIN.to_string(),
            name: FAST_UNLOCK_NAME.to_string(),
            data: secret.to_string(),
        })
        .map_err(|error| AppError::Auth {
            message: format!("빠른 잠금 해제 등록에 실패했습니다: {error}"),
        })
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn store_secret<R: Runtime>(_app: &AppHandle<R>, _secret: &str) -> Result<(), AppError> {
    Err(AppError::Auth {
        message: "모바일 환경에서는 현재 지원하지 않습니다.".to_string(),
    })
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn load_secret<R: Runtime>(app: &AppHandle<R>) -> Result<String, AppError> {
    app.biometry()
        .get_data(GetDataOptions {
            domain: FAST_UNLOCK_DOMAIN.to_string(),
            name: FAST_UNLOCK_NAME.to_string(),
            reason: "로컬 마스터 잠금을 빠르게 해제합니다.".to_string(),
            cancel_title: Some("취소".to_string()),
        })
        .map(|response| response.data)
        .map_err(|error| AppError::Auth {
            message: format!("빠른 잠금 해제를 완료하지 못했습니다: {error}"),
        })
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn load_secret<R: Runtime>(_app: &AppHandle<R>) -> Result<String, AppError> {
    Err(AppError::Auth {
        message: "모바일 환경에서는 현재 지원하지 않습니다.".to_string(),
    })
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn remove_secret<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    if !has_registered_secret(app) {
        return Ok(());
    }

    app.biometry()
        .remove_data(DataOptions {
            domain: FAST_UNLOCK_DOMAIN.to_string(),
            name: FAST_UNLOCK_NAME.to_string(),
        })
        .map_err(|error| AppError::Storage {
            target: "fast_unlock.remove".to_string(),
            error: error.to_string(),
        })
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn remove_secret<R: Runtime>(_app: &AppHandle<R>) -> Result<(), AppError> {
    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn biometry_label(kind: BiometryType) -> String {
    match kind {
        BiometryType::TouchID => "Touch ID".to_string(),
        BiometryType::FaceID => "Face ID".to_string(),
        BiometryType::Auto => {
            #[cfg(target_os = "windows")]
            {
                "Windows Hello".to_string()
            }
            #[cfg(not(target_os = "windows"))]
            {
                default_fast_unlock_label()
            }
        }
        BiometryType::None => default_fast_unlock_label(),
    }
}

fn default_fast_unlock_label() -> String {
    #[cfg(target_os = "windows")]
    {
        "Windows Hello".to_string()
    }

    #[cfg(target_os = "macos")]
    {
        "Touch ID".to_string()
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        "빠른 잠금 해제".to_string()
    }
}
