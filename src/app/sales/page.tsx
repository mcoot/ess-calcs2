"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/providers/app-provider";
import { SalesTable } from "@/components/sales/sales-table";
import type { SaleLot } from "@/types";
import type { SaleLotCgt } from "@/services/cgt.service";

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

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Sales</h1>
      <SalesTable lots={lots} cgtResults={cgtResults} />
    </main>
  );
}
