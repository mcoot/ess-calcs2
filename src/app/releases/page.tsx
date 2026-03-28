"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/providers/app-provider";
import { ReleasesTable } from "@/components/releases/releases-table";
import type { RsuRelease, SaleLot } from "@/types";
import type { ReleaseEssIncome } from "@/services/ess-income.service";

export default function ReleasesPage() {
  const { store, essIncome, refreshKey } = useAppContext();
  const [releases, setReleases] = useState<RsuRelease[]>([]);
  const [incomes, setIncomes] = useState<ReleaseEssIncome[]>([]);

  useEffect(() => {
    async function load() {
      const [rels, lots] = await Promise.all([
        store.getRsuReleases(),
        store.getSaleLots(),
      ]);
      setReleases(rels);
      setIncomes(essIncome.calculateByRelease(rels, lots));
    }
    load();
  }, [store, essIncome, refreshKey]);

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">RSU Releases</h1>
      <ReleasesTable incomes={incomes} releases={releases} />
    </main>
  );
}
