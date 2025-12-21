import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils.js";

interface ConfigCardsProps {
  start: string;
  end: string;
  initialBTC: number;
  initialUSD: number;
  apr: number;
  maxDebtPct: number;
  band: number;
  satPerVb: number;
  vbytesPerTx: number;
  txBorrow: number;
  txRepay: number;
  advancedMode: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onInitialBTCChange: (value: number) => void;
  onInitialUSDChange: (value: number) => void;
  onAprChange: (value: number) => void;
  onMaxDebtPctChange: (value: number) => void;
  onBandChange: (value: number) => void;
  onSatPerVbChange: (value: number) => void;
  onVbytesPerTxChange: (value: number) => void;
  onTxBorrowChange: (value: number) => void;
  onTxRepayChange: (value: number) => void;
  onAdvancedModeChange: (value: boolean) => void;
}

const InfoLabel = ({ label, tip }: { label: string; tip: string }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Label className="group inline-flex cursor-help items-center gap-1">
          {label}
          <Info
            size={16}
            className="text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </Label>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        {tip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export function ConfigCards({
  start,
  end,
  initialBTC,
  initialUSD,
  apr,
  maxDebtPct,
  band,
  satPerVb,
  vbytesPerTx,
  txBorrow,
  txRepay,
  advancedMode,
  onStartChange,
  onEndChange,
  onInitialBTCChange,
  onInitialUSDChange,
  onAprChange,
  onMaxDebtPctChange,
  onBandChange,
  onSatPerVbChange,
  onVbytesPerTxChange,
  onTxBorrowChange,
  onTxRepayChange,
  onAdvancedModeChange,
}: ConfigCardsProps) {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-end gap-2 text-xs">
        <span className={!advancedMode ? "font-semibold" : ""}>Lite</span>
        <Switch checked={advancedMode} onCheckedChange={onAdvancedModeChange} />
        <span className={advancedMode ? "font-semibold" : ""}>Pro</span>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          advancedMode ? "lg:grid-cols-3" : "lg:grid-cols-2",
        )}
      >
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Range & Capital</CardTitle>
            <CardDescription>
              Subset the series and define initial allocation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <InfoLabel
                  label="Start"
                  tip="First date to include in the backtest (YYYY-MM-DD)."
                />
                <Input
                  value={start}
                  onChange={(e) => onStartChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="End"
                  tip="Last date to include in the backtest (YYYY-MM-DD)."
                />
                <Input
                  value={end}
                  onChange={(e) => onEndChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <InfoLabel
                  label="initialUSD"
                  tip="Cash allocated at start; auto-converted to BTC on day one."
                />
                <Input
                  type="number"
                  value={initialUSD}
                  onChange={(e) => onInitialUSDChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="initialBTC"
                  tip="BTC allocated at start (kept as BTC)."
                />
                <Input
                  type="number"
                  value={initialBTC}
                  onChange={(e) => onInitialBTCChange(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Debt Policy</CardTitle>
            <CardDescription>
              LTV constraint via maxDebtPct + hysteresis band.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`grid gap-3 ${advancedMode ? "grid-cols-3" : "grid-cols-1"}`}
            >
              {advancedMode && (
                <div className="space-y-1.5">
                  <InfoLabel
                    label="APR"
                    tip="Annualized borrow rate applied to outstanding debt."
                  />
                  <Input
                    type="number"
                    step="0.001"
                    value={apr}
                    onChange={(e) => onAprChange(Number(e.target.value))}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <InfoLabel
                  label="maxDebtPct"
                  tip="Max debt as % of collateral value (e.g., 0.15 = 15%)."
                />
                <Input
                  type="number"
                  step="0.01"
                  value={maxDebtPct}
                  onChange={(e) => onMaxDebtPctChange(Number(e.target.value))}
                />
              </div>
              {advancedMode && (
                <div className="space-y-1.5">
                  <InfoLabel
                    label="band"
                    tip="Rebalance band; borrow/repay when LTV drifts beyond this band."
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={band}
                    onChange={(e) => onBandChange(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Rule intuition: "-70% crash & collateral ratio = 200%" corresponds
              roughly to{" "}
              <span className="font-medium text-foreground">
                maxDebtPct ~ 0.15
              </span>
              .
            </div>
          </CardContent>
        </Card>

        {advancedMode && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Fees</CardTitle>
              <CardDescription>Bitcoin L1 fee model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <InfoLabel
                    label="sat/vB"
                    tip="Fee rate in satoshis per virtual byte."
                  />
                  <Input
                    type="number"
                    value={satPerVb}
                    onChange={(e) => onSatPerVbChange(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <InfoLabel
                    label="vbytes/tx"
                    tip="Estimated transaction size per borrow/repay or DCA."
                  />
                  <Input
                    type="number"
                    value={vbytesPerTx}
                    onChange={(e) =>
                      onVbytesPerTxChange(Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <InfoLabel
                    label="txBorrow"
                    tip="Number of on-chain tx per borrow event."
                  />
                  <Input
                    type="number"
                    value={txBorrow}
                    onChange={(e) => onTxBorrowChange(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <InfoLabel
                    label="txRepay"
                    tip="Number of on-chain tx per repay event."
                  />
                  <Input
                    type="number"
                    value={txRepay}
                    onChange={(e) => onTxRepayChange(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
