import { test, expect } from "@playwright/test";
import { importAllSampleData } from "./fixtures/import-helper";

test("all pages are accessible and render headings", async ({ page }) => {
  await importAllSampleData(page);

  const pages = [
    { path: "/", heading: /ESS Calcs|Dashboard/ },
    { path: "/import", heading: "Import Data" },
    { path: "/awards", heading: /Awards/ },
    { path: "/releases", heading: /Releases/ },
    { path: "/sales", heading: /Sales/ },
    { path: "/reports", heading: /Tax Reports/ },
  ];

  for (const { path, heading } of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});
