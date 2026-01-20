"use client";

import * as XLSX from "xlsx";
import { toast } from "../ui/use-toast";
import { PayslipData } from "@/src/services/payroll/payroll.api";
import { capitalizeFirstLetter, getMonthName } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTimeUTC(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function generatePayrollExcel(
  payslipData: PayslipData,
  postedValue: number,
  currentUser: string = "admin",
  vesselFilter?: number,
): boolean {
  const postedStatus = postedValue === 1 ? "Posted" : "Unposted";

  if (typeof window === "undefined") {
    console.warn("Excel generation attempted during SSR");
    return false;
  }

  if (!payslipData?.vessels?.length) {
    toast({
      title: "Error",
      description: "No payroll data available.",
      variant: "destructive",
    });
    return false;
  }

  try {
    const workbook = XLSX.utils.book_new();
    const periodMonthYear = payslipData.period.formattedPeriod.toUpperCase();
    const exchangeRate = payslipData.period.exchangeRate;
    const vessels = vesselFilter
      ? payslipData.vessels.filter(v => v.vesselId === vesselFilter)
      : payslipData.vessels;

    const noCrewData = vessels.every((v) => !v.payrolls?.length);

    if (noCrewData) {
      toast({
        //title: "Error",
        description: "No crew members found in the selected vessel(s).",
        variant: "default",
      });
      return false;
    }

    vessels.forEach((vessel) => {
      if (!vessel.payrolls?.length) return;

      vessel.payrolls.forEach((crew, index) => {
        const wsData: any[][] = [];

        // Header
        wsData.push(["IMS PHILIPPINES"]);
        wsData.push(["MARITIME CORP."]);
        wsData.push([periodMonthYear]);
        wsData.push([`PAYROLL STATEMENT - ${postedStatus}`]);
        wsData.push([]);
        wsData.push(["CREW"]);
        wsData.push([`${crew.rank} / ${crew.crewName}`]);
        wsData.push(["VESSEL"]);
        wsData.push([vessel.vesselName]);
        wsData.push([]);

        // Payroll Details
        wsData.push(["PAYROLL DETAILS"]);
        wsData.push(["Basic Wage", `$ ${formatCurrency(crew.payrollDetails.basicWage)}`]);
        wsData.push(["Fixed OT", `$ ${formatCurrency(crew.payrollDetails.fixedOT)}`]);
        wsData.push(["Guar. OT", `$ ${formatCurrency(crew.payrollDetails.guaranteedOT)}`]);
        wsData.push(["Dollar Gross", `$ ${formatCurrency(crew.payrollDetails.dollarGross)}`]);
        wsData.push(["Peso Gross", `₱ ${formatCurrency(crew.payrollDetails.pesoGross)}`]);
        wsData.push(["Total Deduction", `₱ ${formatCurrency(crew.payrollDetails.totalDeduction)}`]);
        wsData.push(["NET WAGE :", `₱ ${formatCurrency(crew.payrollDetails.netWage)}`]);
        wsData.push([]);

        // Allotment Deductions
        wsData.push(["ALLOTMENT DEDUCTIONS", "CURRENCY", "AMOUNT", "FOREX", "PESO"]);

        if (crew.allotmentDeductions?.length) {
          crew.allotmentDeductions.forEach((d) => {
            wsData.push([
              d.name,
              d.currency,
              formatCurrency(d.amount),
              d.forex
                ? `PHP ${formatCurrency(d.forex)}`
                : `PHP ${formatCurrency(exchangeRate)}`,
              formatCurrency(d.dollar),
            ]);
          });
        } else {
          wsData.push(["No deductions found"]);
        }

        wsData.push([]);
        wsData.push(["Total :", "", "", "", `₱ ${formatCurrency(crew.payrollDetails.totalDeduction)}`]);
        wsData.push([]);

        // Allottee Distribution
        wsData.push(["ALLOTTEE DISTRIBUTION", "NET ALLOTMENT"]);

        if (crew.allotteeDistribution?.length) {
          crew.allotteeDistribution.forEach((a) => {
            const pesoAmount = a.currency === 1
              ? a.amount * exchangeRate
              : a.amount;
            wsData.push([a.name, `₱ ${formatCurrency(pesoAmount)}`]);
          });
        } else {
          wsData.push(["No allottee distribution found"]);
        }

        wsData.push([]);
        wsData.push([
          `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formatDateTimeUTC(new Date())}`,
        ]);
        wsData.push([`Current User's Login: ${currentUser}`]);
        wsData.push(["(This is a system generated document and does not require signature)"]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto column width (general)
        const colWidths = wsData[0].map((_, colIndex: number) => {
          // Default auto width
          const maxLength = wsData.reduce((max, row) => {
            const val = row[colIndex] ? row[colIndex].toString() : "";
            return Math.max(max, val.length + 5);
          }, 10);

          // Force much wider columns for: CURRENCY, AMOUNT, FOREX, PESO
          if (colIndex === 1) return { wch: 30 }; // CURRENCY
          if (colIndex === 2) return { wch: 25 }; // AMOUNT
          if (colIndex === 3) return { wch: 25 }; // FOREX
          if (colIndex === 4) return { wch: 25 }; // PESO

          return { wch: maxLength };
        });

        ws["!cols"] = colWidths;

        const safeCrewName = crew.crewName.slice(0, 25).replace(/[^a-z0-9]/gi, "_").toLowerCase();
        //const sheetName = {safeCrewName};
        XLSX.utils.book_append_sheet(workbook, ws, safeCrewName);
      });
    });

    //const fileName = `payroll-crewwise-${payslipData.period.formattedPeriod.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.xlsx`;
    let fileName = ""
    if (payslipData.vessels.length === 1) {
        fileName = `Payroll_${capitalizeFirstLetter(payslipData.vessels[0].vesselName.replace(' ', '-'))}_${capitalizeFirstLetter(getMonthName(payslipData.period.month))}-${payslipData.period.year}- ${postedStatus}.xlsx`
    } else {
        fileName = `Payroll_ALL_${capitalizeFirstLetter(getMonthName(payslipData.period.month))}-${payslipData.period.year}- ${postedStatus}.xlsx`;
    }
    XLSX.writeFile(workbook, fileName);
    return true;
  } catch (error) {
    console.error("Error generating Excel file:", error);
    toast({
      title: "Error",
      description: "Failed to generate Excel. Please try again.",
      variant: "destructive",
    });
    return false;
  }
}
