import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import type { Dataset } from "../types/index.js";

interface HeaderProps {
  datasets: Dataset[];
  datasetId: string;
  onDatasetChange: (id: string) => void;
  hasUploaded: boolean;
  darkMode: boolean;
  onDarkModeChange: (dark: boolean) => void;
  onUpload: (file: File) => void;
  onRun: () => void;
  canRun: boolean;
}

export function Header({
  datasets,
  datasetId,
  onDatasetChange,
  hasUploaded,
  darkMode,
  onDarkModeChange,
  onUpload,
  onRun,
  canRun,
}: HeaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Reset so the same file can be selected twice if needed.
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          DCA vs Debt Backtest
        </h1>
        <p className="text-sm text-muted-foreground">
          Dashboard UI (no backend). Debt strategy vs DCA with optional fees for
          any asset.
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
            {hasUploaded && (
              <SelectItem value="uploaded">Uploaded CSV</SelectItem>
            )}
          </SelectContent>
        </Select>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Upload a daily CSV with columns: date, price. Formats like
              6,849.09 are accepted.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button onClick={onRun} disabled={!canRun}>
          Run
        </Button>
      </div>
    </div>
  );
}
