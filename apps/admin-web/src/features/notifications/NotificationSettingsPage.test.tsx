import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { NotificationSettingsPage } from "./NotificationSettingsPage";

const api = vi.hoisted(() => ({
  createWebPushSubscription: vi.fn(),
  deleteTelegramDestination: vi.fn(),
  getNotificationTransportStatus: vi.fn(),
  listWebPushSubscriptions: vi.fn(),
  putTelegramDestination: vi.fn(),
  revokeWebPushSubscription: vi.fn(),
  rotateWebPushSubscription: vi.fn(),
}));
const browserPush = vi.hoisted(() => ({ acquireBrowserPushSubscription: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));
vi.mock("./browserPush", () => browserPush);

function renderPage(stepUpActive = true) {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/notifications"]}>
      <AuthSessionProvider value={{
        idleTimeoutMinutes: 30,
        logout: async () => {},
        session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: stepUpActive, csrf_token: "csrf-1" },
        updateIdleTimeout: () => {},
        updateSession: () => {},
      }}>
        <Routes><Route path="/sites/:siteId/notifications" element={<NotificationSettingsPage />} /></Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getNotificationTransportStatus.mockResolvedValue({
    telegram_transport_configured: true,
    telegram_destination_configured: false,
    vapid_public_key: "public-vapid-key",
    active_web_push_subscriptions: 0,
  });
  api.listWebPushSubscriptions.mockResolvedValue([]);
  api.createWebPushSubscription.mockResolvedValue({ subscription_id: "wps_new", state: "active" });
  browserPush.acquireBrowserPushSubscription.mockResolvedValue({
    endpoint: "https://fcm.googleapis.com/fcm/send/secret-endpoint",
    keys: { p256dh: "secret-public-key", auth: "secret-auth" },
  });
});

describe("NotificationSettingsPage", () => {
  it("creates a browser subscription without rendering endpoint secrets", async () => {
    renderPage();
    const button = await screen.findByRole("button", { name: "이 브라우저 구독" });
    fireEvent.click(button);
    await waitFor(() => expect(api.createWebPushSubscription).toHaveBeenCalledWith(
      "site-a",
      expect.objectContaining({ endpoint: expect.stringContaining("fcm.googleapis.com") }),
      "csrf-1",
    ));
    expect(screen.queryByText(/secret-endpoint/)).not.toBeInTheDocument();
    expect(screen.getByText("브라우저 Push 구독을 저장했습니다.")).toBeVisible();
  });

  it("keeps destination and subscription mutations locked without recent OTP", async () => {
    renderPage(false);
    expect(await screen.findByText("OTP 재인증 필요")).toBeVisible();
    expect(screen.getByRole("button", { name: "암호화 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이 브라우저 구독" })).toBeDisabled();
  });
});
