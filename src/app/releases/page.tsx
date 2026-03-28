"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "@/components/providers/app-provider";
import { ReleasesTable } from "@/components/releases/releases-table";
import { FySelector } from "@/components/dashboard/fy-selector";
import { useFyFilter } from "@/hooks/use-fy-filter";
import type { RsuRelease, SaleLot } from "@/types";
import type { ReleaseEssIncome } from "@/services/ess-income.service";
import { toFyString } from "@/lib/dates";

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

  const availableFys = useMemo(() => {
    const fys = new Set(incomes.map((i) => i.financialYear));
    return [...fys].sort();
  }, [incomes]);

  const { selectedFy, setSelectedFy, filterByFy } = useFyFilter(availableFys);
  const filteredIncomes = filterByFy(incomes);

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">RSU Releases</h1>
      <FySelector
        availableFys={availableFys}
        selectedFy={selectedFy}
        onSelect={setSelectedFy}
      />
      <ReleasesTable incomes={filteredIncomes} releases={releases} />
    </main>
  );
}
