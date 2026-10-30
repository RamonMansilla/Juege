import "server-only";

function configuredRate(value: string | undefined, fallback: number) {
  const rate = Number(value ?? fallback);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : Number.NaN;
}

export function getServerPaymentConfig() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "CLP";
  const depositRate = configuredRate(process.env.DEPOSIT_RATE, 0.1);
  const feeRate = configuredRate(process.env.RAMNCO_FEE_RATE, 0.03);
  const feeBase = process.env.RAMNCO_FEE_BASE === "deposit_amount" ? "deposit_amount" : "product_total";
  let validSiteUrl = false;
  try {
    const url = new URL(siteUrl);
    validSiteUrl = (url.protocol === "https:" || url.hostname === "localhost") && Boolean(url.host);
  } catch {
    validSiteUrl = false;
  }
  const sellerAccessToken = process.env.MERCADOPAGO_SELLER_ACCESS_TOKEN || "";
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
  return { ready: Boolean(validSiteUrl && sellerAccessToken && webhookSecret && Number.isFinite(depositRate) && Number.isFinite(feeRate)), siteUrl, currency, depositRate, feeRate, feeBase, sellerAccessToken, webhookSecret };
}

export function calculateServerSplit(total: number) {
  const config = getServerPaymentConfig();
  const deposit = Math.round(total * config.depositRate);
  const feeBase = config.feeBase === "deposit_amount" ? deposit : total;
  const platformFee = Math.min(deposit, Math.round(feeBase * config.feeRate));
  return { total, deposit, platformFee, storeDeposit: deposit - platformFee, balance: total - deposit };
}
