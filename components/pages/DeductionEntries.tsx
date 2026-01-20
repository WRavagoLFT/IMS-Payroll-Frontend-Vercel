"use client";

import {
  useState,
  useEffect,
  useCallback,
  Dispatch,
  SetStateAction,
  useMemo,
} from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  User,
  Phone,
  PhoneCall,
  Mail,
  MoreHorizontal,
  Ship,
  Calendar,
  CircleCheck,
  CircleEllipsis,
  CircleX,
  CircleDot,
  Loader2,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { RiShieldStarLine, RiFilterOffLine } from "react-icons/ri";
import { AddDeductionDialog } from "@/components/dialogs/AddDeductionDialog";
import { Switch } from "@/components/ui/switch";
import {
  getDeductionEntries,
  DeductionEntries as DeductionEntriesType,
  getCrewDeductionList,
  addHDMFUpgrade,
  getCrewHDMFUpgrade,
  getCrewPhilhealth,
  philhealthDeductionItem,
  getCrewSSS,
  sssDeductionItem,
  HDMFHistoryEntry,
  deleteCrewDeductionEntry,
} from "@/src/services/deduction/crewDeduction.api";
import { getCrewBasic } from "@/src/services/crew/crew.api";
import Base64Image from "../Base64Image";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toast } from "../ui/use-toast";
import { EditDeductionDialog } from "../dialogs/EditDeductionDialog";
import Swal from "sweetalert2";

type Props = {
  crewCode: string | null;
  setOnSuccess: Dispatch<SetStateAction<boolean>>;
};

interface DeductionEntriesItem extends philhealthDeductionItem {
  Month?: string; // Month name
}

interface sssDeductionItemWithMonth extends sssDeductionItem {
  Month?: string;
}

const crewPhilhealthColumns = ({ } = {}): ColumnDef<DeductionEntriesItem>[] => [
  {
    accessorKey: "Month",
    header: "Month",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.Month}</div>;
    },
  },
  {
    accessorKey: "PayrollYear",
    header: "Year",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.PayrollYear}</div>;
    },
  },
  {
    accessorKey: "Salary",
    header: "Salary",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.Salary}</div>;
    },
  },
  {
    accessorKey: "EEPremiumRate",
    header: "EE Premium Rate",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.EEPremiumRate}</div>;
    },
  },
  {
    accessorKey: "EEPremium",
    header: "EE Premium",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.EEPremium}</div>;
    },
  },
];

const crewSSSColumns = ({ } = {}): ColumnDef<sssDeductionItemWithMonth>[] => [
  {
    accessorKey: "Month",
    header: "Month",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.Month}</div>;
    },
  },
  {
    accessorKey: "PayrollYear",
    header: "Year",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.PayrollYear}</div>;
    },
  },
  {
    accessorKey: "Salary",
    header: "Salary",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.Salary}</div>;
    },
  },
  {
    accessorKey: "RegularSS",
    header: "Regular SSS",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.RegularSS}</div>;
    },
  },
  {
    accessorKey: "MutualFund",
    header: "Mutual Fund",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.MutualFund}</div>;
    },
  },
  {
    accessorKey: "ERSS",
    header: "ER SSS",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.ERSS}</div>;
    },
  },
  {
    accessorKey: "ERMF",
    header: "ER MF",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.ERMF}</div>;
    },
  },
  {
    accessorKey: "EC",
    header: "EC",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.EC}</div>;
    },
  },
  {
    accessorKey: "EESS",
    header: "EE SSS",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.EESS}</div>;
    },
  },
  {
    accessorKey: "EEMF",
    header: "EE MF",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.EEMF}</div>;
    },
  },
];

const crewHDMFColumns = ({ } = {}): ColumnDef<HDMFHistoryEntry>[] => [
  {
    accessorKey: "PayMonth",
    header: "Pay Month",
    cell: ({ row }) => {
      const monthIndex = Number(row.original.PayMonth) - 1;
      const monthName = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ][monthIndex] || "";

      return <div className="text-center">{monthName}</div>;
    },
  },
  {
    accessorKey: "PayYear",
    header: "PayYear",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.PayYear}</div>;
    },
  },
  {
    accessorKey: "Salary",
    header: "Salary",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.Salary}</div>;
    },
  },
  {
    accessorKey: "EE",
    header: "EE",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.EE}</div>;
    },
  },
  {
    accessorKey: "ER",
    header: "ER",
    cell: ({ row }) => {
      return <div className="text-center">{row.original.ER}</div>;
    },
  }
];

