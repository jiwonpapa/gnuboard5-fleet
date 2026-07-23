import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { SiteSftpBrowserPage } from "./SiteSftpBrowserPage";

const {
  navigateSpy,
  chmodPathSpy,
  copyPathSpy,
  downloadFileSpy,
  enqueueTransfersSpy,
  uploadFileSpy,
  deleteSpy,
  mkdirSpy,
  movePathSpy,
  writeFileSpy,
  statSpy,
  readFileSpy,
  loadDirectorySpy,
  refetchDirectorySpy,
  refetchFileSpy,
  openSpy,
  saveSpy,
} = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  chmodPathSpy: vi.fn(),
  copyPathSpy: vi.fn(),
  downloadFileSpy: vi.fn(),
  enqueueTransfersSpy: vi.fn(),
  uploadFileSpy: vi.fn(),
  deleteSpy: vi.fn(),
  mkdirSpy: vi.fn(),
  movePathSpy: vi.fn(),
  writeFileSpy: vi.fn(),
  statSpy: vi.fn(),
  readFileSpy: vi.fn(),
  loadDirectorySpy: vi.fn(),
  refetchDirectorySpy: vi.fn(),
  refetchFileSpy: vi.fn(),
  openSpy: vi.fn(),
  saveSpy: vi.fn(),
}));

let transferSnapshot = {
  active_count: 0,
  cancelled_count: 0,
  concurrency_limit: 2,
  failed_count: 0,
  items: [],
  paused_count: 0,
  queued_count: 0,
  site_id: "site-alpha",
};

let sshResponse = {
  active_profile: null,
  connected: true,
  connected_at: "1742600000",
  correlation_id: "corr-ssh",
  request_id: "req-ssh",
  shell_open: false,
  server_key_algorithm: "Ed25519",
  server_key_fingerprint: "SHA256:test",
  server_request_id: null,
  site_id: "site-alpha",
};

let masterLockStatus = {
  is_configured: true,
  is_unlocked: true,
};
let masterLockLoading = false;
let authAuthenticated = true;
let authLoading = false;
let sshResponseError: {
  code: string;
  correlation_id: string;
  detail: string | null;
  error_category: string;
  fault_domain: string;
  guide: { action: string | null; reason: string | null } | null;
  message: string;
  owner: string;
  request_id: string;
  retryable: boolean;
  server_request_id: string | null;
  status: number | null;
  target: string | null;
  user_actionable: boolean;
} | null = null;

const directoryResponse = {
  correlation_id: "corr-sftp",
  entries: [
    {
      metadata: {
        kind: "directory",
        modified_at_epoch: 1_742_600_000,
        permissions_octal: "755",
        size_bytes: null,
      },
      name: "logs",
      path: "/var/www/html/logs",
    },
    {
      metadata: {
        kind: "file",
        modified_at_epoch: 1_742_600_120,
        permissions_octal: "644",
        size_bytes: 4096,
      },
      name: "index.php",
      path: "/var/www/html/index.php",
    },
  ],
  parent_path: "/var/www",
  request_id: "req-sftp",
  requested_path: ".",
  resolved_path: "/var/www/html",
  server_request_id: null,
  site_id: "site-alpha",
};

const statResponse = {
  correlation_id: "corr-stat",
  metadata: {
    kind: "file",
    modified_at_epoch: 1_742_600_120,
    permissions_octal: "644",
    size_bytes: 4096,
  },
  request_id: "req-stat",
  requested_path: "/var/www/html/index.php",
  resolved_path: "/var/www/html/index.php",
  server_request_id: null,
  site_id: "site-alpha",
};

const readFileResponse = {
  byte_length: 22,
  content: "<?php echo 'hello'; ?>",
  correlation_id: "corr-read",
  request_id: "req-read",
  requested_path: "/var/www/html/index.php",
  resolved_path: "/var/www/html/index.php",
  server_request_id: null,
  site_id: "site-alpha",
  truncated: false,
  utf8_lossy: false,
};

const downloadFileResponse = {
  copied_bytes: 4096,
  correlation_id: "corr-download",
  destination_path: "/Users/test/Downloads/index.php",
  request_id: "req-download",
  requested_path: "/var/www/html/index.php",
  resolved_path: "/var/www/html/index.php",
  server_request_id: null,
  site_id: "site-alpha",
};

