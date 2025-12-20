import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Dataset } from "../types/index.js";

interface HeaderProps {
  datasets: Dataset[];
  datasetId: string;
  onDatasetChange: (id: string) => void;
  darkMode: boolean;
  onDarkModeChange: (dark: boolean) => void;
  onLoad: () => void;
  onRun: () => void;
  canRun: boolean;
}

export function Header({
  datasets,
  datasetId,
  onDatasetChange,
  darkMode,
  onDarkModeChange,
  onLoad,
  onRun,
  canRun,
}: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bitcoin Strategy Backtest
        </h1>
        <p className="text-sm text-muted-foreground">
          Dashboard UI (no backend). Debt strategy vs DCA with optional
          on-chain fees.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Dark</span>
          <Switch checked={darkMode} onCheckedChange={onDarkModeChange} />
        </div>

        <Select value={datasetId} onValueChange={onDatasetChange}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Select dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="secondary" onClick={onLoad}>
          Load
        </Button>

        <Button onClick={onRun} disabled={!canRun}>
          Run
        </Button>
      </div>
    </div>
  );
}

