import { useContext, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart2,
  Boxes,
  FolderOpen,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
import type { View } from "@/lib/navigation";
import { DRAG_REGION_ATTR, DRAG_REGION_STYLE, isMac } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { HoverTip } from "@/components/ui/hover-tip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WindowControlsContext } from "../components/shell/AppPageHeader";
import { useSidebarStatus } from "@/hooks/useSidebarStatus";
import { AppSwitcher } from "./AppSwitcher";
import { AppToolbar } from "./AppToolbar";
import { RoutingActivationBrand } from "./RoutingActivationBrand";
import { UpdateBadge } from "./UpdateBadge";

interface ClassicHeaderProps {
  activeApp: AppId;
  view: View;
  visibleApps: VisibleApps;
  appOrder?: string[];
  hasUpdate: boolean;
  appsUpdateAvailable: boolean;
  profileSwitcher?: ReactNode;
  moreActions?: ReactNode;
  titleRef: (host: HTMLDivElement | null) => void;
  actionsRef: (host: HTMLDivElement | null) => void;
  leadingRef: (host: HTMLDivElement | null) => void;
  onBack: () => void;
  onSwitchApp: (app: AppId) => void;
  onNavigate: (view: View) => void;
  onOpenClawConfig: (tab: "env" | "tools" | "agents") => void;
  onOpenWebUI: () => void;
  onAdd: () => void;
  onSearch?: () => void;
  onUpdate: () => void;
}

export function ClassicHeader(props: ClassicHeaderProps) {
  const { t } = useTranslation();
  const { appStatus } = useSidebarStatus();
  const windowControls = useContext(WindowControlsContext);
  const home = props.view === "providers";
  const iconButton = (
    label: string,
    Icon: typeof Settings,
    action: () => void,
    dot = false,
  ) => (
    <HoverTip content={label}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        aria-label={label}
        onClick={action}
      >
        <Icon className="h-4 w-4" />
        {dot && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        )}
      </Button>
    </HoverTip>
  );
  return (
    <>
      {isMac() && (
        <div
          className="h-7 shrink-0 bg-background/80"
          {...DRAG_REGION_ATTR}
          style={DRAG_REGION_STYLE}
        />
      )}
      <header
        className="z-50 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-6 backdrop-blur-md"
        {...DRAG_REGION_ATTR}
        style={DRAG_REGION_STYLE}
      >
        {home ? (
          <>
            <RoutingActivationBrand mode={appStatus(props.activeApp).mode} />
            <div
              className="flex shrink-0 items-center gap-0.5"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              {iconButton(t("nav.settings"), Settings, () =>
                props.onNavigate("settings"),
              )}
              {iconButton(
                t("nav.apps"),
                Boxes,
                () => props.onNavigate("apps"),
                props.appsUpdateAvailable,
              )}
              {iconButton(t("nav.usage"), BarChart2, () =>
                props.onNavigate("usage"),
              )}
              <UpdateBadge visible={props.hasUpdate} onClick={props.onUpdate} />
            </div>
            {props.profileSwitcher && (
              <div
                className="shrink-0"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <div className="hidden min-[1100px]:block">
                  {props.profileSwitcher}
                </div>
                <div className="min-[1100px]:hidden">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={t("profile.title", {
                          defaultValue: "Projects",
                        })}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      {props.profileSwitcher}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            <div
              className="min-w-[88px] flex-1 overflow-hidden"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <AppSwitcher
                activeApp={props.activeApp}
                visibleApps={props.visibleApps}
                appOrder={props.appOrder}
                appStatus={appStatus}
                onSwitch={props.onSwitchApp}
                onManageApps={() => props.onNavigate("apps")}
              />
            </div>
            <div
              className="flex shrink-0 items-center gap-2"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <AppToolbar
                activeApp={props.activeApp}
                onNavigate={props.onNavigate}
                onOpenClawConfig={props.onOpenClawConfig}
                onOpenWebUI={props.onOpenWebUI}
              />
              {props.onSearch &&
                iconButton(
                  t("provider.searchAriaLabel"),
                  Search,
                  props.onSearch,
                )}
              {props.moreActions}
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
                aria-label={t("provider.addProvider")}
                onClick={props.onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              ref={props.leadingRef}
              className="shrink-0 empty:hidden [&:not(:empty)+button]:hidden"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label={t("common.back")}
              onClick={props.onBack}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div
              ref={props.titleRef}
              className="flex min-w-0 flex-1 items-center gap-2"
              {...DRAG_REGION_ATTR}
            />
            <div
              ref={props.actionsRef}
              className="flex min-w-0 shrink items-center gap-2"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            />
          </>
        )}
        {windowControls && (
          <div
            className="flex shrink-0 items-center"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {windowControls}
          </div>
        )}
      </header>
    </>
  );
}