const uploadFileResponse = {
  copied_bytes: 8192,
  correlation_id: "corr-upload",
  destination_path: "/var/www/html/logo.png",
  request_id: "req-upload",
  resolved_path: "/var/www/html/logo.png",
  server_request_id: null,
  site_id: "site-alpha",
  source_path: "/Users/test/Desktop/logo.png",
};

const deleteResponse = {
  correlation_id: "corr-delete",
  deleted_count: 1,
  kind: "file",
  request_id: "req-delete",
  requested_path: "/var/www/html/index.php",
  resolved_path: "/var/www/html/index.php",
  server_request_id: null,
  site_id: "site-alpha",
};

const writeFileResponse = {
  byte_length: 24,
  correlation_id: "corr-write",
  request_id: "req-write",
  requested_path: "/var/www/html/index.php",
  resolved_path: "/var/www/html/index.php",
  server_request_id: null,
  site_id: "site-alpha",
};

const copyPathResponse = {
  copied_bytes: 4096n,
  correlation_id: "corr-copy",
  kind: "file",
  request_id: "req-copy",
  requested_destination_path: "/var/www/html/index-copy.php",
  requested_source_path: "/var/www/html/index.php",
  resolved_destination_path: "/var/www/html/index-copy.php",
  server_request_id: null,
  site_id: "site-alpha",
  source_resolved_path: "/var/www/html/index.php",
};

const movePathResponse = {
  correlation_id: "corr-move",
  kind: "file",
  request_id: "req-move",
  requested_destination_path: "/var/www/releases/index.php",
  requested_source_path: "/var/www/html/index.php",
  resolved_destination_path: "/var/www/releases/index.php",
  server_request_id: null,
  site_id: "site-alpha",
  source_resolved_path: "/var/www/html/index.php",
};

const chmodPathResponse = {
  correlation_id: "corr-chmod",
  kind: "file",
  permissions_octal: "600",
  request_id: "req-chmod",
  requested_path: "/var/www/html/index.php",
  resolved_path: "/var/www/html/index.php",
  server_request_id: null,
  site_id: "site-alpha",
};

const mkdirResponse = {
  correlation_id: "corr-mkdir",
  request_id: "req-mkdir",
  requested_path: "/var/www/html/releases",
  resolved_path: "/var/www/html/releases",
  server_request_id: null,
  site_id: "site-alpha",
};

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: openSpy,
  save: saveSpy,
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

vi.mock("../master/use-master-lock", () => ({
  useMasterLock: () => ({
    isLoading: masterLockLoading,
    status: masterLockStatus,
  }),
}));

vi.mock("../auth/use-auth-session", () => ({
  useAuthSession: () => ({
    authenticated: authAuthenticated,
    currentMember: null,
    isLoading: authLoading,
    logout: vi.fn(),
    logoutPending: false,
    refetchSession: vi.fn(),
    session: null,
    sessionError: null,
  }),
}));

vi.mock("../server-ssh/use-site-ssh-session", () => ({
  useSiteSshSession: () => ({
    isLoading: false,
    refetchStatus: vi.fn(),
    response: sshResponse,
    responseError: sshResponseError,
  }),
}));

vi.mock("./use-site-sftp-browser", () => ({
  useSiteSftpBrowser: () => ({
    directory: directoryResponse,
    directoryError: null,
    directoryLoading: false,
    directoryRefreshing: false,
    downloadFile: downloadFileSpy,
    downloadFileError: null,
    downloadFilePending: false,
    downloadFileResponse,
    deleteError: null,
    deletePath: deleteSpy,
    deletePending: false,
    deleteResponse,
    chmodPath: chmodPathSpy,
    chmodPathError: null,
    chmodPathPending: false,
    chmodPathResponse,
    copyPath: copyPathSpy,
    copyPathError: null,
    copyPathPending: false,
    copyPathResponse,
    refetchDirectory: refetchDirectorySpy,
    movePath: movePathSpy,
    movePathError: null,
    movePathPending: false,
    movePathResponse,
    readFile: readFileSpy,
    readFileError: null,
    readFilePending: false,
    readFileResponse,
    stat: statSpy,
    statError: null,
    statPending: false,
    statResponse,
    uploadFile: uploadFileSpy,
    uploadFileError: null,
    uploadFilePending: false,
    uploadFileResponse,
    mkdir: mkdirSpy,
    mkdirError: null,
    mkdirPending: false,
    mkdirResponse,
    writeFile: writeFileSpy,
    writeFileError: null,
    writeFilePending: false,
    writeFileResponse,
  }),
}));