export default function DeductionEntries() {
  const params = useSearchParams();
  const crewCode = params.get("crewCode");
  const [activeTab, setActiveTab] = useState("deduction-entries");
  const today = new Date();
  const currentYear = today.getFullYear().toString(); // e.g. "2025"
  const currentMonth = today.toLocaleString("default", { month: "long" }); // e.g. "June"
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [crewData, setCrewData] = useState({
    name: "",
    rank: "",
    vessel: "",
    crewCode: "",
    mobileNo: "",
    landlineNo: "",
    emailAddress: "",
    birthday: "",
    profileImage: {
      FileContent: "",
      FileExtension: "",
      ContentType: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [deductionEntries, setDeductionEntries] = useState<DeductionEntriesType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [onSuccess, setOnSuccess] = useState(false);
  const [HDMFUpgradeAmount, setHDMFUpgradeAmount] = useState<number>(0);
  const [isDollar, setIsDollar] = useState<boolean>(false);
  const [HDMFHistoryAmount, setHDMFHistoryAmount] = useState<HDMFHistoryEntry[]>([]);
  const [selectedHDMFYear, setSelectedHDMFYear] = useState<string>(new Date().getFullYear().toString());
  const [hdmfLoading, setHdmfLoading] = useState(false);
  const [hdmfYears, sethdmfYears] = useState<string[]>([]);
  const [onSuccessHDMF, setOnSuccessHDMF] = useState(false);

  // PhilHealth states
  const [philhealthData, setPhilhealthData] = useState<philhealthDeductionItem[]>([]);
  const [selectedPhilhealthYear, setSelectedPhilhealthYear] = useState<string>(new Date().getFullYear().toString());
  const [philhealthYears, setPhilhealthYears] = useState<string[]>([]);
  const [philhealthLoading, setPhilhealthLoading] = useState<boolean>(false);

  // SSS states
  const [sssData, setSSSData] = useState<sssDeductionItem[]>([]);
  const [selectedSSSYear, setSelectedSSSYear] = useState<string>(new Date().getFullYear().toString());
  const [sssYears, setSSSYears] = useState<string[]>([]);
  const [sssLoading, setSSSLoading] = useState<boolean>(false);

  const [selectedDeduction, setSelectedDeduction] = useState<DeductionEntriesType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const monthMap = useMemo<Record<number, string>>(
    () => ({
      1: "January",
      2: "February",
      3: "March",
      4: "April",
      5: "May",
      6: "June",
      7: "July",
      8: "August",
      9: "September",
      10: "October",
      11: "November",
      12: "December",
    }),
    []
  );

  useEffect(() => {
    if (crewCode) {
      fetchDeductionEntries(crewCode);
    }
  }, [crewCode]);

  const fetchDeductionEntries = useCallback(async (crewCode: string) => {
    if (!crewCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getDeductionEntries(crewCode);
      
      if (response.success) {
        setDeductionEntries(response.data);
        

        // Populate dropdown filters only — don't auto-select
        const years = [
          ...new Set(response.data.map((entry) => entry.Year.toString())),
        ];
        years.sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableYears(years);

        const months = [...new Set(response.data.map((entry) => entry.Month))];
        const monthOrder = [
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
        months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
        setAvailableMonths(months);
      } else {
        setError(response.message || "Failed to fetch deduction entries");
      }
    } catch (err) {
      setError("Error fetching deduction entries");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPhilhealthData = useCallback(
    async (crewCode: string, year: number = 0) => {
      if (!crewCode) return;

      setPhilhealthLoading(true);

      try {
        const response = await getCrewPhilhealth(crewCode, year);

        if (response.success) {
          const mappedData = response.data.map((item) => ({
            ...item,
            Month: monthMap[item.PayrollMonth],
          }));

          setPhilhealthData(mappedData);

          if (year === 0) {
            const years = [
              ...new Set(
                response.data.map((entry) => entry.PayrollYear.toString())
              ),
            ];
            years.sort((a, b) => parseInt(b) - parseInt(a));

            setPhilhealthYears(years);

            if (years.length > 0 && !selectedPhilhealthYear) {
              setSelectedPhilhealthYear(years[0]);
            }
          }
        } else {
          console.error("Failed to fetch PhilHealth data:", response.message);
        }
      } catch (error) {
        console.error("Error fetching PhilHealth data:", error);
      } finally {
        setPhilhealthLoading(false);
      }
    },
    [monthMap, selectedPhilhealthYear]
  );

  const fetchSSSData = useCallback(
    async (crewCode: string, year: number = 0) => {
      if (!crewCode) return;

      setSSSLoading(true);

      try {
        const response = await getCrewSSS(crewCode, year);

        if (response.success) {
          const mappedData = response.data.map((item) => ({
            ...item,
            Month: monthMap[item.PayrollMonth],
          }));

          setSSSData(mappedData);

          if (year === 0) {
            const years = [
              ...new Set(
                response.data.map((entry) => entry.PayrollYear.toString())
              ),
            ];
            years.sort((a, b) => parseInt(b) - parseInt(a));

            setSSSYears(years);

            if (years.length > 0 && !selectedSSSYear) {
              setSelectedSSSYear(years[0]);
            }
          }
        } else {
          console.error("Failed to fetch SSS data:", response.message);
        }
      } catch (error) {
        console.error("Error fetching SSS data:", error);
      } finally {
        setSSSLoading(false);
      }
    },
    [monthMap, selectedSSSYear]
  );

  const apiDeductionColumns = ({
    crewCode,
    setOnSuccess,
  }: Props): ColumnDef<DeductionEntriesType>[] => [
      {
        accessorKey: "Date",
        header: "Date",
        cell: ({ row }) => {
          const month = row.original.Month;
          const year = row.original.Year ?? row.original.Year;
          return (
            <div className="text-center">
              {month && year ? `${month} ${year}` : "N/A"}
            </div>
          );
        },
      },
      {
        accessorKey: "Deduction",
        header: "Deduction",
      },
      {
        accessorKey: "Amount",
        header: "Amount",
        cell: ({ row }) => {
          return <div className="text-right">{row.original.Amount.toFixed(2)}</div>;
        },
      },
      {
        accessorKey: "Remarks",
        header: "Remarks",
        cell: ({ row }) => {
          const remarks = row.getValue("Remarks");
          const text = typeof remarks === "string" ? remarks.trim() : "";
          return (
            <div className={text ? "" : "text-gray-500 italic"}>
              {text || "No remarks."}
            </div>
          );
        },
      },
      {
        accessorKey: "Status",
        header: "Status",
        cell: ({ row }) => {
          const getStatusColor = (statusCode: string) => {
            switch (statusCode) {
              case "Completed":
                return "bg-green-100 text-green-800";
              case "Pending":
                return "bg-yellow-100 text-yellow-800";
              case "Adjusted":
                return "bg-blue-100 text-blue-800";
              case "Failed":
                return "bg-red-100 text-red-800";
              case "On Hold":
                return "bg-gray-100 text-gray-800";
              default:
                return "bg-gray-100 text-gray-800";
            }
          };

          const statusTextMap: Record<string, string> = {
            Completed: "Posted",
            Pending: "Not Posted",
            Adjusted: "Adjusted",
            Failed: "Failed",
            "On Hold": "On Hold",
          };

          const rawStatus = row.original.Status.toString(10);
          const displayText = statusTextMap[rawStatus] ?? rawStatus;

          return (
            <div className="flex justify-center">
              <span
                className={`px-2 py-1 w-full rounded-full text-xs ${getStatusColor(
                  rawStatus
                )}`}
              >
                {displayText}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const deductionId = row.original.DeductionDetailID;
          const Posted = String(row?.original?.Status) === "Completed";

          const handleDelete = (crewCode: string, deductionId: number) => {
            const swalWithBootstrapButtons = Swal.mixin({
              customClass: {
                confirmButton:
                  "bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 mx-2 rounded",
                cancelButton:
                  "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 mx-2 rounded",
              },
              buttonsStyling: false,
            });

            swalWithBootstrapButtons
              .fire({
                title: "Are you sure?",
                text: `Are you sure you want to delete deduction ${deductionId}? This action cannot be undone.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
                cancelButtonText: "No, cancel!",
                reverseButtons: true,
              })
              .then(async (result) => {
                if (result.isConfirmed) {
                  await deleteCrewDeductionEntry(crewCode, deductionId).then(
                    (response) => {
                      if (response.success) {
                        setOnSuccess(true);
                        toast({
                          title: "Deleted!",
                          description: "The deduction has been successfully deleted.",
                          variant: "success",
                        });
                      } else {
                        swalWithBootstrapButtons.fire({
                          title: "Error!",
                          text: response.message || "Failed to delete deduction.",
                          icon: "error",
                        });
                      }
                    }
                  );
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                  Swal.fire({
                    title: "Cancelled",
                    text: "Process cancelled.",
                    icon: "error",
                  });
                }
              });
          };

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
                    onClick={() => {
                      const deduction = deductionEntries.find(d => d.DeductionDetailID === deductionId);
                      if (Posted) {
                        Swal.fire({
                          title: "Not Editable",
                          text: "This movement cannot be edited. Payment has already been posted.",
                          icon: "error",
                          confirmButtonText: "OK",
                        });
                        return;
                      }
                      if (deduction) {
                        setSelectedDeduction(deduction);
                        setEditDialogOpen(true);
                      }
                    }}
                  >
                    <Pencil className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                    Edit Deduction Entry
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive text-xs sm:text-sm"
                    onClick={() => {
                      if (crewCode) {
                        handleDelete(crewCode, deductionId)
                      }
                    }}
                  >
                    <Trash className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];

  useEffect(() => {
    if (!crewCode || !selectedPhilhealthYear) return;

    fetchPhilhealthData(crewCode, parseInt(selectedPhilhealthYear));
  }, [crewCode, selectedPhilhealthYear, fetchPhilhealthData]);

  useEffect(() => {
    if (!crewCode || !selectedSSSYear) return;

    fetchSSSData(crewCode, parseInt(selectedSSSYear));
  }, [crewCode, selectedSSSYear, fetchSSSData]);

  useEffect(() => {
    if (!crewCode) return;

    const today = new Date().getFullYear()

    fetchPhilhealthData(crewCode, today);
    fetchSSSData(crewCode, today);
  }, [crewCode, fetchPhilhealthData, fetchSSSData]);

  useEffect(() => {
    const tab = params.get("tab");
    if (
      tab &&
      ["deduction-entries", "hdmf-upgrade", "philhealth", "sss"].includes(
        tab.toString()
      )
    ) {
      setActiveTab(tab.toString());
    }
  }, [params]);

  // Read the parameters from URL and fetch crew details
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const crewCodeParam = params.get("crewCode");

    if (tabParam === "hdmf-upgrade") {
      setActiveTab("hdmf-upgrade");
    }

    // Fetch crew details if we have a crew code
    if (crewCodeParam) {
      const decodedCrewCode = decodeURIComponent(crewCodeParam);

      // Fetch both crew basic info and vessel info in parallel
      Promise.all([getCrewBasic(decodedCrewCode), getCrewDeductionList()])
        .then(([basicResponse, deductionResponse]) => {
          if (basicResponse.success) {
            const { data } = basicResponse;

            // Find the crew's vessel from the deduction list
            const crewVessel = deductionResponse.success
              ? deductionResponse.data.find(
                (item) => item.CrewCode === decodedCrewCode
              )?.VesselName
              : "";

            setCrewData({
              name: `${data.FirstName} ${data.MiddleName ? data.MiddleName.charAt(0) + ". " : ""
                }${data.LastName}`,
              rank: data.Rank,
              vessel: crewVessel || "",
              crewCode: decodedCrewCode,
              mobileNo: data.MobileNo,
              landlineNo: data.LandLineNo,
              emailAddress: data.EmailAddress,
              birthday: data.Birthday,
              profileImage: {
                FileContent: data.ProfileImage?.FileContent || "",
                FileExtension: data.ProfileImage?.FileExtension || "",
                ContentType: data.ProfileImage?.ContentType || "",
              },
            });

            // After getting crew info, fetch deduction entries
            fetchDeductionEntries(decodedCrewCode);
          }
        })
        .catch((error) => {
          console.error("Error fetching crew details:", error);
          setError("Failed to fetch crew details");
        });
    }
  }, [fetchDeductionEntries]);

  useEffect(() => {
    if (!crewData.crewCode) return;

    const fetchCrewHDMFUpgrade = async () => {
      try {
        const response = await getCrewHDMFUpgrade(crewData.crewCode);
        if (response.success && response.data) {
          const { Amount, History } = response.data;

          setHDMFUpgradeAmount(Amount.HDMFAmount ?? 0);
          setIsDollar(Amount.DollarCurrency === 1);
          setHDMFHistoryAmount(History ?? []);

          const uniqueYears = Array.from(
            new Set((History ?? []).map((entry) => entry.PayYear.toString()))
          ).sort((a, b) => Number(b) - Number(a));
          sethdmfYears(uniqueYears);
        } else {
          console.error("Failed to fetch HDMF Upgrade:", response);
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Error fetching HDMF Upgrade:", error);
        toast({
          title: "Error fetching HDMF Upgrade",
          description: err.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    fetchCrewHDMFUpgrade();
    setOnSuccessHDMF(false);
  }, [crewData.crewCode, onSuccessHDMF]);

  // Re-fetch data when month or year changes
  useEffect(() => {
    if (crewData.crewCode) {
      fetchDeductionEntries(crewData.crewCode);
    }

    if (onSuccess) {
      // Reset onSuccess state after fetching new data
      fetchDeductionEntries(crewData.crewCode);
      setOnSuccess(false);
    }
  }, [
    selectedMonth,
    selectedYear,
    crewData.crewCode,
    fetchDeductionEntries,
    onSuccess,
  ]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);

    window.history.pushState({}, "", url.toString());
  };

  // Filter entries by selected month and year
  const filteredEntries = useMemo(() => {
    const monthOrder = [
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

    return deductionEntries
      .filter((entry) => {
        const matchesMonth =
          selectedMonth === "all" || entry.Month === selectedMonth;
        const matchesYear =
          selectedYear === "all" || entry.Year.toString() === selectedYear;
        return matchesMonth && matchesYear;
      })
      .sort((a, b) => {
        const yearA = a.Year;
        const yearB = b.Year;

        if (yearA !== yearB) return yearB - yearA;

        const monthA = monthOrder.indexOf(a.Month);
        const monthB = monthOrder.indexOf(b.Month);
        return monthB - monthA;
      });
  }, [deductionEntries, selectedMonth, selectedYear]);

  // Filter PhilHealth data by selected year
  const filteredPhilhealthData = useMemo(() => {
    if (!selectedPhilhealthYear) return [];
    return philhealthData.filter(
      (entry) => entry.PayrollYear.toString() === selectedPhilhealthYear
    );
  }, [philhealthData, selectedPhilhealthYear]);

  const filteredHDMFData = useMemo(() => {
    if (!selectedHDMFYear) return [];
    return HDMFHistoryAmount.filter(
      (entry) => entry.PayYear.toString() === selectedHDMFYear
    );
  }, [HDMFHistoryAmount, selectedHDMFYear]);

  // Filter SSS data by selected year
  const filteredSSSData = useMemo(() => {
    if (!selectedSSSYear) return [];
    return sssData.filter(
      (entry) => entry.PayrollYear.toString() === selectedSSSYear
    );
  }, [sssData, selectedSSSYear]);

  const handleSubmitHDMFUpgrade = () => {
    setHdmfLoading(true);

    addHDMFUpgrade(crewData.crewCode, HDMFUpgradeAmount, isDollar ? 1 : 0)
      .then((response) => {
        if (response.success) {
          toast({
            title: "HDMF Upgrade Amount saved successfully",
            description: `Amount: ${HDMFUpgradeAmount} ${isDollar ? "USD" : "PHP"
              }`,
            variant: "success",
          });
          setOnSuccess(true);
          setOnSuccessHDMF(true);
        } else {
          toast({
            title: "Failed to save HDMF Upgrade Amount",
            description: response.message || "Unknown error",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        toast({
          title: "Error saving HDMF Upgrade Amount",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      })
      .finally(() => {
        setHdmfLoading(false);
      });
  };

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const hasHadBirthdayThisYear =
      today.getMonth() > birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() >= birthDate.getDate());

    if (!hasHadBirthdayThisYear) {
      age--;
    }

    return age;
  };

  return (
    <div className="h-full w-full p-4 pt-3">
      <div className="flex flex-col space-y-6">
        {/* Header with back button and title */}
        <div className="flex items-center justify-between mt-3 mb-4">
          <div className="flex items-center gap-2">
            <Link href="/home/deduction">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold">Crew Deduction Entries</h1>
          </div>
          {activeTab === "deduction-entries" && (
            <Button
              className="w-40 bg-primary hover:bg-primary/90"
              onClick={() => setIsAddDeductionOpen(true)}
            >
              <Plus />
              Add Deduction
            </Button>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card className="h-[calc(100vh-180px)] flex flex-col overflow-hidden">
              <CardContent className="p-4 flex flex-col items-center text-center overflow-y-auto scrollbar-hide flex-1">
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
                <div className="w-60 h-60 min-w-[160px] bg-white rounded-md mb-3 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                  {!crewData.profileImage.FileContent ? (
                    <Image
                      width={256}
                      height={160}
                      src="/image.png"
                      alt="Selfie with ID Attachment"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <>
                      <Base64Image
                        imageType={crewData.profileImage?.ContentType || ""}
                        alt="Crew Profile Image"
                        base64String={crewData.profileImage?.FileContent || ""}
                        width={60}
                        height={60}
                        className="object-contain w-full h-full"
                      />
                    </>
                  )}
                </div>

                <h2 className="text-lg font-bold mb-1 w-full">
                  {crewData.name}
                </h2>
                <div className="flex items-center gap-3 mb-3 flex-wrap justify-center">
                  <div className="text-sm px-2 py-0.5 bg-green-100 text-green-800 rounded-full border-green-300 flex items-center gap-1 flex-shrink-0">
                    Active
                  </div>
                </div>

                <div className="w-full space-y-3 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Crew Code</div>
                      <div className="text-sm font-medium truncate">
                        {crewData.crewCode}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiShieldStarLine className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Rank</div>
                      <div className="text-sm font-medium truncate">
                        {crewData.rank}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">
                        Current Vessel
                      </div>
                      <div className="text-sm font-medium truncate">
                        {crewData.vessel}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Age</div>
                      <div className="text-sm font-medium truncate">
                        {crewData.birthday
                          ? `${calculateAge(crewData.birthday)} years old`
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full mt-4 pt-4 border-t min-w-0">
                  <h3 className="text-md font-semibold mb-3 text-left">
                    Contact Information
                  </h3>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500">
                          Mobile Number
                        </div>

                        <div className="text-sm font-medium truncate">
                          {crewData.mobileNo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500">
                          Landline Number
                        </div>

                        <div className="text-sm font-medium truncate">
                          {crewData.landlineNo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500">
                          Email Address
                        </div>

                        <div className="text-sm font-medium truncate">
                          {crewData.emailAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right content area with tabs */}
          <div className="md:col-span-3">
            <Card className="h-[calc(100vh-180px)] flex flex-col">
              <Tabs
                defaultValue={activeTab}
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full flex flex-col h-full"
              >
                <div className="border-b">
                  <div className="px-4 pt-1">
                    <TabsList className="bg-transparent p-0 h-8 w-full flex justify-start space-x-8">
                      <TabsTrigger
                        value="deduction-entries"
                        className="px-10 pb-8 h-full text-lg w-1/4 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                      >
                        Deduction Entries
                      </TabsTrigger>
                      <TabsTrigger
                        value="hdmf-upgrade"
                        className="px-10 pb-8 h-full text-lg w-1/4 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                      >
                        HDMF Upgrade Contributions
                      </TabsTrigger>
                      <TabsTrigger
                        value="philhealth"
                        className="px-10 pb-8 h-full text-lg w-1/4 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                      >
                        Philhealth Contributions
                      </TabsTrigger>
                      <TabsTrigger
                        value="sss"
                        className="px-10 pb-8 h-full text-lg w-1/4 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                      >
                        SSS Contributions
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <TabsContent
                  value="deduction-entries"
                  className="p-6 mt-0 overflow-y-auto flex-1"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-center gap-6 w-full">
                      <div className="w-full">
                        <Select
                          value={selectedMonth}
                          onValueChange={setSelectedMonth}
                        >
                          <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                            <div className="flex items-center w-full">
                              <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                                Select Month
                              </span>
                              <SelectValue className="text-black text-base pl-3" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableMonths.length > 0 ? (
                              availableMonths.map((month) => (
                                <SelectItem key={month} value={month}>
                                  {month}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="January">January</SelectItem>
                                <SelectItem value="February">
                                  February
                                </SelectItem>
                                <SelectItem value="March">March</SelectItem>
                                <SelectItem value="April">April</SelectItem>
                                <SelectItem value="May">May</SelectItem>
                                <SelectItem value="June">June</SelectItem>
                                <SelectItem value="July">July</SelectItem>
                                <SelectItem value="August">August</SelectItem>
                                <SelectItem value="September">
                                  September
                                </SelectItem>
                                <SelectItem value="October">October</SelectItem>
                                <SelectItem value="November">
                                  November
                                </SelectItem>
                                <SelectItem value="December">
                                  December
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full">
                        <Select
                          value={selectedYear}
                          onValueChange={setSelectedYear}
                        >
                          <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                            <div className="flex items-center w-full">
                              <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                                Select Year
                              </span>
                              <SelectValue className="text-black text-base pl-3" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableYears.length > 0 ? (
                              availableYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full">
                        <div className="flex justify-end w-full mt-2">
                          <Button
                            className="w-48 text-primary border border-gray-300 bg-white hover:bg-gray-50"
                            onClick={() => {
                              setSelectedMonth("all");
                              setSelectedYear("all");
                            }}
                          >
                            <RiFilterOffLine className="w-4 h-4" />
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#F9F9F9] rounded-xl border border-gray-200 overflow-hidden pb-3">
                      {loading ? (
                        <div className="flex justify-center items-center py-10">
                          <p>Loading deduction entries...</p>
                        </div>
                      ) : error ? (
                        <div className="flex justify-center items-center py-10 text-red-500">
                          <p>{error}</p>
                        </div>
                      ) : filteredEntries.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                          <p>No deduction entries found for this period.</p>
                        </div>
                      ) : (
                        <DataTable
                          columns={apiDeductionColumns({
                            crewCode,
                            setOnSuccess,
                          })}
                          data={filteredEntries}
                          pageSize={7}
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="hdmf-upgrade"
                  className="p-6 mt-0 overflow-y-auto flex-1"
                >
                  <div className="space-y-6">
                    <div className="bg-white p-4 mb-10 rounded-lg border border-gray-200">
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-end mb-2">
                            <div className="flex items-center gap-2 mb-4">
                              <Switch
                                checked={isDollar}
                                onCheckedChange={setIsDollar}
                                className="data-[state=checked]:bg-primary"
                              />
                              <span className="text-sm text-gray-500">
                                Dollar (USD)
                              </span>
                            </div>
                          </div>
                          <h3 className="text-sm text-gray-500 font-semibold mb-1">
                            HDMF Amount
                          </h3>
                          <Input
                            type="number"
                            placeholder="Enter HDMF Amount"
                            className="bg-white border border-gray-200 h-12"
                            value={HDMFUpgradeAmount}
                            onChange={(e) =>
                              setHDMFUpgradeAmount(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            className="bg-primary hover:bg-primary/90"
                            onClick={handleSubmitHDMFUpgrade}
                            disabled={hdmfLoading}
                          >
                            {hdmfLoading ? (
                              <>
                                <Loader2 className="animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Pencil className="mr-2" />
                                Edit Amount
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                    </div>
                    <div className="ml-auto w-1/2">
                      <Select
                        value={selectedHDMFYear}
                        onValueChange={setSelectedHDMFYear}
                      >
                        <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                          <div className="flex items-center w-full">
                            <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                              Select Year
                            </span>
                            <SelectValue className="text-black text-base pl-3" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {hdmfYears.length > 0 ? (
                            hdmfYears.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2023">2023</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-[#F9F9F9] rounded-xl border border-gray-200 overflow-hidden pb-3">
                      {philhealthLoading ? (
                        <div className="flex justify-center items-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mr-2" />
                          <p>Loading HDMF data...</p>
                        </div>
                      ) : error ? (
                        <div className="flex justify-center items-center py-10 text-red-500">
                          <p>{error}</p>
                        </div>
                      ) : filteredPhilhealthData.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                          <p>No HDMF entries found for this year.</p>
                        </div>
                      ) : (
                        <DataTable
                          columns={crewHDMFColumns()}
                          data={filteredHDMFData}
                          pageSize={7}
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="philhealth"
                  className="p-6 mt-0 overflow-y-auto flex-1"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-center gap-6 w-full">
                      <div className="w-1/2"></div>
                      <div className="w-1/2">
                        <Select
                          value={selectedPhilhealthYear}
                          onValueChange={setSelectedPhilhealthYear}
                        >
                          <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                            <div className="flex items-center w-full">
                              <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                                Select Year
                              </span>
                              <SelectValue className="text-black text-base pl-3" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {philhealthYears.length > 0 ? (
                              philhealthYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-[#F9F9F9] rounded-xl border border-gray-200 overflow-hidden pb-3">
                      {philhealthLoading ? (
                        <div className="flex justify-center items-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mr-2" />
                          <p>Loading PhilHealth data...</p>
                        </div>
                      ) : error ? (
                        <div className="flex justify-center items-center py-10 text-red-500">
                          <p>{error}</p>
                        </div>
                      ) : filteredPhilhealthData.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                          <p>No PhilHealth entries found for this year.</p>
                        </div>
                      ) : (
                        <DataTable
                          columns={crewPhilhealthColumns()}
                          data={filteredPhilhealthData}
                          pageSize={7}
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="sss"
                  className="p-6 mt-0 overflow-y-auto flex-1"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-center gap-6 w-full">
                      <div className="w-1/2"></div>
                      <div className="w-1/2">
                        <Select
                          value={selectedSSSYear}
                          onValueChange={setSelectedSSSYear}
                        >
                          <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                            <div className="flex items-center w-full">
                              <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                                Select Year
                              </span>
                              <SelectValue className="text-black text-base pl-3" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {sssYears.length > 0 ? (
                              sssYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-[#F9F9F9] rounded-xl border border-gray-200 overflow-hidden pb-3">
                      {sssLoading ? (
                        <div className="flex justify-center items-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mr-2" />
                          <p>Loading SSS data...</p>
                        </div>
                      ) : error ? (
                        <div className="flex justify-center items-center py-10 text-red-500">
                          <p>{error}</p>
                        </div>
                      ) : filteredSSSData.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                          <p>No SSS entries found for this year.</p>
                        </div>
                      ) : (
                        <DataTable
                          columns={crewSSSColumns()}
                          data={filteredSSSData}
                          pageSize={7}
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
      <AddDeductionDialog
        open={isAddDeductionOpen}
        onOpenChange={setIsAddDeductionOpen}
        setOnSuccess={setOnSuccess}
      />

      {selectedDeduction && (
        <EditDeductionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          deduction={selectedDeduction}
          crewCode={crewCode ?? ""}
          setOnSuccess={setOnSuccess}

        />
      )}
    </div>
  );
}
