import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { resetProviderState } from "../msw/state";
import { emitTauriEvent } from "../msw/tauriMocks";
import ClassicApp from "@/classic/ClassicApp";

vi.mock("@/contexts/UpdateContext", () => ({
  useUpdate: () => ({ hasUpdate: false, updateInfo: null }),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setDecorations: vi.fn(async () => {}) }),
}));
vi.mock("@/lib/platform", async (original) => ({
  ...(await original<typeof import("@/lib/platform")>()),
  isLinux: () => false,
  isWindows: () => false,
}));
vi.mock("@/components/FirstRunNoticeDialog", () => ({
  FirstRunNoticeDialog: () => null,
}));
vi.mock("@/components/WhatsNewDialog", () => ({ WhatsNewNotice: () => null }));
vi.mock("@/components/DeepLinkImportDialog", () => ({
  DeepLinkImportDialog: () => null,
}));
vi.mock("@/components/providers/AddProviderDialog", () => ({
  AddProviderDialog: ({ open, appId }: { open: boolean; appId: string }) =>
    open ? <div data-testid="add-provider">{appId}</div> : null,
}));
vi.mock("@/components/providers/EditProviderDialog", () => ({
  EditProviderDialog: () => null,
}));
vi.mock("@/components/providers/OpenTerminalDialog", () => ({
  OpenTerminalDialog: () => null,
}));
vi.mock("@/components/UsageScriptModal", () => ({ default: () => null }));
vi.mock("@/components/providers/ProviderList", () => ({
  ProviderList: () => <div>additive providers</div>,
}));
vi.mock("@/components/providers/mode/SwitchModePanel", () => ({
  SwitchModePanel: ({
    app,
    providers,
  }: {
    app: string;
    providers: unknown;
  }) => (
    <div data-testid="providers" data-app={app}>
      {JSON.stringify(providers)}
    </div>
  ),
}));
vi.mock("@/components/settings/SettingsPage", async () => {
  const { useUnsavedChangesTracker } = await vi.importActual<
    typeof import("@/lib/unsavedChanges")
  >("@/lib/unsavedChanges");
  return {
    SettingsPage: ({ section }: { section: string }) => (
      <div data-testid="settings" {...useUnsavedChangesTracker()}>
        {section}
        <input aria-label="settings draft" />
      </div>
    ),
  };
});
vi.mock("@/components/settings/AuthCenterPanel", () => ({
  AuthCenterPanel: () => <div>accounts</div>,
}));
vi.mock("@/components/settings/auth/RefreshAllQuotaButton", () => ({
  RefreshAllQuotaButton: () => null,
}));
vi.mock("@/components/apps/AppsPage", () => ({
  AppsPage: () => <div>apps</div>,
}));
vi.mock("@/components/usage/UsagePage", () => ({
  UsagePage: () => <div>usage</div>,
}));
vi.mock("@/components/sessions/SessionManagerPage", () => ({
  SessionManagerPage: () => <div>sessions</div>,
}));
vi.mock("@/components/prompts/PromptPanel", () => ({
  default: () => <div>prompts</div>,
}));
vi.mock("@/components/skills/UnifiedSkillsPanel", () => ({
  default: () => <div>skills</div>,
}));
vi.mock("@/components/mcp/UnifiedMcpPanel", async () => {
  const { useUnsavedChangesTracker } = await vi.importActual<
    typeof import("@/lib/unsavedChanges")
  >("@/lib/unsavedChanges");
  return {
    default: () => (
      <div {...useUnsavedChangesTracker()}>
        <input aria-label="mcp draft" />
      </div>
    ),
  };
});
vi.mock("@/components/ConfirmDialog", () => ({
  ConfirmDialog: ({
    isOpen,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onConfirm}>Discard</button>
        <button onClick={onCancel}>Keep editing</button>
      </div>
    ) : null,
}));

function mountApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ClassicApp />
    </QueryClientProvider>,
  );
}
async function ready() {
  await waitFor(() =>
    expect(screen.getByTestId("providers")).toHaveTextContent("claude-1"),
  );
}

describe("ClassicApp navigation", () => {
  beforeEach(() => {
    resetProviderState();
    localStorage.removeItem("cc-switch-last-view");
    localStorage.removeItem("cc-switch-last-app");
  });

  it("opens settings with Ctrl+, and returns through the classic header", async () => {
    mountApp();
    await ready();
    expect(document.querySelector("nav")).toBeNull();
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(await screen.findByTestId("settings")).toHaveTextContent("general");
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(await screen.findByTestId("providers")).toHaveAttribute(
      "data-app",
      "claude",
    );
  });

  it("guards header back and keyboard settings navigation while an editor is dirty", async () => {
    mountApp();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "nav.mcp" }));
    fireEvent.input(await screen.findByLabelText("mcp draft"), {
      target: { value: "draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Keep editing"));
    expect(screen.getByLabelText("mcp draft")).toHaveValue("draft");
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(screen.queryByTestId("settings")).toBeNull();
    fireEvent.click(screen.getByText("Discard"));
    expect(await screen.findByTestId("settings")).toHaveTextContent("general");
    expect(screen.queryByLabelText("mcp draft")).toBeNull();
  });

  it("resets an internal auth tab when Ctrl+, explicitly requests general again", async () => {
    mountApp();
    await ready();
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    const authTab = await screen.findByRole("tab", {
      name: "classic.settings.auth",
    });
    fireEvent.mouseDown(authTab, { button: 0, ctrlKey: false });
    expect(await screen.findByText("accounts")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(await screen.findByTestId("settings")).toHaveTextContent("general");
  });

  it("guards Escape when leaving settings with unsaved changes", async () => {
    mountApp();
    await ready();
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    fireEvent.input(await screen.findByLabelText("settings draft"), {
      target: { value: "draft" },
    });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Keep editing"));
    expect(screen.getByLabelText("settings draft")).toHaveValue("draft");
  });

  it("routes a tray add request to the requested app after confirming unsaved edits", async () => {
    let navigation: { app: string; intent: string } | null = null;
    server.use(
      http.post("http://tauri.local/take_tray_navigation", () => {
        const pending = navigation;
        navigation = null;
        return HttpResponse.json(pending);
      }),
    );
    mountApp();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "nav.mcp" }));
    fireEvent.input(await screen.findByLabelText("mcp draft"), {
      target: { value: "draft" },
    });
    navigation = { app: "codex", intent: "add" };
    act(() => emitTauriEvent("tray-navigate", {}));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("add-provider")).toBeNull();
    fireEvent.click(screen.getByText("Discard"));
    expect(await screen.findByTestId("add-provider")).toHaveTextContent(
      "codex",
    );
    expect(screen.getByTestId("providers")).toHaveAttribute(
      "data-app",
      "codex",
    );
  });
});
