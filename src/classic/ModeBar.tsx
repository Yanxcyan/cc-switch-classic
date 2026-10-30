import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Search, Settings2, Shuffle } from "lucide-react";
import type { AppMode } from "@/types/proxy";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HelpTip } from "@/components/ui/help-tip";
import { HoverTip } from "@/components/ui/hover-tip";
import { MODE_TONE } from "@/components/providers/mode/ModeTabs";
import { cn } from "@/lib/utils";

interface ModeBarProps {
  modes: AppMode[];
  active: AppMode;
  view: AppMode;
  onView: (mode: AppMode) => void;
  status?: ReactNode;
  activate?: { label: string; disabled: boolean; onClick: () => void };
  failover?: {
    enabled: boolean;
    disabled?: boolean;
    onChange: (enabled: boolean) => void;
  };
  onOpenRouteSettings?: () => void;
  onOpenStackSettings?: () => void;
  searchSlotRef?: (node: HTMLDivElement | null) => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}

/** Browsing a mode is read-only; the separate action opens v4's confirmation. */
export function ModeBar({
  modes,
  active,
  view,
  onView,
  status,
  activate,
  failover,
  onOpenRouteSettings,
  onOpenStackSettings,
  searchSlotRef,
  searchOpen,
  onSearchOpenChange,
}: ModeBarProps) {
  const { t } = useTranslation();
  const openSettings = onOpenRouteSettings ?? onOpenStackSettings;
  const settingsLabel = onOpenRouteSettings
    ? t("mode.routeSettings")
    : t("mode.stackSettings.title");

  return (
    <div className="relative flex min-h-14 shrink-0 items-center gap-2 border-b border-border/50 px-6 py-2">
      <div
        role="group"
        aria-label={t("mode.tabsLabel")}
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1"
      >
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onClick={() => onView(mode)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              view === mode && "bg-background shadow-sm",
              active === mode
                ? MODE_TONE[mode].text
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`mode.names.${mode}`)}
            {active === mode && (
              <span
                role="img"
                aria-label={t("mode.active")}
                className={cn("h-1.5 w-1.5 rounded-full", MODE_TONE[mode].dot)}
              />
            )}
          </button>
        ))}
      </div>
      <HelpTip title={t("mode.help.title")}>
        {modes.map((mode) => (
          <span key={mode} className="block">
            {t(`mode.help.${mode}`)}
          </span>
        ))}
      </HelpTip>
      <div className="min-w-0 flex-1 truncate">{status}</div>
      {activate && (
        <Button
          variant={view}
          size="sm"
          disabled={activate.disabled}
          onClick={activate.onClick}
        >
          {activate.label}
        </Button>
      )}
      {failover && (
        <HoverTip content={t("mode.failover")}>
          <label className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-muted/50 px-1.5">
            <Shuffle
              aria-hidden="true"
              className={cn(
                "h-4 w-4",
                failover.enabled
                  ? "status-heartbeat text-emerald-500"
                  : "text-muted-foreground",
              )}
            />
            <Switch
              checked={failover.enabled}
              disabled={failover.disabled}
              onCheckedChange={failover.onChange}
              aria-label={t("mode.failover")}
            />
          </label>
        </HoverTip>
      )}
      {openSettings && (
        <HoverTip content={settingsLabel}>
          <Button
            variant="ghost"
            size="icon-compact"
            aria-label={settingsLabel}
            onClick={openSettings}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </HoverTip>
      )}
      {onSearchOpenChange && (
        <HoverTip content={t("provider.searchAriaLabel")}>
          <Button
            variant="ghost"
            size="icon-compact"
            aria-label={t("provider.searchAriaLabel")}
            aria-pressed={searchOpen ?? false}
            onClick={() => onSearchOpenChange(!searchOpen)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </HoverTip>
      )}
      {searchSlotRef && (
        <div
          ref={searchSlotRef}
          className="absolute end-6 top-full z-20 mt-2 rounded-lg bg-background shadow-lg empty:hidden"
        />
      )}
    </div>
  );
}
