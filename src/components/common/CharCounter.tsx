"use client";

import { cn } from "@/lib/utils";

interface CharCounterProps {
  current: number;
  max: number;
  /** Chars remaining at which the counter turns orange. */
  warnAt: number;
}

export function CharCounter({ current, max, warnAt }: CharCounterProps) {
  const remaining = max - current;
  const isMaxed = current >= max;
  const isWarning = !isMaxed && remaining <= warnAt;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        isMaxed
          ? "text-destructive font-semibold"
          : isWarning
          ? "text-amber-500"
          : "text-muted-foreground"
      )}
    >
      {current}/{max}
    </span>
  );
}
