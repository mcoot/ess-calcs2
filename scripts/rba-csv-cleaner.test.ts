import { describe, it, expect } from "vitest";
import { cleanRbaCsv } from "./rba-csv-cleaner";

function makeRawCsv(dataRows: string[]): string {
  const headers = [
    "F11.1  EXCHANGE RATES ,,,,,,,,,,,,,,,,,,,,,,,",
    "Title,A$1=USD,Trade-weighted Index,A$1=CNY,A$1=JPY,A$1=EUR,A$1=KRW,A$1=GBP,A$1=SGD,A$1=INR,A$1=THB,A$1=NZD,A$1=TWD,A$1=MYR,A$1=IDR,A$1=VND,A$1=AED,A$1=PGK,A$1=HKD,A$1=CAD,A$1=ZAR,A$1=CHF,A$1=PHP,A$1=SDR",
    "Description,AUD/USD Exchange Rate,,,,,,,,,,,,,,,,,,,,,,",
    "Frequency,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily,Daily",
    "Type,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative,Indicative",
    "Units,USD,Index,CNY,JPY,EUR,KRW,GBP,SGD,INR,THB,NZD,TWD,MYR,IDR,VND,AED,PGK,HKD,CAD,ZAR,CHF,PHP,SDR",
    ",,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,",
    "Source,WM/Reuters,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,RBA,IMF",
    "Publication date,15-Mar-2023,,,,,,,,,,,,,,,,,,,,,,",
    "Series ID,FXRUSD,FXRTWI,FXRCR,,,,,,,,,,,,,,,,,,,",
  ];
  return [...headers, ...dataRows].join("\n");
}

function makeDataRow(date: string, usdRate: string): string {
  return `${date},${usdRate},65.10,5.09,88.33,0.65,831.98,0.58,1.04,49.92,25.47,1.10,23.19,3.16,10614,17798,2.88,2.53,6.13,0.98,,0.76,,0.55`;
}

describe("cleanRbaCsv", () => {
  it("strips header rows and extracts only date + USD rate", () => {
    const input = makeRawCsv([
      makeDataRow("02-Jan-2018", "0.7837"),
      makeDataRow("03-Jan-2018", "0.7816"),
    ]);

    const result = cleanRbaCsv([input]);
    const lines = result.split("\n").filter((l) => l !== "");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("02-Jan-2018,0.7837");
    expect(lines[1]).toBe("03-Jan-2018,0.7816");
  });

  it("merges multiple inputs sorted by date", () => {
    const csv1 = makeRawCsv([makeDataRow("10-Jan-2023", "0.6900")]);
    const csv2 = makeRawCsv([makeDataRow("02-Jan-2018", "0.7837")]);

    const result = cleanRbaCsv([csv1, csv2]);
    const lines = result.split("\n").filter((l) => l !== "");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("02-Jan-2018,0.7837");
    expect(lines[1]).toBe("10-Jan-2023,0.6900");
  });

  it("deduplicates overlapping dates (last-wins)", () => {
    const csv1 = makeRawCsv([makeDataRow("03-Jan-2023", "0.5000")]);
    const csv2 = makeRawCsv([makeDataRow("03-Jan-2023", "0.6828")]);

    const result = cleanRbaCsv([csv1, csv2]);
    const lines = result.split("\n").filter((l) => l !== "");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("03-Jan-2023,0.6828");
  });

  it("handles empty/blank lines in data section", () => {
    const input = makeRawCsv([
      makeDataRow("02-Jan-2018", "0.7837"),
      "",
      "   ",
      makeDataRow("03-Jan-2018", "0.7816"),
    ]);

    const result = cleanRbaCsv([input]);
    const lines = result.split("\n").filter((l) => l !== "");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("02-Jan-2018,0.7837");
    expect(lines[1]).toBe("03-Jan-2018,0.7816");
  });

  it("throws on missing rate column", () => {
    const input = makeRawCsv(["02-Jan-2018"]);

    expect(() => cleanRbaCsv([input])).toThrow(/missing.*rate/i);
  });
});
