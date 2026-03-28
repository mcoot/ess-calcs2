"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { AppHeader } from "@/components/header/app-header";
import { FakeStore } from "@/store/fake/fake.store";
import { parseForexCsv } from "@/parsers/forex.parser";
import { createForexService, type ForexService } from "@/services/forex.service";
import type { DataStore } from "@/store/data-store";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deps, setDeps] = useState<{ store: DataStore; forex: ForexService } | null>(null);

  useEffect(() => {
    async function init() {
      const store = new FakeStore();
      const res = await fetch("/rba-forex.csv");
      const csv = await res.text();
      const rates = parseForexCsv(csv);
      const forex = createForexService(rates);
      setDeps({ store, forex });
    }
    init();
  }, []);

  return (
    <html lang="en">
      <body>
        {deps ? (
          <AppProvider store={deps.store} forex={deps.forex}>
            <AppHeader />
            {children}
          </AppProvider>
        ) : (
          <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}
      </body>
    </html>
  );
}
