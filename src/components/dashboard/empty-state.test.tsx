import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders import prompt for no-data type", () => {
    render(<EmptyState type="no-data" />);

    expect(screen.getByText(/no data imported/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /import/i })).toBeDefined();
  });

  it("renders FY message for no-fy-data type", () => {
    render(<EmptyState type="no-fy-data" fyLabel="2022-23" />);

    expect(screen.getByText(/no events in 2022-23/i)).toBeDefined();
  });

  it("renders sales import prompt for no-sales type", () => {
    render(<EmptyState type="no-sales" />);

    expect(screen.getByText(/no sales data/i)).toBeDefined();
  });
});
