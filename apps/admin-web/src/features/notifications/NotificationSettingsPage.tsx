import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  createWebPushSubscription,
  deleteTelegramDestination,
  getNotificationTransportStatus,
  listWebPushSubscriptions,
  putTelegramDestination,
  revokeWebPushSubscription,
  rotateWebPushSubscription,
  type NotificationTransportStatus,
  type WebPushSubscriptionSummary,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import { acquireBrowserPushSubscription } from "./browserPush";

export function NotificationSettingsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [status, setStatus] = useState<NotificationTransportStatus | null>(null);
  const [subscriptions, setSubscriptions] = useState<WebPushSubscriptionSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const [nextStatus, nextSubscriptions] = await Promise.all([
      getNotificationTransportStatus(siteId),
      listWebPushSubscriptions(siteId),
    ]);
    setStatus(nextStatus);
    setSubscriptions(nextSubscriptions);
  }

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    void Promise.all([
      getNotificationTransportStatus(siteId),
      listWebPushSubscriptions(siteId),
    ]).then(([nextStatus, nextSubscriptions]) => {
      if (active) {
        setStatus(nextStatus);
        setSubscriptions(nextSubscriptions);
      }
    }).catch((caught) => active && setError(errorMessage(caught)));
    return () => { active = false; };
  }, [siteId]);

  async function run(task: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await refresh();
      setNotice(message);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function saveTelegram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const chatId = String(new FormData(form).get("chat_id") ?? "");
    await run(async () => {
      await putTelegramDestination(siteId, chatId, session.csrf_token);
      form.reset();
    }, "Telegram 목적지를 암호화 저장했습니다.");
  }

  async function subscribe(rotate: boolean) {
    const vapid = status?.vapid_public_key;
    if (!vapid) {
      setError("서버에 VAPID 전송 키가 설정되지 않았습니다.");
      return;
    }
    const active = subscriptions.find((subscription) => subscription.state === "active");
    await run(async () => {
      const input = await acquireBrowserPushSubscription(vapid, rotate);
      if (rotate && active) {
        await rotateWebPushSubscription(
          siteId,
          active.subscription_id,
          input,
          session.csrf_token,
        );
      } else {
        await createWebPushSubscription(siteId, input, session.csrf_token);
      }
    }, rotate ? "브라우저 Push 구독을 회전했습니다." : "브라우저 Push 구독을 저장했습니다.");
  }

  if (!siteId) return <p className="error-message">site_id가 없는 알림 경로입니다.</p>;
  const canMutate = session.step_up_active && !busy;
  const activeSubscriptions = subscriptions.filter((item) => item.state === "active");

  return (
    <section className="page notification-settings-page" aria-labelledby="notification-settings-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Notifications</span>
          <h2 id="notification-settings-title">알림 전달 설정</h2>
          <p>운영 전송 비밀은 서버에만 두고 사이트별 Telegram 목적지와 브라우저 Push 구독을 관리합니다.</p>
        </div>
        <span className="status-pill" data-status={session.step_up_active ? "ready" : "attention"}>
          {session.step_up_active ? "OTP 확인됨" : "OTP 재인증 필요"}
        </span>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {notice ? <p className="flow-notice" role="status">{notice}</p> : null}

      <div className="theme-summary-grid" aria-label="알림 전송 상태">
        <Summary label="Telegram transport" value={status?.telegram_transport_configured ? "설정됨" : "서버 설정 필요"} />
        <Summary label="Telegram destination" value={status?.telegram_destination_configured ? "암호화 저장됨" : "미설정"} />
        <Summary label="VAPID" value={status?.vapid_public_key ? "설정됨" : "서버 설정 필요"} />
        <Summary label="활성 브라우저" value={status?.active_web_push_subscriptions ?? 0} />
      </div>

      <div className="security-grid notification-settings-grid">
        <article className="security-panel">
          <header><span className="eyebrow">Telegram</span><h3>사이트 목적지</h3></header>
          <p>Bot token은 서버 secret에서만 읽습니다. 이 화면에는 chat ID도 다시 표시하지 않습니다.</p>
          <form className="security-form" onSubmit={(event) => void saveTelegram(event)}>
            <label><span>Chat ID</span><input required name="chat_id" inputMode="numeric" pattern="-?[0-9]+" autoComplete="off" /></label>
            <div className="action-row">
              <button className="danger-action" type="button" disabled={!canMutate || !status?.telegram_destination_configured} onClick={() => void run(async () => { await deleteTelegramDestination(siteId, session.csrf_token); }, "Telegram 목적지를 폐기했습니다.")}>목적지 폐기</button>
              <button className="primary-action" disabled={!canMutate}>암호화 저장</button>
            </div>
          </form>
        </article>

        <article className="security-panel">
          <header><span className="eyebrow">Web Push</span><h3>브라우저 구독</h3></header>
          <p>endpoint와 암호화 키는 서버 DB에 암호화되며, 목록에는 식별자와 상태만 표시됩니다.</p>
          <div className="action-row">
            <button type="button" disabled={!canMutate || !status?.vapid_public_key} onClick={() => void subscribe(false)}>이 브라우저 구독</button>
            <button className="primary-action" type="button" disabled={!canMutate || !status?.vapid_public_key || activeSubscriptions.length === 0} onClick={() => void subscribe(true)}>현재 구독 회전</button>
          </div>
          <ul className="notification-subscription-list" aria-label="Web Push 구독 목록">
            {subscriptions.length === 0 ? <li>저장된 구독이 없습니다.</li> : subscriptions.map((subscription) => (
              <li key={subscription.subscription_id}>
                <div><strong>{subscription.subscription_id}</strong><span>{subscription.state} · {subscription.updated_at}</span></div>
                <button className="danger-action" type="button" disabled={!canMutate || subscription.state !== "active"} onClick={() => void run(async () => { await revokeWebPushSubscription(siteId, subscription.subscription_id, session.csrf_token); }, "Web Push 구독을 폐기했습니다.")}>폐기</button>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "알림 설정을 처리하지 못했습니다.";
}
