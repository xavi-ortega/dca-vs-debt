export function btcFeeUSD(params: {
  satPerVb: number;
  vbytes: number;
  txCount: number;
  btcPriceUSD: number;
}): number {
  const sats = params.satPerVb * params.vbytes * params.txCount;
  return (sats / 1e8) * params.btcPriceUSD;
}

