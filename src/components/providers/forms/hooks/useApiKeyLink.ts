import { useMemo } from "react";
import type { AppId } from "@/lib/api";
import type { ProviderCategory } from "@/types";
import { extractBaseUrlForUsageDetection } from "@/config/codingPlanProviders";
import { extractCodexBaseUrl } from "@/utils/providerConfigUtils";
import { hasProviderPromotion } from "@/config/providerCatalogPolicy";

type PresetEntry = {
  id: string;
  preset: {
    category?: ProviderCategory;
    websiteUrl?: string;
    apiKeyUrl?: string;
    isPartner?: boolean;
    partnerPromotionKey?: string;
    endpointCandidates?: string[];
  };
};

interface UseApiKeyLinkProps {
  appId: AppId;
  category?: ProviderCategory;
  selectedPresetId: string | null;
  presetEntries: PresetEntry[];
  formWebsiteUrl: string;
  /** 表单当前的请求地址；没选预设（编辑已有供应商）时按它反查预设 */
  formBaseUrl?: string;
  formIsPartner?: boolean;
  formPartnerPromotionKey?: string;
  /** Native protocol forms also expose explicit cloud/official API-key consoles. */
  includeNativeApiKeyLinks?: boolean;
}

const LINK_CATEGORIES: ReadonlyArray<ProviderCategory | undefined> = [
  "cn_official",
  "aggregator",
  "third_party",
];

/** Prefer the API-key console over a generic homepage whenever one is supplied. */
function presetLinkUrl(preset: PresetEntry["preset"]): string {
  return preset.apiKeyUrl || preset.websiteUrl || "";
}

function normalizeBaseUrl(url: string | null | undefined): string {
  return (url ?? "").trim().toLowerCase().replace(/\/+$/, "");
}

/** 各应用预设的请求地址放在不同位置 */
function presetBaseUrl(appId: AppId, preset: PresetEntry["preset"]): string {
  const p = preset as {
    baseUrl?: unknown;
    baseURL?: unknown;
    config?: unknown;
    settingsConfig?: Record<string, any>;
  };
  if (appId === "claude-desktop") {
    return typeof p.baseUrl === "string" ? p.baseUrl : "";
  }
  if (appId === "codex" || appId === "grokbuild") {
    return typeof p.config === "string"
      ? (extractCodexBaseUrl(p.config) ?? "")
      : "";
  }
  if (
    (appId === "gemini" || appId === "agy") &&
    typeof p.baseURL === "string"
  ) {
    return p.baseURL;
  }
  const configAppId =
    appId === "dsh" ? "mcode" : appId === "agy" ? "gemini" : appId;
  return extractBaseUrlForUsageDetection(configAppId, p.settingsConfig) ?? "";
}

/**
 * 管理 API Key 获取链接的显示和 URL
 */
export function useApiKeyLink({
  appId,
  category,
  selectedPresetId,
  presetEntries,
  formWebsiteUrl,
  formBaseUrl,
  formIsPartner,
  formPartnerPromotionKey,
  includeNativeApiKeyLinks = false,
}: UseApiKeyLinkProps) {
  // 获取当前预设条目
  const currentPresetEntry = useMemo(() => {
    if (selectedPresetId && selectedPresetId !== "custom") {
      return presetEntries.find((item) => item.id === selectedPresetId);
    }
    return undefined;
  }, [selectedPresetId, presetEntries]);

  // 没选预设（编辑已有供应商）：供应商不记来源预设，按请求地址反查。
  // 同一地址的几个预设链接或推广语不一致（如同一家的不同版本）时不猜，退回官网链接。
  const matchingPresets = useMemo(() => {
    if (currentPresetEntry) return [];
    const target = normalizeBaseUrl(formBaseUrl);
    if (!target) return [];
    return presetEntries
      .map((entry) => entry.preset)
      .filter((preset) =>
        [
          presetBaseUrl(appId, preset),
          ...(preset.endpointCandidates ?? []),
        ].some((url) => normalizeBaseUrl(url) === target),
      );
  }, [appId, currentPresetEntry, formBaseUrl, presetEntries]);
  const matchedPreset = useMemo(() => {
    const [first] = matchingPresets;
    if (!first || !presetLinkUrl(first)) return undefined;
    const consistent = matchingPresets.every(
      (preset) =>
        presetLinkUrl(preset) === presetLinkUrl(first) &&
        Boolean(preset.isPartner) === Boolean(first.isPartner) &&
        preset.partnerPromotionKey === first.partnerPromotionKey,
    );
    return consistent ? first : undefined;
  }, [matchingPresets]);

  const linkPreset = currentPresetEntry?.preset ?? matchedPreset;

  // 获取当前供应商的网址（用于 API Key 链接）
  const getWebsiteUrl = useMemo(() => {
    if (linkPreset) return presetLinkUrl(linkPreset);
    return formWebsiteUrl || "";
  }, [linkPreset, formWebsiteUrl]);

  // 提取合作伙伴信息
  // An ambiguous match must not expose a sponsor's homepage as a fallback link.
  const isPartner = currentPresetEntry
    ? Boolean(currentPresetEntry.preset.isPartner)
    : Boolean(formIsPartner) ||
      matchingPresets.some((preset) =>
        hasProviderPromotion({ ...preset, websiteUrl: presetLinkUrl(preset) }),
      );
  const partnerPromotionKey = currentPresetEntry
    ? currentPresetEntry.preset.partnerPromotionKey
    : (matchedPreset?.partnerPromotionKey ?? formPartnerPromotionKey);
  const linkCategory =
    category === "custom" || !category
      ? (linkPreset?.category ?? category)
      : category;

  return {
    shouldShowApiKeyLink:
      LINK_CATEGORIES.includes(linkCategory) ||
      (includeNativeApiKeyLinks && Boolean(linkPreset?.apiKeyUrl)),
    websiteUrl: getWebsiteUrl,
    isPartner,
    partnerPromotionKey,
  };
}
