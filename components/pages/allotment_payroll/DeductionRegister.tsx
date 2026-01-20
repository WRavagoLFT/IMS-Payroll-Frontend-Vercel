"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, MoreHorizontal, Loader2, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "../../ui/card";
import { AiOutlinePrinter } from "react-icons/ai";
import { getVesselDeductionRegister } from "@/src/services/payroll/payroll.api";
import type {
  DeductionRegisterCrew,
  DeductionRegisterVessel,
} from "@/src/services/payroll/payroll.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeductionDistributionDialog } from "../../dialogs/DeductionDistributionDialog";
import { useDebounce } from "@/lib/useDebounce";
import { generateDeductionAllotmentV2PDF } from "@/components/PDFs/payrollDeductionRegisterV2PDF";
import { generateDeductionAllotmentExcel } from "@/components/Excels/payrollDeductionRegister";
import { PiReceiptFill } from "react-icons/pi";
import { capitalizeFirstLetter, getMonthName } from "@/lib/utils";
import { otherDeductions, otherDeductionsResponse } from "@/src/services/deduction/crewDeduction.api";
import generateOtherDeductionsReport from "@/components/PDFs/otherDeductionsReportPDF";
import { generateDeductionRegisterV3PDF } from "@/components/PDFs/payrollDeductionRegisterV3PDF";
import generateOtherDeductionsExcel from "@/components/Excels/otherDeductionsReportExcel";
import { generateDeductionRegisterV3Excel } from "@/components/Excels/payrollDeductionRegisterV3Excel";

