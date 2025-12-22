import React from "react";
import { FREQ_ORDER, freqLabel } from "@/lib/frequency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string;
  onChange: (v: any) => void;
};

export function FreqSelect({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-3">
      <span className="text-muted-foreground">Cadence:</span>

      {/* Mobile: dropdown to avoid overflow */}
      <div className="sm:hidden">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger size="sm" aria-label="Select cadence">
            <SelectValue placeholder="Cadence" />
          </SelectTrigger>
          <SelectContent>
            {FREQ_ORDER.map((f) => (
              <SelectItem key={f} value={f}>
                {freqLabel[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: segmented control */}
      <div className="hidden flex-wrap gap-1 rounded-md border border-border bg-card px-1 py-1 sm:flex sm:w-auto sm:flex-nowrap">
        {FREQ_ORDER.map((f) => (
          <button
            key={f}
            className={`rounded-sm px-2 py-1 text-[11px] sm:text-xs transition-colors ${
              value === f
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
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
