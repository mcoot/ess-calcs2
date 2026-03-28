import { test, expect } from "@playwright/test";
import { importAllSampleData } from "./fixtures/import-helper";

test.describe("Reports", () => {
  test.beforeEach(async ({ page }) => {
    await importAllSampleData(page);
    await page.goto("/reports");
  });

  test("FY selector populates with available years", async ({ page }) => {
    // FY buttons should appear (e.g. "2019-20", "2020-21", etc.)
    await expect(page.getByRole("button", { name: /\d{4}-\d{2}/ }).first()).toBeVisible();
  });

  test("ESS income and CGT tables render", async ({ page }) => {
    await expect(page.getByText("Item 12, Label F")).toBeVisible();
    await expect(page.getByText("Item 18, Labels H+A")).toBeVisible();
  });

  test("clicking a row expands the drill-down", async ({ page }) => {
    // Click the first data row in the ESS income table
    const essTable = page.locator("table").first();
    const firstDataRow = essTable.locator("tbody tr").first();
    await firstDataRow.click();

    // Drill-down should show calculation details
    await expect(page.getByText(/Exchange rate:/)).toBeVisible();
  });
});