vi.mock("./use-site-sftp-editor", () => ({
  useSiteSftpEditor: (_siteId: string | null, path: string | null) => ({
    file: path ? readFileResponse : null,
    fileError: null,
    fileLoading: false,
    fileRefreshing: false,
    refetchFile: refetchFileSpy,
    writeFile: writeFileSpy,
    writeFileError: null,
    writeFilePending: false,
    writeFileResponse,
  }),
}));

vi.mock("./use-site-sftp-directory-tree", () => ({
  useSiteSftpDirectoryTree: () => ({
    loadDirectory: loadDirectorySpy,
    loadingPath: null,
    nodes: [
      {
        data: {
          path: "/var/www/html",
          permissionsOctal: "755",
        },
        droppable: true,
        id: "/var/www/html",
        parent: "root",
        text: "html",
      },
      {
        data: {
          path: "/var/www/html/logs",
          permissionsOctal: "755",
        },
        droppable: true,
        id: "/var/www/html/logs",
        parent: "/var/www/html",
        text: "logs",
      },
    ],
    rootId: "root",
  }),
}));

vi.mock("./use-site-sftp-transfer-queue", () => ({
  useSiteSftpTransferQueue: () => ({
    activeDownloadPath: null,
    activeUploadSourcePath: null,
    cancel: vi.fn(),
    concurrencyPending: false,
    enqueue: enqueueTransfersSpy,
    enqueueError: null,
    items: transferSnapshot.items,
    mutationPending: false,
    pending: false,
    pause: vi.fn(),
    retry: vi.fn(),
    setConcurrency: vi.fn(),
    snapshot: transferSnapshot,
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
        <MemoryRouter initialEntries={["/sites/site-alpha/server/files"]}>
          <SiteSftpBrowserPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("SiteSftpBrowserPage", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    chmodPathSpy.mockReset();
    copyPathSpy.mockReset();
    downloadFileSpy.mockReset();
    enqueueTransfersSpy.mockReset();
    uploadFileSpy.mockReset();
    deleteSpy.mockReset();
    mkdirSpy.mockReset();
    movePathSpy.mockReset();
    writeFileSpy.mockReset();
    refetchDirectorySpy.mockReset();
    readFileSpy.mockReset();
    loadDirectorySpy.mockReset();
    openSpy.mockReset();
    saveSpy.mockReset();
    statSpy.mockReset();
    downloadFileSpy.mockResolvedValue(downloadFileResponse);
    uploadFileSpy.mockResolvedValue(uploadFileResponse);
    deleteSpy.mockResolvedValue(deleteResponse);
    mkdirSpy.mockResolvedValue(mkdirResponse);
    chmodPathSpy.mockResolvedValue(chmodPathResponse);
    copyPathSpy.mockResolvedValue(copyPathResponse);
    movePathSpy.mockResolvedValue(movePathResponse);
    writeFileSpy.mockResolvedValue(writeFileResponse);
    readFileSpy.mockResolvedValue(readFileResponse);
    loadDirectorySpy.mockResolvedValue(undefined);
    openSpy.mockResolvedValue("/Users/test/Desktop/logo.png");
    saveSpy.mockResolvedValue("/Users/test/Downloads/index.php");
    enqueueTransfersSpy.mockResolvedValue(transferSnapshot);
    statSpy.mockResolvedValue(statResponse);
    transferSnapshot = {
      active_count: 0,
      cancelled_count: 0,
      concurrency_limit: 2,
      failed_count: 0,
      items: [],
      paused_count: 0,
      queued_count: 0,
      site_id: "site-alpha",
    };
    sshResponse = {
      active_profile: null,
      connected: true,
      connected_at: "1742600000",
      correlation_id: "corr-ssh",
      request_id: "req-ssh",
      shell_open: false,
      server_key_algorithm: "Ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
    };
    masterLockStatus = {
      is_configured: true,
      is_unlocked: true,
    };
    masterLockLoading = false;
    authAuthenticated = true;
    authLoading = false;
    sshResponseError = null;
  });

  it("renders the sftp browser with directory entries", () => {
    renderPage();

    expect(screen.getByText("SFTP")).toBeInTheDocument();
    expect(screen.getByText("알파몰")).toBeInTheDocument();
    expect(screen.getByText("..")).toBeInTheDocument();
    expect(screen.getAllByText("logs").length).toBeGreaterThan(0);
    expect(screen.getByText("index.php")).toBeInTheDocument();
    expect(screen.queryByText("/var/www/html/index.php")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("<?php echo 'hello'; ?>")).not.toBeInTheDocument();
  });

  it("shows SSH session errors in the centered SFTP error dialog instead of a top banner", () => {
    sshResponseError = {
      code: "ssh_runtime_error",
      correlation_id: "corr-ssh-error",
      detail: null,
      error_category: "transport",
      fault_domain: "local",
      guide: {
        action: "SSH 연결을 다시 확인하세요.",
        reason: "활성 SSH 세션을 읽을 수 없습니다.",
      },
      message: "SSH 연결 상태를 확인하지 못했습니다.",
      owner: "desktop",
      request_id: "req-ssh-error",
      retryable: true,
      server_request_id: null,
      status: null,
      target: "ssh-session",
      user_actionable: true,
    };

    renderPage();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("SFTP 작업 오류")).toBeInTheDocument();
    expect(screen.getByText("SSH 연결 상태를 확인하지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByText("오류 안내")).not.toBeInTheDocument();
  });

  it("suppresses the SFTP error dialog while the app lock or site session is not ready", () => {
    sshResponseError = {
      code: "ssh_runtime_error",
      correlation_id: "corr-ssh-error",
      detail: null,
      error_category: "transport",
      fault_domain: "local",
      guide: {
        action: "SSH 연결을 다시 확인하세요.",
        reason: "활성 SSH 세션을 읽을 수 없습니다.",
      },
      message: "SSH 연결 상태를 확인하지 못했습니다.",
      owner: "desktop",
      request_id: "req-ssh-error",
      retryable: true,
      server_request_id: null,
      status: null,
      target: "ssh-session",
      user_actionable: true,
    };
    authAuthenticated = false;

    renderPage();

    expect(screen.getByText("SFTP 사용 준비 중")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requests stat for the keyboard-selected entry", () => {
    renderPage();

    fireEvent.keyDown(window, { key: "ArrowDown" });

    expect(statSpy).toHaveBeenCalledWith({
      path: "/var/www/html/logs",
      site_id: "site-alpha",
    });
  });

  it("does not sync tree selection when a checkbox is checked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("checkbox", { name: "logs 선택" }));

    expect(statSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "logs" })).not.toHaveAttribute(
      "data-selected-directory",
      "true",
    );
    expect(screen.getByRole("button", { name: "html" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("switches the workspace viewport height presets", async () => {
    const user = userEvent.setup();
    renderPage();

    const workspaceViewport = document.querySelector("[data-viewport-mode]");
    expect(workspaceViewport).toHaveAttribute("data-viewport-mode", "standard");
    expect(workspaceViewport).toHaveClass("h-[calc(100vh-12.5rem)]", "min-h-[44rem]");

    await user.click(screen.getByRole("button", { name: "SFTP 작업면 높이 tall" }));
    expect(workspaceViewport).toHaveAttribute("data-viewport-mode", "tall");
    expect(workspaceViewport).toHaveClass("h-[calc(100vh-7rem)]", "min-h-[56rem]");

    await user.click(screen.getByRole("button", { name: "SFTP 작업면 높이 compact" }));
    expect(workspaceViewport).toHaveAttribute("data-viewport-mode", "compact");
    expect(workspaceViewport).toHaveClass("h-[calc(100vh-18rem)]", "min-h-[34rem]");
  });

  it("switches the sftp list and tree font scale from the toolbar", async () => {
    const user = userEvent.setup();
    renderPage();

    const workspaceViewport = document.querySelector("[data-font-scale]");
    const listing = document.querySelector("[data-sftp-pane='listing']");
    const directoryTree = document.querySelector("[data-sftp-pane='directory-tree']");

    expect(workspaceViewport).toHaveAttribute("data-font-scale", "md");
    expect(listing).toHaveAttribute("data-font-scale", "md");
    expect(directoryTree).toHaveAttribute("data-font-scale", "md");

    await user.click(screen.getByRole("button", { name: "SFTP 목록 폰트 키우기" }));

    expect(workspaceViewport).toHaveAttribute("data-font-scale", "lg");
    expect(listing).toHaveAttribute("data-font-scale", "lg");
    expect(directoryTree).toHaveAttribute("data-font-scale", "lg");

    await user.click(screen.getByRole("button", { name: "SFTP 목록 폰트 줄이기" }));

    expect(workspaceViewport).toHaveAttribute("data-font-scale", "md");
  });

  it("opens the selected file in the modal editor", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "index.php 편집" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("/var/www/html/index.php")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("<?php echo 'hello'; ?>")).toBeInTheDocument();
  });

  it("keeps the editor modal open when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "index.php 편집" }));

    const dialog = screen.getByRole("dialog");
    const backdrop = screen.getByRole("presentation");
    await user.click(backdrop);

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("<?php echo 'hello'; ?>")).toBeInTheDocument();
  });

  it("downloads the selected file after choosing a save path", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "index.php 다운로드" }));

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(enqueueTransfersSpy).toHaveBeenCalledWith({
      items: [
        {
          destination_path: "/Users/test/Downloads/index.php",
          direction: "download",
          label: "index.php",
          recursive: false,
          source_kind: "file",
          source_path: "/var/www/html/index.php",
        },
      ],
      site_id: "site-alpha",
    });
  });

  it("downloads a directory recursively after choosing a local destination folder", async () => {
    const user = userEvent.setup();
    openSpy.mockResolvedValueOnce("/Users/test/Downloads");
    renderPage();

    await user.click(screen.getByRole("button", { name: "logs 다운로드" }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(enqueueTransfersSpy).toHaveBeenCalledWith({
      items: [
        {
          destination_path: "/Users/test/Downloads",
          direction: "download",
          label: "logs",
          recursive: true,
          source_kind: "directory",
          source_path: "/var/www/html/logs",
        },
      ],
      site_id: "site-alpha",
    });
  });

  it("uploads a local file into the current directory", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "업로드" }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(enqueueTransfersSpy).toHaveBeenCalledWith({
      items: [
        {
          destination_path: "/var/www/html/logo.png",
          direction: "upload",
          label: "logo.png",
          recursive: false,
          source_kind: null,
          source_path: "/Users/test/Desktop/logo.png",
        },
      ],
      site_id: "site-alpha",
    });
  });

  it("uploads multiple local files into the current directory", async () => {
    const user = userEvent.setup();
    openSpy.mockResolvedValue([
      "/Users/test/Desktop/logo.png",
      "/Users/test/Desktop/banner.jpg",
    ]);
    renderPage();

    await user.click(screen.getByRole("button", { name: "업로드" }));

    expect(enqueueTransfersSpy).toHaveBeenCalledWith({
      items: [
        {
          destination_path: "/var/www/html/logo.png",
          direction: "upload",
          label: "logo.png",
          recursive: false,
          source_kind: null,
          source_path: "/Users/test/Desktop/logo.png",
        },
        {
          destination_path: "/var/www/html/banner.jpg",
          direction: "upload",
          label: "banner.jpg",
          recursive: false,
          source_kind: null,
          source_path: "/Users/test/Desktop/banner.jpg",
        },
      ],
      site_id: "site-alpha",
    });
    expect(screen.getByText("작업 큐")).toBeInTheDocument();
  });

  it("creates a directory under the current sftp path", async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("새 폴더 이름"), {
      target: { value: "releases" },
    });
    await user.click(screen.getByRole("button", { name: "폴더 생성" }));

    expect(mkdirSpy).toHaveBeenCalledWith({
      path: "/var/www/html/releases",
      site_id: "site-alpha",
    });
    expect(refetchDirectorySpy).toHaveBeenCalledTimes(1);
  });

  it("deletes the selected entry after explicit confirmation", async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.contextMenu(screen.getByText("index.php"));
    await user.click(screen.getByRole("menuitem", { name: /삭제/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));

    expect(deleteSpy).toHaveBeenCalledWith({
      path: "/var/www/html/index.php",
      recursive: false,
      site_id: "site-alpha",
    });
    expect(refetchDirectorySpy).toHaveBeenCalledTimes(1);
  });

  it("requires typed confirmation before recursive directory delete", async () => {
    const user = userEvent.setup();
    renderPage();

    const logsSelection = screen.getByRole("checkbox", { name: "logs 선택" });
    fireEvent.contextMenu(logsSelection.closest("div[aria-selected]") ?? logsSelection);
    await user.click(screen.getByRole("menuitem", { name: /삭제/ }));
    expect(screen.getByRole("button", { name: "재귀 삭제" })).toBeDisabled();
    await user.type(
      screen.getByPlaceholderText("재귀 삭제를 확인하려면 delete 입력"),
      "delete",
    );
    await user.click(screen.getByRole("button", { name: "재귀 삭제" }));

    expect(deleteSpy).toHaveBeenCalledWith({
      path: "/var/www/html/logs",
      recursive: true,
      site_id: "site-alpha",
    });
  });

  it("copies the selected entry to another remote path", async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.contextMenu(screen.getByText("index.php"));
    await user.click(screen.getByRole("menuitem", { name: "복사" }));
    const dialog = screen.getByRole("dialog");
    const destinationInput = within(dialog).getByLabelText("대상 경로");
    await user.clear(destinationInput);
    await user.type(destinationInput, "/var/www/html/index-copy.php");
    await user.click(within(dialog).getByRole("button", { name: "복사" }));

    expect(copyPathSpy).toHaveBeenCalledWith({
      destination_path: "/var/www/html/index-copy.php",
      site_id: "site-alpha",
      source_path: "/var/www/html/index.php",
    });
    expect(refetchDirectorySpy).toHaveBeenCalledTimes(1);
  });

  it("supports batch delete from the selection toolbar", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("checkbox", { name: "logs 선택" }));
    await user.click(screen.getByRole("checkbox", { name: "index.php 선택" }));
    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByPlaceholderText("재귀 삭제를 확인하려면 delete 입력"),
      "delete",
    );
    await user.click(within(dialog).getByRole("button", { name: "재귀 삭제" }));

    expect(deleteSpy).toHaveBeenNthCalledWith(1, {
      path: "/var/www/html/logs",
      recursive: true,
      site_id: "site-alpha",
    });
    expect(deleteSpy).toHaveBeenNthCalledWith(2, {
      path: "/var/www/html/index.php",
      recursive: true,
      site_id: "site-alpha",
    });
  });

  it("does not select file entries when the row itself is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("index.php"));

    expect(screen.getByRole("checkbox", { name: "index.php 선택" })).not.toBeChecked();
    expect(screen.queryByText("1개 선택됨")).not.toBeInTheDocument();
    expect(statSpy).not.toHaveBeenCalled();
  });

  it("opens a directory when the row itself is clicked without checking its checkbox", async () => {
    const user = userEvent.setup();
    renderPage();

    const logsSelection = screen.getByRole("checkbox", { name: "logs 선택" });
    const logsRow = logsSelection.closest('[role="button"]');
    expect(logsRow).not.toBeNull();
    await user.click(logsRow as HTMLElement);

    expect(screen.getByRole("checkbox", { name: "logs 선택" })).not.toBeChecked();
    expect(screen.queryByText("1개 선택됨")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("/var/www/html/logs")).toBeInTheDocument();
  });

  it("uses the current multi-selection when the context menu opens on a selected row", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("checkbox", { name: "logs 선택" }));
    await user.click(screen.getByRole("checkbox", { name: "index.php 선택" }));

    fireEvent.contextMenu(screen.getByText("index.php"));
    expect(screen.getByText("2개 선택")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: /삭제/ }));

    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByPlaceholderText("재귀 삭제를 확인하려면 delete 입력"),
      "delete",
    );
    await user.click(within(dialog).getByRole("button", { name: "재귀 삭제" }));

    expect(deleteSpy).toHaveBeenNthCalledWith(1, {
      path: "/var/www/html/logs",
      recursive: true,
      site_id: "site-alpha",
    });
    expect(deleteSpy).toHaveBeenNthCalledWith(2, {
      path: "/var/www/html/index.php",
      recursive: true,
      site_id: "site-alpha",
    });
  });

  it("supports select-all and delete keyboard shortcuts", async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.keyDown(window, { ctrlKey: true, key: "a" });
    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Delete" });
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByPlaceholderText("재귀 삭제를 확인하려면 delete 입력"),
      "delete",
    );
    await user.click(within(dialog).getByRole("button", { name: "재귀 삭제" }));

    expect(deleteSpy).toHaveBeenNthCalledWith(1, {
      path: "/var/www/html/logs",
      recursive: true,
      site_id: "site-alpha",
    });
    expect(deleteSpy).toHaveBeenNthCalledWith(2, {
      path: "/var/www/html/index.php",
      recursive: true,
      site_id: "site-alpha",
    });
  });

  it("supports arrow navigation before opening the selected entry", async () => {
    renderPage();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(statSpy).toHaveBeenLastCalledWith({
      path: "/var/www/html/logs",
      site_id: "site-alpha",
    });

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(statSpy).toHaveBeenLastCalledWith({
      path: "/var/www/html/index.php",
      site_id: "site-alpha",
    });

    fireEvent.keyDown(window, { key: "Enter" });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("/var/www/html/index.php")).toBeInTheDocument();
  });

  it("keeps the tree selection in sync with the focused directory entry", () => {
    renderPage();

    fireEvent.keyDown(window, { key: "ArrowDown" });

    expect(screen.getByRole("button", { name: "html" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(screen.getByRole("button", { name: "logs" })).toHaveAttribute(
      "data-selected-directory",
      "true",
    );
  });

  it("moves the selected entry to another remote path", async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.contextMenu(screen.getByText("index.php"));
    await user.click(screen.getByRole("menuitem", { name: "이동" }));
    const dialog = screen.getByRole("dialog");
    const destinationInput = within(dialog).getByLabelText("대상 경로");
    await user.clear(destinationInput);
    await user.type(destinationInput, "/var/www/releases/index.php");
    await user.click(within(dialog).getByRole("button", { name: "이동" }));

    expect(movePathSpy).toHaveBeenCalledWith({
      destination_path: "/var/www/releases/index.php",
      site_id: "site-alpha",
      source_path: "/var/www/html/index.php",
    });
    expect(refetchDirectorySpy).toHaveBeenCalledTimes(1);
  });

  it("changes remote permissions from the context menu", async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.contextMenu(screen.getByText("index.php"));
    await user.click(screen.getByRole("menuitem", { name: "권한 변경" }));
    const permissionInput = screen.getByLabelText("권한 값");
    await user.clear(permissionInput);
    await user.type(permissionInput, "600");
    await user.click(screen.getByRole("button", { name: "권한 적용" }));

    expect(chmodPathSpy).toHaveBeenCalledWith({
      path: "/var/www/html/index.php",
      permissions_octal: "600",
      site_id: "site-alpha",
    });
    expect(refetchDirectorySpy).toHaveBeenCalledTimes(1);
  });

  it("saves edited file content back to sftp from the modal editor", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "index.php 편집" }));

    const dialog = screen.getByRole("dialog");
    const editor = within(dialog).getByDisplayValue("<?php echo 'hello'; ?>");
    await user.clear(editor);
    await user.type(editor, "<?php echo 'updated'; ?>");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(writeFileSpy).toHaveBeenCalledWith({
      content: "<?php echo 'updated'; ?>",
      path: "/var/www/html/index.php",
      site_id: "site-alpha",
    });
  });

  it("saves the integrated editor with the keyboard shortcut", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "index.php 편집" }));

    const dialog = screen.getByRole("dialog");
    const editor = within(dialog).getByDisplayValue("<?php echo 'hello'; ?>");
    await user.clear(editor);
    await user.type(editor, "<?php echo 'shortcut'; ?>");
    fireEvent.keyDown(editor, { ctrlKey: true, key: "s" });

    expect(writeFileSpy).toHaveBeenCalledWith({
      content: "<?php echo 'shortcut'; ?>",
      path: "/var/www/html/index.php",
      site_id: "site-alpha",
    });
  });
});
