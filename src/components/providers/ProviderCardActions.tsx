import type * as React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Check,
  Copy,
  FlaskConical,
  Code,
  Trash2,
  Loader2,
  MoreHorizontal,
  Pencil,
  SquareTerminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisabledReason } from "@/components/ui/help-tip";
import { HoverTip } from "@/components/ui/hover-tip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  CardButton,
  CardMenuItem,
  CardPresentation,
  CardTone,
} from "./presentation";

interface ProviderCardActionsProps {
  providerName: string;
  presentation: CardPresentation;
  modeView?: CardTone;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onTest?: () => void;
  isTesting?: boolean;
  onConfigureUsage?: () => void;
  onOpenTerminal?: () => void;
  /** 这张卡打开的终端是否与 CC Switch 的切换隔离（见 terminalIsIsolated），决定提示里带不带「环境隔离」 */
  openTerminalIsolated?: boolean;
}

/** Classic actions retain the v4 presentation contract and disabled reasons. */
export function ProviderCardActions({
  providerName,
  presentation,
  modeView,
  onEdit,
  onDelete,
  onDuplicate,
  onTest,
  isTesting,
  onConfigureUsage,
  onOpenTerminal,
  openTerminalIsolated,
}: ProviderCardActionsProps) {
  const { t } = useTranslation();
  const { status, buttons, move, menuItems = [] } = presentation;

  return (
    <div className="flex shrink-0 items-center gap-1 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto">
      {/* 主操作位定宽：图标按钮和「● 使用中」这类状态文字宽度不同，不定宽的话
          切换后左边的用量会被推开、跟其他卡片对不齐。按最长的常见状态留宽，靠右对齐 */}
      <div className="flex min-w-[4.5rem] items-center justify-end gap-1">
        {status && (
          <span className="inline-flex h-8 min-w-[4.5rem] items-center justify-center gap-1 rounded-lg bg-muted px-2 text-xs font-medium text-muted-foreground">
            <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {status.label}
          </span>
        )}
        {buttons.map((button) => (
          <PrimaryButton key={button.key} button={button} modeView={modeView} />
        ))}
      </div>

      <IconAction
        tip={t("common.edit")}
        disabledReason={presentation.editDisabledReason}
      >
        <Button
          variant="quiet"
          size="icon-compact"
          aria-label={t("providerCard.action.edit", { name: providerName })}
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </IconAction>

      {onDuplicate && (
        <HoverTip content={t("provider.duplicate")}>
          <Button
            variant="quiet"
            size="icon-compact"
            aria-label={t("provider.duplicate")}
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </HoverTip>
      )}
      {onTest && (
        <HoverTip content={t("provider.connectivityCheck")}>
          <Button
            variant="quiet"
            size="icon-compact"
            aria-label={t("provider.connectivityCheck")}
            disabled={isTesting}
            onClick={onTest}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
          </Button>
        </HoverTip>
      )}
      {onConfigureUsage && (
        <HoverTip content={t("provider.configureUsage")}>
          <Button
            variant="quiet"
            size="icon-compact"
            aria-label={t("provider.configureUsage")}
            onClick={onConfigureUsage}
          >
            <Code className="h-4 w-4" />
          </Button>
        </HoverTip>
      )}
      {onOpenTerminal && (
        <HoverTip
          content={t(
            openTerminalIsolated
              ? "provider.openTerminalIsolated"
              : "provider.openTerminal",
          )}
        >
          <Button
            variant="quiet"
            size="icon-compact"
            aria-label={t("providerCard.action.openTerminal", {
              name: providerName,
            })}
            onClick={onOpenTerminal}
          >
            <SquareTerminal className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </HoverTip>
      )}

      <IconAction
        tip={t("common.delete")}
        disabledReason={presentation.deleteDisabledReason}
      >
        <Button
          variant="quiet"
          size="icon-compact"
          className="hover:bg-red-500/10 hover:text-red-500"
          aria-label={t("common.delete")}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </IconAction>

      <DropdownMenu>
        <HoverTip content={t("common.more")}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="quiet"
              size="icon-compact"
              aria-label={t("providerCard.action.more", {
                name: providerName,
              })}
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
        </HoverTip>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {menuItems.map((item) => (
            <ModeMenuItem key={item.key} item={item} />
          ))}
          {move && (
            <>
              <DropdownMenuItem disabled={!move.onUp} onSelect={move.onUp}>
                <ArrowUp className="h-4 w-4" />
                {t("providerCard.action.moveUp", { name: providerName })}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!move.onDown} onSelect={move.onDown}>
                <ArrowDown className="h-4 w-4" />
                {t("providerCard.action.moveDown", { name: providerName })}
              </DropdownMenuItem>
            </>
          )}
          {(menuItems.length > 0 || move) && <DropdownMenuSeparator />}
          {onDuplicate && (
            <DropdownMenuItem onSelect={onDuplicate}>
              {t("provider.duplicate")}
            </DropdownMenuItem>
          )}
          {onTest && (
            <DropdownMenuItem disabled={isTesting} onSelect={onTest}>
              {isTesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("provider.connectivityCheck")}
            </DropdownMenuItem>
          )}
          {onConfigureUsage && (
            <DropdownMenuItem onSelect={onConfigureUsage}>
              {t("provider.configureUsage")}
            </DropdownMenuItem>
          )}
          {(onDuplicate || onTest || onConfigureUsage) && (
            <DropdownMenuSeparator />
          )}
          <DropdownMenuItem
            disabled={Boolean(presentation.deleteDisabledReason)}
            onSelect={onDelete}
            className="flex-col items-start gap-0.5 text-danger-text focus:text-danger-text"
          >
            {t("common.delete")}
            {presentation.deleteDisabledReason && (
              <span className="text-caption text-fg-3">
                {presentation.deleteDisabledReason}
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** 有禁用原因时只挂说明卡（报原因），否则挂 HoverTip（报名字），两者不叠。 */
function IconAction({
  tip,
  disabledReason,
  children,
}: {
  tip: string;
  disabledReason?: string;
  children: React.ReactElement;
}) {
  if (disabledReason) {
    return (
      <DisabledReason reason={disabledReason} align="end">
        {children}
      </DisabledReason>
    );
  }
  return <HoverTip content={tip}>{children}</HoverTip>;
}

/** 「更多」菜单里跟模式有关的一项；带子菜单时（选默认模型）展开选，否则直接点。 */
function ModeMenuItem({ item }: { item: CardMenuItem }) {
  if (item.submenu && !item.disabledReason) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          {item.label}
          <ChevronRight
            aria-hidden="true"
            className="ml-auto h-3.5 w-3.5 text-fg-3"
          />
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="max-h-72 min-w-64 overflow-y-auto">
            <DropdownMenuLabel>{item.submenu.title}</DropdownMenuLabel>
            {item.submenu.options.map((option) => (
              <DropdownMenuItem
                key={option.key}
                onSelect={option.onSelect}
                className="flex min-w-0 flex-col items-start gap-0.5"
              >
                <span className="max-w-72 truncate">{option.label}</span>
                {option.detail && (
                  <span className="max-w-72 truncate font-mono text-caption text-fg-3">
                    {option.detail}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }
  return (
    <DropdownMenuItem
      disabled={Boolean(item.disabledReason)}
      onSelect={item.onSelect}
      className="flex-col items-start gap-0.5"
    >
      {item.label}
      {item.disabledReason && (
        <span className="max-w-64 text-caption text-fg-3">
          {item.disabledReason}
        </span>
      )}
    </DropdownMenuItem>
  );
}

function PrimaryButton({
  button,
  modeView,
}: {
  button: CardButton;
  modeView?: CardTone;
}) {
  const isRemove = button.key === "remove" || button.key === "disable";
  const tone =
    modeView ??
    (button.key === "routeHere" ||
    button.key.startsWith("queue") ||
    button.key === "add" ||
    button.key === "enable"
      ? "route"
      : "direct");
  return (
    <IconAction tip={button.label} disabledReason={button.disabledReason}>
      <Button
        variant={isRemove ? "ghost" : tone}
        size="sm"
        className={cn(
          "w-[4.5rem] px-1.5 text-xs",
          isRemove &&
            (tone === "stack"
              ? "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400"
              : "bg-muted text-muted-foreground hover:bg-muted/80"),
        )}
        aria-label={button.label}
        onClick={button.onClick}
      >
        <span className="truncate">{button.label}</span>
      </Button>
    </IconAction>
  );
}
