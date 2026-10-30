import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClassicSettings } from "@/classic/ClassicSettings";
import {
  useUnsavedChangesTracker,
  useUnsavedChangesRegistration,
  hasUnsavedChanges,
  discardUnsavedChanges,
} from "@/lib/unsavedChanges";

vi.mock("@/components/settings/SettingsPage", () => ({
  SettingsPage: ({
    groupedSections,
    section,
  }: {
    groupedSections?: string[];
    section: string;
  }) => (
    <div data-testid="sections">
      {(groupedSections ?? [section]).join(",")}
      {groupedSections?.includes("appConfig") && <DirectoryDraft />}
    </div>
  ),
}));
vi.mock("@/components/settings/AuthCenterPanel", () => ({
  AuthCenterPanel: () => {
    const tracker = useUnsavedChangesTracker();
    return <input aria-label="Account draft" {...tracker} />;
  },
}));
vi.mock("@/components/settings/auth/RefreshAllQuotaButton", () => ({
  RefreshAllQuotaButton: () => <button>Refresh quotas</button>,
}));
vi.mock("@/components/usage/UsagePage", () => ({
  UsagePage: ({
    onOpenRoutingSettings,
  }: {
    onOpenRoutingSettings: () => void;
  }) => <button onClick={onOpenRoutingSettings}>Open routing</button>,
}));

function DirectoryDraft() {
  const [saved, setSaved] = useState("C:/saved");
  const [draft, setDraft] = useState(saved);
  useUnsavedChangesRegistration(draft !== saved);
  return (
    <>
      <input
        aria-label="Configuration directory"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button onClick={() => setSaved(draft)}>Save directories</button>
    </>
  );
}

const props = {
  section: "general" as const,
  onOpenApps: vi.fn(),
  onOpenApp: vi.fn(),
};
const tab = (name: string) =>
  fireEvent.mouseDown(screen.getByRole("tab", { name }), {
    button: 0,
    ctrlKey: false,
  });

describe("Classic settings navigation", () => {
  it("groups both v4 routing sections and both advanced sections under six tabs", () => {
    render(<ClassicSettings {...props} />);
    expect(screen.getAllByRole("tab")).toHaveLength(6);
    tab("classic.settings.proxy");
    expect(screen.getByTestId("sections")).toHaveTextContent("routing,network");
    tab("classic.settings.advanced");
    expect(screen.getByTestId("sections")).toHaveTextContent("appConfig,data");
  });

  it("honors an external app configuration destination", () => {
    const result = render(<ClassicSettings {...props} />);
    result.rerender(<ClassicSettings {...props} section="data" />);
    expect(
      screen.getByRole("tab", { name: "classic.settings.advanced" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("keeps an account draft when leaving is cancelled and discards only after confirmation", () => {
    render(<ClassicSettings {...props} initialTab="auth" />);
    fireEvent.input(screen.getByLabelText("Account draft"), {
      target: { value: "draft" },
    });
    tab("classic.settings.advanced");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("common.unsavedLeaveCancel"));
    expect(screen.getByLabelText("Account draft")).toHaveValue("draft");
    tab("classic.settings.advanced");
    fireEvent.click(screen.getByText("common.unsavedLeaveConfirm"));
    expect(screen.queryByLabelText("Account draft")).not.toBeInTheDocument();
    expect(screen.getByTestId("sections")).toHaveTextContent("appConfig,data");
    discardUnsavedChanges();
  });

  it("opens routing from the embedded usage dashboard", () => {
    render(<ClassicSettings {...props} initialTab="usage" />);
    fireEvent.click(screen.getByText("Open routing"));
    expect(screen.getByTestId("sections")).toHaveTextContent("routing,network");
  });

  it("protects directory drafts, clears the registration after saving, and permits explicit discard", () => {
    render(<ClassicSettings {...props} initialTab="advanced" />);
    fireEvent.change(screen.getByLabelText("Configuration directory"), {
      target: { value: "D:/changed" },
    });
    expect(hasUnsavedChanges()).toBe(true);
    tab("classic.settings.general");
    fireEvent.click(screen.getByText("common.unsavedLeaveCancel"));
    expect(screen.getByLabelText("Configuration directory")).toHaveValue(
      "D:/changed",
    );
    fireEvent.click(screen.getByText("Save directories"));
    expect(hasUnsavedChanges()).toBe(false);
    tab("classic.settings.general");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    tab("classic.settings.advanced");
    fireEvent.change(screen.getByLabelText("Configuration directory"), {
      target: { value: "D:/discard" },
    });
    tab("classic.settings.general");
    fireEvent.click(screen.getByText("common.unsavedLeaveConfirm"));
    expect(
      screen.queryByLabelText("Configuration directory"),
    ).not.toBeInTheDocument();
    expect(hasUnsavedChanges()).toBe(false);
  });
});
