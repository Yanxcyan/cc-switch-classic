import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AppMode } from "@/types/proxy";
import { cn } from "@/lib/utils";

export function RoutingActivationBrand({ mode }: { mode: AppMode }) {
  const reducedMotion = useReducedMotion();
  const previous = useRef(mode);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (previous.current === "direct" && mode !== "direct" && !reducedMotion)
      setBurst((value) => value + 1);
    previous.current = mode;
  }, [mode, reducedMotion]);
  return (
    <span
      className={cn(
        "pointer-events-none relative whitespace-nowrap text-xl font-semibold",
        mode === "route"
          ? "text-emerald-500"
          : mode === "stack"
            ? "text-violet-500"
            : "text-blue-500",
      )}
    >
      CC Switch
      <AnimatePresence>
        {burst > 0 && !reducedMotion && (
          <motion.span
            key={burst}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl bg-current"
            initial={{ opacity: 0.25, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.65 }}
            transition={{ duration: 0.98 }}
          />
        )}
      </AnimatePresence>
      {burst > 0 &&
        !reducedMotion &&
        Array.from({ length: 12 }, (_, index) => (
          <motion.i
            key={`${burst}-${index}`}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-current"
            initial={{ opacity: 0.9, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              x: Math.cos((index * Math.PI) / 6) * 65,
              y: Math.sin((index * Math.PI) / 6) * 30,
            }}
            transition={{ duration: 0.98 }}
          />
        ))}
    </span>
  );
}
