import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "./DataTable.js";
import { fmtBTC, fmtInt } from "@/lib/utils";
import type { DebtRow, HeadRow, CrossRow } from "../types/index.js";

interface ResultsTabsProps {
  activeTab: "debt" | "head" | "cross";
  onTabChange: (tab: "debt" | "head" | "cross") => void;
  debtRows: DebtRow[] | null;
  headRows: HeadRow[] | null;
  crossRows: CrossRow[] | null;
}

export function ResultsTabs({
  activeTab,
  onTabChange,
  debtRows,
  headRows,
  crossRows,
}: ResultsTabsProps) {
  return (
    <div className="mt-6">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as any)}>
        <TabsList>
          <TabsTrigger value="debt">Debt report</TabsTrigger>
          <TabsTrigger value="head">Head-to-head</TabsTrigger>
          <TabsTrigger value="cross">DCA cross</TabsTrigger>
        </TabsList>

        <TabsContent value="debt" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Debt Strategy</CardTitle>
              <CardDescription>
                Breakdown of external costs and resulting BTC exposure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!debtRows ? (
                <div className="text-sm text-muted-foreground">
                  Run the backtest to see results.
                </div>
              ) : (
                <DataTable<DebtRow>
                  columns={[
                    { key: "freq", label: "Freq" },
                    {
                      key: "btcFinal",
                      label: "BTC",
                      align: "right",
                      render: (r) => fmtBTC(r.btcFinal),
                    },
                    {
                      key: "finalValueUSD",
                      label: "Final $",
                      align: "right",
                      render: (r) => fmtInt(r.finalValueUSD),
                    },
                    {
                      key: "debtFinal",
                      label: "Debt $",
                      align: "right",
                      render: (r) => fmtInt(r.debtFinal),
                    },
                    {
                      key: "netValueUSD",
                      label: "Net $",
                      align: "right",
                      render: (r) => fmtInt(r.netValueUSD),
                    },
                    {
                      key: "externalTotalUSD",
                      label: "External $",
                      align: "right",
                      render: (r) => fmtInt(r.externalTotalUSD),
                    },
                    {
                      key: "interestUSD",
                      label: "Interest $",
                      align: "right",
                      render: (r) => fmtInt(r.interestUSD),
                    },
                    {
                      key: "principalUSD",
                      label: "Principal $",
                      align: "right",
                      render: (r) => fmtInt(r.principalUSD),
                    },
                    {
                      key: "feesUSD",
                      label: "Fees $",
                      align: "right",
                      render: (r) => fmtInt(r.feesUSD),
                    },
                    {
                      key: "borrows",
                      label: "Borrows",
                      align: "right",
                      render: (r) => fmtInt(r.borrows),
                    },
                    {
                      key: "repays",
                      label: "Repays",
                      align: "right",
                      render: (r) => fmtInt(r.repays),
                    },
                  ]}
                  rows={debtRows}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="head" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Debt vs DCA (same frequency)</CardTitle>
              <CardDescription>
                Compare BTC and net USD value using the same schedule.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!headRows ? (
                <div className="text-sm text-muted-foreground">
                  Run the backtest to see results.
                </div>
              ) : (
                <DataTable<HeadRow>
                  columns={[
                    { key: "freq", label: "Freq" },
                    {
                      key: "debtBTC",
                      label: "Debt BTC",
                      align: "right",
                      render: (r) => fmtBTC(r.debtBTC),
                    },
                    {
                      key: "dcaBTC",
                      label: "DCA BTC",
                      align: "right",
                      render: (r) => fmtBTC(r.dcaBTC),
                    },
                    {
                      key: "deltaBTC",
                      label: "Δ BTC",
                      align: "right",
                      render: (r) => fmtBTC(r.deltaBTC),
                    },
                    {
                      key: "debtNetUSD",
                      label: "Debt Net $",
                      align: "right",
                      render: (r) => fmtInt(r.debtNetUSD),
                    },
                    {
                      key: "dcaValueUSD",
                      label: "DCA $",
                      align: "right",
                      render: (r) => fmtInt(r.dcaValueUSD),
                    },
                    {
                      key: "deltaNetUSD",
                      label: "Δ Net $",
                      align: "right",
                      render: (r) => fmtInt(r.deltaNetUSD),
                    },
                    {
                      key: "externalUSD",
                      label: "External $",
                      align: "right",
                      render: (r) => fmtInt(r.externalUSD),
                    },
                    {
                      key: "dcaFeesUSD",
                      label: "DCA Fees $",
                      align: "right",
                      render: (r) => fmtInt(r.dcaFeesUSD),
                    },
                  ]}
                  rows={headRows}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cross" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>DCA Cross Table</CardTitle>
              <CardDescription>
                For each debt frequency budget, compare multiple DCA
                schedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!crossRows ? (
                <div className="text-sm text-muted-foreground">
                  Run the backtest to see results.
                </div>
              ) : (
                <DataTable<CrossRow>
                  columns={[
                    { key: "debtFreq", label: "Debt Freq" },
                    { key: "dcaFreq", label: "DCA Freq" },
                    {
                      key: "budgetUSD",
                      label: "Budget $",
                      align: "right",
                      render: (r) => fmtInt(r.budgetUSD),
                    },
                    {
                      key: "dcaBTCFinal",
                      label: "DCA BTC",
                      align: "right",
                      render: (r) => fmtBTC(r.dcaBTCFinal),
                    },
                    {
                      key: "dcaBuys",
                      label: "Buys",
                      align: "right",
                      render: (r) => fmtInt(r.dcaBuys),
                    },
                    {
                      key: "dcaFeesUSD",
                      label: "Fees $",
                      align: "right",
                      render: (r) => fmtInt(r.dcaFeesUSD),
                    },
                    {
                      key: "dcaValueFinalUSD",
                      label: "Final $",
                      align: "right",
                      render: (r) => fmtInt(r.dcaValueFinalUSD),
                    },
                  ]}
                  rows={crossRows}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

