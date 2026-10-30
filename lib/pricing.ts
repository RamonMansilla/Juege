export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "CLP";
export const DEPOSIT_RATE = Number(process.env.NEXT_PUBLIC_DEPOSIT_RATE || "0.10");
export const RAMNCO_FEE_RATE = Number(process.env.NEXT_PUBLIC_RAMNCO_FEE_RATE || "0.03");
export const RAMNCO_FEE_BASE = process.env.NEXT_PUBLIC_RAMNCO_FEE_BASE === "deposit_amount" ? "deposit_amount" : "product_total";

export function calculateSplit(total: number) {
  const deposit = Math.round(total * DEPOSIT_RATE);
  const feeBase = RAMNCO_FEE_BASE === "deposit_amount" ? deposit : total;
  const ramncoFee = Math.min(deposit, Math.round(feeBase * RAMNCO_FEE_RATE));
  return { total, deposit, ramncoFee, storeDeposit: deposit - ramncoFee, balance: total - deposit, feeBase };
}

export function formatMoney(value: number, currency = CURRENCY) {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return "$" + Math.round(value).toLocaleString("es-CL");
  }
}
