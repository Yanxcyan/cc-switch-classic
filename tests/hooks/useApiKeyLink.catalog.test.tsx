import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useApiKeyLink } from "@/components/providers/forms/hooks/useApiKeyLink";
import { ApiKeySection } from "@/components/providers/forms/shared/ApiKeySection";
import { PACKY_API_KEY_URL } from "@/config/providerCatalogPolicy";
import type { AppId } from "@/lib/api";
import { extractBaseUrlForUsageDetection } from "@/config/codingPlanProviders";
import { extractCodexBaseUrl } from "@/utils/providerConfigUtils";
import { providerPresets } from "@/config/claudeProviderPresets";
import { claudeDesktopProviderPresets } from "@/config/claudeDesktopProviderPresets";
import { codexProviderPresets } from "@/config/codexProviderPresets";
import { geminiProviderPresets } from "@/config/geminiProviderPresets";
import { grokBuildProviderPresets } from "@/config/grokBuildProviderPresets";
import { hermesProviderPresets } from "@/config/hermesProviderPresets";
import { openclawProviderPresets } from "@/config/openclawProviderPresets";
import { opencodeProviderPresets } from "@/config/opencodeProviderPresets";
import { piProviderPresets } from "@/config/piProviderPresets";
import { ompProviderPresets } from "@/config/ompProviderPresets";
import { kimiProviderPresets } from "@/config/kimiProviderPresets";
import { mcodeProviderPresets } from "@/config/mcodeProviderPresets";
import { dshProviderPresets } from "@/config/dshProviderPresets";

type Props = Parameters<typeof useApiKeyLink>[0];

function LinkPreview(props: Props) {
  const link = useApiKeyLink(props);
  return (
    <ApiKeySection
      value=""
      onChange={() => {}}
      shouldShowLink={link.shouldShowApiKeyLink}
      websiteUrl={link.websiteUrl}
      isPartner={link.isPartner}
      partnerPromotionKey={link.partnerPromotionKey}
    />
  );
}

const catalogs = {
  claude: providerPresets,
  "claude-desktop": claudeDesktopProviderPresets,
  codex: codexProviderPresets,
  gemini: geminiProviderPresets,
  agy: geminiProviderPresets,
  grokbuild: grokBuildProviderPresets,
  hermes: hermesProviderPresets,
  openclaw: openclawProviderPresets,
  opencode: opencodeProviderPresets,
  pi: piProviderPresets,
  omp: ompProviderPresets,
  kimi: kimiProviderPresets,
  mcode: mcodeProviderPresets,
  dsh: dshProviderPresets,
};

function baseUrl(app: AppId, preset: object): string {
  const data = preset as Record<string, any>;
  if (app === "claude-desktop") return data.baseUrl;
  if (app === "codex" || app === "grokbuild")
    return extractCodexBaseUrl(data.config) ?? "";
  return (
    extractBaseUrlForUsageDetection(
      app === "dsh" ? "mcode" : app === "agy" ? "gemini" : app,
      data.settingsConfig,
    ) ?? ""
  );
}

describe("API Key links across provider catalogs", () => {
  it.each(Object.entries(catalogs))(
    "%s preserves Packy and hides other sponsor links in add and edit modes",
    (app, presets) => {
      const appId = app as AppId;
      const entries = presets.map((preset, index) => ({
        id: String(index),
        preset,
      }));
      const packy = entries.find(({ preset }) => preset.name === "PackyCode")!;
      const qiniu = entries.find(({ preset }) => preset.name === "Qiniu")!;
      const props: Props = {
        appId,
        category: "third_party",
        selectedPresetId: packy.id,
        presetEntries: entries,
        formWebsiteUrl: "https://old-saved-website.example",
      };
      const { rerender } = render(<LinkPreview {...props} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        PACKY_API_KEY_URL,
      );

      rerender(
        <LinkPreview
          {...props}
          selectedPresetId={null}
          formBaseUrl={baseUrl(appId, packy.preset)}
        />,
      );
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        PACKY_API_KEY_URL,
      );

      rerender(<LinkPreview {...props} selectedPresetId={qiniu.id} />);
      expect(screen.queryByRole("link")).toBeNull();
      rerender(
        <LinkPreview
          {...props}
          selectedPresetId={null}
          formBaseUrl={baseUrl(appId, qiniu.preset)}
        />,
      );
      expect(screen.queryByRole("link")).toBeNull();
    },
  );

  it("does not reveal a sponsor homepage when the stored endpoint is custom", () => {
    render(
      <LinkPreview
        appId="claude"
        category="third_party"
        selectedPresetId={null}
        presetEntries={[]}
        formWebsiteUrl="https://sponsor.example"
        formBaseUrl="https://custom-endpoint.example"
        formIsPartner
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps a non-sponsored official vendor console when editing", () => {
    const preset = providerPresets.find(
      (preset) => preset.name === "DeepSeek",
    )!;
    render(
      <LinkPreview
        appId="claude"
        category="cn_official"
        selectedPresetId={null}
        presetEntries={[{ id: "deepseek", preset }]}
        formWebsiteUrl=""
        formBaseUrl={baseUrl("claude", preset)}
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      preset.apiKeyUrl || preset.websiteUrl,
    );
  });

  it.each(
    Object.entries(catalogs).filter(([, presets]) =>
      presets.some((preset) =>
        /Kimi For Coding|QwenCloud|千问AI平台|StreamLake/.test(preset.name),
      ),
    ),
  )(
    "%s hides legacy Kimi/Qwen/StreamLake referral URLs without sponsor flags",
    (app, presets) => {
      const referralPresets = presets.filter((preset) =>
        /Kimi For Coding|QwenCloud|千问AI平台|StreamLake/.test(preset.name),
      );
      expect(referralPresets.length).toBeGreaterThan(0);
      const { rerender } = render(<div />);
      for (const preset of referralPresets) {
        const url = preset.apiKeyUrl || preset.websiteUrl;
        if (!/[?&](aff=|utm_|channel=ccswitch)/.test(url)) continue;
        rerender(
          <LinkPreview
            appId={app as AppId}
            category={preset.category}
            selectedPresetId="preset"
            presetEntries={[{ id: "preset", preset }]}
            formWebsiteUrl=""
          />,
        );
        expect(screen.queryByRole("link"), `${app}: ${preset.name}`).toBeNull();
      }
    },
  );

  it.each(["pi", "omp", "kimi", "mcode", "dsh"] as const)(
    "%s preserves the existing cloud API-key console target",
    (appId) => {
      const preset = catalogs[appId].find(
        (preset) => preset.name === "Ollama Cloud",
      )!;
      const props: Props = {
        appId,
        category: "cloud_provider",
        includeNativeApiKeyLinks: true,
        selectedPresetId: "cloud",
        presetEntries: [{ id: "cloud", preset }],
        formWebsiteUrl: "",
      };
      const { rerender } = render(<LinkPreview {...props} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://ollama.com/settings/keys",
      );
      rerender(
        <LinkPreview
          {...props}
          selectedPresetId={null}
          formBaseUrl={baseUrl(appId, preset)}
        />,
      );
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://ollama.com/settings/keys",
      );
    },
  );
});
