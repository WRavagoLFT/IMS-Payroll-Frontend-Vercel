"use client";

import { useEffect, useState } from "react";
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
  Pencil,
} from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AddDeductionTypeDialog } from "@/components/dialogs/AddDeductionTypeDialog";
import { EditDeductionTypeDialog } from "@/components/dialogs/EditDeductionTypeDialog";
import Swal from "sweetalert2";
import {
  DeductionDescriptionItem,
  deleteDeductionDescription,
  getDeductionDescriptionList,
} from "@/src/services/deduction/deductionDescription.api";

export default function Deduction() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDeductionTypeDialogOpen, setAddDeductionTypeDialogOpen] =
    useState(false);
  const [selectedDeduction, setSelectedDeduction] =
    useState<DeductionDescriptionItem | null>(null);
  const [onSuccess, setOnSuccess] = useState(false);
  const [deductionDescriptionData, setDeductionDescriptionData] = useState<
    DeductionDescriptionItem[]
  >([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setCurrencyFilter("all");
  }
  
  const loantype: Record<number, string> = {
    1: "Common Deduction",
    2: "Loan Type",
  };

  const currency: Record<number, string> = {
    1: "PHP",
    2: "USD",
  };

  useEffect(() => {
    const fetchDeductionDescriptionList = async () => {
      const res = await getDeductionDescriptionList();
      if (res.success) {
        setDeductionDescriptionData(res.data);
      } else {
        console.error("Failed to fetch deduction description:", res.message);
      }
    };
    fetchDeductionDescriptionList();

    if (onSuccess) {
      fetchDeductionDescriptionList();
      setOnSuccess(false);
    }
  }, [onSuccess]);

  // Handle tab change
  // const handleTabChange = (value: string) => {
  //   setActiveTab(value);
  // };

  const deductionDescriptionColumns: ColumnDef<DeductionDescriptionItem>[] = [
    {
      accessorKey: "deductionCode",
      header: () => <div className="text-justify">Deduction Code</div>,
      cell: ({ row }) => {
        const deduction = row.original;
        return <div className="text-justify">{deduction.DeductionCode}</div>;
      },
    },
    {
      accessorKey: "deductionName",
      header: () => <div className="text-justify">Deduction Name</div>,
      cell: ({ row }) => {
        const deduction = row.original;
        return <div className="text-justify">{deduction.DeductionName}</div>;
      },
    },
    {
      accessorKey: "deductionType",
      header: () => <div className="text-justify">Deduction Type</div>,
      cell: ({ row }) => {
        const deduction = row.original;
        const value = loantype[deduction.DeductionType];

        return <div className="text-justify">{value}</div>;
      },
    },
    {
      accessorKey: "currency",
      header: () => <div className="text-justify">Currency</div>,
      cell: ({ row }) => {
        const deduction = row.original;
        const value = currency[deduction.DeductionCurrency];
        return <div className="text-justify">{value}</div>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const deduction = row.original;
        const handleDelete = (deductionId: number) => {
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
              text: `Are you sure you want to delete ${deduction.DeductionName}? This action cannot be undone.`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Yes, delete it!",
              cancelButtonText: "No, cancel!",
              reverseButtons: true,
            })
            .then(async (result) => {
              if (result.isConfirmed) {
                // Place your delete logic here, for example, API call or state update
                await deleteDeductionDescription(deduction.DeductionID).then(
                  (response) => {
                    if (response.success) {
                      setOnSuccess(true);
                      swalWithBootstrapButtons.fire({
                        title: "Deleted!",
                        text: "The deduction has been successfully deleted.",
                        icon: "success",
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
                    setSelectedDeduction(deduction);
                    setEditDialogOpen(true);
                  }}
                  className="text-xs sm:text-sm">
                  <Pencil className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  Edit Description
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive text-xs sm:text-sm"
                  onClick={() => handleDelete(deduction.DeductionID)}>
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

  const filteredDeductionDescription = deductionDescriptionData.filter(
    (item) => {
      const matchesSearch =
        item.DeductionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.DeductionCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === "all" || item.DeductionType.toString() === typeFilter;

      const matchesCurrency =
        currencyFilter === "all" ||
        item.DeductionCurrency.toString() === currencyFilter;

      return matchesSearch && matchesType && matchesCurrency;
    }
  );

  return (
    <>
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
              <h1 className="text-3xl font-semibold mb-0">Deduction</h1>
            </div>

            <div className="p-0 flex flex-col space-y-4 sm:space-y-5 min-h-full">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:flex-1">
                  <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-4 sm:h-4.5 w-4 sm:w-4.5 text-muted-foreground" />
                  <Input
                    placeholder="Search deduction by code or name..."
                    className="bg-[#EAEBF9] pl-8 sm:pl-9 py-4 sm:py-5 text-xs sm:text-sm h-9 sm:h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                      <Filter className="h-4 sm:h-4.5 w-4 sm:w-4.5" />
                      <SelectValue placeholder="Filter by deduction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="1">Common Deduction</SelectItem>
                      <SelectItem value="2">Loan Type</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={currencyFilter}
                    onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                      <Filter className="h-4 sm:h-4.5 w-4 sm:w-4.5" />
                      <SelectValue placeholder="Filter by currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currencies</SelectItem>
                      <SelectItem value="1">PHP</SelectItem>
                      <SelectItem value="2">USD</SelectItem>
                    </SelectContent>
                  </Select>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="h-11 px-4 bg-white border border-[#E5E7EB] shadow-none rounded-xl text-[#6366F1]"
                  >
                    Clear Filters
                  </Button>
                </div>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setAddDeductionTypeDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Description
                  </Button>
                </div>
              </div>
              {/* DataTable with custom styling */}
              <div className="bg-[#F9F9F9] rounded-md border pb-3">
                <DataTable
                  columns={deductionDescriptionColumns}
                  data={filteredDeductionDescription}
                  pageSize={10}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddDeductionTypeDialog
        open={addDeductionTypeDialogOpen}
        onOpenChange={setAddDeductionTypeDialogOpen}
        setOnSuccess={setOnSuccess}
      />
      {selectedDeduction && (
        <EditDeductionTypeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          deduction={selectedDeduction}
          setOnSuccess={setOnSuccess}
        />
      )}
    </>
  );
}
