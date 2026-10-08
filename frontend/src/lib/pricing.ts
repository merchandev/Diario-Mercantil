// The configured price includes VAT. Round the total first and extract the tax.
export function includedVat(totalValue: number, percent: number) {
  const total = Math.round(totalValue * 100) / 100
  const sub = Math.round(total / (1 + percent / 100) * 100) / 100
  return { total, sub, iva: Math.round((total - sub) * 100) / 100 }
}
