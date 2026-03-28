import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./app-header";
import { AppProvider } from "@/components/providers/app-provider";
import { FakeStore } from "@/store/fake/fake.store";
import { stubForex } from "@/test-helpers";

// Mock next/link to a plain anchor so we don't need the Next.js router
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <AppProvider store={new FakeStore()} forex={stubForex}>
      {ui}
    </AppProvider>
  );
}

describe("AppHeader", () => {
  it("renders navigation links for all pages", () => {
    renderWithProvider(<AppHeader />);
    const importLink = screen.getByRole("link", { name: "Import" });
    const awardsLink = screen.getByRole("link", { name: "Awards" });
    const releasesLink = screen.getByRole("link", { name: "Releases" });
    const salesLink = screen.getByRole("link", { name: "Sales" });
    const reportsLink = screen.getByRole("link", { name: "Reports" });
    expect(importLink).toHaveAttribute("href", "/import");
    expect(awardsLink).toHaveAttribute("href", "/awards");
    expect(releasesLink).toHaveAttribute("href", "/releases");
    expect(salesLink).toHaveAttribute("href", "/sales");
    expect(reportsLink).toHaveAttribute("href", "/reports");
  });

  it("renders title as a link to the dashboard", () => {
    renderWithProvider(<AppHeader />);
    const homeLink = screen.getByRole("link", { name: "ESS Calcs" });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders the currency toggle", () => {
    renderWithProvider(<AppHeader />);
    expect(screen.getByRole("button", { name: "AUD" })).toBeDefined();
    expect(screen.getByRole("button", { name: "USD" })).toBeDefined();
  });
});
