import { ArrowUpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HoverTip } from "@/components/ui/hover-tip";

export function UpdateBadge({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <HoverTip content={t("settings.checkForUpdates")}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-emerald-500"
        aria-label={t("settings.checkForUpdates")}
        onClick={onClick}
      >
        <ArrowUpCircle className="h-4 w-4" />
      </Button>
    </HoverTip>
  );
}
