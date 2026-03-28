import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FySelector } from "./fy-selector";

describe("FySelector", () => {
  it("renders 'All' button plus one per FY", () => {
    render(
      <FySelector
        availableFys={["2021-22", "2022-23"]}
        selectedFy="all"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "All" })).toBeDefined();
    expect(screen.getByRole("button", { name: "2021-22" })).toBeDefined();
    expect(screen.getByRole("button", { name: "2022-23" })).toBeDefined();
  });

  it("renders only 'All' when no FYs available", () => {
    render(
      <FySelector availableFys={[]} selectedFy="all" onSelect={() => {}} />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("All");
  });

  it("calls onSelect with FY value when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <FySelector
        availableFys={["2021-22", "2022-23"]}
        selectedFy="all"
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "2022-23" }));

    expect(onSelect).toHaveBeenCalledWith("2022-23");
  });

  it("calls onSelect with 'all' when All button clicked", async () => {
    const onSelect = vi.fn();
    render(
      <FySelector
        availableFys={["2021-22"]}
        selectedFy="2021-22"
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "All" }));

    expect(onSelect).toHaveBeenCalledWith("all");
  });
});
