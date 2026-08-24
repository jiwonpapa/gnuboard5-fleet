use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    time::Duration,
};

use async_trait::async_trait;
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use g5_fleet_store::{FleetStore, NotificationOutboxRecord};
use getrandom::fill as random_fill;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;
use url::Url;
use web_push::{
    ContentEncoding, SubscriptionInfo, VapidSignatureBuilder, WebPushMessageBuilder,
    request_builder::build_request,
};

const DEFAULT_LEASE_SECONDS: u64 = 60;
const DEFAULT_MAX_ATTEMPTS: i64 = 5;
const DEFAULT_RETRY_BASE_SECONDS: u64 = 5;

#[derive(Debug, thiserror::Error)]
pub enum NotifyError {
    #[error("notification input is invalid")]
    InvalidInput,
    #[error("notification store operation failed")]
    Store,
    #[error("notification delivery failed permanently: {0}")]
    Permanent(String),
    #[error("notification delivery failed transiently: {0}")]
    Transient(String),
}

pub type NotifyResult<T> = Result<T, NotifyError>;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum NotificationChannel {
    Telegram,
    WebPush,
}

impl NotificationChannel {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Telegram => "telegram",
            Self::WebPush => "web_push",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct NotificationPayload {
    pub title: String,
    pub body: String,
    pub action_path: Option<String>,
}

impl NotificationPayload {
    pub fn sanitized(self) -> NotifyResult<Self> {
        if self.title.trim().is_empty()
            || self.title.len() > 200
            || self.body.trim().is_empty()
            || self.body.len() > 4000
            || self
                .action_path
                .as_deref()
                .is_some_and(|path| !valid_action_path(path))
        {
            return Err(NotifyError::InvalidInput);
        }
        Ok(Self {
            title: redact_sensitive_text(&self.title),
            body: redact_sensitive_text(&self.body),
            action_path: self.action_path,
        })
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct EnqueueResult {
    pub notification: NotificationOutboxRecord,
    pub inserted: bool,
}

#[derive(Clone)]
pub struct NotificationService {
    store: FleetStore,
}

impl NotificationService {
    pub fn new(store: FleetStore) -> Self {
        Self { store }
    }

    pub async fn enqueue(
        &self,
        owner_user_id: &str,
        site_id: &str,
        event_id: &str,
        channel: NotificationChannel,
        payload: NotificationPayload,
    ) -> NotifyResult<EnqueueResult> {
        if event_id.is_empty() || event_id.len() > 128 {
            return Err(NotifyError::InvalidInput);
        }
        let payload =
            serde_json::to_value(payload.sanitized()?).map_err(|_| NotifyError::InvalidInput)?;
        let outbox_id = format!("outbox_{}", random_token()?);
        let scoped_event_id = scoped_event_id(owner_user_id, site_id, event_id);
        let (notification, inserted) = self
            .store
            .enqueue_notification_deduplicated(
                &outbox_id,
                &scoped_event_id,
                owner_user_id,
                site_id,
                channel.as_str(),
                &payload,
            )
            .await
            .map_err(|_| NotifyError::Store)?;
        Ok(EnqueueResult {
            notification,
            inserted,
        })
    }

    pub async fn get(
        &self,
        owner_user_id: &str,
        site_id: &str,
        outbox_id: &str,
    ) -> NotifyResult<Option<NotificationOutboxRecord>> {
        self.store
            .owned_notification(owner_user_id, site_id, outbox_id)
            .await
            .map_err(|_| NotifyError::Store)
    }
}

#[async_trait]
pub trait NotificationProvider: Send + Sync {
    fn channel(&self) -> NotificationChannel;
    async fn deliver(&self, notification: &NotificationOutboxRecord) -> NotifyResult<()>;
}

#[derive(Clone)]
pub struct NotificationWorker {
    store: FleetStore,
    providers: HashMap<NotificationChannel, Arc<dyn NotificationProvider>>,
    lease_seconds: u64,
    max_attempts: i64,
    retry_base_seconds: u64,
}

impl NotificationWorker {
    pub fn new(
        store: FleetStore,
        providers: impl IntoIterator<Item = Arc<dyn NotificationProvider>>,
    ) -> Self {
        Self::with_policy(
            store,
            providers,
            DEFAULT_LEASE_SECONDS,
            DEFAULT_MAX_ATTEMPTS,
            DEFAULT_RETRY_BASE_SECONDS,
        )
    }

    pub fn with_policy(
        store: FleetStore,
        providers: impl IntoIterator<Item = Arc<dyn NotificationProvider>>,
        lease_seconds: u64,
        max_attempts: i64,
        retry_base_seconds: u64,
    ) -> Self {
        let providers = providers
            .into_iter()
            .map(|provider| (provider.channel(), provider))
            .collect();
        Self {
            store,
            providers,
            lease_seconds: lease_seconds.clamp(1, 3600),
            max_attempts: max_attempts.clamp(1, 20),
            retry_base_seconds: retry_base_seconds.min(3600),
        }
    }

    pub async fn run_once(&self) -> NotifyResult<Option<NotificationOutboxRecord>> {
        let Some(notification) = self
            .store
            .claim_due_notification(self.lease_seconds)
            .await
            .map_err(|_| NotifyError::Store)?
        else {
            return Ok(None);
        };
        let channel = parse_channel(&notification.channel)?;
        let Some(provider) = self.providers.get(&channel) else {
            self.store
                .dead_letter_notification(&notification.outbox_id, "provider_not_configured")
                .await
                .map_err(|_| NotifyError::Store)?;
            return self.current(notification).await.map(Some);
        };
        match provider.deliver(&notification).await {
            Ok(()) => self
                .store
                .deliver_notification(&notification.outbox_id)
                .await
                .map_err(|_| NotifyError::Store)?,
            Err(NotifyError::Transient(code)) => {
                let retry_seconds = retry_delay(self.retry_base_seconds, notification.attempts);
                self.store
                    .retry_notification(
                        &notification.outbox_id,
                        &safe_error_code(&code),
                        retry_seconds,
                        self.max_attempts,
                    )
                    .await
                    .map_err(|_| NotifyError::Store)?;
            }
            Err(NotifyError::Permanent(code)) => self
                .store
                .dead_letter_notification(&notification.outbox_id, &safe_error_code(&code))
                .await
                .map_err(|_| NotifyError::Store)?,
            Err(_) => self
                .store
                .dead_letter_notification(&notification.outbox_id, "invalid_provider_result")
                .await
                .map_err(|_| NotifyError::Store)?,
        }
        self.current(notification).await.map(Some)
    }

    pub async fn run(self, idle_interval: Duration) {
        let idle_interval = idle_interval.max(Duration::from_millis(100));
        loop {
            match self.run_once().await {
                Ok(Some(_)) => tokio::task::yield_now().await,
                Ok(None) | Err(_) => tokio::time::sleep(idle_interval).await,
            }
        }
    }

    async fn current(
        &self,
        notification: NotificationOutboxRecord,
    ) -> NotifyResult<NotificationOutboxRecord> {
        self.store
            .owned_notification(
                &notification.owner_user_id,
                notification.site_id.as_deref().ok_or(NotifyError::Store)?,
                &notification.outbox_id,
            )
            .await
            .map_err(|_| NotifyError::Store)?
            .ok_or(NotifyError::Store)
    }
}

#[derive(Clone, Default)]
pub struct FakeProvider {
    channel: Option<NotificationChannel>,
    outcomes: Arc<Mutex<VecDeque<NotifyResult<()>>>>,
    deliveries: Arc<Mutex<Vec<String>>>,
}

impl FakeProvider {
    pub fn new(
        channel: NotificationChannel,
        outcomes: impl IntoIterator<Item = NotifyResult<()>>,
    ) -> Self {
        Self {
            channel: Some(channel),
            outcomes: Arc::new(Mutex::new(outcomes.into_iter().collect())),
            deliveries: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn delivery_ids(&self) -> Vec<String> {
        self.deliveries.lock().await.clone()
    }
}

#[async_trait]
impl NotificationProvider for FakeProvider {
    fn channel(&self) -> NotificationChannel {
        self.channel.unwrap_or(NotificationChannel::Telegram)
    }

    async fn deliver(&self, notification: &NotificationOutboxRecord) -> NotifyResult<()> {
        self.deliveries
            .lock()
            .await
            .push(notification.outbox_id.clone());
        self.outcomes.lock().await.pop_front().unwrap_or(Ok(()))
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TelegramDelivery {
    pub destination_ref: String,
    pub title: String,
    pub body: String,
}

#[async_trait]
pub trait TelegramTransport: Send + Sync {
    async fn send(&self, delivery: &TelegramDelivery) -> NotifyResult<()>;
}

pub struct TelegramAdapter<T> {
    transport: T,
    destination_ref: String,
}

#[derive(Clone)]
pub struct TelegramHttpTransport {
    client: reqwest::Client,
    bot_token: Arc<str>,
}

impl TelegramHttpTransport {
    pub fn new(bot_token: String) -> NotifyResult<Self> {
        if !(20..=256).contains(&bot_token.len())
            || !bot_token
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || ":_-".contains(character))
        {
            return Err(NotifyError::InvalidInput);
        }
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|_| NotifyError::InvalidInput)?;
        Ok(Self {
            client,
            bot_token: Arc::from(bot_token),
        })
    }
}

#[derive(Deserialize)]
struct TelegramApiResponse {
    ok: bool,
}

#[async_trait]
impl TelegramTransport for TelegramHttpTransport {
    async fn send(&self, delivery: &TelegramDelivery) -> NotifyResult<()> {
        let response = self
            .client
            .post(format!(
                "https://api.telegram.org/bot{}/sendMessage",
                self.bot_token
            ))
            .json(&serde_json::json!({
                "chat_id": delivery.destination_ref,
                "text": format!("{}\n\n{}", delivery.title, delivery.body),
                "disable_web_page_preview": true,
            }))
            .send()
            .await
            .map_err(|_| NotifyError::Transient("telegram_network".to_owned()))?;
        let status = response.status();
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error() {
            return Err(NotifyError::Transient("telegram_retryable".to_owned()));
        }
        if !status.is_success() {
            return Err(NotifyError::Permanent("telegram_rejected".to_owned()));
        }
        if response
            .content_length()
            .is_some_and(|length| length > 64 * 1024)
        {
            return Err(NotifyError::Transient(
                "telegram_response_too_large".to_owned(),
            ));
        }
        let body = response
            .bytes()
            .await
            .map_err(|_| NotifyError::Transient("telegram_response".to_owned()))?;
        if body.len() > 64 * 1024 {
            return Err(NotifyError::Transient(
                "telegram_response_too_large".to_owned(),
            ));
        }
        let result: TelegramApiResponse = serde_json::from_slice(&body)
            .map_err(|_| NotifyError::Transient("telegram_response".to_owned()))?;
        if result.ok {
            Ok(())
        } else {
            Err(NotifyError::Permanent("telegram_rejected".to_owned()))
        }
    }
}

impl<T> TelegramAdapter<T> {
    pub fn new(transport: T, destination_ref: String) -> NotifyResult<Self> {
        if destination_ref.is_empty() || destination_ref.len() > 128 {
            return Err(NotifyError::InvalidInput);
        }
        Ok(Self {
            transport,
            destination_ref,
        })
    }
}

#[async_trait]
impl<T: TelegramTransport> NotificationProvider for TelegramAdapter<T> {
    fn channel(&self) -> NotificationChannel {
        NotificationChannel::Telegram
    }

    async fn deliver(&self, notification: &NotificationOutboxRecord) -> NotifyResult<()> {
        let payload: NotificationPayload = serde_json::from_value(notification.payload.clone())
            .map_err(|_| NotifyError::InvalidInput)?;
        self.transport
            .send(&TelegramDelivery {
                destination_ref: self.destination_ref.clone(),
                title: payload.title,
                body: payload.body,
            })
            .await
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct WebPushSubscription {
    pub subscription_ref: String,
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
}

impl std::fmt::Debug for WebPushSubscription {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("WebPushSubscription")
            .field("subscription_ref", &self.subscription_ref)
            .field("endpoint", &"<redacted>")
            .field("p256dh", &"<redacted>")
            .field("auth", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebPushDelivery {
    pub subscription: WebPushSubscription,
    pub title: String,
    pub body: String,
    pub action_path: Option<String>,
}

#[async_trait]
pub trait WebPushTransport: Send + Sync {
    async fn send(&self, delivery: &WebPushDelivery) -> NotifyResult<()>;
}

pub struct WebPushAdapter<T> {
    transport: T,
    subscription: WebPushSubscription,
}

impl<T> WebPushAdapter<T> {
    pub fn new(transport: T, subscription: WebPushSubscription) -> NotifyResult<Self> {
        if subscription.subscription_ref.is_empty()
            || subscription.subscription_ref.len() > 128
            || !valid_web_push_endpoint(&subscription.endpoint)
        {
            return Err(NotifyError::InvalidInput);
        }
        Ok(Self {
            transport,
            subscription,
        })
    }
}

#[async_trait]
impl<T: WebPushTransport> NotificationProvider for WebPushAdapter<T> {
    fn channel(&self) -> NotificationChannel {
        NotificationChannel::WebPush
    }

    async fn deliver(&self, notification: &NotificationOutboxRecord) -> NotifyResult<()> {
        let payload: NotificationPayload = serde_json::from_value(notification.payload.clone())
            .map_err(|_| NotifyError::InvalidInput)?;
        self.transport
            .send(&WebPushDelivery {
                subscription: self.subscription.clone(),
                title: payload.title,
                body: payload.body,
                action_path: payload.action_path,
            })
            .await
    }
}

#[derive(Clone)]
pub struct WebPushHttpTransport {
    client: reqwest::Client,
    vapid_private_key: Arc<str>,
    vapid_subject: Arc<str>,
    public_key: Arc<str>,
}

impl WebPushHttpTransport {
    pub fn new(vapid_private_key: String, vapid_subject: String) -> NotifyResult<Self> {
        if !valid_vapid_subject(&vapid_subject) {
            return Err(NotifyError::InvalidInput);
        }
        let partial = VapidSignatureBuilder::from_base64_no_sub(&vapid_private_key)
            .map_err(|_| NotifyError::InvalidInput)?;
        let public_key = URL_SAFE_NO_PAD.encode(partial.get_public_key());
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|_| NotifyError::InvalidInput)?;
        Ok(Self {
            client,
            vapid_private_key: Arc::from(vapid_private_key),
            vapid_subject: Arc::from(vapid_subject),
            public_key: Arc::from(public_key),
        })
    }

    pub fn public_key(&self) -> &str {
        &self.public_key
    }

    fn request(
        &self,
        delivery: &WebPushDelivery,
    ) -> NotifyResult<(String, Vec<(String, String)>, Vec<u8>)> {
        if !valid_web_push_endpoint(&delivery.subscription.endpoint) {
            return Err(NotifyError::Permanent(
                "web_push_endpoint_forbidden".to_owned(),
            ));
        }
        let subscription = SubscriptionInfo::new(
            delivery.subscription.endpoint.clone(),
            delivery.subscription.p256dh.clone(),
            delivery.subscription.auth.clone(),
        );
        let mut signature =
            VapidSignatureBuilder::from_base64(&self.vapid_private_key, &subscription)
                .map_err(|_| NotifyError::Permanent("web_push_invalid_key".to_owned()))?;
        signature.add_claim("sub", self.vapid_subject.to_string());
        let signature = signature
            .build()
            .map_err(|_| NotifyError::Permanent("web_push_invalid_signature".to_owned()))?;
        let payload = serde_json::to_vec(&serde_json::json!({
            "title": delivery.title,
            "body": delivery.body,
            "action_path": delivery.action_path,
        }))
        .map_err(|_| NotifyError::InvalidInput)?;
        let mut builder = WebPushMessageBuilder::new(&subscription);
        builder.set_ttl(3600);
        builder.set_payload(ContentEncoding::Aes128Gcm, &payload);
        builder.set_vapid_signature(signature);
        let message = builder
            .build()
            .map_err(|_| NotifyError::Permanent("web_push_invalid_subscription".to_owned()))?;
        let request = build_request::<Vec<u8>>(message);
        let endpoint = request.uri().to_string();
        let headers = request
            .headers()
            .iter()
            .map(|(name, value)| {
                value
                    .to_str()
                    .map(|value| (name.as_str().to_owned(), value.to_owned()))
                    .map_err(|_| NotifyError::Permanent("web_push_invalid_header".to_owned()))
            })
            .collect::<NotifyResult<Vec<_>>>()?;
        Ok((endpoint, headers, request.into_body()))
    }
}

#[async_trait]
impl WebPushTransport for WebPushHttpTransport {
    async fn send(&self, delivery: &WebPushDelivery) -> NotifyResult<()> {
        let (endpoint, headers, body) = self.request(delivery)?;
        let mut outgoing = self.client.post(endpoint);
        for (name, value) in headers {
            outgoing = outgoing.header(name, value);
        }
        let response = outgoing
            .body(body)
            .send()
            .await
            .map_err(|_| NotifyError::Transient("web_push_network".to_owned()))?;
        match response.status() {
            status if status.is_success() => Ok(()),
            reqwest::StatusCode::TOO_MANY_REQUESTS => {
                Err(NotifyError::Transient("web_push_rate_limited".to_owned()))
            }
            status if status.is_server_error() => {
                Err(NotifyError::Transient("web_push_retryable".to_owned()))
            }
            reqwest::StatusCode::NOT_FOUND | reqwest::StatusCode::GONE => {
                Err(NotifyError::Permanent("subscription_gone".to_owned()))
            }
            _ => Err(NotifyError::Permanent("web_push_rejected".to_owned())),
        }
    }
}

fn parse_channel(value: &str) -> NotifyResult<NotificationChannel> {
    match value {
        "telegram" => Ok(NotificationChannel::Telegram),
        "web_push" => Ok(NotificationChannel::WebPush),
        _ => Err(NotifyError::InvalidInput),
    }
}

fn valid_action_path(value: &str) -> bool {
    value.starts_with('/')
        && !value.starts_with("//")
        && !value.contains('\\')
        && !value.contains('\0')
        && value.len() <= 2048
}

pub fn valid_web_push_endpoint(value: &str) -> bool {
    let Ok(url) = Url::parse(value) else {
        return false;
    };
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || url.port().is_some_and(|port| port != 443)
    {
        return false;
    }
    let Some(host) = url.host_str().map(str::to_ascii_lowercase) else {
        return false;
    };
    [
        "googleapis.com",
        "push.services.mozilla.com",
        "push.apple.com",
        "notify.windows.com",
    ]
    .iter()
    .any(|suffix| host == *suffix || host.ends_with(&format!(".{suffix}")))
}

fn valid_vapid_subject(value: &str) -> bool {
    if value.len() > 512 {
        return false;
    }
    if let Some(address) = value.strip_prefix("mailto:") {
        return address.contains('@') && !address.contains(char::is_whitespace);
    }
    Url::parse(value).is_ok_and(|url| {
        url.scheme() == "https"
            && url.host_str().is_some()
            && url.username().is_empty()
            && url.password().is_none()
            && url.fragment().is_none()
    })
}

fn retry_delay(base: u64, attempts: i64) -> u64 {
    let exponent = u32::try_from(attempts.saturating_sub(1))
        .unwrap_or(0)
        .min(10);
    base.saturating_mul(1_u64 << exponent).min(86_400)
}

fn safe_error_code(value: &str) -> String {
    let code: String = value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '_')
        .take(64)
        .collect();
    if code.is_empty() {
        "provider_error".to_owned()
    } else {
        code
    }
}

fn redact_sensitive_text(value: &str) -> String {
    value
        .split_whitespace()
        .map(|part| {
            let digits = part.chars().filter(char::is_ascii_digit).count();
            if (part.contains('@') && part.contains('.'))
                || digits >= 7
                || (part.starts_with("eyJ") && part.len() >= 20)
            {
                "[redacted]"
            } else {
                part
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn random_token() -> NotifyResult<String> {
    let mut bytes = [0_u8; 24];
    random_fill(&mut bytes).map_err(|_| NotifyError::Store)?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

fn scoped_event_id(owner_user_id: &str, site_id: &str, event_id: &str) -> String {
    let mut digest = Sha256::new();
    for value in [owner_user_id, site_id, event_id] {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    URL_SAFE_NO_PAD.encode(digest.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn fixture() -> (FleetStore, NotificationService) {
        let data = tempfile::tempdir().unwrap();
        let path = data.keep();
        let store = FleetStore::initialize(path, "notify-test").await.unwrap();
        store
            .create_user("user-a", "admin", b"fixture-password-hash-a")
            .await
            .unwrap();
        store
            .create_user("user-b", "other", b"fixture-password-hash-b")
            .await
            .unwrap();
        store
            .create_site("site-a", "user-a", "Site A", "https://example.com")
            .await
            .unwrap();
        store
            .create_site("site-b", "user-b", "Site B", "https://example.org")
            .await
            .unwrap();
        (store.clone(), NotificationService::new(store))
    }

    fn payload() -> NotificationPayload {
        NotificationPayload {
            title: "회원 가입".to_owned(),
            body: "person@example.com 010-1234-5678 가입".to_owned(),
            action_path: Some("/sites/site-a/members".to_owned()),
        }
    }

    #[tokio::test]
    async fn enqueue_is_deduplicated_redacted_and_owner_site_bound() {
        let (store, service) = fixture().await;
        let first = service
            .enqueue(
                "user-a",
                "site-a",
                "event-a",
                NotificationChannel::Telegram,
                payload(),
            )
            .await
            .unwrap();
        let duplicate = service
            .enqueue(
                "user-a",
                "site-a",
                "event-a",
                NotificationChannel::Telegram,
                payload(),
            )
            .await
            .unwrap();
        assert!(first.inserted);
        assert!(!duplicate.inserted);
        assert_eq!(
            first.notification.outbox_id,
            duplicate.notification.outbox_id
        );
        let encoded = serde_json::to_string(&first.notification.payload).unwrap();
        assert!(!encoded.contains("person@example.com"));
        assert!(!encoded.contains("010-1234-5678"));
        assert!(
            store
                .owned_notification("user-b", "site-a", &first.notification.outbox_id,)
                .await
                .unwrap()
                .is_none()
        );
        assert!(
            service
                .enqueue(
                    "user-b",
                    "site-b",
                    "event-a",
                    NotificationChannel::Telegram,
                    payload(),
                )
                .await
                .unwrap()
                .inserted
        );
    }

    #[tokio::test]
    async fn fake_delivery_retries_then_succeeds_without_external_send() {
        let (store, service) = fixture().await;
        let queued = service
            .enqueue(
                "user-a",
                "site-a",
                "event-retry",
                NotificationChannel::Telegram,
                payload(),
            )
            .await
            .unwrap();
        let fake = Arc::new(FakeProvider::new(
            NotificationChannel::Telegram,
            [Err(NotifyError::Transient("temporary".to_owned())), Ok(())],
        ));
        let providers: Vec<Arc<dyn NotificationProvider>> = vec![fake.clone()];
        let worker = NotificationWorker::with_policy(store, providers, 1, 3, 0);
        assert_eq!(worker.run_once().await.unwrap().unwrap().state, "pending");
        assert_eq!(worker.run_once().await.unwrap().unwrap().state, "delivered");
        assert_eq!(fake.delivery_ids().await.len(), 2);
        assert_eq!(
            service
                .get("user-a", "site-a", &queued.notification.outbox_id)
                .await
                .unwrap()
                .unwrap()
                .attempts,
            2
        );
    }

    #[tokio::test]
    async fn fake_permanent_failure_moves_web_push_to_dead_letter() {
        let (store, service) = fixture().await;
        service
            .enqueue(
                "user-a",
                "site-a",
                "event-dead",
                NotificationChannel::WebPush,
                payload(),
            )
            .await
            .unwrap();
        let fake = Arc::new(FakeProvider::new(
            NotificationChannel::WebPush,
            [Err(NotifyError::Permanent("subscription_gone".to_owned()))],
        ));
        let providers: Vec<Arc<dyn NotificationProvider>> = vec![fake];
        let worker = NotificationWorker::with_policy(store, providers, 1, 3, 0);
        let result = worker.run_once().await.unwrap().unwrap();
        assert_eq!(result.state, "dead_letter");
        assert_eq!(result.last_error_code.as_deref(), Some("subscription_gone"));
    }

    #[test]
    fn production_transports_build_only_https_vendor_push_requests() {
        assert!(
            TelegramHttpTransport::new("1234567890:abcdefghijklmnopqrstuvwxyzABCDE".to_owned())
                .is_ok()
        );
        assert!(TelegramHttpTransport::new("token".to_owned()).is_err());
        assert!(valid_web_push_endpoint(
            "https://fcm.googleapis.com/fcm/send/subscription"
        ));
        assert!(valid_web_push_endpoint(
            "https://updates.push.services.mozilla.com/wpush/v2/subscription"
        ));
        assert!(!valid_web_push_endpoint(
            "https://fcm.googleapis.com.evil.invalid/secret"
        ));
        assert!(!valid_web_push_endpoint("http://127.0.0.1/push"));

        let transport = WebPushHttpTransport::new(
            "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY".to_owned(),
            "mailto:admin@example.com".to_owned(),
        )
        .unwrap();
        let delivery = WebPushDelivery {
            subscription: WebPushSubscription {
                subscription_ref: "wps-fixture".to_owned(),
                endpoint: "https://fcm.googleapis.com/fcm/send/subscription".to_owned(),
                p256dh: "BLMbF9ffKBiWQLCKvTHb6LO8Nb6dcUh6TItC455vu2kElga6PQvUmaFyCdykxY2nOSSL3yKgfbmFLRTUaGv4yV8".to_owned(),
                auth: "xS03Fi5ErfTNH_l9WHE9Ig".to_owned(),
            },
            title: "운영 알림".to_owned(),
            body: "점검이 완료되었습니다.".to_owned(),
            action_path: Some("/sites/site-a".to_owned()),
        };
        let (endpoint, headers, encrypted_body) = transport.request(&delivery).unwrap();
        assert_eq!(endpoint, "https://fcm.googleapis.com/fcm/send/subscription");
        assert!(headers.iter().any(|(name, value)| {
            name.eq_ignore_ascii_case("content-encoding") && value == "aes128gcm"
        }));
        assert!(
            headers
                .iter()
                .any(|(name, _)| { name.eq_ignore_ascii_case("authorization") })
        );
        assert!(!encrypted_body.is_empty());
        assert!(!String::from_utf8_lossy(&encrypted_body).contains("점검이 완료"));
    }
}
