import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSwitcher } from "@/classic/AppSwitcher";
import { ClassicHeaderContext } from "@/classic/ClassicHeaderContext";
import { AppPageHeader } from "@/classic/AppPageHeaderAdapter";
import { FullScreenPanel } from "@/components/common/FullScreenPanel";
import { APP_IDS, DEFAULT_VISIBLE_APPS } from "@/config/appConfig";
import { APP_DISPLAY_NAME } from "@/components/shell/AppGlyph";

describe("Classic navigation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the active application visible in a narrow header and exposes all overflow apps", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(168);
    const onSwitch = vi.fn();
    const onManageApps = vi.fn();
    render(
      <div>
        <AppSwitcher
          activeApp="omp"
          visibleApps={DEFAULT_VISIBLE_APPS}
          appStatus={() => ({ mode: "direct", alert: false })}
          onSwitch={onSwitch}
          onManageApps={onManageApps}
        />
      </div>,
    );
    expect(screen.getByRole("button", { name: "Oh My Pi" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "DeepSeek Harness" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "appSwitcher.more" }));
    for (const app of APP_IDS)
      expect(
        screen.getByRole("button", { name: APP_DISPLAY_NAME[app] }),
      ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "DeepSeek Harness" }));
    expect(onSwitch).toHaveBeenCalledWith("dsh");
    fireEvent.click(screen.getByRole("button", { name: "appSwitcher.more" }));
    fireEvent.click(screen.getByRole("button", { name: "nav.apps" }));
    expect(onManageApps).toHaveBeenCalledOnce();
  });

  it("respects user order and visibility without saving a switch before the navigation guard accepts it", () => {
    const save = vi.spyOn(Storage.prototype, "setItem");
    const onSwitch = vi.fn();
    render(
      <div>
        <AppSwitcher
          activeApp="claude"
          visibleApps={{ ...DEFAULT_VISIBLE_APPS, codex: false }}
          appOrder={["dsh", "claude"]}
          appStatus={() => ({ mode: "direct", alert: false })}
          onSwitch={onSwitch}
          onManageApps={vi.fn()}
        />
      </div>,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName("DeepSeek Harness");
    expect(screen.queryByRole("button", { name: "Codex" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kimi Code" }));
    expect(onSwitch).toHaveBeenCalledWith("kimi");
    expect(save).not.toHaveBeenCalled();
  });
});

describe("Classic page headers", () => {
  it("portals live page actions into the classic header", () => {
    const titleHost = document.createElement("div");
    const actionsHost = document.createElement("div");
    document.body.append(titleHost, actionsHost);
    const onSave = vi.fn();
    const page = (title: string) => (
      <ClassicHeaderContext.Provider value={{ titleHost, actionsHost }}>
        <AppPageHeader
          title={title}
          actions={<button onClick={onSave}>Save</button>}
        />
      </ClassicHeaderContext.Provider>
    );
    const view = render(page("MCP"));
    expect(
      within(titleHost).getByRole("heading", { name: "MCP" }),
    ).toBeInTheDocument();
    fireEvent.click(within(actionsHost).getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
    view.rerender(page("Skills"));
    expect(within(titleHost).queryByText("MCP")).toBeNull();
    expect(within(titleHost).getByText("Skills")).toBeInTheDocument();
    view.unmount();
    expect(titleHost).toBeEmptyDOMElement();
    expect(actionsHost).toBeEmptyDOMElement();
    titleHost.remove();
    actionsHost.remove();
  });

  it("gives an editor its own full-window header without replacing the page title", () => {
    const titleHost = document.createElement("div");
    const content = document.createElement("main");
    content.id = "content-area";
    document.body.append(titleHost, content);
    const view = render(
      <ClassicHeaderContext.Provider value={{ titleHost, actionsHost: null }}>
        <AppPageHeader title="Providers" />
        <FullScreenPanel isOpen title="Edit provider" onClose={vi.fn()}>
          Editor body
        </FullScreenPanel>
      </ClassicHeaderContext.Provider>,
    );
    expect(within(titleHost).getByText("Providers")).toBeInTheDocument();
    expect(within(titleHost).queryByText("Edit provider")).toBeNull();
    const panel = screen.getByText("Editor body").closest(".fixed");
    expect(panel?.parentElement).toBe(document.body);
    expect(
      within(panel as HTMLElement).getByRole("heading", {
        name: "Edit provider",
      }),
    ).toBeInTheDocument();
    view.unmount();
    titleHost.remove();
    content.remove();
  });

  it("places a page-specific back action in the leading slot instead of the title", () => {
    const titleHost = document.createElement("div");
    const leadingHost = document.createElement("div");
    document.body.append(titleHost, leadingHost);
    const onBack = vi.fn();
    const view = render(
      <ClassicHeaderContext.Provider
        value={{ titleHost, leadingHost, actionsHost: null }}
      >
        <AppPageHeader
          title="Session"
          leading={<button onClick={onBack}>Back to sessions</button>}
        />
      </ClassicHeaderContext.Provider>,
    );
    expect(within(titleHost).queryByRole("button")).toBeNull();
    fireEvent.click(
      within(leadingHost).getByRole("button", { name: "Back to sessions" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
    view.unmount();
    expect(leadingHost).toBeEmptyDOMElement();
    titleHost.remove();
    leadingHost.remove();
  });
});
