"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Plus,
  CircleCheck,
  CircleEllipsis,
  CircleX,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { RiShieldStarLine } from "react-icons/ri";
import { AddRemittanceDialog } from "@/components/dialogs/AddRemittanceDialog";
import {
  getCrewRemittanceDetails,
  getCrewRemittanceList,
  getAllottees,
  editRemittanceStatus,
  deleteCrewRemittance,
  type CrewRemittanceItem,
  type AllotteeOption,
} from "@/src/services/remittance/crewRemittance.api";
import { getCrewBasic } from "@/src/services/crew/crew.api";
import Swal from "sweetalert2";
import Base64Image from "../Base64Image";
import Image from "next/image";

type RemittanceEntry = {
  remittanceId: number;
  remittanceHeaderId: number;
  allottee: string;
  amount: number;
  remarks?: string;
  status: "Completed" | "Pending" | "On Hold" | "Declined";
};

const mapStatusToDisplay = (
  status: string | number
): RemittanceEntry["status"] => {
  if (typeof status === "number") {
    switch (status) {
      case 0:
        return "Pending";
      case 1:
        return "Completed";
      case 2:
        return "Declined";
      case 3:
        return "On Hold";
      default:
        return "Pending";
    }
  } else {
    const statusStr = status?.toString();

    switch (statusStr) {
      case "0":
        return "Pending";
      case "1":
        return "Completed";
      case "2":
        return "Declined";
      case "3":
        return "On Hold";
      default:
        const normalizedStatus = statusStr?.toLowerCase().trim();
        switch (normalizedStatus) {
          case "completed":
            return "Completed";
          case "declined":
            return "Declined";
          case "on hold":
            return "On Hold";
          case "pending":
          default:
            return "Pending";
        }
    }
  }
};

