import { createContext } from "react";

/** Page components publish directly into these slots without duplicating their state. */
export const ClassicHeaderContext = createContext<{
  titleHost: HTMLDivElement | null;
  actionsHost: HTMLDivElement | null;
  leadingHost?: HTMLDivElement | null;
} | null>(null);
