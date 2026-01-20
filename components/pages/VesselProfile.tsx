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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Trash,
  Filter,
  Users,
  Pencil,
  Download,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddVesselDialog } from "../dialogs/AddVesselDialog";
import { EditVesselDialog } from "../dialogs/EditVesselDialog";
import { AddVesselTypeDialog } from "../dialogs/AddVesselTypeDialog";
import { EditVesselTypeDialog } from "../dialogs/EditVesselTypeDialog";
import { AddVesselPrincipalDialog } from "../dialogs/AddVesselPrincipalDialog";
import { EditVesselPrincipalDialog } from "../dialogs/EditVesselPrincipalDialog";
import Swal from "sweetalert2";
import {
  getVesselList,
  VesselItem,
  deleteVessel,
  getOnboardCrewReport,
  OnboardCrewReportResponse,
} from "@/src/services/vessel/vessel.api";
import {
  getVesselTypeList,
  VesselTypeItem,
  deleteVesselType,
} from "@/src/services/vessel/vesselType.api";
import {
  getVesselPrincipalList,
  VesselPrincipalItem,
  deleteVesselPrincipal,
} from "@/src/services/vessel/vesselPrincipal.api";
import { NewVesselItem, UpdatedVesselFromApi } from "@/types/vessel";
import generateOnboardCrewReport from "../PDFs/onboardCrewReportPDF";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

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

interface VesselType {
  vesselTypeId: number;
  vesselTypeCode: string;
  vesselTypeName: string;
}

interface VesselPrincipal {
  vesselPrincipalId: number;
  vesselPrincipalCode: string;
  vesselPrincipalName: string;
}

