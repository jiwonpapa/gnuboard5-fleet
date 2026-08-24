import type { WebPushSubscriptionInput } from "../../api/fleet";

export async function acquireBrowserPushSubscription(
  vapidPublicKey: string,
  rotate: boolean,
): Promise<WebPushSubscriptionInput> {
  if (!("serviceWorker" in navigator) || !("Notification" in globalThis)) {
    throw new Error("이 브라우저는 Web Push를 지원하지 않습니다.");
  }
  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted") {
    throw new Error("브라우저 알림 권한이 필요합니다.");
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && rotate) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeVapidPublicKey(vapidPublicKey),
  });
  return subscriptionInput(subscription.toJSON());
}

export function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

export function subscriptionInput(
  value: PushSubscriptionJSON,
): WebPushSubscriptionInput {
  const endpoint = value.endpoint ?? "";
  const p256dh = value.keys?.p256dh ?? "";
  const auth = value.keys?.auth ?? "";
  if (!endpoint || !p256dh || !auth) {
    throw new Error("브라우저 구독 키를 읽지 못했습니다.");
  }
  return { endpoint, keys: { p256dh, auth } };
}
