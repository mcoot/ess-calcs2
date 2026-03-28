"use client";

import { useAppContext } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";

export function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useAppContext();

  return (
    <div className="flex gap-1">
      <Button
        variant={displayCurrency === "AUD" ? "default" : "outline"}
        size="sm"
        aria-pressed={displayCurrency === "AUD"}
        onClick={() => setDisplayCurrency("AUD")}
      >
        AUD
      </Button>
      <Button
        variant={displayCurrency === "USD" ? "default" : "outline"}
        size="sm"
        aria-pressed={displayCurrency === "USD"}
        onClick={() => setDisplayCurrency("USD")}
      >
        USD
      </Button>
    </div>
  );
}
