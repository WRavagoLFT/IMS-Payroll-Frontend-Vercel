"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  CrewPayrollHistoryItem,
  getCrewPayrollHistory,
} from "@/src/services/payroll/crewPayrollHistory.api";
import { useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DataTable } from "../ui/data-table";
import { useCrewDetails } from "@/src/hooks/useCrewDetails";
import { CrewSidebar } from "../CrewSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { PiUserListFill } from "react-icons/pi";
import { CrewAllotteeDistribution } from "../dialogs/CrewAllotteeDistributionDialog";
import { CrewDeductionDistribution } from "../dialogs/CrewDeductionDistributionDialog";
import { generatePayrollPDFSingle } from "../PDFs/payrollStatementPDFSingle";
import { CrewPayroll } from "@/src/services/payroll/payroll.api";
import PDFPreview from "../dialogs/PDFPreviewModal";

export default function CrewPayrollHistory() {
  const [payrollData, setPayrollData] = useState<CrewPayrollHistoryItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  //const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  //const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedCrewPayrollItem, setSelectedCrewPayrollItem] = useState<CrewPayrollHistoryItem | null>(null);
  const [isViewSelectedAllotteeDistributionDialogOpen, setViewselectedAllotteeDistributionDialogOpen] = useState(false);
  const [isViewSelectedDeductionDialogOpen, setViewSelectedDeductionDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Blob | null>();
  const [fileName, setFileName] = useState("");
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const crewCode = id ? Number(id) : null;
  const { crew, isLoading } = useCrewDetails(id);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) =>
    (currentYear - 15 + i).toString()
  );

  useEffect(() => {
    if (!crewCode) return;
    setIsDataLoading(true);
    getCrewPayrollHistory(crewCode)
      .then((res) => {
        if (res.success) {
          setPayrollData(res.data);
        } else {
          console.error("Failed to fetch payroll list:", res.message);
        }
      })
      .catch((err) => console.error("Error fetching payroll list:", err))
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [crewCode]);

  const columns: ColumnDef<CrewPayrollHistoryItem>[] = [
    {
      accessorKey: "PayrollMonth",
      header: "Posted Date",
      cell: ({ row }) => {
        const month = row.original.PayrollMonth;
        const year = row.original.PayrollYear;
        const date = new Date(
          `${year}-${month.toString().padStart(2, "0")}-01`
        );
        const formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return (
          <div className="text-xs sm:text-sm text-center">{formattedDate}</div>
        );
      },
    },
    {
      accessorKey: "crewName",
      header: "Crew Name",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.crewName}
        </div>
      ),
    },
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.rank}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.basicWage",
      header: "Basic Wage",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.basicWage || "0"}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.fixedOT",
      header: "Fixed OT",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.fixedOT || "0"}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.guaranteedOT",
      header: "Guar. OT",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.guaranteedOT || "0"}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.dollarGross",
      header: "Dollar Gross",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.dollarGross || "0"}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.pesoGross",
      header: "Peso Gross",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.pesoGross || "0"}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.totalDeduction",
      header: "Total Deductions",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.totalDeduction || "0"}
        </div>
      ),
    },
    {
      accessorKey: "payrollDetails.netWage",
      header: "Net",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.original.payrollDetails?.netWage || "0"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const crew = row.original;
        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 sm:h-8 w-7 sm:w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                <DropdownMenuItem
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setSelectedCrewPayrollItem(row.original);
                    setViewselectedAllotteeDistributionDialogOpen(true);
                  }}
                >
                  <PiUserListFill className="mr-2 h-4 w-4" />
                  Allottee Distribution
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setSelectedCrewPayrollItem(row.original);
                    setViewSelectedDeductionDialogOpen(true);
                  }}
                >
                  <PiUserListFill className="mr-2 h-4 w-4" />
                  Deduction Distribution
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-xs sm:text-sm"
                  onClick={() => previewPayrollPDFCrew(row.original)}
                >
                  <PiUserListFill className="mr-2 h-4 w-4" />
                  Payslip
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const filteredPayrollData = payrollData.filter((item) => {
    const matchesMonth =
      monthFilter !== "all"
        ? item.PayrollMonth.toString() === monthFilter
        : true;

    const matchesYear =
      yearFilter !== "all" ? item.PayrollYear.toString() === yearFilter : true;

    return matchesMonth && matchesYear;
  });

  const clearFilters = () => {
    setMonthFilter("all");
    setYearFilter("all");
  };

  function convertHistoryItemToCrewPayroll(
    item: CrewPayrollHistoryItem
  ): CrewPayroll {
    return {
      ...item,
      payrollDetails: {
        ...item.payrollDetails,
        basicWage: Number(item.payrollDetails.basicWage),
        fixedOT: Number(item.payrollDetails.fixedOT),
        guaranteedOT: Number(item.payrollDetails.guaranteedOT),
        dollarGross: Number(item.payrollDetails.dollarGross),
        pesoGross: Number(item.payrollDetails.pesoGross),
        totalDeduction: Number(item.payrollDetails.totalDeduction),
        netWage: Number(item.payrollDetails.netWage),
      },
      allotmentDeductions: item.allotmentDeductions.map((d) => ({
        ...d,
        amount: Number(d.amount),
        forex: Number(d.forex),
        dollar: Number(d.dollar),
      })),
      allotteeDistribution: item.allotteeDistribution.map((a) => ({
        ...a,
        amount: Number(a.amount),
        currency:
          typeof a.currency === "string"
            ? a.currency
            : a.currency === 1
            ? "USD"
            : "PHP",
      })),
    };
  }
  
  const previewPayrollPDFCrew = async (crew: CrewPayrollHistoryItem) => {
    const crewPayroll = convertHistoryItemToCrewPayroll(crew);
    const month = crewPayroll.PayrollMonth ?? 1;
    const year = crewPayroll.PayrollYear ?? new Date().getFullYear();

    try {
      const blob = await generatePayrollPDFSingle(
        crewPayroll,
        month,
        year,
        1, // posted value
        "",
        false
      );

      const { blob: pdfBlob, filename } = blob as { blob: Blob; filename: string };
      //const blobUrl = URL.createObjectURL(pdfBlob);
      //window.open(blobUrl, "_blank");

      setPreviewData(pdfBlob);
      setFileName(filename);
      setShowPreview(true);

    } catch (error) {
      console.error("Error generating payroll PDF:", error);
    }
  };

  return (
    <div className="h-full w-full p-4 pt-3">
      <div className="flex flex-col space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <CrewSidebar crew={crew} />
          <div className="md:col-span-3">
            <Card className="h-[calc(100vh-180px)] flex flex-col p-4 overflow-auto">
            
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 items-center">
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="bg-white w-full h-10 px-4 text-sm flex items-center">
                    <div className="flex items-center justify-between w-full -mx-4">
                      <div className="flex items-center h-full bg-[#F6F6F6] py-2.5 px-4 border-r rounded-l-md">
                        <span className="text-muted-foreground text-base">
                          Select Month
                        </span>
                      </div>
                      <span className="text-foreground text-base px-4">
                        {monthFilter !== "all"
                          ? monthNames[parseInt(monthFilter, 10) - 1]
                          : "All Months"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {monthNames.map((name, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="bg-white w-full h-10 px-4 text-sm flex items-center">
                    <div className="flex items-center justify-between w-full -mx-4">
                      <div className="flex items-center h-full bg-[#F6F6F6] py-2.5 px-4 border-r rounded-l-md">
                        <span className="text-muted-foreground text-base">
                          Select Year
                        </span>
                      </div>
                      <span className="text-foreground text-base px-4">
                        {yearFilter !== "all" ? yearFilter : "All Years"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-92 overflow-y-auto">
                    <SelectItem value="all">All Months</SelectItem>
                    {years.map((yr, idx) => (
                      <SelectItem key={idx} value={yr}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="h-11 px-4 ml-2 bg-white border border-[#E5E7EB] shadow-none rounded-xl text-[#6366F1] self-center"
                >
                  Clear Filters
                </Button>
              </div>

              {isDataLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">Loading crew data...</p>
                </div>
              ) : (
                <div className="bg-white rounded-md border pb-3">
                  <DataTable columns={columns} data={filteredPayrollData} />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      <CrewAllotteeDistribution
        crewPayroll={selectedCrewPayrollItem}
        open={isViewSelectedAllotteeDistributionDialogOpen}
        onOpenChange={setViewselectedAllotteeDistributionDialogOpen}
      />

      <CrewDeductionDistribution
        crewPayroll={selectedCrewPayrollItem}
        open={isViewSelectedDeductionDialogOpen}
        onOpenChange={setViewSelectedDeductionDialogOpen}
      />
      
      {previewData && (
        <PDFPreview
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewData(null);
          }}
          blob={previewData}
          filename={fileName}
        />
      )}
    </div>
  );
}
