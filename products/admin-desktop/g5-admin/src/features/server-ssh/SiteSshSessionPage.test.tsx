import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { SiteSshSessionPage } from "./SiteSshSessionPage";

const connectSpy = vi.fn();
const connectSshTerminalBridgeSpy = vi.fn();
const disconnectSpy = vi.fn();
const listenSshShellStreamSpy = vi.fn();
const openShellSpy = vi.fn();
const writeShellSpy = vi.fn();
const readShellSpy = vi.fn();
const closeShellSpy = vi.fn();
const resizeShellSpy = vi.fn();
const refetchStatusSpy = vi.fn();
const navigateSpy = vi.fn();
const inspectHostSpy = vi.fn();
const trustHostSpy = vi.fn();
const resetHostVerificationSpy = vi.fn();
const resetConnectErrorSpy = vi.fn();

type SessionResponse = {
  active_profile: {
    auth_type: string;
    host: string;
    name: string;
    port: number;
    ssh_profile_id: string;
    username: string;
  } | null;
  connected: boolean;
  connected_at: string | null;
  correlation_id: string;
  request_id: string;
  shell_open: boolean;
  server_key_algorithm: string | null;
  server_key_fingerprint: string | null;
  server_request_id: string | null;
  site_id: string;
};

let sessionResponse: SessionResponse = {
  active_profile: null,
  connected: false,
  connected_at: null,
  correlation_id: "corr-ssh",
  request_id: "req-ssh",
  shell_open: false,
  server_key_algorithm: null,
  server_key_fingerprint: null,
  server_request_id: null,
  site_id: "site-alpha",
};

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock("../sites/site-routing", () => ({
  useCurrentSiteId: () => "site-alpha",
}));

vi.mock("../sites/use-site-catalog", () => ({
  useSiteCatalog: () => ({
    catalog: {
      active_site_id: "site-alpha",
      correlation_id: "corr-site",
      needs_onboarding: false,
      request_id: "req-site",
      server_request_id: null,
      sites: [
        {
          site: {
            api_base_url: "https://alpha.example.com/api/v1",
            created_at: "2026-03-10T00:00:00Z",
            id: "site-alpha",
            is_default: true,
            name: "알파몰",
            updated_at: "2026-03-10T00:00:00Z",
          },
          status: "authenticated",
        },
      ],
    },
  }),
}));

vi.mock("../server-profiles/use-site-ssh-profiles", () => ({
  useSiteSshProfiles: () => ({
    isLoading: false,
    profiles: [
      {
        auth_type: "key",
        created_at: "2026-03-10T00:00:00Z",
        has_key_passphrase: true,
        has_password: false,
        host: "ssh.alpha.example.com",
        id: "ssh-profile-1",
        key_path: "~/.ssh/id_ed25519",
        name: "운영 SSH",
        port: 22,
        site_id: "site-alpha",
        updated_at: "2026-03-10T00:00:00Z",
        username: "deploy",
      },
      {
        auth_type: "password",
        created_at: "2026-03-10T00:00:00Z",
        has_key_passphrase: false,
        has_password: true,
        host: "ssh.beta.example.com",
        id: "ssh-profile-2",
        key_path: null,
        name: "보조 SSH",
        port: 2222,
        site_id: "site-alpha",
        updated_at: "2026-03-10T00:00:00Z",
        username: "ops",
      },
    ],
    responseError: null,
  }),
}));

vi.mock("./use-site-ssh-session", () => ({
  useSiteSshSession: () => ({
    connect: connectSpy,
    connectError: null,
    connectPending: false,
    disconnect: disconnectSpy,
    disconnectError: null,
    disconnectPending: false,
    isLoading: false,
    resetConnectError: resetConnectErrorSpy,
    refetchStatus: refetchStatusSpy,
    response: sessionResponse,
    responseError: null,
  }),
}));

