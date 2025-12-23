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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfigCardsProps {
  start: string;
  end: string;
  initialBTC: number;
  initialUSD: number;
  apr: number;
  maxDebtPct: number;
  band: number;
  transactionFeeUSD: number;
  amortizationFeeUSD: number;
  refinancingFeeUSD: number;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onInitialBTCChange: (value: number) => void;
  onInitialUSDChange: (value: number) => void;
  onAprChange: (value: number) => void;
  onMaxDebtPctChange: (value: number) => void;
  onBandChange: (value: number) => void;
  onTransactionFeeUSDChange: (value: number) => void;
  onAmortizationFeeUSDChange: (value: number) => void;
  onRefinancingFeeUSDChange: (value: number) => void;
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
  transactionFeeUSD,
  amortizationFeeUSD,
  refinancingFeeUSD,
  onStartChange,
  onEndChange,
  onInitialBTCChange,
  onInitialUSDChange,
  onAprChange,
  onMaxDebtPctChange,
  onBandChange,
  onTransactionFeeUSDChange,
  onAmortizationFeeUSDChange,
  onRefinancingFeeUSDChange,
}: ConfigCardsProps) {
  return (
    <div className="mt-6 space-y-3">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                  label="Start date"
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
                  label="End date"
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
                  label="Initial cash (USD)"
                  tip="Cash allocated at start; auto-converted to collateral on day one."
                />
                <Input
                  type="number"
                  value={initialUSD}
                  onChange={(e) => onInitialUSDChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="Initial collateral (units)"
                  tip="Units of pledged collateral allocated at start (kept as collateral)."
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
              LTV constraint via max debt % plus a hysteresis band.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <InfoLabel
                  label="Debt interest rate (APR)"
                  tip="Annualized borrow rate applied to outstanding debt."
                />
                <Input
                  type="number"
                  step="0.001"
                  value={apr}
                  onChange={(e) => onAprChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="Max debt percentage"
                  tip="Maximum debt as a fraction of collateral value (e.g., 0.15 = 15%)."
                />
                <Input
                  type="number"
                  step="0.01"
                  value={maxDebtPct}
                  onChange={(e) => onMaxDebtPctChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="Rebalance band"
                  tip="Borrow or repay when LTV drifts beyond this tolerance band."
                />
                <Input
                  type="number"
                  step="0.01"
                  value={band}
                  onChange={(e) => onBandChange(Number(e.target.value))}
                />
              </div>
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

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Fees</CardTitle>
            <CardDescription>
              Flat USD costs for transactions, amortization, and refinancing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <InfoLabel
                  label="Transaction fee (USD)"
                  tip="Per-transaction cost applied when DCA fees are included."
                />
                <Input
                  type="number"
                  step="0.01"
                  value={transactionFeeUSD}
                  onChange={(e) =>
                    onTransactionFeeUSDChange(Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="Amortization fee (USD)"
                  tip="Flat fee applied each time the strategy repays debt."
                />
                <Input
                  type="number"
                  step="0.01"
                  value={amortizationFeeUSD}
                  onChange={(e) =>
                    onAmortizationFeeUSDChange(Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <InfoLabel
                  label="Refinancing fee (USD)"
                  tip="Flat fee applied each time the strategy borrows or refinances."
                />
                <Input
                  type="number"
                  step="0.01"
                  value={refinancingFeeUSD}
                  onChange={(e) =>
                    onRefinancingFeeUSDChange(Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              These inputs are asset-agnostic—set them to reflect exchange,
              custody, or network costs for any collateral type.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
