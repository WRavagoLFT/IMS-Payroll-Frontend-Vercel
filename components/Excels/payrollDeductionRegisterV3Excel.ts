"use client";

import * as XLSX from "xlsx";
import { capitalizeFirstLetter, getMonthName } from "@/lib/utils";
import { DeductionRegisterResponse } from "@/src/services/payroll/payroll.api";
import { toast } from "../ui/use-toast";

// --- Helper functions ---
function extractPeriod(message: string): { month: string; year: number } {
  const regex = /(\d+)\/(\d+)/;
  const match = message.match(regex);
  if (match && match.length >= 3) {
    const monthNum = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    return {
      month: getMonthName(monthNum),
      year,
    };
  }
  return { month: "FEBRUARY", year: 2025 };
}

function formatNumber(amount: number | string): string {
  const num = Number(amount);
  return !isNaN(num)
    ? num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
}

// --- MAIN FUNCTION ---
export function generateDeductionRegisterV3Excel(
  data: DeductionRegisterResponse,
  dateGenerated: Date,
  mode: "all" | "vessel" = "vessel",
  postedValue: number
): boolean {
  const postedStatus = postedValue === 1 ? "Posted" : "Unposted";

  if (
    !data?.success ||
    !data?.data?.Vessels ||
    data.data.Vessels.length === 0
  ) {
    toast({
      title: "No Data Found",
      description:
        "No vessels or crew data available for the selected period.",
      variant: "destructive",
    });
    return false;
  }

  try {
    const register = data.data;
    const vesselData = register.Vessels;
    const exchangeRate = register.ExchangeRate;
    const period = extractPeriod(data.message);

    // Skip Excel generation if all amounts are zero
    const hasNonZeroData = vesselData.some(vessel =>
      vessel.Crew.some(crew =>
        crew.Deductions.some(d => Number(d.Amount) > 0)
      )
    );

    if (!hasNonZeroData) {
      toast({
        title: "No Deductions Found",
        description:
          "All deduction amounts are zero.",
        variant: "destructive",
      });
      return false;
    }

    const wb = XLSX.utils.book_new();

    // --- HEADER ---
    const headerRows: any[][] = [
      ["IMS PHILIPPINES"],
      ["MARITIME CORP."],
      [`${capitalizeFirstLetter(period.month)} ${period.year}`],
      [`GOVERNMENT DEDUCTION REGISTER - ${postedStatus}`],
      [mode === "vessel" ? "VESSEL" : "ALL VESSELS"],
      [`ALL VESSELS EXCHANGE RATE: 1 USD = PHP ${formatNumber(exchangeRate)}`],
      [dateGenerated.toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })],
      [],
    ];

    const getColumnWidths = (rows: any[][]) =>
      rows[0].map((_: any, colIndex: number) => {
        const maxLength = rows.reduce((max, row) => {
          const val = row[colIndex] ? row[colIndex].toString() : "";
          return Math.max(max, val.length + 2);
        }, 10);
        return { wch: maxLength };
      });

    // --- SUMMARY SHEET ---
    if (mode === "all") {
      const summaryRows: any[] = [["VESSEL NAME", "SSS", "HDMF", "PHILHEALTH", "PROVIDENT"]];
      let grandTotalSSS = 0;
      let grandTotalHDMF = 0;
      let grandTotalPhilhealth = 0;
      let grandTotalProvident = 0;

      vesselData.forEach((vessel) => {
        let totalSSS = 0, totalHDMF = 0, totalPhilhealth = 0, totalProvident = 0;

        vessel.Crew.forEach((crew) => {
          const sss = crew.Deductions.find((d) => d.Name.toLowerCase() === "sss premium")?.Amount || 0;
          const hdmf = crew.Deductions.find((d) => d.Name.toLowerCase().includes("pag-ibig"))?.Amount || 0;
          const philhealth = crew.Deductions.find((d) => d.Name.toLowerCase().includes("philhealth"))?.Amount || 0;
          const provident = crew.Deductions.find((d) => d.Name.toLowerCase().includes("provident"))?.Amount || 0;

          totalSSS += sss;
          totalHDMF += hdmf;
          totalPhilhealth += philhealth;
          totalProvident += provident;
        });

        grandTotalSSS += totalSSS;
        grandTotalHDMF += totalHDMF;
        grandTotalPhilhealth += totalPhilhealth;
        grandTotalProvident += totalProvident;

        summaryRows.push([
          vessel.VesselName,
          totalSSS,
          totalHDMF,
          totalPhilhealth,
          totalProvident,
        ]);
      });

      summaryRows.push([
        "GRAND TOTAL",
        grandTotalSSS,
        grandTotalHDMF,
        grandTotalPhilhealth,
        grandTotalProvident,
      ]);

      const wsSummary = XLSX.utils.aoa_to_sheet([...headerRows, ...summaryRows]);
      wsSummary["!cols"] = getColumnWidths([...headerRows, ...summaryRows]);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    }

    // --- DETAIL SHEETS ---
    vesselData.forEach((vessel) => {
      const rows: any[] = [["CREW NAME", "SSS", "HDMF", "PHILHEALTH", "PROVIDENT"]];
      let totalSSS = 0, totalHDMF = 0, totalPhilhealth = 0, totalProvident = 0;

      vessel.Crew.forEach((crew) => {
        const sss = crew.Deductions.find((d) => d.Name.toLowerCase() === "sss premium")?.Amount || 0;
        const hdmf = crew.Deductions.find((d) => d.Name.toLowerCase().includes("pag-ibig"))?.Amount || 0;
        const philhealth = crew.Deductions.find((d) => d.Name.toLowerCase().includes("philhealth"))?.Amount || 0;
        const provident = crew.Deductions.find((d) => d.Name.toLowerCase().includes("provident"))?.Amount || 0;

        totalSSS += sss;
        totalHDMF += hdmf;
        totalPhilhealth += philhealth;
        totalProvident += provident;

        rows.push([crew.CrewName, sss, hdmf, philhealth, provident]);
      });

      rows.push(["TOTAL", totalSSS, totalHDMF, totalPhilhealth, totalProvident]);

      const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...rows]);
      ws["!cols"] = getColumnWidths([...headerRows, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, vessel.VesselName.substring(0, 31));
    });

    // --- SAVE FILE ---
    const fileName =
      mode === "vessel"
        ? `GovDeductionRegister_${capitalizeFirstLetter(
          vesselData[0].VesselName.replace(" ", "-")
        )}_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.xlsx`
        : `GovDeductionRegister_ALL_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.xlsx`;

    XLSX.writeFile(wb, fileName);
    return true;
  } catch (error) {
    console.error("Error generating Gov Deduction Register Excel:", error);
    return false;
  }
}

export default generateDeductionRegisterV3Excel;