vi.mock("./use-site-ssh-shell", () => ({
  useSiteSshShell: () => ({
    closeShell: closeShellSpy,
    closeShellError: null,
    closeShellPending: false,
    openShell: openShellSpy,
    openShellError: null,
    openShellPending: false,
    readShell: readShellSpy,
    readShellError: null,
    readShellPending: false,
    readShellResponse: null,
    resizeShell: resizeShellSpy,
    resizeShellError: null,
    resizeShellPending: false,
    writeShell: writeShellSpy,
    writeShellError: null,
    writeShellPending: false,
  }),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>(
    "../../api/client",
  );
  return {
    ...actual,
    connectSshTerminalBridge: (...args: unknown[]) =>
      connectSshTerminalBridgeSpy(...args),
    listenSshShellStream: (...args: unknown[]) => listenSshShellStreamSpy(...args),
  };
});

let hostVerificationResponse: {
  correlation_id: string;
  host: string;
  port: number;
  request_id: string;
  server_key_algorithm: string;
  server_key_fingerprint: string;
  server_request_id: string | null;
  site_id: string;
  ssh_profile_id: string;
  trust_state: "trusted" | "missing" | "changed";
  username: string;
} | null = null;
let hostVerificationError: {
  code: string;
  correlation_id: string;
  error_category: string;
  fault_domain: string;
  message: string;
  owner: string;
  request_id: string;
  retryable: boolean;
  server_request_id: string | null;
  status: number | null;
  target: string | null;
  user_actionable: boolean;
} | null = null;

vi.mock("./use-site-ssh-host-verification", () => ({
  useSiteSshHostVerification: () => ({
    error: hostVerificationError,
    inspect: inspectHostSpy,
    inspectPending: false,
    reset: resetHostVerificationSpy,
    response: hostVerificationResponse,
    trust: trustHostSpy,
    trustPending: false,
  }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });
}

function renderPage() {
  render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/sites/site-alpha/server/ssh"]}>
          <SiteSshSessionPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("SiteSshSessionPage", () => {
  beforeEach(() => {
    sessionResponse = {
      active_profile: null,
      connected: false,
      connected_at: null,
      correlation_id: "corr-ssh",
      request_id: "req-ssh",
      shell_open: false,
      server_key_algorithm: null,
      server_key_fingerprint: null,
      server_request_id: null,
      site_id: "site-alpha",
    };
    connectSpy.mockReset();
    connectSshTerminalBridgeSpy.mockReset();
    disconnectSpy.mockReset();
    listenSshShellStreamSpy.mockReset();
    openShellSpy.mockReset();
    writeShellSpy.mockReset();
    readShellSpy.mockReset();
    closeShellSpy.mockReset();
    resizeShellSpy.mockReset();
    refetchStatusSpy.mockReset();
    inspectHostSpy.mockReset();
    trustHostSpy.mockReset();
    resetHostVerificationSpy.mockReset();
    resetConnectErrorSpy.mockReset();
    listenSshShellStreamSpy.mockResolvedValue(vi.fn());
    connectSshTerminalBridgeSpy.mockRejectedValue(
      new Error("bridge-disabled-in-session-page-test"),
    );
    hostVerificationResponse = null;
    hostVerificationError = null;
  });

  it("renders SSH session status, profiles, and shell surface", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "SSH" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로필/연결" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SFTP" })).toBeInTheDocument();
    expect(screen.getByText("알파몰")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "작업면 최대화" })).toBeInTheDocument();
    expect(screen.queryByText("단일 명령 실행")).not.toBeInTheDocument();
  });

  it("triggers connect for the selected profile", async () => {
    const user = userEvent.setup();
    connectSpy.mockResolvedValue({
      active_profile: {
        auth_type: "key",
        host: "ssh.alpha.example.com",
        name: "운영 SSH",
        port: 22,
        ssh_profile_id: "ssh-profile-1",
        username: "deploy",
      },
      connected: true,
      connected_at: "123456",
      correlation_id: "corr-ssh",
      request_id: "req-ssh",
      shell_open: false,
      server_key_algorithm: "Ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
    });
    connectSshTerminalBridgeSpy.mockRejectedValue(
      new Error("bridge-disabled-in-session-page-test"),
    );

    renderPage();

    await user.click(screen.getByRole("button", { name: "프로필/연결" }));
    await user.click(screen.getAllByRole("button", { name: "연결" })[0]);

    expect(connectSpy).toHaveBeenCalledWith({
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-1",
    });
    await waitFor(() => {
      expect(openShellSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
      });
    });
    expect(resetHostVerificationSpy).toHaveBeenCalled();
  });

  it("inspects host verification when connect fails with host trust error", async () => {
    const user = userEvent.setup();
    connectSpy.mockRejectedValue({
      code: "ssh_host_verification_error",
      correlation_id: "corr-ssh-trust",
      error_category: "security",
      fault_domain: "transport",
      message: "unknown host key",
      owner: "infra",
      request_id: "req-ssh-trust",
      retryable: false,
      server_request_id: null,
      status: null,
      target: "ssh-runtime",
      user_actionable: true,
    });
    inspectHostSpy.mockResolvedValue({
      correlation_id: "corr-ssh-trust",
      host: "ssh.alpha.example.com",
      port: 22,
      request_id: "req-ssh-trust",
      server_key_algorithm: "ssh-ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-1",
      trust_state: "missing",
      username: "deploy",
    });
    hostVerificationResponse = {
      correlation_id: "corr-ssh-trust",
      host: "ssh.alpha.example.com",
      port: 22,
      request_id: "req-ssh-trust",
      server_key_algorithm: "ssh-ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-1",
      trust_state: "missing",
      username: "deploy",
    };

    renderPage();

    await user.click(screen.getByRole("button", { name: "프로필/연결" }));
    await user.click(screen.getAllByRole("button", { name: "연결" })[0]);

    await waitFor(() => {
      expect(inspectHostSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
        ssh_profile_id: "ssh-profile-1",
      });
    });
    expect(resetConnectErrorSpy).toHaveBeenCalled();
    expect(screen.getByText("서버 신뢰 상태")).toBeInTheDocument();
    expect(screen.getByText(/SHA256:test/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 서버 신뢰" }),
    ).toBeInTheDocument();
  });

  it("ignores host verification payloads that belong to a different profile", async () => {
    const user = userEvent.setup();
    hostVerificationResponse = {
      correlation_id: "corr-ssh-trust",
      host: "ssh.beta.example.com",
      port: 2222,
      request_id: "req-ssh-trust",
      server_key_algorithm: "ssh-ed25519",
      server_key_fingerprint: "SHA256:other",
      server_request_id: null,
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-2",
      trust_state: "missing",
      username: "ops",
    };

    renderPage();

    await user.click(screen.getByRole("button", { name: "프로필/연결" }));
    await user.click(screen.getAllByRole("button", { name: "서버 지문 확인" })[0]);

    expect(screen.getByText("서버 신뢰 상태")).toBeInTheDocument();
    expect(screen.queryByText(/SHA256:other/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 서버 신뢰" }),
    ).toBeDisabled();
  });

  it("does not render the removed single-command surface", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: "명령 실행" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("예: php -v")).not.toBeInTheDocument();
  });

  it("opens the interactive shell on the active session", async () => {
    const user = userEvent.setup();
    sessionResponse = {
      active_profile: {
        auth_type: "key",
        host: "ssh.alpha.example.com",
        name: "운영 SSH",
        port: 22,
        ssh_profile_id: "ssh-profile-1",
        username: "deploy",
      },
      connected: true,
      connected_at: "123456",
      correlation_id: "corr-ssh",
      request_id: "req-ssh",
      shell_open: false,
      server_key_algorithm: "Ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
    };
    openShellSpy.mockResolvedValue({
      ...sessionResponse,
      shell_open: true,
    });
    refetchStatusSpy.mockResolvedValue({
      data: {
        ...sessionResponse,
        shell_open: true,
      },
    });

    renderPage();

    await user.click(screen.getByRole("button", { name: "SSH 셸 열기" }));

    expect(openShellSpy).toHaveBeenCalledWith({
      site_id: "site-alpha",
    });
  });

  it("writes to the interactive shell terminal and reads the transcript", async () => {
    const user = userEvent.setup();
    sessionResponse = {
      active_profile: {
        auth_type: "key",
        host: "ssh.alpha.example.com",
        name: "운영 SSH",
        port: 22,
        ssh_profile_id: "ssh-profile-1",
        username: "deploy",
      },
      connected: true,
      connected_at: "123456",
      correlation_id: "corr-ssh",
      request_id: "req-ssh",
      shell_open: true,
      server_key_algorithm: "Ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
    };
    writeShellSpy.mockResolvedValue(undefined);
    listenSshShellStreamSpy.mockImplementation(async (handler) => {
      queueMicrotask(() => {
        handler({
          site_id: "site-alpha",
          stdout: "/var/www/html\n",
          stderr: "",
          closed: false,
          exit_status: null,
          exit_signal: null,
        });
      });
      return vi.fn();
    });

    renderPage();

    await user.type(screen.getByRole("textbox", { name: "SSH 터미널 입력" }), "pwd{enter}");

    await waitFor(() => {
      expect(writeShellSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
        data: "pwd\r",
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("SSH 터미널 출력")).toHaveTextContent(
        "/var/www/html",
      );
    });
  });
});
