"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "@/components/providers/app-provider";
import { SalesTable } from "@/components/sales/sales-table";
import { FySelector } from "@/components/dashboard/fy-selector";
import { useFyFilter } from "@/hooks/use-fy-filter";
import type { SaleLot } from "@/types";
import type { SaleLotCgt } from "@/services/cgt.service";
import { toFyString } from "@/lib/dates";

export default function SalesPage() {
  const { store, cgt, refreshKey } = useAppContext();
  const [lots, setLots] = useState<SaleLot[]>([]);
  const [cgtResults, setCgtResults] = useState<SaleLotCgt[]>([]);

  useEffect(() => {
    async function load() {
      const saleLots = await store.getSaleLots();
      setLots(saleLots);
      setCgtResults(cgt.calculateByLot(saleLots));
    }
    load();
  }, [store, cgt, refreshKey]);

  const availableFys = useMemo(() => {
    const fys = new Set(lots.map((l) => toFyString(l.saleDate)));
    return [...fys].sort();
  }, [lots]);

  const { selectedFy, setSelectedFy, filterByFy } = useFyFilter(availableFys);
  const filteredResults = filterByFy(cgtResults);
  const filteredLots = useMemo(
    () =>
      selectedFy === "all"
        ? lots
        : lots.filter((l) => toFyString(l.saleDate) === selectedFy),
    [lots, selectedFy],
  );

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Sales</h1>
      <FySelector
        availableFys={availableFys}
        selectedFy={selectedFy}
        onSelect={setSelectedFy}
      />
      <SalesTable lots={filteredLots} cgtResults={filteredResults} />
    </main>
  );
}
