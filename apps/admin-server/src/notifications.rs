use std::sync::Arc;

use async_trait::async_trait;
use g5_fleet_notify::{
    NotificationProvider, NotificationWorker, NotifyError, NotifyResult, TelegramAdapter,
    TelegramHttpTransport, WebPushAdapter, WebPushHttpTransport, WebPushSubscription,
};
use g5_fleet_security::{AuthError, AuthService, SecretPurpose};
use g5_fleet_store::{NotificationOutboxRecord, StoreError};
use serde::Serialize;

#[derive(Clone, Debug, Default, Serialize)]
pub struct NotificationPublicConfig {
    pub telegram_transport_configured: bool,
    pub vapid_public_key: Option<String>,
}

pub struct NotificationRuntime {
    pub worker: NotificationWorker,
    pub public_config: NotificationPublicConfig,
}

pub fn build_notification_runtime(
    auth: AuthService,
    telegram_bot_token: Option<String>,
    vapid_private_key: Option<String>,
    vapid_subject: Option<String>,
) -> NotifyResult<NotificationRuntime> {
    let mut providers: Vec<Arc<dyn NotificationProvider>> = Vec::new();
    let telegram_transport_configured = telegram_bot_token.is_some();
    if let Some(token) = telegram_bot_token {
        providers.push(Arc::new(SiteTelegramProvider {
            auth: auth.clone(),
            transport: TelegramHttpTransport::new(token)?,
        }));
    }

    let vapid_transport = match (vapid_private_key, vapid_subject) {
        (None, None) => None,
        (Some(private_key), Some(subject)) => {
            Some(WebPushHttpTransport::new(private_key, subject)?)
        }
        _ => return Err(NotifyError::InvalidInput),
    };
    let vapid_public_key = vapid_transport
        .as_ref()
        .map(|transport| transport.public_key().to_owned());
    if let Some(transport) = vapid_transport {
        providers.push(Arc::new(SiteWebPushProvider {
            auth: auth.clone(),
            transport,
        }));
    }

    Ok(NotificationRuntime {
        worker: NotificationWorker::new(auth.store().clone(), providers),
        public_config: NotificationPublicConfig {
            telegram_transport_configured,
            vapid_public_key,
        },
    })
}

struct SiteTelegramProvider {
    auth: AuthService,
    transport: TelegramHttpTransport,
}

#[async_trait]
impl NotificationProvider for SiteTelegramProvider {
    fn channel(&self) -> g5_fleet_notify::NotificationChannel {
        g5_fleet_notify::NotificationChannel::Telegram
    }

    async fn deliver(&self, notification: &NotificationOutboxRecord) -> NotifyResult<()> {
        let site_id = notification
            .site_id
            .as_deref()
            .ok_or_else(|| NotifyError::Permanent("notification_site_missing".to_owned()))?;
        let destination = self
            .auth
            .decrypt_secret_for_connector(
                &notification.owner_user_id,
                site_id,
                SecretPurpose::Notification,
            )
            .await
            .map_err(map_auth_delivery_error)?;
        let destination = String::from_utf8(destination)
            .map_err(|_| NotifyError::Permanent("telegram_destination_invalid".to_owned()))?;
        let destination = destination.trim().to_owned();
        if destination.is_empty()
            || destination.len() > 128
            || !destination
                .chars()
                .all(|character| character.is_ascii_digit() || character == '-')
        {
            return Err(NotifyError::Permanent(
                "telegram_destination_invalid".to_owned(),
            ));
        }
        TelegramAdapter::new(self.transport.clone(), destination)?
            .deliver(notification)
            .await
    }
}

struct SiteWebPushProvider {
    auth: AuthService,
    transport: WebPushHttpTransport,
}

#[async_trait]
impl NotificationProvider for SiteWebPushProvider {
    fn channel(&self) -> g5_fleet_notify::NotificationChannel {
        g5_fleet_notify::NotificationChannel::WebPush
    }

    async fn deliver(&self, notification: &NotificationOutboxRecord) -> NotifyResult<()> {
        let site_id = notification
            .site_id
            .as_deref()
            .ok_or_else(|| NotifyError::Permanent("notification_site_missing".to_owned()))?;
        let subscriptions = self
            .auth
            .active_web_push_subscription_materials(&notification.owner_user_id, site_id)
            .await
            .map_err(map_auth_delivery_error)?;
        if subscriptions.is_empty() {
            return Err(NotifyError::Permanent(
                "web_push_subscription_missing".to_owned(),
            ));
        }

        let mut delivered = 0_usize;
        let mut transient = false;
        for subscription in subscriptions {
            let subscription_id = subscription.subscription_id.clone();
            let adapter = WebPushAdapter::new(
                self.transport.clone(),
                WebPushSubscription {
                    subscription_ref: subscription.subscription_id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            )?;
            match adapter.deliver(notification).await {
                Ok(()) => delivered += 1,
                Err(NotifyError::Permanent(code)) if code == "subscription_gone" => {
                    let _ = self
                        .auth
                        .revoke_web_push_subscription(
                            &notification.owner_user_id,
                            site_id,
                            &subscription_id,
                        )
                        .await;
                }
                Err(NotifyError::Transient(_)) => transient = true,
                Err(NotifyError::Permanent(_)) | Err(NotifyError::InvalidInput) => {}
                Err(NotifyError::Store) => transient = true,
            }
        }
        if transient {
            return Err(NotifyError::Transient("web_push_partial_retry".to_owned()));
        }
        if delivered == 0 {
            return Err(NotifyError::Permanent(
                "web_push_no_active_delivery".to_owned(),
            ));
        }
        Ok(())
    }
}

fn map_auth_delivery_error(error: AuthError) -> NotifyError {
    match error {
        AuthError::Store(StoreError::NotFound) => {
            NotifyError::Permanent("notification_destination_missing".to_owned())
        }
        AuthError::Decryption | AuthError::InvalidWebPushSubscription => {
            NotifyError::Permanent("notification_secret_invalid".to_owned())
        }
        _ => NotifyError::Transient("notification_secret_store".to_owned()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
    use g5_fleet_store::FleetStore;

    #[tokio::test]
    async fn production_runtime_exposes_only_public_vapid_material() {
        let data = tempfile::tempdir().unwrap();
        let store = FleetStore::initialize(data.path(), "notification-runtime-test")
            .await
            .unwrap();
        let auth = AuthService::new(store, &[7_u8; 32]).unwrap();
        let private_key = "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY".to_owned();
        let runtime = build_notification_runtime(
            auth,
            Some("1234567890:abcdefghijklmnopqrstuvwxyzABCDE".to_owned()),
            Some(private_key.clone()),
            Some("mailto:admin@example.com".to_owned()),
        )
        .unwrap();
        let public_key = runtime.public_config.vapid_public_key.unwrap();
        assert_eq!(URL_SAFE_NO_PAD.decode(&public_key).unwrap().len(), 65);
        assert_ne!(public_key, private_key);
        assert!(runtime.public_config.telegram_transport_configured);
    }
}
