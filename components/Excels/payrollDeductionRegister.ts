"use client";

import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { Deductions } from "../PDFs/allotmentDeductionRegister";
import { capitalizeFirstLetter } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

export interface DeductionRegisterCrew {
  CrewID: number;
  CrewName: string;
  Rank: string;
  Salary: number;
  Allotment: number;
  Gross: number;
  Deduction: number;
  Deductions: Deductions[];
}

export interface DeductionRegisterVessel {
  VesselID: number;
  VesselName: string;
  VesselCode: string;
  VesselType: string;
  Principal: string;
  IsActive: number;
  Crew: DeductionRegisterCrew[];
}

export interface DeductionRegisterData {
  ExchangeRate: number;
  Vessels: DeductionRegisterVessel[];
}

function getMonthName(monthNum: number): string {
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  return months[monthNum - 1];
}

function formatNumber(amount: number | string): string {
  const num = Number(amount);
  return !isNaN(num)
    ? num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
}

export function generateDeductionAllotmentExcel(
  deductionData: DeductionRegisterData,
  month: number,
  year: number,
  postedValue: number
): void {
  const postedStatus = postedValue === 1 ? "Posted" : "Unposted";
  // Basic validation
  if (
    !deductionData ||
    !deductionData.Vessels ||
    deductionData.Vessels.length === 0
  ) {
    toast({
      title: "No Data Found",
      description:
        "No vessels or crew data available for the selected period.",
      variant: "destructive",
    });
    return;
  }

  // Check if all deduction amounts are zero
  const hasNonZeroDeductions = deductionData.Vessels.some((v) =>
    v.Crew.some((c) =>
      c.Deductions?.some((d) => Number(d.Amount) > 0)
    )
  );

  if (!hasNonZeroDeductions) {
    toast({
      title: "No Deductions Found",
      description: "All deduction amounts are zero.",
      variant: "destructive",
    });
    return;
  }

  try {
    const workbook = XLSX.utils.book_new();
    const monthName = getMonthName(month);
    const exchangeRate = deductionData.ExchangeRate;

    deductionData.Vessels.forEach((vessel, vesselIndex) => {
      const wsData: (string | number)[][] = [];

      // --- HEADER ---
      wsData.push(["IMS PHILIPPINES"]);
      wsData.push(["MARITIME CORP."]);
      wsData.push([`${monthName} ${year}`]);
      wsData.push([`ALLOTMENT DEDUCTION REGISTER - ${postedStatus}`]);
      wsData.push(["VESSEL"]);
      wsData.push([
        `${vessel.VesselName} EXCHANGE RATE: USD 1.00 = PHP ${formatNumber(
          exchangeRate
        )}`,
      ]);
      wsData.push([dayjs().format("MM/DD/YY HH:mm")]);
      wsData.push([]);

      // --- TABLE HEADER ---
      wsData.push([
        "CREW NAME",
        "RANK",
        "SALARY",
        "GROSS",
        "DEDUCTION NAME",
        "CURRENCY",
        "AMOUNT",
        "PHP EQUIVALENT",
      ]);

      // --- TABLE CONTENT ---
      vessel.Crew.forEach((crew) => {
        const hasDeductions = crew.Deductions?.length > 0;

        if (hasDeductions) {
          crew.Deductions.forEach((deduction, idx) => {
            const isUSD = deduction.Currency === 1;
            const amount = Number(deduction.Amount) || 0;
            const forexRate = deduction.ExchangeRate ?? exchangeRate;
            const phpEquivalent = isUSD ? amount * forexRate : amount;

            wsData.push([
              idx === 0 ? crew.CrewName : "",
              idx === 0 ? crew.Rank : "",
              idx === 0 ? formatNumber(crew.Salary) : "",
              idx === 0 ? formatNumber(crew.Gross) : "",
              deduction.Name,
              isUSD ? "USD" : "PHP",
              formatNumber(amount),
              formatNumber(phpEquivalent),
            ]);
          });
        } else {
          wsData.push([
            crew.CrewName,
            crew.Rank,
            formatNumber(crew.Salary),
            formatNumber(crew.Gross),
            "No Deduction",
            "-",
            "-",
            "-",
          ]);
        }
      });

      wsData.push([]);
      wsData.push([
        `Page ${vesselIndex + 1} out of ${deductionData.Vessels.length}`,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // --- Auto-width ---
      const colWidths = wsData[0].map((_, colIndex: number) => {
        const maxLength = wsData.reduce((max, row) => {
          const val = row[colIndex] ? row[colIndex].toString() : "";
          return Math.max(max, val.length + 2);
        }, 10);
        return { wch: maxLength };
      });

      colWidths[0] = { wch: 30 }; // Crew Name
      colWidths[4] = { wch: 28 }; // Deduction Name
      colWidths[6] = { wch: 15 }; // Amount
      colWidths[7] = { wch: 18 }; // PHP Equivalent

      ws["!cols"] = colWidths;

      const sheetName =
        vessel.VesselName.length > 31
          ? vessel.VesselName.slice(0, 28) + "..."
          : vessel.VesselName;

      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    // --- SAVE FILE ---
    const fileName =
      deductionData.Vessels.length > 1
        ? `Deduction_ALL_${capitalizeFirstLetter(monthName)}-${year} - ${postedStatus}.xlsx`
        : `Deduction_${capitalizeFirstLetter(
            deductionData.Vessels[0].VesselName.replace(" ", "-")
          )}_${capitalizeFirstLetter(monthName)}-${year} - ${postedStatus}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Excel Generated Successfully",
      description: `Allotment deduction register exported for ${capitalizeFirstLetter(
        monthName
      )} ${year}.`,
      variant: "default",
    });
  } catch (error) {
    console.error("Error generating Allotment Deduction Excel:", error);
    toast({
      title: "Excel Generation Failed",
      description:
        "Something went wrong while generating the allotment deduction register.",
      variant: "destructive",
    });
  }
}
