import {
  BookOpen,
  History,
  Wrench,
  Server,
  FolderOpen,
  SlidersHorizontal,
  Bot,
  Brain,
  ExternalLink,
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HoverTip } from "@/components/ui/hover-tip";
import type { AppId } from "@/lib/api";
import type { View } from "@/lib/navigation";

export function AppToolbar({
  activeApp,
  onNavigate,
  onOpenClawConfig,
  onOpenWebUI,
}: {
  activeApp: AppId;
  onNavigate: (view: View) => void;
  onOpenClawConfig: (tab: "env" | "tools" | "agents") => void;
  onOpenWebUI: () => void;
}) {
  const { t } = useTranslation();
  const tools =
    activeApp === "openclaw"
      ? [
          {
            icon: FolderOpen,
            label: t("appPage.workspace"),
            action: () => onNavigate("workspace"),
          },
          {
            icon: SlidersHorizontal,
            label: t("openclaw.env.title"),
            action: () => onOpenClawConfig("env"),
          },
          {
            icon: Settings2,
            label: t("openclaw.tools.title"),
            action: () => onOpenClawConfig("tools"),
          },
          {
            icon: Bot,
            label: t("openclaw.agents.title"),
            action: () => onOpenClawConfig("agents"),
          },
        ]
      : [
          {
            icon: Wrench,
            label: t("nav.skills"),
            action: () => onNavigate("skills"),
          },
          {
            icon: BookOpen,
            label: t("nav.prompts"),
            action: () => onNavigate("prompts"),
          },
          {
            icon: History,
            label: t("nav.sessions"),
            action: () => onNavigate("sessions"),
          },
          {
            icon: Server,
            label: t("nav.mcp"),
            action: () => onNavigate("mcp"),
          },
          ...(activeApp === "hermes"
            ? [
                {
                  icon: Brain,
                  label: t("appPage.memory"),
                  action: () => onNavigate("hermesMemory"),
                },
                {
                  icon: ExternalLink,
                  label: t("appPage.webUi"),
                  action: onOpenWebUI,
                },
              ]
            : []),
        ];
  return (
    <div className="flex shrink-0 gap-0.5 rounded-xl bg-muted p-1">
      {tools.map(({ icon: Icon, label, action }) => (
        <HoverTip key={label} content={label}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={label}
            onClick={action}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </HoverTip>
      ))}
    </div>
  );
}
