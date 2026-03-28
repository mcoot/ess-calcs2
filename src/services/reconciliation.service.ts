import type { Award, RsuRelease, SaleLot } from "@/types";

// ── Result types ───────────────────────────────────────────────────

export interface ReconciliationWarning {
  severity: "error" | "warning";
  category: "share-count" | "orphan-ref" | "oversold";
  message: string;
  details?: string;
}

// ── Service interface ──────────────────────────────────────────────

export interface ReconciliationService {
  validate(
    awards: Award[],
    releases: RsuRelease[],
    saleLots: SaleLot[],
  ): ReconciliationWarning[];
}

// ── Factory ────────────────────────────────────────────────────────

export function createReconciliationService(): ReconciliationService {
  function checkShareCounts(
    awards: Award[],
    releases: RsuRelease[],
  ): ReconciliationWarning[] {
    const warnings: ReconciliationWarning[] = [];

    for (const award of awards) {
      const vestedTotal = releases
        .filter((r) => r.grantNumber === award.grantNumber)
        .reduce((sum, r) => sum + r.sharesVested, 0);

      if (vestedTotal !== award.sharesGranted) {
        warnings.push({
          severity: "warning",
          category: "share-count",
          message: `Grant ${award.grantNumber}: ${vestedTotal} shares vested vs ${award.sharesGranted} granted`,
        });
      }
    }

    return warnings;
  }

  function checkOrphanRefs(
    releases: RsuRelease[],
    saleLots: SaleLot[],
  ): ReconciliationWarning[] {
    const releaseRefs = new Set(releases.map((r) => r.releaseReferenceNumber));
    const warnings: ReconciliationWarning[] = [];

    for (const lot of saleLots) {
      if (!releaseRefs.has(lot.originatingReleaseRef)) {
        warnings.push({
          severity: "error",
          category: "orphan-ref",
          message: `Sale lot references unknown release ${lot.originatingReleaseRef}`,
        });
      }
    }

    return warnings;
  }

  function checkOversold(
    releases: RsuRelease[],
    saleLots: SaleLot[],
  ): ReconciliationWarning[] {
    const warnings: ReconciliationWarning[] = [];

    for (const release of releases) {
      const soldTotal = saleLots
        .filter((lot) => lot.originatingReleaseRef === release.releaseReferenceNumber)
        .reduce((sum, lot) => sum + lot.sharesSold, 0);

      if (soldTotal > release.sharesVested) {
        warnings.push({
          severity: "warning",
          category: "oversold",
          message: `Release ${release.releaseReferenceNumber}: ${soldTotal} shares sold exceeds ${release.sharesVested} vested`,
        });
      }
    }

    return warnings;
  }

  function validate(
    awards: Award[],
    releases: RsuRelease[],
    saleLots: SaleLot[],
  ): ReconciliationWarning[] {
    return [
      ...checkShareCounts(awards, releases),
      ...checkOrphanRefs(releases, saleLots),
      ...checkOversold(releases, saleLots),
    ];
  }

  return { validate };
}
