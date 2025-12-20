import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { fmtNum } from "@/lib/utils";
import type { SeriesPoint } from "@bitcoin-strategy/core";

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
  includeDcaFees: boolean;
  rawSeries: SeriesPoint[] | null;
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
  onIncludeDcaFeesChange: (value: boolean) => void;
}

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
  includeDcaFees,
  rawSeries,
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
  onIncludeDcaFeesChange,
}: ConfigCardsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
              <Label>Start</Label>
              <Input
                value={start}
                onChange={(e) => onStartChange(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
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
              <Label>initialUSD</Label>
              <Input
                type="number"
                value={initialUSD}
                onChange={(e) => onInitialUSDChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>initialBTC</Label>
              <Input
                type="number"
                value={initialBTC}
                onChange={(e) => onInitialBTCChange(Number(e.target.value))}
              />
            </div>
          </div>

          {rawSeries && (
            <div className="text-xs text-muted-foreground">
              Loaded: {rawSeries.length.toLocaleString("en-US")} rows ·
              First {rawSeries[0].date} @ ${fmtNum(rawSeries[0].price)} ·
              Last {rawSeries.at(-1)!.date} @ $
              {fmtNum(rawSeries.at(-1)!.price)}
            </div>
          )}
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>APR</Label>
              <Input
                type="number"
                step="0.001"
                value={apr}
                onChange={(e) => onAprChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>maxDebtPct</Label>
              <Input
                type="number"
                step="0.01"
                value={maxDebtPct}
                onChange={(e) => onMaxDebtPctChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>band</Label>
              <Input
                type="number"
                step="0.01"
                value={band}
                onChange={(e) => onBandChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Rule intuition: "-70% crash ⇒ collateral ratio ≥ 200%"
            corresponds roughly to{" "}
            <span className="font-medium text-foreground">
              maxDebtPct ≈ 0.15
            </span>
            .
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Fees</CardTitle>
          <CardDescription>
            Bitcoin L1 fee model + apply to DCA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>sat/vB</Label>
              <Input
                type="number"
                value={satPerVb}
                onChange={(e) => onSatPerVbChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>vbytes/tx</Label>
              <Input
                type="number"
                value={vbytesPerTx}
                onChange={(e) => onVbytesPerTxChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>txBorrow</Label>
              <Input
                type="number"
                value={txBorrow}
                onChange={(e) => onTxBorrowChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>txRepay</Label>
              <Input
                type="number"
                value={txRepay}
                onChange={(e) => onTxRepayChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Apply fees to DCA</div>
              <div className="text-xs text-muted-foreground">
                Subtract on-chain fee from each periodic buy.
              </div>
            </div>
            <Switch
              checked={includeDcaFees}
              onCheckedChange={onIncludeDcaFeesChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

