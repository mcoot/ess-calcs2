import type { VestingScheduleEntry } from "@/types";
import type { ParseResult } from "./award-summary.parser";

/**
 * Parse a Schwab Vesting Schedule CSV export into VestingScheduleEntry records.
 */
export function parseVestingSchedule(_csv: string): ParseResult<VestingScheduleEntry> {
  throw new Error("not implemented");
}
