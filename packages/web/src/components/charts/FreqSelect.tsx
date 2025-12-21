import React from "react";
import { FREQ_ORDER, freqLabel } from "@/lib/frequency";

type Props = {
  value: string;
  onChange: (v: any) => void;
};

export function FreqSelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Cadence:</span>
      <div className="flex rounded-md border border-border bg-card px-1 py-0.5">
        {FREQ_ORDER.map((f) => (
          <button
            key={f}
            className={`px-2 py-1 rounded-sm text-xs ${
              value === f
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80"
            }`}
            onClick={() => onChange(f)}
            type="button"
          >
            {freqLabel[f]}
          </button>
        ))}
      </div>
    </div>
  );
}
