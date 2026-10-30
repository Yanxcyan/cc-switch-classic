import { useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal, Boxes } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppGlyph, APP_DISPLAY_NAME } from "@/components/shell/AppGlyph";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { orderAppIds } from "@/config/appConfig";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
import type { AppNavStatus } from "@/hooks/useSidebarStatus";
import { cn } from "@/lib/utils";

export interface AppSwitcherProps {
  activeApp: AppId;
  visibleApps: VisibleApps;
  appOrder?: string[];
  appStatus: (app: AppId) => AppNavStatus;
  onSwitch: (app: AppId) => void;
  onManageApps: () => void;
}

export function AppSwitcher({
  activeApp,
  visibleApps,
  appOrder,
  appStatus,
  onSwitch,
  onManageApps,
}: AppSwitcherProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const apps = orderAppIds(appOrder).filter((app) => visibleApps[app]);
  const [visibleCount, setVisibleCount] = useState(apps.length);
  useLayoutEffect(() => {
    const slot = rootRef.current?.parentElement;
    if (!slot) return;
    const compute = () => {
      if (!slot.clientWidth) return;
      // 36px icon buttons, 4px gap, 8px padding; reserve one overflow button.
      const allFit = 8 + apps.length * 40 - 4 <= slot.clientWidth;
      setVisibleCount(
        allFit
          ? apps.length
          : Math.max(1, Math.floor((slot.clientWidth - 8) / 40) - 1),
      );
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [apps.length]);
  const visible = apps.slice(0, Math.max(1, visibleCount));
  if (apps.includes(activeApp) && !visible.includes(activeApp))
    visible[visible.length - 1] = activeApp;
  const overflow = apps.filter((app) => !visible.includes(app));
  const glyph = (app: AppId) => (
    <span className="relative">
      <AppGlyph
        app={app}
        size={20}
        badgeClassName={app === activeApp ? "bg-background" : "bg-muted"}
      />
      {appStatus(app).alert && (
        <span
          aria-label={t("nav.needsAttention", {
            defaultValue: "Needs attention",
          })}
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500"
        />
      )}
    </span>
  );
  return (
    <div
      ref={rootRef}
      className="inline-flex gap-1 rounded-xl bg-muted p-1"
      role="group"
      aria-label={t("nav.mainLabel")}
    >
      {visible.map((app) => (
        <button
          type="button"
          key={app}
          title={APP_DISPLAY_NAME[app]}
          aria-label={APP_DISPLAY_NAME[app]}
          aria-pressed={app === activeApp}
          onClick={() => onSwitch(app)}
          className={cn(
            "flex h-8 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
            app === activeApp
              ? "bg-background shadow-sm"
              : "hover:bg-background/50",
          )}
        >
          {glyph(app)}
        </button>
      ))}
      {overflow.length > 0 && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-9 items-center justify-center rounded-md hover:bg-background/50"
              aria-label={t("appSwitcher.more")}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-1">
            {overflow.map((app) => (
              <button
                key={app}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                onClick={() => {
                  setMoreOpen(false);
                  onSwitch(app);
                }}
              >
                {glyph(app)}
                {APP_DISPLAY_NAME[app]}
              </button>
            ))}
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 border-t px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setMoreOpen(false);
                onManageApps();
              }}
            >
              <Boxes className="h-5 w-5" />
              {t("nav.apps")}
            </button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
