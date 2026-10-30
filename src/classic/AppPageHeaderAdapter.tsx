import { useContext, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { AppPageHeader as OriginalHeader } from "../components/shell/AppPageHeader";
import { ClassicHeaderContext } from "./ClassicHeaderContext";
export { WindowControlsContext } from "../components/shell/AppPageHeader";

export function AppPageHeader(props: ComponentProps<typeof OriginalHeader>) {
  const slots = useContext(ClassicHeaderContext);
  if (!slots)
    return (
      <OriginalHeader
        {...props}
        className={`h-16 bg-background/80 backdrop-blur-md ${props.className ?? ""}`}
      />
    );
  return (
    <>
      {slots.leadingHost &&
        props.leading &&
        createPortal(props.leading, slots.leadingHost)}
      {slots.titleHost &&
        createPortal(
          <>
            {!slots.leadingHost && props.leading}
            <h1 className="min-w-0 truncate text-lg font-semibold">
              {props.title}
            </h1>
            {props.subtitle && (
              <span className="truncate text-sm text-muted-foreground">
                {props.subtitle}
              </span>
            )}
            {props.titleExtra}
          </>,
          slots.titleHost,
        )}
      {slots.actionsHost &&
        props.actions &&
        createPortal(props.actions, slots.actionsHost)}
    </>
  );
}
