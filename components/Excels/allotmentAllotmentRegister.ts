import { capitalizeFirstLetter, getMonthName } from "@/lib/utils";
import * as XLSX from "xlsx";

export interface Allottee {
  AllotteeName: string;
  AccountNumber: string;
  Bank: string;
  NetAllotment: number;
  Currency: number;
}

export interface AllotmentRegisterCrew {
  CrewID: number;
  CrewName: string;
  Rank: string;
  BasicWage: string;
  FixedOT: string;
  GuarOT: string;
  DollarGross: string;
  PesoGross: number;
  TotalDeduction: number;
  Net: number;
  Allottee: Allottee[];
}

export interface AllotmentRegisterData {
  VesselID: number;
  VesselName: string;
  ExchangeRate: number;
  Crew: AllotmentRegisterCrew[];
}

function calculateVesselTotals(vessel: AllotmentRegisterData) {
  let totalDollarGross = 0;
  let totalPesoGross = 0;
  let totalDeduction = 0;
  let totalNet = 0;

  vessel.Crew.forEach(crew => {
    totalDollarGross += Number(crew.DollarGross) || 0;
    totalPesoGross += Number(crew.PesoGross) || 0;
    totalDeduction += Number(crew.TotalDeduction) || 0;
    totalNet += Number(crew.Net) || 0;
  });

  return {
    //totalDollarGross,
    totalPesoGross,
    totalDeduction,
    totalNet
  };
}

export function generateAllotmentExcel(
  allotmentData: AllotmentRegisterData[],
  month: string,
  year: number,
  globalExchangeRate: number,
  postedValue: number
): void {
  const postedStatus = postedValue === 1 ? "Posted" : "Unposted";

  if (!allotmentData?.length) {
    console.warn("No allotment data available");
    return;
  }

  const wb = XLSX.utils.book_new();

  allotmentData.forEach((vessel, vIndex) => {
    const wsData: any[][] = [];

    const now = new Date();
    const formattedDate = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${String(now.getFullYear()).slice(2)} ${now.toLocaleTimeString("en-US", { hour12: false })}`;

    // Headers
    wsData.push(["IMS PHILIPPINES"]);
    wsData.push(["MARITIME CORP."]);
    wsData.push([`${month.toUpperCase()} ${year}`]);
    wsData.push([`ALLOTMENT PAYROLL REGISTER - ${postedStatus}`]);
    wsData.push(["VESSEL"]);
    wsData.push([`${vessel.VesselName} EXCHANGE RATE: USD 1.00 = PHP ${vessel.ExchangeRate}`]);
    wsData.push([formattedDate]);
    wsData.push([]); // Spacer

    // Table Header
    wsData.push([
      "CREW NAME",
      "RANK",
      "BASIC WAGE",
      "FIXED OT",
      "GUAR OT",
      "DOLLAR GROSS",
      "PESO GROSS",
      "TOTAL DED.",
      "NET",
      "ALLOTTEE NAME",
      "ACCOUNT NUMBER",
      "BANK",
      "ALLOTMENT"
    ]);

    vessel.Crew.forEach((crew) => {
      const formatNumber = (value: number | string) => {
        const num = Number(value);
        return !isNaN(num)
          ? num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "";
      };

      const baseRow = [
        crew.CrewName,
        crew.Rank,
        formatNumber(crew.BasicWage),
        formatNumber(crew.FixedOT),
        formatNumber(crew.GuarOT),
        formatNumber(crew.DollarGross),
        formatNumber(crew.PesoGross),
        formatNumber(crew.TotalDeduction),
        formatNumber(crew.Net),
      ];

      if (crew.Allottee?.length) {
        crew.Allottee.forEach((allottee, index) => {
          const netAllotment =
            allottee.Currency === 1
              ? allottee.NetAllotment
              : allottee.NetAllotment;
          const row =
            index === 0
              ? [
                ...baseRow,
                allottee.AllotteeName,
                allottee.AccountNumber,
                allottee.Bank,
                formatNumber(allottee.NetAllotment),
                //formatNumber(netAllotment.toFixed(2)), 
              ]
              : new Array(9).fill("").concat([
                allottee.AllotteeName,
                allottee.AccountNumber,
                allottee.Bank,
                formatNumber(allottee.NetAllotment),
                //formatNumber(netAllotment.toFixed(2)),
              ]);
          wsData.push(row);
        });
      } else {
        wsData.push([...baseRow, "", "", "", "", ""]);
      }
    });

    // Add totals row
    const totals = calculateVesselTotals(vessel);
    wsData.push([]); // Spacer before totals
    wsData.push([
      "TOTALS", "", "", "", "", "",
      // Uncomment and format Dollar Gross if you want it later
      //totals.totalDollarGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totals.totalPesoGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totals.totalDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totals.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      "", "", "", "", "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto width calculation
    const colWidths = wsData[0].map((_, colIndex: number) => {
      const maxLength = wsData.reduce((max, row) => {
        const val = row[colIndex] ? row[colIndex].toString() : "";
        return Math.max(max, val.length + 2);
      }, 10);
      return { wch: maxLength };
    });

    colWidths[1] = { wch: 20 };
    colWidths[2] = { wch: 12 };
    colWidths[3] = { wch: 12 };
    colWidths[4] = { wch: 14 };
    colWidths[5] = { wch: 14 };
    colWidths[6] = { wch: 14 };
    colWidths[7] = { wch: 14 };
    colWidths[8] = { wch: 14 };
    colWidths[9] = { wch: 30 };
    colWidths[10] = { wch: 25 };
    colWidths[11] = { wch: 22 };
    colWidths[12] = { wch: 20 };

    ws["!cols"] = colWidths;

    const sheetName = `${vessel.VesselName.slice(0, 25)}-${vIndex + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fileName = allotmentData.length > 1
    ? `Allotment_ALL_${capitalizeFirstLetter(month)}-${year} - ${postedStatus}.xlsx`
    : `Allotment_${capitalizeFirstLetter(allotmentData[0].VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(month)}-${year} - ${postedStatus}.xlsx`;
  XLSX.writeFile(wb, fileName);
}