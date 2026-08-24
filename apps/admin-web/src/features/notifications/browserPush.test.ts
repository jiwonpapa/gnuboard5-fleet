import { describe, expect, it } from "vitest";

import { decodeVapidPublicKey, subscriptionInput } from "./browserPush";

describe("browserPush", () => {
  it("decodes the URL-safe VAPID public key for PushManager", () => {
    const bytes = decodeVapidPublicKey("BAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0-P0A");
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });

  it("keeps endpoint keys in the server request and rejects incomplete browser output", () => {
    expect(subscriptionInput({
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      keys: { p256dh: "public", auth: "auth" },
    })).toEqual({
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      keys: { p256dh: "public", auth: "auth" },
    });
    expect(() => subscriptionInput({ endpoint: "https://example.com" }))
      .toThrow("구독 키");
  });
});
