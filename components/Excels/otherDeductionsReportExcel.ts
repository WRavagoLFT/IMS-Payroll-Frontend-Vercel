"use client";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { capitalizeFirstLetter, formatCurrency, getMonthName } from "@/lib/utils";
import { toast } from "../ui/use-toast";
import { otherDeductionsCrew, otherDeductionsData } from "@/src/services/deduction/crewDeduction.api";

export interface OtherDeductionsResponse {
  success: boolean;
  message: string;
  data: otherDeductionsData;
}

// Extract month and year from message (e.g., "3/2025")
function extractPeriod(message: string): { month: string; year: number } {
  const regex = /(\d+)\/(\d+)/;
  const match = message.match(regex);
  if (match && match.length >= 3) {
    const monthNum = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    return { month: getMonthName(monthNum), year };
  }
  return { month: "FEBRUARY", year: 2025 }; // default fallback
}

// Calculate totals
function calculateTotals(crew: otherDeductionsCrew[]): {
  cashAdvTotal: number;
  deductionTotal: number;
} {
  let cashAdvTotal = 0;
  let deductionTotal = 0;

  crew.forEach((crewMember) => {
    let amount = crewMember.Currency === 2 ? crewMember.OriginalAmount : crewMember.DeductionAmount;

    if (crewMember.DeductionName.toLowerCase().includes("cash advance")) {
      cashAdvTotal += amount;
    } else {
      deductionTotal += amount;
    }
  });

  return { cashAdvTotal, deductionTotal };
}

export function generateOtherDeductionsExcel(
  data: OtherDeductionsResponse,
  dateGenerated: Date,
  mode: "all" | "vessel" = "vessel",
  postedValue: number
): boolean {
  const postedStatus = postedValue === 1 ? "Posted" : "Unposted";
  
  if (typeof window === "undefined") {
    console.warn("Excel generation attempted during server-side rendering");
    return false;
  }

  if (!data.success || !data.data || data.data.Crew.length === 0) {
    toast({
      title: "Error",
      description: "Invalid or empty data for date.",
      variant: "destructive",
    });
    return false;
  }

  try {
    const period = extractPeriod(data.message);
    const vesselName = data.data.VesselName || "ALL VESSELS";

    // Prepare sheet data
    const sheetData: any[][] = [];

    // Header info
    sheetData.push([
      "IMS Philippines Maritime Corp.",
      "",
      "",
      "",
      `Crew Deductions Report - ${postedStatus}`,
      `${period.month} ${period.year}`,
    ]);
    sheetData.push([]);
    sheetData.push([`Vessel: ${vesselName}`]);
    sheetData.push([
      "Crew Name",
      "Vessel Name",
      "Cash Adv. Amount",
      "Cash Adv. Remarks",
      "Deduction Name",
      "Deduction Amount",
      "Deduction Remarks",
    ]);

    const exchangeRate = data.data.ExchangeRate;

    data.data.Crew.forEach((crew) => {
      const crewName = `${crew.LastName}, ${crew.FirstName} ${
        crew.MiddleName ? crew.MiddleName[0] + "." : ""
      }`;

      let cashAdvAmount = "";
      let cashAdvRemarks = "";
      let deductionName = "";
      let deductionAmount = "";
      let deductionRemarks = "";

      // Convert value
      let value = crew.Currency === 2 
        ? crew.OriginalAmount 
        : crew.DeductionAmount;

      if (crew.Currency === 1 && exchangeRate) {
        value = value / exchangeRate; // Convert PHP → USD
      }

      const formattedValue = `$${formatCurrency(value)}`;

      if (crew.DeductionName.toLowerCase().includes("cash advance")) {
        cashAdvAmount = formattedValue;
        cashAdvRemarks = crew.DeductionRemarks || "";
      } else {
        deductionName = crew.DeductionName;
        deductionAmount = formattedValue;
        deductionRemarks = crew.DeductionRemarks || "";
      }

      sheetData.push([
        crewName,
        crew.VesselName,
        cashAdvAmount,
        cashAdvRemarks,
        deductionName,
        deductionAmount,
        deductionRemarks,
      ]);
    });

    // Adjust totals to use converted values
    function calculateTotals(crewList: any[]) {
      let cashAdvTotal = 0;
      let deductionTotal = 0;

      crewList.forEach((crew) => {
        let value = crew.Currency === 2 
          ? crew.OriginalAmount 
          : crew.DeductionAmount;

        if (crew.Currency === 1 && exchangeRate) {
          value = value / exchangeRate; // Convert PHP → USD
        }

        if (crew.DeductionName.toLowerCase().includes("cash advance")) {
          cashAdvTotal += value;
        } else {
          deductionTotal += value;
        }
      });

      return { cashAdvTotal, deductionTotal };
    }

    // Push totals row
    const totals = calculateTotals(data.data.Crew);
    sheetData.push([]);
    sheetData.push([
      "TOTALS",
      "",
      totals.cashAdvTotal > 0 ? `$${formatCurrency(totals.cashAdvTotal)}` : "",
      "",
      "",
      totals.deductionTotal > 0 ? `$${formatCurrency(totals.deductionTotal)}` : "",
      "",
    ]);

    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto width for columns
    const colWidths = sheetData[3].map((_, colIndex) => {
      const maxLength = sheetData.reduce((max, row) => {
        const cell = row[colIndex] ? row[colIndex].toString() : "";
        return Math.max(max, cell.length);
      }, 10);
      return { wch: maxLength + 2 };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Crew Deductions");

    const fileName =
      mode === "vessel"
        ? `CrewDeductions_${capitalizeFirstLetter(
            vesselName.replace(" ", "-")
          )}_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.xlsx`
        : `CrewDeductions_ALL_${capitalizeFirstLetter(
            period.month
          )}-${period.year} - ${postedStatus}.xlsx`;

    XLSX.writeFile(wb, fileName);

    return true;
  } catch (error) {
    console.error("Error generating Crew Deductions Excel:", error);
    return false;
  }
}

export default generateOtherDeductionsExcel;