export default function DeductionRegisterComponent() {
  const searchParams = useSearchParams();
  const vesselId = searchParams.get("vesselId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const forex = searchParams.get("forex");
  const postedParam = searchParams.get("posted");
  const postedValue = postedParam ? parseInt(postedParam) : 0;
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [vessels, setVessels] = useState<DeductionRegisterVessel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [otherDeductionData, setOtherDeductionData] = useState<otherDeductionsResponse | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<DeductionRegisterCrew | null>(null);
  const [isDeductionDialogOpen, setIsDeductionDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAllotmentData = async () => {
      if (!vesselId || !month || !year) return;

      setIsLoading(true);
      try {
        // Fetch vessel deduction register
        const response = await getVesselDeductionRegister(
          vesselId,
          parseInt(month),
          parseInt(year),
          postedValue
        );

        if (response.success && response.data?.Vessels) {
          // Clean CrewName and map vessels
          const cleaned = response.data.Vessels.map((vessel) => ({
            ...vessel,
            Crew: Array.isArray(vessel.Crew)
              ? vessel.Crew.map((crew) => ({
                ...crew,
                CrewName: crew.CrewName
                  ? crew.CrewName.replace(/\bnull\b/g, "").replace(/\s+/g, " ").trim()
                  : "",
              }))
              : [],
          }));

          // Filter only the vessel matching vesselId from search params
          const filteredVessel = cleaned.filter(
            (v) => v.VesselID === parseInt(vesselId)
          );

          setVessels(filteredVessel);
          console.log("Filtered & Cleaned Vessels Data:", filteredVessel);
        } else {
          setVessels([]);
          console.warn("No vessels found in response");
        }

        // Fetch other deductions
        let otherDeductionResponse;
        if (postedValue && postedValue !== 0) {
          otherDeductionResponse = await otherDeductions(
            parseInt(year),
            parseInt(month),
            parseInt(vesselId),
            postedValue
          );
        } else {
          otherDeductionResponse = await otherDeductions(
            parseInt(year),
            parseInt(month),
            parseInt(vesselId)
          );
        }

        if (otherDeductionResponse.success) {
          setOtherDeductionData(otherDeductionResponse); // store full response
        } else {
          console.error("No other deduction data found");
          setOtherDeductionData(null);
        }

      } catch (error) {
        console.error("Error fetching allotment data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllotmentData();
  }, [vesselId, month, year, postedValue]);

  const formatNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const columns: ColumnDef<DeductionRegisterCrew>[] = [
    { accessorKey: "CrewName", header: "Crew Name", cell: ({ row }) => <div className="font-medium">{row.getValue("CrewName")}</div> },
    { accessorKey: "Rank", header: "Rank" },
    {
      accessorKey: "Salary",
      header: "Salary",
      cell: ({ row }) => <div className="text-right">{formatNumber(row.getValue("Salary"))}</div>,
    },
    {
      accessorKey: "Allotment",
      header: "Allotment",
      cell: ({ row }) => <div className="text-right">{formatNumber(row.getValue("Allotment"))}</div>,
    },
    {
      accessorKey: "Gross",
      header: "Gross",
      cell: ({ row }) => <div className="text-right">{formatNumber(row.getValue("Gross"))}</div>,
    },
    {
      accessorKey: "Deduction",
      header: "Deduction",
      cell: ({ row }) => <div className="text-right">{formatNumber(row.getValue("Deduction"))}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const crew = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCrew(crew);
                  setIsDeductionDialogOpen(true);
                }}
              >
                <PiReceiptFill className="mr-2 h-4 w-4" />
                View Deduction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Use first vessel if available
  const vessel = vessels[0];
  const filteredData =
    vessel?.Crew?.filter((item) =>
      item.CrewName?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) || [];

  const handlePrint = () => {
    generateDeductionAllotmentV2PDF(
      { ExchangeRate: 0, Vessels: vessels }, // temp fix for signature match
      Number(month),
      Number(year),
      Number(forex),
      postedValue
    );
  };

  const handlePrintOtherDeductions = () => {
    if (otherDeductionData && otherDeductionData.data) {
      generateOtherDeductionsReport(otherDeductionData, new Date(), vesselId ? "vessel" : "all", postedValue);
    }
  };

  const handlePrintV3 = async () => {
    const response = await getVesselDeductionRegister(vesselId, Number(month), Number(year), postedValue);
    generateDeductionRegisterV3PDF(response, new Date(), vesselId ? "vessel" : "all", postedValue);
  };

  const handleExcelPrint = () => {
    generateDeductionAllotmentExcel(
      {
        ExchangeRate: forex ? Number(forex) : 0,
        Vessels: vessels,
      },
      Number(month),
      Number(year),
      postedValue
    );
  };

  const handlePrintOtherDeductionsExcel = () => {
    if (otherDeductionData && otherDeductionData.data) {
      generateOtherDeductionsExcel(otherDeductionData, new Date(), vesselId ? "vessel" : "all", postedValue);
    }
  };

  const handlePrintV3Excel = async () => {
    const response = await getVesselDeductionRegister(vesselId, Number(month), Number(year), postedValue);
    generateDeductionRegisterV3Excel(response, new Date(), vesselId ? "vessel" : "all", postedValue);
  };

  const monthName = getMonthName(Number(month));

  console.log(selectedCrew);

  return (
    <div className="h-full w-full p-6 pt-5 overflow-hidden">
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center gap-2">
          <Link href={monthName && year ? `/home/allotment?month=${month}&year=${year}` : "/home/allotment"}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold mb-0">
            {monthName && year
              ? `Deduction Register - ${capitalizeFirstLetter(monthName)} ${year}`
              : "Deduction Register"}
          </h1>
        </div>
      </div>

      <Card className="p-6 bg-[#F5F6F7]">
        {vessel && (
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-xl text-gray-500 uppercase">{vessel.VesselCode}</div>
              <h2 className="text-2xl font-semibold">{vessel.VesselName}</h2>
              <Badge
                variant="secondary"
                className="mt-2 px-6 py-0 bg-[#DFEFFE] text-[#292F8C]"
              >
                {vessel.IsActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-lg flex items-center gap-2">
                <Ship className="h-4 w-4" />
                {vessel.VesselType}
              </div>
              <Card className="p-1 bg-[#FDFDFD] mt-2">
                <div className="text-sm text-center">
                  <p className="flex items-center justify-center font-semibold">{vessel.Principal}</p>
                  <div className="text-gray-500 text-xs flex items-center justify-center">
                    Principal Name
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Card>

      {/* Search and Actions */}
      <div className="flex justify-between items-center gap-4 mt-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            placeholder="Search Crew..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-[#EAEBF9]"
          />
        </div>
        <div className="flex gap-4">
          {/* PDF */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 px-4 text-sm" disabled={isLoading}>
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "PDF Print Summary"
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-sm w-72" align="end">
              <DropdownMenuItem onClick={handlePrint}>
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                Export PDF (All)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintOtherDeductions} >
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                Export PDF (Crew Deductions)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintV3}>
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                Export PDF (Gov. Deductions)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* EXCEL */}
        <div className="flex gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 px-4 text-sm" disabled={isLoading}>
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Excel Print Summary"
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-sm w-72" align="end">
              <DropdownMenuItem onClick={handleExcelPrint}>
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                Export Excel (All)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintOtherDeductionsExcel} >
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                Export Excel (Crew Deductions)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintV3Excel}>
                <AiOutlinePrinter className="mr-2 h-4 w-4" />
                Export Excel (Gov. Deductions)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border pb-3">
        <DataTable columns={columns} data={filteredData} pageSize={6} />
      </div>

      {selectedCrew && (
        <DeductionDistributionDialog
          open={isDeductionDialogOpen}
          onOpenChange={setIsDeductionDialogOpen}
          deductions={selectedCrew.Deductions}
          crewName={selectedCrew.CrewName}
        />
      )}
    </div>
  );
}
