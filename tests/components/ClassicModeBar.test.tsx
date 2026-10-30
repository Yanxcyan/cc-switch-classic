import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModeBar } from "@/classic/ModeBar";

describe("Classic mode browsing", () => {
  it("browses without activating and keeps the active dot on the real mode", () => {
    const onView = vi.fn();
    const activate = vi.fn();
    const props = {
      modes: ["direct", "route", "stack"] as ("direct" | "route" | "stack")[],
      active: "direct" as const,
      onView,
      activate: { label: "Activate route", disabled: false, onClick: activate },
    };
    const { rerender } = render(<ModeBar {...props} view="direct" />);
    fireEvent.click(screen.getByRole("button", { name: "mode.names.route" }));
    expect(onView).toHaveBeenCalledWith("route");
    expect(activate).not.toHaveBeenCalled();

    rerender(<ModeBar {...props} view="route" />);
    const direct = screen.getByRole("button", { name: /mode.names.direct/ });
    expect(direct).toHaveAttribute("aria-pressed", "false");
    expect(
      within(direct).getByRole("img", { name: "mode.active" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "mode.names.route" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Activate route" }));
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("honors supported modes and pending operations", () => {
    const activate = vi.fn();
    render(
      <ModeBar
        modes={["direct", "route"]}
        active="direct"
        view="route"
        onView={vi.fn()}
        activate={{
          label: "Activate route",
          disabled: true,
          onClick: activate,
        }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "mode.names.stack" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Activate route" }));
    expect(activate).not.toHaveBeenCalled();
  });

  it("connects the search entry to the existing provider search state", () => {
    const onSearch = vi.fn();
    render(
      <ModeBar
        modes={["direct", "route"]}
        active="direct"
        view="direct"
        onView={vi.fn()}
        searchOpen={false}
        onSearchOpenChange={onSearch}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "provider.searchAriaLabel" }),
    );
    expect(onSearch).toHaveBeenCalledWith(true);
  });
});
