import type { ProviderCategory } from "@/types";

export const PACKY_API_KEY_URL = "https://www.packyapi.ai/register?aff=VGGr";

const VISIBLE_CATEGORIES = new Set<ProviderCategory>([
  "official",
  "cn_official",
  "cloud_provider",
  "local",
  "custom",
  // These are local tool templates, not API platforms.
  "omo",
  "omo-slim",
]);

const VISIBLE_PLATFORM_NAMES = new Set([
  "PackyCode",
  "Azure OpenAI",
  "Codex",
  "Gemini Native",
  "GitHub Copilot",
  "xAI (Grok)",
  "xAI (Grok) OAuth",
  "Qiniu",
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
]);

/** Apply only to the picker: retain the full catalogs and their IDs for saved providers. */
export function isProviderPresetVisible(preset: {
  name: string;
  category?: ProviderCategory;
}): boolean {
  return (
    (preset.category !== undefined &&
      VISIBLE_CATEGORIES.has(preset.category)) ||
    VISIBLE_PLATFORM_NAMES.has(preset.name)
  );
}

interface ApiKeyLinkMetadata {
  websiteUrl: string;
  isPartner?: boolean;
  partnerPromotionKey?: string;
}

export function hasProviderPromotion({
  websiteUrl,
  isPartner,
  partnerPromotionKey,
}: ApiKeyLinkMetadata): boolean {
  if (isPartner || partnerPromotionKey) return true;
  try {
    // Some older first-party presets only mark the promotion in their URL.
    return [...new URL(websiteUrl).searchParams.entries()].some(
      ([key, value]) =>
        key.toLowerCase() === "aff" ||
        key.toLowerCase().startsWith("utm_") ||
        (key.toLowerCase() === "channel" && value.toLowerCase() === "ccswitch"),
    );
  } catch {
    return false;
  }
}

/** Resolve the actual rendered link so a hidden promotion cannot fall back to the homepage. */
export function getProviderApiKeyUrl({
  websiteUrl,
  isPartner,
  partnerPromotionKey,
}: ApiKeyLinkMetadata): string | undefined {
  let isPacky = partnerPromotionKey?.toLowerCase() === "packycode";
  if (!isPacky && websiteUrl) {
    try {
      // Older saved providers may have the website but no promotion metadata.
      const host = new URL(websiteUrl).hostname.toLowerCase();
      isPacky = [
        "packyapi.ai",
        "www.packyapi.ai",
        "packyapi.com",
        "www.packyapi.com",
      ].includes(host);
    } catch {
      // The form may contain an unfinished URL.
    }
  }
  if (isPacky) return PACKY_API_KEY_URL;
  if (hasProviderPromotion({ websiteUrl, isPartner, partnerPromotionKey })) {
    return undefined;
  }
  return websiteUrl || undefined;
}
