"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, MoreHorizontal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "../../ui/card";
import { AiOutlinePrinter } from "react-icons/ai";
import {
  AllotmentRegisterCrew,
  AllotmentRegisterData,
  getVesselAllotmentRegister,
} from "@/src/services/payroll/payroll.api";
import { Ship } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AllotteeDistributionDialog } from "../../dialogs/AllotteeDistributionDialog";
import { useDebounce } from "@/lib/useDebounce";
import { generateAllotmentPDF } from "@/components/PDFs/payrollAllotmentRegisterPDF";
import { PiUserListFill } from "react-icons/pi";
import { generateAllotmentExcel } from "@/components/Excels/allotmentAllotmentRegister";
import { capitalizeFirstLetter, getMonthName } from "@/lib/utils";

export default function AllotmentRegisterComponent() {
  const searchParams = useSearchParams();
  const vesselId = searchParams.get("vesselId");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const postedParam = searchParams.get("posted");
  const postedValue = postedParam ? parseInt(postedParam) : 0;
  const [allotmentData, setAllotmentData] = useState<AllotmentRegisterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrew, setSelectedCrew] = useState<AllotmentRegisterCrew | null>(null);
  const [isAllotteeDialogOpen, setIsAllotteeDialogOpen] = useState(false);

  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const forexRate = searchParams.get("forex") || "0";

  useEffect(() => {
    const fetchAllotmentData = async () => {
      if (!vesselId) return;

      setIsLoading(true);
      try {
        const response = await getVesselAllotmentRegister(
          vesselId,
          Number(searchParams.get("month")),
          Number(searchParams.get("year")),
          postedValue
        );

        if (response.success && Array.isArray(response.data)) {
          setAllotmentData(response.data);
        } else {
          console.error("Unexpected API response format:", response);
          setAllotmentData([]);
        }
      } catch (error) {
        console.error("Error fetching allotment data:", error);
        setAllotmentData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllotmentData();
  }, [vesselId, searchParams, postedValue]); // also add postedValue to dependency array

  // Format numbers to two decimal places with null checking
  const formatNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0.00";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(numValue) ? "0.00" : numValue?.toFixed(2);
  };

  const monthName = getMonthName(Number(month))

  const columns: ColumnDef<AllotmentRegisterCrew>[] = [
    {
      accessorKey: "CrewID",
      header: "Crew Code",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("CrewID")}</div>
      ),
    },
    {
      accessorKey: "CrewName",
      header: "Crew Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("CrewName")}</div>
      ),
    },
    {
      accessorKey: "Rank",
      header: "Rank",
    },
    {
      accessorKey: "BasicWage",
      header: "Basic Wage",
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("BasicWage")}</div>
      ),
    },
    {
      accessorKey: "FixedOT",
      header: "Fixed OT",
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("FixedOT")}</div>
      ),
    },
    {
      accessorKey: "GuarOT",
      header: "Guar OT",
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("GuarOT")}</div>
      ),
    },
    {
      accessorKey: "DollarGross",
      header: "Dollar Gross",
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("DollarGross")}</div>
      ),
    },
    {
      accessorKey: "PesoGross",
      header: "Peso Gross",
      cell: ({ row }) => (
        <div className="text-right">
          {formatNumber(row.getValue("PesoGross"))}
        </div>
      ),
    },
    {
      accessorKey: "TotalDeduction",
      header: "Total Deduction",
      cell: ({ row }) => (
        <div className="text-right">
          {formatNumber(row.getValue("TotalDeduction"))}
        </div>
      ),
    },
    {
      accessorKey: "Net",
      header: "Net",
      cell: ({ row }) => (
        <div className="text-right">{formatNumber(row.getValue("Net"))}</div>
      ),
    },
    {
      id: "actions",
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
                  setIsAllotteeDialogOpen(true);
                }}
              >
                <PiUserListFill className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                View Allottee Distribution
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter the crew data based on search term
  const filterCrew = allotmentData[0]?.Crew || [];
  const filteredData = filterCrew.filter(
    (item) =>
      item.CrewID?.toString()
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      item.CrewName?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handlePrint = () => {
    if (allotmentData && allotmentData.length > 0) {
      // Get month name from month number
      const monthNames = [
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
      ];

      // const monthName = monthNames[selectedMonth - 1];

      generateAllotmentPDF(
        allotmentData,
        monthNames[Number(month)] ? monthNames[Number(month) - 1] : "ALL",
        year ? parseInt(year) : new Date().getFullYear(),
        Number(forexRate),
        postedValue
      );
    } else {
      console.error("No allotment register data available");
    }
  };

  // EXCEL
  const handleExcelPrint = () => {
    if (allotmentData && allotmentData.length > 0) {
      // Get month name from month number
      const monthNames = [
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
      ];

      // const monthName = monthNames[selectedMonth - 1];

      generateAllotmentExcel(
        allotmentData,
        monthNames[Number(month)] ? monthNames[Number(month) - 1] : "ALL",
        year ? parseInt(year) : new Date().getFullYear(),
        Number(forexRate),
        postedValue
      );
    } else {
      console.error("No allotment register data available");
    }
  };

  return (
    <div className="h-full w-full p-6 pt-5 overflow-hidden">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .overflow-y-auto::-webkit-scrollbar,
        .overflow-auto::-webkit-scrollbar,
        .overflow-scroll::-webkit-scrollbar {
          display: none;
        }

        .overflow-y-auto,
        .overflow-auto,
        .overflow-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center gap-2">
          <Link href={monthName && year ? `/home/allotment?month=${month}&year=${year}` : "/home/allotment"}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold mb-0">{ monthName && year ? `Allotment Register - ${capitalizeFirstLetter(monthName)} ${year}` : "Allotment Register"}</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-6 bg-[#F5F6F7]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-xl text-gray-500 uppercase">
                {allotmentData[0]?.VesselCode}
              </div>
              <h2 className="text-2xl font-semibold">
                {allotmentData[0]?.VesselName}
              </h2>
              <Badge
                variant="secondary"
                className="mt-2 px-6 py-0 bg-[#DFEFFE] text-[#292F8C]"
              >
                Active
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-lg flex items-center gap-2">
                <Ship className="h-4 w-4" />
                {allotmentData[0]?.VesselType || "N/A"}
              </div>
              <Card className="p-1 bg-[#FDFDFD] mt-2">
                <div className="text-sm text-center">
                  <p className="flex items-center justify-center font-semibold">
                    {allotmentData[0]?.Principal || "N/A"}
                  </p>
                  <div className="text-gray-500 text-xs flex items-center justify-center">
                    Principal Name
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>

        <div className="flex justify-between items-center gap-4 mt-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search Crew...."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-[#EAEBF9]"
            />
          </div>
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
                    "Print Summary"
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="text-sm w-48">
                <DropdownMenuItem onClick={handlePrint}>
                  <AiOutlinePrinter className="mr-2 h-4 w-4" />
                    Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                onClick={handleExcelPrint}
                >
                  <AiOutlinePrinter className="mr-2 h-4 w-4" />
                  Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="rounded-md border pb-3">
          {isLoading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <p>Loading allotment data...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <DataTable columns={columns} data={filteredData} pageSize={6} />
          ) : (
            <div className="flex justify-center items-center p-10">
              <p>No allotment data available for this vessel</p>
            </div>
          )}
        </div>
      </div>

      {selectedCrew && (
        <AllotteeDistributionDialog
          open={isAllotteeDialogOpen}
          onOpenChange={setIsAllotteeDialogOpen}
          allottees={selectedCrew.Allottee}
          crewName={selectedCrew.CrewName}
        />
      )}
    </div>
  );
}