export default function VesselProfile() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("vessel");
  const [addVesselDialogOpen, setAddVesselDialogOpen] = useState(false);
  const [editVesselDialogOpen, setEditVesselDialogOpen] = useState(false);
  const [addVesselTypeDialogOpen, setAddVesselTypeDialogOpen] = useState(false);
  const [editVesselTypeDialogOpen, setEditVesselTypeDialogOpen] = useState(false);
  const [addVesselPrincipalDialogOpen, setAddVesselPrincipalDialogOpen] = useState(false);
  const [editVesselPrincipalDialogOpen, setEditVesselPrincipalDialogOpen] = useState(false);
  const [vesselData, setVesselData] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [vesselTypeData, setVesselTypeData] = useState<VesselType[]>([]);
  const [selectedVesselType, setSelectedVesselType] = useState<VesselType | null>(null);
  const [vesselPrincipalData, setVesselPrincipalData] = useState<VesselPrincipal[]>([]);
  const [selectedVesselPrincipal, setSelectedVesselPrincipal] = useState<VesselPrincipal | null>(null);
  const [isLoadingVessels, setLoadingVessels] = useState(false);
  const [isLoadingTypes, setLoadingTypes] = useState(false);
  const [isLoadingPrincipals, setLoadingPrincipals] = useState(false);
  const [onBoardCrewData, setOnBoardCrewData] = useState<OnboardCrewReportResponse>({} as OnboardCrewReportResponse);

  const [openExportModal, setOpenExportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loadingPDFExport, setLoadingPDFExport] = useState(false);

  const handleExport = async () => {
    setLoadingPDFExport(true);
    // Always fetch fresh data based on selected month & year
    const response = await getOnboardCrewReport(selectedMonth, selectedYear);
    setOnBoardCrewData(response);

    // Generate PDF with the latest response
    generateOnboardCrewReport(
      response,
      new Date(),
      "all"
    );

    setOpenExportModal(false);
    setLoadingPDFExport(false);
  };  

  const handleVesselTypeAdded = (newVesselType: VesselTypeItem) => {
    // Convert API response format to your internal format
    const newItem: VesselType = {
      vesselTypeId: newVesselType.VesselTypeID,
      vesselTypeCode: newVesselType.VesselTypeCode,
      vesselTypeName: newVesselType.VesselTypeName,
    };

    // Add the new vessel type to the list
    setVesselTypeData((prevData) => [...prevData, newItem]);
  };

  const handleVesselPrincipalAdded = (
    newVesselPrincipal: VesselPrincipalItem
  ) => {
    // Convert API response format to your internal format
    const newItem: VesselPrincipal = {
      vesselPrincipalId: newVesselPrincipal.PrincipalID,
      vesselPrincipalCode: newVesselPrincipal.PrincipalCode,
      vesselPrincipalName: newVesselPrincipal.PrincipalName,
    };

    // Add the new vessel principal to the list
    setVesselPrincipalData((prevData) => [...prevData, newItem]);
  };

  const handleVesselAdded = (newVessel: NewVesselItem) => {
    const newItem: Vessel = {
      vesselId: newVessel.VesselID,
      vesselCode: newVessel.VesselCode,
      vesselName: newVessel.VesselName,
      vesselType: parseInt(newVessel.VesselType),
      vesselTypeName: newVessel.VesselType,
      principalName: newVessel.Principal,
      principalID: parseInt(newVessel.Principal),
      status: newVessel.IsActive === 1 ? "Active" : "Inactive",
    };
    setVesselData((prevData) => [...prevData, newItem]);
  };

  const handleVesselUpdated = (updatedVessel: UpdatedVesselFromApi) => {
    setVesselData((prevData) =>
      prevData.map((vessel) =>
        vessel.vesselId === updatedVessel.VesselID
          ? {
            vesselId: updatedVessel.VesselID,
            vesselCode: updatedVessel.VesselCode,
            vesselName: updatedVessel.VesselName,
            vesselType: parseInt(updatedVessel.VesselType),
            vesselTypeName: updatedVessel.VesselType,
            principalName: updatedVessel.Principal,
            principalID: parseInt(updatedVessel.Principal),
            status: updatedVessel.IsActive === 1 ? "Active" : "Inactive",
          }
          : vessel
      )
    );
  };

  const handleVesselTypeUpdated = (updatedVesselType: VesselTypeItem) => {
    setVesselTypeData((prevData) =>
      prevData.map((item) =>
        item.vesselTypeId === updatedVesselType.VesselTypeID
          ? {
            vesselTypeId: updatedVesselType.VesselTypeID,
            vesselTypeCode: updatedVesselType.VesselTypeCode,
            vesselTypeName: updatedVesselType.VesselTypeName,
          }
          : item
      )
    );
  };
  const handleVesselPrincipalUpdated = (
    updatedVesselPrincipal: VesselPrincipalItem
  ) => {
    // Update the vessel principal in the list
    setVesselPrincipalData((prevData) =>
      prevData.map((item) =>
        item.vesselPrincipalId === updatedVesselPrincipal.PrincipalID
          ? {
            vesselPrincipalId: updatedVesselPrincipal.PrincipalID,
            vesselPrincipalCode: updatedVesselPrincipal.PrincipalCode,
            vesselPrincipalName: updatedVesselPrincipal.PrincipalName,
          }
          : item
      )
    );
  };

  const handleVesselTypeDelete = async (vesselType: VesselType) => {
    const swal = Swal.mixin({
      customClass: {
        confirmButton:
          "bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 mx-2 rounded",
        cancelButton:
          "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 mx-2 rounded",
      },
      buttonsStyling: false,
    });

    try {
      const result = await swal.fire({
        title: "Are you sure?",
        text: "This vessel type will be permanently deleted.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        const response = await deleteVesselType(vesselType.vesselTypeId);

        if (response.success) {
          swal.fire("Deleted!", "The vessel type has been deleted.", "success");
          setVesselTypeData((prevData) =>
            prevData.filter((v) => v.vesselTypeId !== vesselType.vesselTypeId)
          );
        } else {
          swal.fire({
            title: "Error!",
            text: response.message || "Failed to delete vessel.",
            icon: "error",
          });
        }
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        swal.fire({
          title: "Cancelled",
          text: "Process cancelled.",
          icon: "error",
        });
      }
    } catch (error) {
      swal.fire(
        "Error",
        error instanceof Error ? error.message : "Failed to delete vessel type",
        "error"
      );
    }
  };

  const handleVesselPrincipalDelete = async (
    vesselPrincipal: VesselPrincipal
  ) => {
    const swal = Swal.mixin({
      customClass: {
        confirmButton:
          "bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 mx-2 rounded",
        cancelButton:
          "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 mx-2 rounded",
      },
      buttonsStyling: false,
    });

    try {
      const result = await swal.fire({
        title: "Are you sure?",
        text: "This vessel principal will be permanently deleted.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        const response = await deleteVesselPrincipal(
          vesselPrincipal.vesselPrincipalId
        );

        if (response.success) {
          swal.fire(
            "Deleted!",
            "The vessel principal has been deleted.",
            "success"
          );
          setVesselPrincipalData((prevData) =>
            prevData.filter(
              (v) => v.vesselPrincipalId !== vesselPrincipal.vesselPrincipalId
            )
          );
        } else {
          swal.fire({
            title: "Error!",
            text: response.message || "Failed to delete vessel.",
            icon: "error",
          });
        }
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        swal.fire({
          title: "Cancelled",
          text: "Process cancelled.",
          icon: "error",
        });
      }
    } catch (error) {
      swal.fire(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to delete vessel principal",
        "error"
      );
    }
  };

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

  // Fetch vessel type list on mount
  useEffect(() => {
    const fetchVesselTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await getVesselTypeList();
        if (res.success && Array.isArray(res.data)) {
          const mapped: VesselType[] = res.data.map((item: VesselTypeItem) => ({
            vesselTypeId: item.VesselTypeID,
            vesselTypeCode: item.VesselTypeCode,
            vesselTypeName: item.VesselTypeName,
          }));
          setVesselTypeData(mapped);
        } else {
          console.error("Failed to fetch vessel type:", res.message);
        }
      } catch (err) {
        console.error("Error fetching vessel type:", err);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchVesselTypes();
  }, []);

  // Fetch vessel principal list on mount
  useEffect(() => {
    const fetchVesselPrincipals = async () => {
      setLoadingPrincipals(true);
      try {
        const res = await getVesselPrincipalList();
        if (res.success) {
          const mapped: VesselPrincipal[] = res.data.map((item) => ({
            vesselPrincipalId: item.PrincipalID,
            vesselPrincipalCode: item.PrincipalCode,
            vesselPrincipalName: item.PrincipalName,
          }));
          setVesselPrincipalData(mapped);
        } else {
          console.error("Failed to fetch vessel principal:", res.message);
        }
      } catch (err) {
        console.error("Error fetching vessel principal:", err);
      } finally {
        setLoadingPrincipals(false);
      }
    };

    fetchVesselPrincipals();
  }, []);

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
      accessorKey: "status",
      header: () => <div className="text-justify">Status</div>,
      cell: ({ row }) => {
        const statusRow = row.getValue("status") as string;
        return (
          <div className="text-justify">
            <Badge
              className={`text-xs sm:text-sm w-full rounded-full bg-[#E7F0F9] text-[#1F279C]/90 ${statusRow === "Active"
                ? "bg-[#E7F0F9] text-[#1F279C]/90"
                : "bg-red-500/20 text-red-800"
                }`}
            >
              {statusRow}
            </Badge>
          </div>
        );
      },
    },

    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const vessel = row.original;
        const handleDelete = async (vessel: Vessel) => {
          const swal = Swal.mixin({
            customClass: {
              confirmButton:
                "bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 mx-2 rounded",
              cancelButton:
                "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 mx-2 rounded",
            },
            buttonsStyling: false,
          });

          try {
            const result = await swal.fire({
              title: "Are you sure?",
              text: "This action cannot be undone.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Yes, delete it!",
              cancelButtonText: "No, cancel!",
              reverseButtons: true,
            });

            if (result.isConfirmed) {
              const response = await deleteVessel(vessel.vesselId);

              if (response.success) {
                swal.fire({
                  title: "Deleted!",
                  text: "The vessel has been deleted.",
                  icon: "success",
                  confirmButtonText: "Okay",
                });
                setVesselData((prevData) =>
                  prevData.filter((v) => v.vesselId !== vessel.vesselId)
                );
              } else {
                swal.fire({
                  title: "Error!",
                  text: response.message || "Failed to delete vessel.",
                  icon: "error",
                });
              }
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              swal.fire({
                title: "Cancelled",
                text: "Process cancelled.",
                icon: "error",
              });
            }
          } catch (error) {
            swal.fire({
              title: "Error",
              text: "Failed to delete vessel",
              icon: "error",
              confirmButtonText: "Okay",
            });
          }
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedVessel(vessel);
                  setEditVesselDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Vessel
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/home/vessel/crew-list?id=${vessel.vesselId}&vesselName=${vessel.vesselName}`}
                >
                  <Users className="mr-2 h-4 w-4" /> View Crew List
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(vessel)}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const columnsVesselType: ColumnDef<VesselType>[] = [
    {
      accessorKey: "vesselTypeCode",
      header: () => <div className="text-justify">Vessel Type Code</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("vesselTypeCode")}</div>
      ),
    },
    {
      accessorKey: "vesselTypeName",
      header: () => <div className="text-justify">Vessel Type Name</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("vesselTypeName")}</div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-justify">Actions</div>,
      cell: ({ row }) => {
        const vesselType = row.original;
        return (
          <div className="text-justify">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 sm:h-8 w-7 sm:w-8 p-0">
                  <MoreHorizontal className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                <DropdownMenuItem
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setSelectedVesselType(vesselType);
                    setEditVesselTypeDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  Edit Vessel Type
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive text-xs sm:text-sm"
                  onClick={() => handleVesselTypeDelete(vesselType)}
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

  const columnsVesselPrincipal: ColumnDef<VesselPrincipal>[] = [
    {
      accessorKey: "vesselPrincipalCode",
      header: () => <div className="text-justify">Vessel Principal Code</div>,
      cell: ({ row }) => (
        <div className="text-justify">
          {row.getValue("vesselPrincipalCode")}
        </div>
      ),
    },
    {
      accessorKey: "vesselPrincipalName",
      header: () => <div className="text-justify">Vessel Principal Name</div>,
      cell: ({ row }) => (
        <div className="text-justify">
          {row.getValue("vesselPrincipalName")}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-justify">Actions</div>,
      cell: ({ row }) => {
        const vesselPrincipal = row.original;
        return (
          <div className="text-justify">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 sm:h-8 w-7 sm:w-8 p-0">
                  <MoreHorizontal className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                <DropdownMenuItem
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setSelectedVesselPrincipal(vesselPrincipal);
                    setEditVesselPrincipalDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  Edit Vessel Principal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive text-xs sm:text-sm"
                  onClick={() => handleVesselPrincipalDelete(vesselPrincipal)}
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

  // Filter vessels based on search and status
  const filteredVessel = vesselData.filter((v) => {
    const matchesSearch =
      v.vesselCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vesselTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.principalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      v.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredVesselType = vesselTypeData.filter((vesselType) => {
    const matchesSearch =
      vesselType.vesselTypeName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      vesselType.vesselTypeCode
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const filteredVesselPrincipal = vesselPrincipalData.filter(
    (vesselPrincipal) => {
      const matchesSearch =
        vesselPrincipal.vesselPrincipalName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        vesselPrincipal.vesselPrincipalCode
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesSearch;
    }
  );
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm("");
  };

  return (
    <div className="h-full w-full p-3 pt-3 overflow-hidden">
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

        /* Hide scrollbar for all scrollable elements in the component */
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
      <div className="h-full overflow-hidden">
        <div className="p-3 pt-0 sm:p-4 flex flex-col space-y-4 sm:space-y-5 h-full">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold mb-0">Vessel Profile</h1>
          </div>

          <Card className="h-[calc(100vh-180px)] flex flex-col overflow-hidden">
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
                      value="vessel"
                      className="px-10 pb-8 h-full text-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                    >
                      Vessel
                    </TabsTrigger>
                    <TabsTrigger
                      value="vessel-type"
                      className="px-10 pb-8 h-full text-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                    >
                      Vessel Type
                    </TabsTrigger>
                    <TabsTrigger
                      value="vessel-principal"
                      className="px-10 pb-8 h-full text-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                    >
                      Vessel Principal
                    </TabsTrigger>
                    {/* <TabsTrigger
                      value="sea-port"
                      className="px-10 pb-8 h-full text-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none cursor-pointer"
                    >
                      Sea Port
                    </TabsTrigger> */}
                  </TabsList>
                </div>
              </div>

              <TabsContent
                value="vessel"
                className="p-2 mt-0 overflow-y-auto flex-1"
              >
                <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5 min-h-full">
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
                    <div className="relative w-full md:flex-1">
                      <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-4 sm:h-4.5 w-4 sm:w-4.5 text-muted-foreground" />
                      <Input
                        placeholder="Search vessel by name or code..."
                        className="bg-[#EAEBF9] pl-8 sm:pl-9 py-4 sm:py-5 text-xs sm:text-sm h-9 sm:h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                          <Filter className="h-4 sm:h-4.5 w-4 sm:w-4.5" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Filter by Status</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        className="whitespace-nowrap h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm w-full sm:w-auto"
                        size="default"
                        onClick={() => setAddVesselDialogOpen(true)}
                      >
                        <Plus className="mr-1.5 sm:mr-2 h-4 sm:h-4.5 w-4 sm:w-4.5" />{" "}
                        Add Vessel
                      </Button>

                      {/* <Button
                        className="whitespace-nowrap h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm w-full sm:w-auto"
                        size="default"
                        onClick={() => generateOnboardCrewReport(onBoardCrewData, new Date(), 'all')}
                      >
                        <Download className="mr-1.5 sm:mr-2 h-4 sm:h-4.5 w-4 sm:w-4.5" />{" "}
                        Export PDF
                      </Button> */}

                      <Button onClick={() => setOpenExportModal(true)}>
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                      </Button>
                    </div>
                  </div>
                  {isLoadingVessels ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">Loading vessel data...</p>
                    </div>
                  ) : (
                    <div className="bg-[#F9F9F9] rounded-md border pb-3">
                      <DataTable
                        columns={columns}
                        data={filteredVessel}
                        pageSize={7}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="vessel-type"
                className="p-2 mt-0 overflow-y-auto flex-1"
              >
                <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5 min-h-full">
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
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
                      <Button
                        className="whitespace-nowrap h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm w-full sm:w-auto"
                        size="default"
                        onClick={() => setAddVesselTypeDialogOpen(true)}
                      >
                        <Plus className="mr-1.5 sm:mr-2 h-4 sm:h-4.5 w-4 sm:w-4.5" />{" "}
                        Add Vessel Type
                      </Button>
                    </div>
                  </div>
                  {isLoadingTypes ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">Loading vessel type data...</p>
                    </div>
                  ) : (
                    <div className="bg-[#F9F9F9] rounded-md border pb-3">
                      <DataTable
                        columns={columnsVesselType}
                        data={filteredVesselType}
                        pageSize={7}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="vessel-principal"
                className="p-2 mt-0 overflow-y-auto flex-1"
              >
                <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5 min-h-full">
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
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
                      <Button
                        className="whitespace-nowrap h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm w-full sm:w-auto"
                        size="default"
                        onClick={() => setAddVesselPrincipalDialogOpen(true)}
                      >
                        <Plus className="mr-1.5 sm:mr-2 h-4 sm:h-4.5 w-4 sm:w-4.5" />{" "}
                        Add Vessel Principal
                      </Button>
                    </div>
                  </div>
                  {isLoadingPrincipals ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">Loading vessel principals data...</p>
                    </div>
                  ) : (
                    <div className="bg-[#F9F9F9] rounded-md border pb-3">
                      <DataTable
                        columns={columnsVesselPrincipal}
                        data={filteredVesselPrincipal}
                        pageSize={7}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      <AddVesselDialog
        open={addVesselDialogOpen}
        onOpenChange={setAddVesselDialogOpen}
        onSuccess={handleVesselAdded}
      />

      {/* Edit Vessel Dialog */}
      {selectedVessel && (
        <EditVesselDialog
          open={editVesselDialogOpen}
          onOpenChange={setEditVesselDialogOpen}
          vesselData={selectedVessel}
          onSuccess={handleVesselUpdated}
        />
      )}

      {/* Add Vessel Type Dialog */}
      <AddVesselTypeDialog
        open={addVesselTypeDialogOpen}
        onOpenChange={setAddVesselTypeDialogOpen}
        onSuccess={handleVesselTypeAdded}
      />

      {/* Edit Vessel Type Dialog */}
      {selectedVesselType && (
        <EditVesselTypeDialog
          open={editVesselTypeDialogOpen}
          onOpenChange={setEditVesselTypeDialogOpen}
          vesselTypeData={selectedVesselType}
          onSuccess={handleVesselTypeUpdated}
        />
      )}

      {/* Add Vessel Principal Dialog */}
      <AddVesselPrincipalDialog
        open={addVesselPrincipalDialogOpen}
        onOpenChange={setAddVesselPrincipalDialogOpen}
        onSuccess={handleVesselPrincipalAdded}
      />

      {/* Edit Vessel Principal Dialog */}
      {selectedVesselPrincipal && (
        <EditVesselPrincipalDialog
          open={editVesselPrincipalDialogOpen}
          onOpenChange={setEditVesselPrincipalDialogOpen}
          vesselPrincipalData={selectedVesselPrincipal}
          onSuccess={handleVesselPrincipalUpdated}
        />
      )}

      <Dialog open={openExportModal} onOpenChange={setOpenExportModal}>
        <DialogContent className="sm:max-w-[600px] bg-[#FCFCFC] p-10">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center text-2xl font-semibold text-[#2E37A4]">
              Select Year and Month
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-5 mb-1">
            <Select
              onValueChange={(value) => setSelectedMonth(Number(value))}
              value={selectedMonth.toString()}
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
              onValueChange={(value) => setSelectedYear(Number(value))}
              value={selectedYear.toString()}
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpenExportModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              className="flex-1 bg-[#2E37A4] hover:bg-[#2E37A4]/90 text-white"
            >
              {loadingPDFExport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
