import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiKeySection } from "@/components/providers/forms/shared/ApiKeySection";
import { PACKY_API_KEY_URL } from "@/config/providerCatalogPolicy";

// 测试的 i18n 是空资源，推广语传了 defaultValue: "" 会变成空串；这里让 t() 原样返回 key
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderSection(
  props: Partial<React.ComponentProps<typeof ApiKeySection>> = {},
) {
  return render(
    <ApiKeySection
      value=""
      onChange={() => {}}
      category="third_party"
      shouldShowLink
      websiteUrl="https://example.com/keys"
      {...props}
    />,
  );
}

describe("ApiKeySection", () => {
  it("keeps a normal non-sponsored API console link", () => {
    renderSection();

    expect(
      screen.getByRole("link", { name: /providerForm\.getApiKey/ }),
    ).toHaveAttribute("href", "https://example.com/keys");
  });

  it.each([
    { isPartner: true },
    { partnerPromotionKey: "qiniu" },
    { isPartner: true, partnerPromotionKey: "kimi" },
    { websiteUrl: "https://www.kimi.com/code/?aff=cc-switch" },
    { websiteUrl: "https://console.example.com/keys?utm_content=partner" },
    {
      websiteUrl:
        "https://console.streamlake.com/console/wanqing/api-key?channel=ccswitch",
    },
  ])("hides sponsored links, including homepage fallbacks: %j", (props) => {
    renderSection(props);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/providerForm\.partnerPromotion/),
    ).not.toBeInTheDocument();
  });

  it.each([
    { isPartner: true, partnerPromotionKey: "packycode" },
    { websiteUrl: "https://www.packyapi.ai/register?aff=cc-switch" },
  ])(
    "keeps Packy's exact registration link for current and saved presets: %j",
    (props) => {
      renderSection(props);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        PACKY_API_KEY_URL,
      );
    },
  );

  it("hides the promotion when the API Key link is hidden", () => {
    renderSection({
      category: "official",
      shouldShowLink: false,
      partnerPromotionKey: "packycode",
    });

    expect(
      screen.queryByText("providerForm.partnerPromotion.packycode"),
    ).not.toBeInTheDocument();
  });

  it("renders nothing extra for presets without a promotion", () => {
    const { container } = renderSection({ partnerPromotionKey: undefined });

    expect(container.querySelector("p")).toBeNull();
  });

  it("turns off autocorrect and auto-capitalization on the key input", () => {
    const { container } = renderSection({ value: "sk-test" });
    const input = container.querySelector("input");

    expect(input).toHaveAttribute("autocorrect", "off");
    expect(input).toHaveAttribute("autocapitalize", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
  });
});
