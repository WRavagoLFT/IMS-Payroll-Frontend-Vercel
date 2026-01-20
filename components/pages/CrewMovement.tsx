"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Filter, UserPen, Download, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "@/lib/useDebounce";
import { getVesselList, VesselItem } from "@/src/services/vessel/vessel.api";
import { CrewMovementHistory, CrewMovementHistoryVessel, getCrewMovementHistory, getCrewMovementHistoryByVessel } from "@/src/services/crew/crew.api";
import { generateMovementHistoryPDF } from "../PDFs/movmentHistoryPDF";
import { AiOutlinePrinter } from "react-icons/ai";
import { generateMovementHistoryExcel } from "../Excels/movementHistoryExcel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { lastDayOfMonth, set } from "date-fns";
import { toast } from "../ui/use-toast";
import { generateMovementHistoryExcelV2 } from "../Excels/movmentHistoryExcelV2";
import { generateMovementHistoryByVesselPDF } from "../PDFs/movementHistoryByVesselPDF";

interface Vessel {
  vesselId: number;
  vesselCode: string;
  vesselName: string;
  vesselType: number;
  vesselTypeName: string;
  principalName: string;
  principalID: number;
  status: string;
}

export default function CrewMovement() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [loadingVessels, setLoadingVessels] = useState(false);
  const [vesselData, setVesselData] = useState<Vessel[]>([]);
  const [vesselTypeFilter, setVesselTypeFilter] = useState("all");
  const [crewMovementHistory, setCrewMovementHistory] = useState<CrewMovementHistory[]>([]);
  const [crewMovementHistoryByVessel, setCrewMovementHistoryByVessel] = useState<CrewMovementHistoryVessel[]>([]);
  const [isExportingVessel, setIsExportingVessel] = useState(false);
  const [openExportModalVessel, setOpenExportModalVessel] = useState(false);
  const [selectedMonthVessel, setSelectedMonthVessel] = useState<number>(new Date().getMonth() + 1);
  const [selectedYearVessel, setSelectedYearVessel] = useState<number>(new Date().getFullYear());
  const [selectedVessel, setSelectedVessel] = useState<number>(0);
  const [loadingPDFExportVessel, setLoadingPDFExportVessel] = useState(false);
  const [loadingExcelExportVessel, setLoadingExcelExportVessel] = useState(false);

  const [isExportingCrew, setIsExportingCrew] = useState(false);
  const [openExportModalCrew, setOpenExportModalCrew] = useState(false);
  const [selectedMonthCrew, setSelectedMonthCrew] = useState<number>(new Date().getMonth() + 1);
  const [selectedYearCrew, setSelectedYearCrew] = useState<number>(new Date().getFullYear());
  const [loadingPDFExportCrew, setLoadingPDFExportCrew] = useState(false);
  const [loadingExcelExportCrew, setLoadingExcelExportCrew] = useState(false);

  const [exportType, setExportType] = useState<"pdf" | "excel" | null>(null);

  // Fetch vessel list on mount
  useEffect(() => {
    const fetchVessels = async () => {
      setLoadingVessels(true);
      try {
        const res = await getVesselList();

        if (res.success) {
          const mapped = res.data.map((item: VesselItem) => ({
            vesselId: item.VesselID,
            vesselCode: item.VesselCode,
            vesselName: item.VesselName,
            vesselType: parseInt(item.VesselType),
            vesselTypeName: item.VesselType,
            principalName: item.Principal,
            principalID: parseInt(item.Principal),
            status: item.IsActive === 1 ? "Active" : "Inactive",
          }));
          setVesselData(mapped);
        } else {
          console.error("Failed to fetch vessels:", res.message);
        }


      } catch (err) {
        console.error("Error fetching vessels:", err);
      } finally {
        setLoadingVessels(false);
      }
    };

    fetchVessels();
  }, []);

  const handlePdfExportVessel = async () => {
    try {
      setIsExportingVessel(true);
      setLoadingPDFExportVessel(true);

      // const movements = await getCrewMovementHistory(
      //   {
      //     startDate: selectedMonthVessel ? new Date(selectedYearVessel, selectedMonthVessel - 1, 1) : undefined,
      //     endDate: selectedYearVessel ? lastDayOfMonth(new Date(selectedYearVessel, selectedMonthVessel - 1, 1)) : undefined,
      //     vesselId: selectedVessel > 0 ? selectedVessel : undefined
      //   }
      // );

      const movements = await getCrewMovementHistoryByVessel(
        {
          startDate: selectedMonthVessel ? new Date(selectedYearVessel, selectedMonthVessel - 1, 1) : undefined,
          endDate: selectedYearVessel ? lastDayOfMonth(new Date(selectedYearVessel, selectedMonthVessel - 1, 1)) : undefined,
          vesselId: selectedVessel > 0 ? selectedVessel : undefined
        }
      );

      if (movements.success) {
        setCrewMovementHistoryByVessel(movements.data);

        // await generateMovementHistoryPDFV2(
        //   movements.data,
        //   selectedMonthVessel,
        //   selectedYearVessel,
        //   new Date(),
        //   selectedVessel > 0 ? "vessel" : "all"
        // );

        await generateMovementHistoryByVesselPDF(
          movements.data,
          selectedMonthVessel,
          selectedYearVessel,
          new Date(),
          selectedVessel > 0 ? "vessel" : "all"
        );

      } else {
        console.error("Failed to fetch crew movements:", movements.message);
        toast({
          title: "Export failed.",
          description: `No matching data for the selected parameters.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Export failed.",
        description: `No matching data for the selected parameters.`,
        variant: "destructive",
      });
    } finally {
      setOpenExportModalVessel(false);
      setIsExportingVessel(false)
      setLoadingPDFExportVessel(false);
    }
  };

  const handleExcelExportVessel = async () => {
    try {
      setIsExportingVessel(true);
      setLoadingExcelExportVessel(true);

      const movements = await getCrewMovementHistoryByVessel(
        {
          startDate: selectedMonthVessel ? new Date(selectedYearVessel, selectedMonthVessel - 1, 1) : undefined,
          endDate: selectedYearVessel ? lastDayOfMonth(new Date(selectedYearVessel, selectedMonthVessel - 1, 1)) : undefined,
          vesselId: selectedVessel > 0 ? selectedVessel : undefined
        }
      );

      if (movements.success) {
        setCrewMovementHistoryByVessel(movements.data);

        await generateMovementHistoryExcelV2(
          movements.data,
          selectedMonthVessel,
          selectedYearVessel,
          new Date(),
          selectedVessel > 0 ? "vessel" : "all"
        );
      } else {
        console.error("Failed to fetch crew movements:", movements.message);
      }
    } catch (error) {
      console.error("Error generating Excel:", error);
    } finally {
      setIsExportingVessel(false);
      setLoadingExcelExportVessel(false);
    }
  };

  ///// ================= by Crew >> List

  const handlePdfExportCrew = async () => {
    try {
      setIsExportingCrew(true);
      setLoadingPDFExportCrew(true);

      const movements = await getCrewMovementHistory(
        {
          startDate: undefined,
          endDate: lastDayOfMonth(new Date(selectedYearCrew, selectedMonthCrew - 1, 1))
        }
      );

      if (movements.success) {
        setCrewMovementHistory(movements.data);

        await generateMovementHistoryPDF(
          movements.data,
          selectedMonthCrew,
          selectedYearCrew,
        );
      } else {
        console.error("Failed to fetch crew movements:", movements.message);
        toast({
          title: "Export failed.",
          description: `No matching data for the selected parameters.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Export failed.",
        description: `No matching data for the selected parameters.`,
        variant: "destructive",
      });
    } finally {
      setIsExportingCrew(false)
      setLoadingPDFExportCrew(false);
      setOpenExportModalCrew(false);
    }
  };

  const handleExcelExportCrew = async () => {
    try {
      setIsExportingCrew(true);
      setOpenExportModalCrew(true);
      setLoadingExcelExportCrew(true);

      const movements = await getCrewMovementHistory();

      if (movements.success) {
        setCrewMovementHistory(movements.data);

        await generateMovementHistoryExcel(
          movements.data,
          new Date().getMonth() + 1,
          new Date().getFullYear()
        );
      } else {
        console.error("Failed to fetch crew movements:", movements.message);
      }
    } catch (error) {
      console.error("Error generating Excel:", error);
    } finally {
      setIsExportingCrew(false);
      setOpenExportModalCrew(false);
      setLoadingExcelExportCrew(false);
    }
  };

  const columns: ColumnDef<Vessel>[] = [
    {
      accessorKey: "vesselCode",
      header: () => <div className="text-justify">Vessel Code</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("vesselCode")}</div>
      ),
    },
    {
      accessorKey: "vesselName",
      header: () => <div className="text-justify">Vessel Name</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("vesselName")}</div>
      ),
    },
    {
      accessorKey: "vesselTypeName",
      header: () => <div className="text-justify">Vessel Type</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("vesselTypeName")}</div>
      ),
    },
    {
      accessorKey: "principalName",
      header: () => <div className="text-justify">Principal Name</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("principalName")}</div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const vessel = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem asChild>
                <Link
                  href={`/home/crew-movement/crew-list?id=${vessel.vesselId}&vesselName=${vessel.vesselName}`}>
                  <UserPen className="mr-2 h-4 w-4" /> Manage Crew List
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter vessels based on search and status
  const filteredVessel = vesselData.filter((v) => {
    const matchesSearch =
      v.vesselCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vesselTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.principalName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVesselType =
      vesselTypeFilter === "all" ||
      v.vesselTypeName.toLowerCase() === vesselTypeFilter.toLowerCase();

    return matchesSearch && matchesVesselType;
  });

  useEffect(() => {
    if (openExportModalVessel && openExportModalCrew) {
      document.body.style.overflow = "hidden";
      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
    }

    // Clean up when component unmounts
    return () => {
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
    };
  }, [openExportModalVessel, openExportModalCrew]);

  return (
    <div className="h-full w-full p-4 pt-2">
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5 min-h-full">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold mb-0">Crew Movement</h1>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-4 sm:h-4.5 w-4 sm:w-4.5 text-muted-foreground" />
              <Input
                placeholder="Search crew by name, code, or rank..."
                className="bg-[#EAEBF9] pl-8 sm:pl-9 py-4 sm:py-5 text-xs sm:text-sm h-9 sm:h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
              <Select value={vesselTypeFilter} onValueChange={setVesselTypeFilter}>
                <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                  <Filter className="h-4 sm:h-4.5 w-4 sm:w-4.5" />
                  <SelectValue placeholder="Filter by vessel" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All Vessel Types</SelectItem>
                  {[
                    ...new Set(
                      vesselData.map((item) => item.vesselTypeName)
                    ),
                  ].map((vesselTypeName) => (
                    <SelectItem key={vesselTypeName} value={String(vesselTypeName || "")}>
                      {vesselTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-4 text-sm" disabled={isExportingVessel}>
                  {isExportingVessel ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <AiOutlinePrinter className="mr-2 h-4 w-4" />
                      Print Summary by Vessel
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="text-sm w-48">
                <DropdownMenuItem onClick={() => { setExportType("pdf"); setOpenExportModalVessel(true); }}
                  //onClick={() => setOpenExportModalVessel(true)} 
                  disabled={isExportingVessel}>
                  <AiOutlinePrinter className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => { setExportType("excel"); setOpenExportModalVessel(true); }}
                  //onClick={() => setOpenExportModalVessel(true)} 
                  disabled={isExportingVessel}>
                  <AiOutlinePrinter className="mr-2 h-4 w-4" />
                  Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-4 text-sm" disabled={isExportingCrew}>
                  {isExportingCrew ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <AiOutlinePrinter className="mr-2 h-4 w-4" />
                      Print Summary by Crew
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="text-sm w-48">
                <DropdownMenuItem onClick={() => { setExportType("pdf"); setOpenExportModalCrew(true); }}
                  //onClick={() => setOpenExportModalCrew(true)} 
                  disabled={isExportingCrew}>
                  <AiOutlinePrinter className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => { setExportType("excel"); setOpenExportModalCrew(true); }}
                  //onClick={handleExcelExportCrew}
                  disabled={isExportingCrew}>
                  <AiOutlinePrinter className="mr-2 h-4 w-4" />
                  Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-center">
            {loadingVessels ? (
              <div className="flex justify-center items-center h-32">
                Loading vessel data...
              </div>
            ) : (
              <DataTable columns={columns} data={filteredVessel} pageSize={10} />
            )}
          </div>
        </div>
      </div>

      {openExportModalVessel && (
        <Dialog open={openExportModalVessel} onOpenChange={setOpenExportModalVessel}>
          <DialogContent className="sm:max-w-[600px] bg-[#FCFCFC] p-10">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center text-2xl font-semibold text-[#2E37A4]">
                Select Year, Month, and Vessel
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-6 mb-1">
              <div className="flex gap-4">
                <Select
                  onValueChange={(value) => setSelectedMonthVessel(Number(value))}
                  value={selectedMonthVessel.toString()}
                >
                  <SelectTrigger className="w-full rounded-md h-10 gap-1">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(value) => setSelectedYearVessel(Number(value))}
                  value={selectedYearVessel.toString()}
                >
                  <SelectTrigger className="w-full rounded-md h-10 gap-1">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Select
                onValueChange={(value) => setSelectedVessel(Number(value))}
                value={selectedVessel.toString()}
              >
                <SelectTrigger className="w-full rounded-md h-10 gap-1">
                  <SelectValue placeholder="Select Vessel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={0} value={"0"}>
                    {'All Vessels'}
                  </SelectItem>
                  {
                    vesselData.map((vessel) => {
                      return (
                        <SelectItem key={vessel.vesselId} value={vessel.vesselId.toString()}>
                          {vessel.vesselName}
                        </SelectItem>
                      )
                    })
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpenExportModalVessel(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (exportType == "pdf") {
                    handlePdfExportVessel();
                  } else if (exportType == "excel") {
                    handleExcelExportVessel();
                  }
                }}
                className="flex-1 bg-[#2E37A4] hover:bg-[#2E37A4]/90 text-white"
              >
                {(loadingPDFExportVessel || loadingExcelExportVessel) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export {exportType?.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {openExportModalCrew && (
        <Dialog open={openExportModalCrew} onOpenChange={setOpenExportModalCrew}>
          <DialogContent className="sm:max-w-[600px] bg-[#FCFCFC] p-10">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center text-2xl font-semibold text-[#2E37A4]">
                Select Year and Month
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-6 mb-1">
              <div>
                <Select
                  onValueChange={(value) => setSelectedMonthCrew(Number(value))}
                  value={selectedMonthCrew.toString()}
                >
                  <SelectTrigger className="w-full rounded-md h-10 gap-1 mb-3">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(value) => setSelectedYearCrew(Number(value))}
                  value={selectedYearCrew.toString()}
                >
                  <SelectTrigger className="w-full rounded-md h-10 gap-1">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpenExportModalCrew(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (exportType == "pdf") {
                    handlePdfExportCrew();
                  } else if (exportType == "excel") {
                    handleExcelExportCrew();
                  }
                }}
                className="flex-1 bg-[#2E37A4] hover:bg-[#2E37A4]/90 text-white"
              >
                {(loadingPDFExportCrew || loadingExcelExportCrew) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export {exportType?.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