export default function RemittanceDetails() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [isAddRemittanceOpen, setIsAddRemittanceOpen] = useState(false);
  // const [isDollar, setIsDollar] = useState(false);
  const [remittanceData, setRemittanceData] = useState<RemittanceEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [allottees, setAllottees] = useState<AllotteeOption[]>([]);
  const initialLoadDone = useRef(false);
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
      FileContent: undefined as string | undefined,
      FileExtension: undefined as string | undefined,
      ContentType: undefined as string | undefined,
    },
  });

  const getStatusLabel = (statusValue: string): string => {
    switch (statusValue) {
      case "0":
        return "Pending";
      case "1":
        return "Completed";
      case "2":
        return "Declined";
      case "3":
        return "On Hold";
      default:
        return "Unknown";
    }
  };

  const handleStatusChange = async (
    remittanceDetailId: number,
    newStatus: string
  ) => {
    try {
      if (!crewData.crewCode || crewData.crewCode.trim() === "") {
        await Swal.fire({
          title: "Error!",
          text: "Crew code is not available. Please refresh the page and try again.",
          icon: "error",
          confirmButtonColor: "#ef4444",
        });
        return;
      }

      const targetRemittance = remittanceData.find(
        (item) => item.remittanceId === remittanceDetailId
      );

      const statusLabel = getStatusLabel(newStatus);

      const result = await Swal.fire({
        title: "Confirm Status Change",
        text: `Change status for ${targetRemittance?.allottee} to: ${statusLabel}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#22bb33",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, change it!",
        cancelButtonText: "Cancel",
      });

      if (result.isConfirmed) {
        try {
          const response = await editRemittanceStatus(
            remittanceDetailId,
            { Status: newStatus },
            crewData.crewCode
          );

          if (response && response.success) {
            await Swal.fire({
              title: "Success!",
              text: `Status for ${targetRemittance?.allottee} changed to ${statusLabel} successfully.`,
              icon: "success",
              confirmButtonColor: "#22c55e",
            });

            setRemittanceData((prevData) =>
              prevData.map((item) =>
                item.remittanceId === remittanceDetailId
                  ? {
                      ...item,
                      status: statusLabel as RemittanceEntry["status"],
                    }
                  : item
              )
            );

            setTimeout(async () => {
              await fetchRemittanceDataForSelection(
                crewData.crewCode,
                selectedMonth,
                selectedYear
              );
            }, 500);
          } else {
            await Swal.fire({
              title: "Error!",
              text: response?.message || "Failed to update status.",
              icon: "error",
              confirmButtonColor: "#ef4444",
            });
          }
        } catch (error: unknown) {
          const err = error as Error;

          await Swal.fire({
            title: "Error!",
            text: err.message,
            icon: "error",
            confirmButtonColor: "#ef4444",
          });
        }
      }
    } catch (error) {
      console.error("Status change confirmation error:", error);
    }
  };

  const handleDeleteRemittance = async (remittanceHeaderId: number) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "Are you sure you want to delete this remittance? This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        const response = await deleteCrewRemittance(
          crewData.crewCode,
          remittanceHeaderId
        );

        if (response.success) {
          await Swal.fire({
            title: "Deleted!",
            text: "The remittance has been successfully deleted.",
            icon: "success",
            confirmButtonColor: "#22c55e",
          });

          setRemittanceData((prevData) =>
            prevData.filter(
              (item) => item.remittanceHeaderId !== remittanceHeaderId
            )
          );

          await fetchRemittanceDataForSelection(
            crewData.crewCode,
            selectedMonth,
            selectedYear
          );
        } else {
          await Swal.fire({
            title: "Error!",
            text: response.message || "Failed to delete remittance.",
            icon: "error",
            confirmButtonColor: "#ef4444",
          });
        }
      }
    } catch (error: unknown) {
      const errorMsg =
        (error as Error).message ||
        "An error occurred while deleting the remittance";

      await Swal.fire({
        title: "Error!",
        text: errorMsg,
        icon: "error",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const remittanceColumns: ColumnDef<RemittanceEntry>[] = [
    {
      accessorKey: "allottee",
      header: "Allottee",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.original.amount;
        return (
          <div className="text-center">
            {new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const getStatusColor = (status: string) => {
          switch (status) {
            case "Completed":
              return "bg-green-100 text-green-800";
            case "Pending":
              return "bg-yellow-100 text-yellow-800";
            case "Adjusted":
              return "bg-blue-100 text-blue-800";
            case "Failed":
            case "Declined":
              return "bg-red-100 text-red-800";
            case "On Hold":
              return "bg-gray-100 text-gray-800";
            default:
              return "bg-gray-100 text-gray-800";
          }
        };

        return (
          <div className="flex justify-center">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium min-w-[80px] text-center ${getStatusColor(
                status
              )}`}>
              {status}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const remittanceDetailId = row.original.remittanceId;
        const remittanceHeaderId = row.original.remittanceHeaderId;
        const currentStatus = row.original.status;

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
                  className=""
                  onClick={() => handleStatusChange(remittanceDetailId, "1")}
                  disabled={currentStatus === "Completed"}>
                  <CircleCheck strokeWidth={2} />
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem
                  className=""
                  onClick={() => handleStatusChange(remittanceDetailId, "0")}
                  disabled={currentStatus === "Pending"}>
                  <CircleEllipsis strokeWidth={2} />
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem
                  className=""
                  onClick={() => handleStatusChange(remittanceDetailId, "2")}
                  disabled={currentStatus === "Declined"}>
                  <CircleX strokeWidth={2} />
                  Declined
                </DropdownMenuItem>
                <DropdownMenuItem
                  className=""
                  onClick={() => handleStatusChange(remittanceDetailId, "3")}
                  disabled={currentStatus === "On Hold"}>
                  <CircleDot strokeWidth={2} />
                  On Hold
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (remittanceHeaderId && !isNaN(remittanceHeaderId)) {
                      handleDeleteRemittance(remittanceHeaderId);
                    } else {
                      Swal.fire({
                        title: "Error!",
                        text: "Invalid remittance header ID format",
                        icon: "error",
                        confirmButtonColor: "#ef4444",
                      });
                    }
                  }}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Initial data load that sets default month and year
  const fetchInitialRemittanceData = useCallback(
    async (crewCode: string) => {
      if (crewCode) {
        try {
          const response = await getCrewRemittanceDetails(crewCode);
          if (response.success && response.data.length > 0) {
            const years = [...new Set(response.data.map((item) => item.Year))];
            setAvailableYears(years.sort((a, b) => b - a));

            const sortedData = [...response.data].sort((a, b) => {
              const dateA = new Date(a.Year, getMonthNumber(a.Month));
              const dateB = new Date(b.Year, getMonthNumber(b.Month));
              return dateB.getTime() - dateA.getTime();
            });

            const latestRemittance = sortedData[0];

            // Only set default values if this is the first load
            if (!initialLoadDone.current) {
              setSelectedMonth(latestRemittance.Month);
              setSelectedYear(latestRemittance.Year.toString());
              initialLoadDone.current = true;
            }

            // Use the current selections to filter data
            const currentMonth = selectedMonth || latestRemittance.Month;
            const currentYear =
              selectedYear || latestRemittance.Year.toString();

            const filteredData = sortedData
              .filter(
                (item) =>
                  item.Month === currentMonth &&
                  item.Year.toString() === currentYear
              )
              .sort((a, b) => b.RemittanceDetailID - a.RemittanceDetailID)
              .map((item) => {
                const remittanceDetailId = item.RemittanceDetailID;
                const remittanceHeaderId = item.RemittanceHeaderID;

                const mappedItem: RemittanceEntry = {
                  remittanceId: Number(remittanceDetailId),
                  remittanceHeaderId: Number(remittanceHeaderId),
                  allottee: String(item.AllotteeName || ""),
                  amount: Number(item.Amount) || 0,
                  remarks: String(item.Remarks || ""),
                  status: mapStatusToDisplay(item.Status),
                };

                return mappedItem;
              });

            const validatedData = filteredData.filter((item) => {
              const isValid =
                typeof item.allottee === "string" &&
                typeof item.amount === "number" &&
                typeof item.status === "string" &&
                typeof item.remittanceId === "number" &&
                typeof item.remittanceHeaderId === "number" &&
                !isNaN(item.remittanceId) &&
                !isNaN(item.remittanceHeaderId) &&
                item.remittanceId > 0 &&
                item.remittanceHeaderId > 0;

              return isValid;
            });

            setRemittanceData(validatedData);
          } else {
            setRemittanceData([]);
          }
        } catch (error) {
          console.error("Error fetching remittance data:", error);
          setRemittanceData([]);
        }
      }
    },
    [selectedMonth, selectedYear]
  );

  // This function fetches data for a specific month/year selection without changing the selection
  const fetchRemittanceDataForSelection = useCallback(
    async (crewCode: string, month: string, year: string) => {
      if (crewCode && month && year) {
        try {
          const response = await getCrewRemittanceDetails(crewCode);
          if (response.success) {
            const years = [...new Set(response.data.map((item) => item.Year))];
            setAvailableYears(years.sort((a, b) => b - a));

            const filteredData = response.data
              .filter(
                (item) => item.Month === month && item.Year.toString() === year
              )
              .sort((a, b) => b.RemittanceDetailID - a.RemittanceDetailID)
              .map((item) => {
                const remittanceDetailId = item.RemittanceDetailID;
                const remittanceHeaderId = item.RemittanceHeaderID;

                const mappedItem: RemittanceEntry = {
                  remittanceId: Number(remittanceDetailId),
                  remittanceHeaderId: Number(remittanceHeaderId),
                  allottee: String(item.AllotteeName || ""),
                  amount: Number(item.Amount) || 0,
                  remarks: String(item.Remarks || ""),
                  status: mapStatusToDisplay(item.Status),
                };

                return mappedItem;
              });

            const validatedData = filteredData.filter((item) => {
              const isValid =
                typeof item.allottee === "string" &&
                typeof item.amount === "number" &&
                typeof item.status === "string" &&
                typeof item.remittanceId === "number" &&
                typeof item.remittanceHeaderId === "number" &&
                !isNaN(item.remittanceId) &&
                !isNaN(item.remittanceHeaderId) &&
                item.remittanceId > 0 &&
                item.remittanceHeaderId > 0;

              return isValid;
            });

            setRemittanceData(validatedData);
          } else {
            setRemittanceData([]);
          }
        } catch (error) {
          console.error("Error fetching remittance data:", error);
          setRemittanceData([]);
        }
      }
    },
    []
  );

  const fetchAllottees = async (crewCode: string) => {
    if (crewCode) {
      try {
        const response = await getAllottees(crewCode);
        if (response.success) {
          setAllottees(response.data);
        } else {
          setAllottees([]);
        }
      } catch (error) {
        console.error("Error fetching allottees:", error);
        setAllottees([]);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const crewCodeParam = params.get("crewCode");

    if (crewCodeParam) {
      const decodedCrewCode = decodeURIComponent(crewCodeParam);

      Promise.all([getCrewBasic(decodedCrewCode), getCrewRemittanceList()])
        .then(([basicResponse, remittanceResponse]) => {
          if (basicResponse.success) {
            const { data } = basicResponse;
            const crewVessel = remittanceResponse.success
              ? remittanceResponse.data.find(
                  (item: CrewRemittanceItem) =>
                    item.CrewCode === decodedCrewCode
                )?.Vessel
              : "";

            setCrewData({
              name: `${data.FirstName} ${
                data.MiddleName ? data.MiddleName.charAt(0) + ". " : ""
              }${data.LastName}`,
              rank: data.Rank,
              vessel: crewVessel || "",
              crewCode: decodedCrewCode,
              mobileNo: data.MobileNo,
              landlineNo: data.LandLineNo,
              emailAddress: data.EmailAddress,
              birthday: data.Birthday,
              profileImage: {
                ContentType: data.ProfileImage?.ContentType,
                FileContent: data.ProfileImage?.FileContent,
                FileExtension: data.ProfileImage?.FileExtension,
              },
            });

            fetchInitialRemittanceData(decodedCrewCode);
            fetchAllottees(decodedCrewCode);
          }
        })
        .catch((error) => {
          console.error("Error fetching crew data:", error);
        });
    }
  }, [fetchInitialRemittanceData]);

  // This effect handles changes in month/year selection
  useEffect(() => {
    if (
      crewData.crewCode &&
      selectedMonth &&
      selectedYear &&
      initialLoadDone.current
    ) {
      fetchRemittanceDataForSelection(
        crewData.crewCode,
        selectedMonth,
        selectedYear
      );
    }
  }, [
    crewData.crewCode,
    selectedMonth,
    selectedYear,
    fetchRemittanceDataForSelection,
  ]);

  const getMonthNumber = (month: string): number => {
    const months = {
      January: 0,
      February: 1,
      March: 2,
      April: 3,
      May: 4,
      June: 5,
      July: 6,
      August: 7,
      September: 8,
      October: 9,
      November: 10,
      December: 11,
    };
    return months[month as keyof typeof months] || 0;
  };

  const handleOpenDialog = () => {
    setIsAddRemittanceOpen(true);
  };

  const handleRemittanceSuccess = () => {
    if (crewData.crewCode) {
      setTimeout(() => {
        fetchRemittanceDataForSelection(
          crewData.crewCode,
          selectedMonth,
          selectedYear
        );
      }, 500);
    }
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
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Link href="/home/remittance">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold">Crew Remittance Details</h1>
          </div>

          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Remittance
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card className="h-[calc(100vh-180px)] flex flex-col overflow-hidden">
              <CardContent className="p-4 flex flex-col items-center text-center overflow-y-auto scrollbar-hide flex-1">
                <style jsx global>{`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                  .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}</style>
                <div className="w-60 h-60 min-w-[160px] bg-white rounded-md mb-3 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                  {crewData.profileImage.ContentType ? (
                    <Base64Image
                      imageType={crewData.profileImage.ContentType}
                      alt="Crew Profile Image"
                      base64String={crewData.profileImage.FileContent}
                      width={60}
                      height={60}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <Image
                      width={256}
                      height={160}
                      src="/image.png"
                      alt="Selfie with ID Attachment"
                      className="object-cover w-full h-full"
                    />
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
                        {calculateAge(crewData.birthday)} years old
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

          <div className="md:col-span-3">
            <Card className="h-[calc(100vh-180px)] flex flex-col">
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-6 w-full">
                    <div className="w-1/2">
                      <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                        disabled={!remittanceData || remittanceData.length === 0}
                        >
                        <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                          <div className="flex items-center w-full">
                            <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                              Select Month
                            </span>
                            <SelectValue
                              placeholder="Select month"
                              className="text-black text-base pl-3"
                            />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {[
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
                          ].map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                    </div>
                    <div className="w-1/2">
                      <Select
                        value={selectedYear}
                        onValueChange={setSelectedYear}
                        disabled={!remittanceData || remittanceData.length === 0}
                        >
                        <SelectTrigger className="bg-white border border-gray-200 rounded-xs h-12 w-full pl-0">
                          <div className="flex items-center w-full">
                            <span className="text-gray-500 text-base bg-[#F6F6F6] rounded-l-xs px-3 py-1.5 mr-5">
                              Select Year
                            </span>
                            <SelectValue
                              placeholder="Select year"
                              className="text-black text-base pl-3"
                            />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {/* DONT DELETE THIS COMMENT, MIGHT BE HELPFUL FOR FUTURE */}
                    {/* <div className="flex items-center">
                      <Checkbox />
                      <span className="ml-2">Remit with payroll</span>
                    </div> */}
                  </div>

                  <div className="bg-[#F9F9F9] rounded-xl border border-gray-200 overflow-hidden">
                    {remittanceData &&
                    Array.isArray(remittanceData) &&
                    remittanceData.length > 0 ? (
                      <DataTable
                        columns={remittanceColumns}
                        data={remittanceData}
                        pageSize={7}
                      />
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddRemittanceDialog
        open={isAddRemittanceOpen}
        onOpenChange={setIsAddRemittanceOpen}
        crewCode={crewData.crewCode}
        allottees={allottees}
        onSuccess={handleRemittanceSuccess}
      />
    </div>
  );
}
