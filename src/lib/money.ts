import type { USD, AUD } from "@/types";
import { usd, aud } from "@/types";

export function roundTo2dp(n: number): number {
  const sign = Math.sign(n);
  return sign * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
}

export function currencyPrefix(currency: "USD" | "AUD"): string {
  return currency === "AUD" ? "A$" : "US$";
}

export function formatCurrency(amount: number, currency: "USD" | "AUD"): string {
  const prefix = currencyPrefix(currency);
  const abs = Math.abs(amount);
  const formatted =
    prefix +
    abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return amount < 0 ? `-${formatted}` : formatted;
}

// ── USD arithmetic ───────────────────────────────────────────────────

export function addUsd(a: USD, b: USD): USD {
  return usd(a + b);
}

export function subtractUsd(a: USD, b: USD): USD {
  return usd(a - b);
}

export function multiplyUsd(a: USD, scalar: number): USD {
  return usd(a * scalar);
}

export function sumUsd(values: USD[]): USD {
  return usd(values.reduce((acc, v) => acc + v, 0));
}

// ── AUD arithmetic ───────────────────────────────────────────────────

export function addAud(a: AUD, b: AUD): AUD {
  return aud(a + b);
}

export function subtractAud(a: AUD, b: AUD): AUD {
  return aud(a - b);
}

export function multiplyAud(a: AUD, scalar: number): AUD {
  return aud(a * scalar);
}

export function sumAud(values: AUD[]): AUD {
  return aud(values.reduce((acc, v) => acc + v, 0));
}
