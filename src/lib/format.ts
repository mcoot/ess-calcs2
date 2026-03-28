/** Format a UTC date as "15 Feb 2018" */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Format a share count with comma separators: 1520 → "1,520" */
export function formatShares(n: number): string {
  return n.toLocaleString("en-US");
}
