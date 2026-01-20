"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CircleAlert,
  Info,
  Loader2,
  Search,
  Undo,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "../ui/card";
import {
  getForex,
  getPayrollList,
  unpostPayrolls,
  unpostVesselPayrolls,
} from "@/src/services/payroll/payroll.api";
import { useDebounce } from "@/lib/useDebounce";
import { toast } from "../ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

type Payroll = {
  vesselId: number;
  vesselName: string;
  onBoardCrew: number;
  grossAllotment: number;
  totalDeductions: number;
  netAllotment: number;
};

// Skeleton component for the cards
const CardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="bg-blue-800 text-white py-3">
          <CardContent className="pt-0 h-full flex flex-col justify-between gap-y-5">
            <Skeleton className="h-6 w-3/4 bg-blue-700" />
            <div className="flex justify-between w-full">
              <Skeleton className="h-8 w-[10%] bg-blue-700" />
              <Skeleton className="h-8 w-[50%] bg-blue-700" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default function PayrollUnposting() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [payrollData, setPayrollData] = useState<Payroll[]>([]);
  const [forexRate, setForexRate] = useState<number>(0);
  const searchParams = useSearchParams();
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const [monthFilter, setMonthFilter] = useState(month || (new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(year || new Date().getFullYear().toString());
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [showUnpostDialog, setShowUnpostDialog] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<Payroll | null>(null);
  //const currentMonth = new Date().getMonth() + 1;
  const formatNumber = (value: number) => value?.toFixed(2);

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

  const fetchDashboardData = async () => {
    try {
      const forexRate = await getForex(monthFilter, yearFilter);

      if (forexRate.length > 0) {
        const result = forexRate.find(
          (item) =>
            item.ExchangeRateMonth === Number(monthFilter) &&
            item.ExchangeRateYear === Number(yearFilter)
        );
        setForexRate(result?.ExchangeRate || 0);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchPayrollData = async (posted?: number) => {
    try {
      setIsLoading(true);
      const res = await getPayrollList(
        Number(monthFilter),
        Number(yearFilter),
        1
      );
      if (res.success) {
        const mapped: Payroll[] = res.data.map((item) => ({
          vesselId: item.VesselId,
          vesselName: item.VesselName,
          onBoardCrew: item.OnBoardCrew,
          grossAllotment: item.GrossAllotment,
          totalDeductions: item.TotalDeduction,
          netAllotment: item.NetAllotment,
        }));
        setPayrollData(mapped);
      } else {
        console.error("Failed to fetch payroll list:", res.message);
      }
    } catch (err) {
      console.error("Error fetching payroll list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 20 }, (_, i) =>
    (currentYear - 15 + i).toString()
  );

  const vesselId = searchParams.get("vesselId");

  useEffect(() => { }, [vesselId, month, year]);

  // Fetch data when filters change
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchDashboardData(),
          fetchPayrollData(),
          fetchPayrollData(1),
        ]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAll();

    return () => {
      isMounted = false;
    };
  }, [monthFilter, yearFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("month", monthFilter);
    params.set("year", yearFilter);

    router.push(`${pathname}?${params.toString()}`);
  }, [monthFilter, yearFilter, pathname]);

  const totalGross = payrollData.reduce((sum, p) => sum + p.grossAllotment, 0);
  const totalDeduction = payrollData.reduce(
    (sum, p) => sum + p.totalDeductions,
    0
  );
  const totalNet = payrollData.reduce((sum, p) => sum + p.netAllotment, 0);

  const handleUnpostAllPayrolls = async () => {
    setPayrollLoading(true);
    try {
      const res = await unpostPayrolls(monthFilter, yearFilter);

      if (res.success) {
        toast({
          title: "All Payrolls Unposted",
          description: res.message || "All payroll records have been unposted.",
          variant: "success",
        });
        fetchPayrollData(); // Refresh table
      } else {
        toast({
          title: "Unposting Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Server Error",
        description: "An error occurred while unposting payrolls.",
        variant: "destructive",
      });
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleUnpostVesselPayroll = async () => {
    if (!selectedVessel?.vesselId) {
      toast({
        title: "Error",
        description: "No vessel selected.",
        variant: "destructive",
      });
      return;
    }

    setPayrollLoading(true);
    try {
      const res = await unpostVesselPayrolls(
        monthFilter,
        yearFilter,
        selectedVessel.vesselId
      );

      if (res.success) {
        toast({
          title: "Vessel Payroll Unposted",
          description:
            res.message ||
            `${selectedVessel.vesselName} payroll is now unposted.`,
          variant: "success",
        });

        fetchPayrollData();
      } else {
        toast({
          title: "Unposting Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setPayrollLoading(false);
      setShowUnpostDialog(false);
    }
  };

  const columns: ColumnDef<Payroll>[] = [
    {
      accessorKey: "vesselName",
      header: "Vessel Name",
      cell: ({ row }) => (
        <div className="font-medium text-xs sm:text-sm text-center">
          {row.getValue("vesselName")}
        </div>
      ),
    },
    {
      accessorKey: "onBoardCrew",
      header: "On Board Crew",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {row.getValue("onBoardCrew")}
        </div>
      ),
    },
    {
      accessorKey: "grossAllotment",
      header: "Gross Allotment",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          }).format(Number(row.getValue("grossAllotment")))}
        </div>
      ),
    },
    {
      accessorKey: "totalDeductions",
      header: "Total Deductions",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          }).format(Number(row.getValue("totalDeductions")))}
        </div>
      ),
    },
    {
      accessorKey: "netAllotment",
      header: "Net Allotment",
      cell: ({ row }) => (
        <div className="text-xs sm:text-sm text-center">
          {new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          }).format(Number(row.getValue("netAllotment")))}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center w-full"></div>,
      cell: ({ row }) => {
        return (
          <div className="flex justify-center my-1.5 w-full">
            <div
              className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full shadow-sm hover:bg-red-300 hover:scale-105 transition-all duration-200 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setSelectedVessel(row.original);
                setShowUnpostDialog(true);
              }}
            >
              <Undo className="h-3 w-3 mr-2" />
              Unpost Payroll
            </div>
          </div>
        );
      },
    },
  ];

  const filteredPosted = payrollData.filter((p) =>
    p.vesselName.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="h-full w-full p-4 pt-3 overflow-y-auto scrollbar-hide">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="overflow-y-auto scrollbar-hide">
        <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5">
          <div className="flex items-center">
            <h1 className="text-3xl font-semibold mb-0 mr-4">
              Unpost Allotment Payroll
            </h1>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
            <div className="grid grid-cols-5 items-center gap-3 sm:gap-4 w-full">
              {/* Month Filter */}
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="bg-white h-full sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[200px] sm:min-w-[220px] w-full sm:w-auto">
                  <div className="flex items-center justify-between w-full -mx-4">
                    <div className="flex items-center h-full bg-[#F6F6F6] py-2.5 px-4 border-r rounded-l-md">
                      <span className="text-muted-foreground text-base">
                        Month
                      </span>
                    </div>
                    <span className="text-foreground text-base px-4">
                      {monthNames[Number(monthFilter) - 1]}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Filter */}
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="bg-white h-full sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[200px] sm:min-w-[220px] w-full sm:w-auto">
                  <div className="flex items-center justify-between w-full -mx-4">
                    <div className="flex items-center h-full bg-[#F6F6F6] py-2.5 px-4 border-r rounded-l-md">
                      <span className="text-muted-foreground text-base">
                        Year
                      </span>
                    </div>
                    <span className="text-foreground text-base px-4">
                      {yearFilter}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-92 overflow-y-auto">
                  {years.map((yr, idx) => (
                    <SelectItem key={idx} value={yr}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div></div>
              <div></div>

              {/* Process Payroll Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {forexRate > 0 ? (
                    <Button
                      className="bg-red-200 hover:bg-red-300 text-red-900 h-10 px-6 text-sm"
                      disabled={payrollLoading}
                    >
                      {payrollLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Undo className="w-4 h-4" />
                          Unpost Process Payrolls
                        </>
                      )}
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            className="w-full bg-red-200 hover:bg-red-300 text-red-900 h-10 px-6 text-sm cursor-not-allowed opacity-70"
                            onClick={(e) => e.preventDefault()} // prevent click actions
                          >
                            <Undo className="w-4 h-4" />
                            Unpost Processed Payrolls
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="flex flex-row align-center items-center gap-2 bg-white text-black text-sm rounded-md p-3 shadow-md leading-snug">
                        <Info className="w-4 h-4" />
                        <p>
                          {
                            forexRate === 0 &&
                            "Set the forex rate for this month to enable posting payrolls."
                            // :
                            // Number(monthFilter) !== currentMonth && "Past months cannot be posted."
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white p-10">
                  <AlertDialogHeader className="flex items-center">
                    <CircleAlert size={120} strokeWidth={1} color="orange" />
                    <AlertDialogTitle className="text-3xl">
                      Are you sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-md">
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex items-center justify-center space-x-4 px-4">
                    <AlertDialogCancel className="w-1/2 bg-gray-400 hover:bg-gray-500 text-white hover:text-white">
                      No, Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="w-1/2 bg-red-500 hover:bg-red-600 text-white"
                      onClick={handleUnpostAllPayrolls}
                      disabled={payrollLoading}
                    >
                      {payrollLoading
                        ? "Processing..."
                        : "Yes, Unpost All Payrolls"}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {isLoading ? (
            <CardsSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="bg-blue-800 text-white py-3">
                <CardContent className="pt-0 h-full flex flex-col justify-between gap-y-5">
                  <p className="text-xl pt-0">Exchange rate of USD</p>
                  <div className="text-3xl font-bold self-end mt-4 flex justify-between w-full">
                    <p>₱</p>
                    <p>{formatNumber(forexRate) || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-800 text-white py-3">
                <CardContent className="pt-0 h-full flex flex-col justify-between gap-y-5">
                  <p className="text-xl pt-0">Total Gross Allotment</p>
                  <div className="text-3xl font-bold self-end mt-4 flex justify-between w-full">
                    <p>₱</p>
                    <p>
                      {new Intl.NumberFormat(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      }).format(Number(totalGross))}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-800 text-white py-3">
                <CardContent className="pt-0 h-full flex flex-col justify-between gap-y-5">
                  <p className="text-xl pt-0">Total Deduction</p>
                  <div className="text-3xl font-bold self-end mt-4 flex justify-between w-full">
                    <p>₱</p>
                    <h3>
                      {new Intl.NumberFormat(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      }).format(Number(totalDeduction))}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-800 text-white py-3">
                <CardContent className="pt-0 h-full flex flex-col justify-between gap-y-5">
                  <p className="text-xl pt-0">Total Net Allotment</p>
                  <div className="text-3xl font-bold self-end mt-4 flex justify-between w-full">
                    <p>₱</p>
                    <p>
                      {new Intl.NumberFormat(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      }).format(Number(totalNet))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="flex flex-col pb-0">
            <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">
                    Loading posted allotment data...
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      placeholder="Search Vessel Name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 bg-[#EAEBF9]"
                    />
                  </div>
                  <div className="bg-[#F9F9F9] rounded-md border pb-2">
                    <DataTable
                      columns={columns}
                      data={filteredPosted}
                      pageSize={6}
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {selectedVessel && (
        <AlertDialog open={showUnpostDialog} onOpenChange={setShowUnpostDialog}>
          <AlertDialogContent className="bg-white p-10">
            <AlertDialogHeader className="flex flex-col items-center space-y-2">
              <CircleAlert size={60} strokeWidth={1} color="orange" />
              <AlertDialogTitle className="text-xl text-center">
                Unpost Payroll for {selectedVessel.vesselName}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base text-gray-600">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center justify-center space-x-4 px-4 mt-1">
              <AlertDialogCancel className="w-1/2 bg-gray-400 hover:bg-gray-500 text-white hover:text-white">
                No, Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="w-1/2 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleUnpostVesselPayroll}
                disabled={payrollLoading}
              >
                {payrollLoading ? "Processing..." : "Yes, Unpost Payroll"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
