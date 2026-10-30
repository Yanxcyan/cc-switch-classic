import { useEffect, useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { AuthCenterPanel } from "@/components/settings/AuthCenterPanel";
import { RefreshAllQuotaButton } from "@/components/settings/auth/RefreshAllQuotaButton";
import { UsagePage } from "@/components/usage/UsagePage";
import { AppPageHeader } from "@/components/shell/AppPageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { discardUnsavedChanges, hasUnsavedChanges } from "@/lib/unsavedChanges";
import type { SettingsSection } from "@/lib/navigation";

export type ClassicSettingsTab =
  | "general"
  | "proxy"
  | "auth"
  | "advanced"
  | "usage"
  | "about";

export function classicTabForSection(
  section: SettingsSection,
): ClassicSettingsTab {
  if (section === "routing" || section === "network") return "proxy";
  if (section === "appConfig" || section === "data") return "advanced";
  return section;
}

const SECTIONS: Partial<Record<ClassicSettingsTab, SettingsSection[]>> = {
  general: ["general"],
  proxy: ["routing", "network"],
  advanced: ["appConfig", "data"],
  about: ["about"],
};
const TABS: ClassicSettingsTab[] = [
  "general",
  "proxy",
  "auth",
  "advanced",
  "usage",
  "about",
];

type Props = ComponentProps<typeof SettingsPage> & {
  initialTab?: ClassicSettingsTab;
  onSectionChange?: (section: SettingsSection) => void;
};

/** Six Classic tabs; v4 owns saves, accounts, routing and usage behavior. */
export function ClassicSettings({
  initialTab,
  onSectionChange,
  ...props
}: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ClassicSettingsTab>(
    initialTab ?? classicTabForSection(props.section),
  );
  const [pending, setPending] = useState<ClassicSettingsTab | null>(null);
  useEffect(() => {
    setTab(initialTab ?? classicTabForSection(props.section));
  }, [props.section, initialTab]);

  const selectTab = (next: ClassicSettingsTab) => {
    setTab(next);
    const section = SECTIONS[next]?.[0];
    if (section) onSectionChange?.(section);
  };
  const requestTab = (next: ClassicSettingsTab) => {
    if (next === tab) return;
    if (hasUnsavedChanges()) setPending(next);
    else selectTab(next);
  };
  const labels: Record<ClassicSettingsTab, string> = {
    general: t("classic.settings.general"),
    proxy: t("classic.settings.proxy"),
    auth: t("classic.settings.auth"),
    advanced: t("classic.settings.advanced"),
    usage: t("classic.settings.usage"),
    about: t("classic.settings.about"),
  };
  const sections = SECTIONS[tab];

  return (
    <>
      {tab !== "usage" && (
        <AppPageHeader
          title={t("settings.title")}
          actions={tab === "auth" ? <RefreshAllQuotaButton /> : undefined}
        />
      )}
      <Tabs
        value={tab}
        onValueChange={(value) => requestTab(value as ClassicSettingsTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList
          className="glass mx-6 mt-4 grid h-auto shrink-0 grid-cols-6 gap-1 p-1"
          aria-label={t("settings.title")}
        >
          {TABS.map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="min-w-0 px-2 py-2"
            >
              {labels[value]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent
          key={tab}
          value={tab}
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          {sections && (
            <SettingsPage
              {...props}
              section={
                sections.includes(props.section) ? props.section : sections[0]
              }
              groupedSections={tab === "about" ? undefined : sections}
              embedded
            />
          )}
          {tab === "auth" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <AuthCenterPanel />
            </div>
          )}
          {tab === "usage" && (
            <UsagePage onOpenRoutingSettings={() => requestTab("proxy")} />
          )}
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        isOpen={pending !== null}
        title={t("common.unsavedLeaveTitle")}
        message={t("common.unsavedLeaveMessage")}
        confirmText={t("common.unsavedLeaveConfirm")}
        cancelText={t("common.unsavedLeaveCancel")}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          discardUnsavedChanges();
          selectTab(pending);
          setPending(null);
        }}
      />
    </>
  );
}
