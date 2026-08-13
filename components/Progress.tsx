import React from "react";

interface ProgressProps {
  value: number;
  variant?: "success" | "warning" | "error" | "default";
  "aria-label"?: string;
}

export function Progress({ value, variant = "default", "aria-label": ariaLabel }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  let barColor = "bg-accent";
  if (variant === "success") barColor = "bg-success";
  if (variant === "warning") barColor = "bg-warning";
  if (variant === "error") barColor = "bg-error";

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className="w-full bg-inset rounded-full h-2.5 overflow-hidden border border-border-weak"
    >
      <div
        className={`h-full transition-all duration-300 rounded-full ${barColor}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
