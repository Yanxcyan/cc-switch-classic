import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  it("uses the Classic 44 by 24 size and emerald checked color", () => {
    render(<Switch aria-label="default" defaultChecked />);
    const element = screen.getByRole("switch", { name: "default" });
    expect(element).toHaveAttribute("data-size", "default");
    expect(element.className).toContain("h-6 w-11");
    expect(element.className).toContain("data-[state=checked]:bg-emerald-500");
  });

  it("preserves the compact API with a 36 by 20 emerald switch", () => {
    render(<Switch aria-label="small" size="sm" />);
    const element = screen.getByRole("switch", { name: "small" });
    expect(element).toHaveAttribute("data-size", "sm");
    expect(element.className).toContain("h-5 w-9");
    expect(element.className).toContain("data-[state=checked]:bg-emerald-500");
  });
});
