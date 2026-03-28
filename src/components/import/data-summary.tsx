"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/providers/app-provider";

interface DataCounts {
  awards: number;
  vestingSchedule: number;
  releases: number;
  saleLots: number;
}

export function DataSummary() {
  const { store, refreshKey } = useAppContext();
  const [counts, setCounts] = useState<DataCounts | null>(null);

  useEffect(() => {
    async function load() {
      const [awards, vestingSchedule, releases, saleLots] = await Promise.all([
        store.getAwards(),
        store.getVestingSchedule(),
        store.getRsuReleases(),
        store.getSaleLots(),
      ]);
      setCounts({
        awards: awards.length,
        vestingSchedule: vestingSchedule.length,
        releases: releases.length,
        saleLots: saleLots.length,
      });
    }
    load();
  }, [store, refreshKey]);

  if (!counts) return null;

  const total = counts.awards + counts.vestingSchedule + counts.releases + counts.saleLots;
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No data imported yet.</p>;
  }

  const entries = [
    { label: "Awards", count: counts.awards },
    { label: "Vesting Schedule", count: counts.vestingSchedule },
    { label: "Releases", count: counts.releases },
    { label: "Sale Lots", count: counts.saleLots },
  ].filter((e) => e.count > 0);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium">Loaded data</h3>
      <ul className="text-sm text-muted-foreground">
        {entries.map(({ label, count }) => (
          <li key={label}>
            {label}: {count} rows
          </li>
        ))}
      </ul>
    </div>
  );
}
