import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ProviderPresetSelector,
  type PresetEntry,
} from "@/components/providers/forms/ProviderPresetSelector";
import {
  isProviderPresetVisible,
  PACKY_API_KEY_URL,
} from "@/config/providerCatalogPolicy";
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
import { universalProviderPresets } from "@/config/universalProviderPresets";

vi.mock("@/components/ProviderIcon", () => ({ ProviderIcon: () => null }));

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

describe("curated provider catalog", () => {
  // These indices shipped in Classic v4.0.25. Upstream may remove or insert
  // entries, but saved preset IDs must continue to resolve to the same provider.
  it.each([
    ["claude", 14, 138],
    ["claude-desktop", 14, 128],
    ["codex", 15, 136],
    ["gemini", 5, 37],
    ["grokbuild", 9, 54],
    ["hermes", 12, 121],
    ["openclaw", 12, 121],
    ["opencode", 12, 109],
    ["pi", 12, 115],
    ["omp", 12, 115],
  ] as const)(
    "%s preserves legacy preset positions",
    (app, ditIndex, lastIndex) => {
      expect(catalogs[app][ditIndex].name).toBe("DIT.ai");
      expect(isProviderPresetVisible(catalogs[app][ditIndex])).toBe(false);
      expect(catalogs[app][lastIndex].name).toBe("AIComing");
    },
  );

  it("appends new official presets and keeps new sponsor presets filtered", () => {
    expect(providerPresets[139].name).toBe("OpenAI API");
    expect(isProviderPresetVisible(providerPresets[139])).toBe(true);
    const addedGemini = geminiProviderPresets.slice(38);
    expect(addedGemini).toHaveLength(13);
    expect(
      addedGemini.filter(isProviderPresetVisible).map((p) => p.name),
    ).toEqual(["Compshare"]);
  });

  it.each(Object.entries(catalogs))(
    "%s offers Packy and Qiniu with original IDs and omits removed platforms even in search",
    (appId, presets) => {
      const entries = presets.map((preset, index) => ({
        id: `${appId}-${index}`,
        preset,
      })) as PresetEntry[];
      const pick = vi.fn();
      const before = presets.slice();
      render(
        <ProviderPresetSelector
          selectedPresetId="custom"
          presetEntries={entries}
          onPresetChange={pick}
        />,
      );

      const packy = entries.find(({ preset }) => preset.name === "PackyCode")!;
      expect(packy.preset.apiKeyUrl).toBe(PACKY_API_KEY_URL);
      fireEvent.click(screen.getByRole("button", { name: "PackyCode" }));
      expect(pick).toHaveBeenLastCalledWith(packy.id);
      // Qiniu may be localized, so locate the picker row by its original entry.
      const qiniu = entries.find(({ preset }) => preset.name === "Qiniu");
      expect(qiniu).toBeDefined();
      expect(isProviderPresetVisible(qiniu!.preset)).toBe(true);
      expect(
        screen.getByRole("button", {
          name: qiniu!.preset.nameKey || qiniu!.preset.name,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "OpenRouter" })).toBeNull();
      const search = screen.getByRole("textbox", {
        name: "providerPreset.searchAriaLabel",
      });
      fireEvent.change(search, { target: { value: "OpenRouter" } });
      expect(screen.queryByRole("button", { name: "OpenRouter" })).toBeNull();
      // Filtering must leave the source tables available for editing and model metadata.
      expect(presets).toEqual(before);
      expect(presets.some((preset) => preset.name === "OpenRouter")).toBe(true);
    },
  );

  it("retains the approved hosted platforms and official/local entries", () => {
    for (const name of [
      "Azure OpenAI",
      "Codex",
      "Gemini Native",
      "GitHub Copilot",
      "xAI (Grok)",
      "xAI (Grok) OAuth",
      "Nvidia",
      "ModelScope",
      "Compshare",
      "Compshare Coding Plan",
      "PPIO",
      "SiliconFlow",
      "SiliconFlow en",
      "Hugging Face",
      "Vercel AI Gateway",
      "Groq",
    ]) {
      expect(
        isProviderPresetVisible({ name, category: "aggregator" }),
        name,
      ).toBe(true);
    }
    for (const category of [
      "official",
      "cn_official",
      "cloud_provider",
      "local",
      "omo",
      "omo-slim",
    ] as const) {
      expect(
        isProviderPresetVisible({ name: "Native provider", category }),
      ).toBe(true);
    }
    for (const name of [
      "OpenRouter",
      "AiHubMix",
      "Nebius Token Factory",
      "DeepInfra",
      "Baseten",
      "Novita AI",
      "AtlasCloud",
      "JieKou AI",
      "模力方舟",
      "RelaxyCode",
    ]) {
      expect(
        isProviderPresetVisible({ name, category: "aggregator" }),
        name,
      ).toBe(false);
    }
  });

  it("keeps the NewAPI and custom gateway tools in the universal picker", () => {
    const pick = vi.fn();
    render(
      <ProviderPresetSelector
        selectedPresetId="custom"
        presetEntries={[]}
        onPresetChange={vi.fn()}
        onUniversalPresetSelect={pick}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /providerPreset.group.universal/ }),
    );
    for (const preset of universalProviderPresets) {
      fireEvent.click(screen.getByRole("button", { name: preset.name }));
      expect(pick).toHaveBeenLastCalledWith(preset);
    }
    expect(
      universalProviderPresets.map((preset) => preset.providerType),
    ).toEqual(["newapi", "custom_gateway"]);
  });
});
