import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "./AuthSessionContext";
import { useAuthSession } from "./useAuthSession";

describe("useAuthSession", () => {
  it("exposes the server session and rotating CSRF token only inside the provider", () => {
    function Consumer() {
      const { session } = useAuthSession();
      return <span>{session.csrf_token}</span>;
    }
    render(
      <AuthSessionProvider
        value={{
          idleTimeoutMinutes: 30,
          logout: vi.fn(),
          session: {
            principal_id: "principal-1",
            web_session_id: "session-1",
            expires_at_unix: 4_000_000_000,
            step_up_active: true,
            csrf_token: "csrf-rotated",
          },
          updateIdleTimeout: vi.fn(),
          updateSession: vi.fn(),
        }}
      >
        <Consumer />
      </AuthSessionProvider>,
    );
    expect(screen.getByText("csrf-rotated")).toBeVisible();
  });
});
