"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCrewStore } from "@/src/store/useCrewStore";
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
import {
  Search,
  MoreHorizontal,
  Filter,
  IdCard,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { CrewItem } from "../../src/services/crew/crew.api";

const getStatusBgColor = (status: string) => {
  switch (status.toLowerCase().trim()) {
    case "on board":
      return "bg-[#EBF5E4] text-green-800 rounded-full";
    case "off board":
      return "bg-[#F5ECE4] text-yellow-800 rounded-full";
    case "active":
      return "bg-[#e4e5f5] text-blue-800 rounded-full";
    case "inactive":
      return "bg-[#f5e4e4] text-red-800 rounded-full";
    case "verified":
      return "bg-[#E7F0F9] text-[#1D237A] rounded-full";
    case "not registered":
      return "bg-[#989898] text-white rounded-full";
    case "pending":
      return "bg-[#EBEBEB] text-black rounded-full";
    default:
      return "bg-gray-100 text-gray-800 rounded-full";
  }
};

const columns: ColumnDef<CrewItem>[] = [
  {
    accessorKey: "CrewCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Crew Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium text-xs sm:text-sm text-center">
        {(row.getValue("CrewCode") as string).trim()}
      </div>
    ),
  },
  {
    accessorKey: "FirstName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Crew Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const firstName = row.original.FirstName || "";
      const middleName = row.original.MiddleName || "";
      const lastName = row.original.LastName || "";
      const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : "";
      return (
        <div className="text-xs sm:text-sm text-center">
          {`${firstName}${middleInitial} ${lastName}`.trim()}
        </div>
      );
    },
  },
  {
    accessorKey: "RankID",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rank
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-xs sm:text-sm text-center">
        {row.original.Rank || row.getValue("RankID")}
      </div>
    ),
  },
  {
    accessorKey: "CrewStatusID",
    header: "Status",
    cell: ({ row }) => {
      const status =
        row.getValue("CrewStatusID") === 1 ? "On Board" : "Off board";
      return (
        <div className="text-center">
          <Badge
            variant="outline"
            className={`mx-auto justify-center text-xs sm:text-sm font-medium px-2 sm:px-2.5 
                py-0.5 flex items-center gap-1.5 sm:gap-2 w-24 sm:w-28 
              ${getStatusBgColor(status)}`}
          >
            {status}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
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
              <DropdownMenuItem asChild className="text-xs sm:text-sm">
                <Link href={`/home/crew-payroll/history?id=${crew.CrewCode}`}>
                  <IdCard className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  View Payroll History
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export default function CrewPayroll() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [inactiveFilter, setInactiveFilter] = useState("verified");
  const { crews, isLoading, error, fetchCrews } = useCrewStore();

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRankFilter("all");
    setInactiveFilter("allCrews");
  };

  useEffect(() => {
    fetchCrews();
  }, [fetchCrews]);

  const filteredCrew = crews.filter((crew) => {
    const matchesSearch =
      crew.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.CrewCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.Rank.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesInactive =
      inactiveFilter === "allCrews" ||
      (crew.IsActive === 1 && inactiveFilter.toLowerCase() === "verified") ||
      (crew.IsActive !== 1 && inactiveFilter.toLowerCase() === "pending");

    const matchesStatus =
      statusFilter === "all" ||
      (crew.CrewStatusID === 1 && statusFilter.toLowerCase() === "active") ||
      (crew.CrewStatusID !== 1 && statusFilter.toLowerCase() === "inactive");

    const matchesRank =
      rankFilter === "all" ||
      crew.RankID.toString() === rankFilter.toLowerCase();

    return matchesSearch && matchesInactive && matchesStatus && matchesRank;
  });

  const uniqueRanks = Array.from(
    new Map(crews.map((crew) => [crew.RankID, crew.Rank])).entries()
  ).map(([id, name]) => ({ id, name }));

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }
  
  return (
    <div className="h-full w-full p-4 pt-2">
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="p-3 sm:p-4 flex flex-col space-y-4 sm:space-y-5 min-h-full">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold mb-0">Crew and Payroll</h1>
          </div>
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
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                  <Filter className="h-4 sm:h-4.5 w-4 text-bold text-primary sm:w-4.5" />
                  <SelectValue placeholder="Filter by rank" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All Ranks</SelectItem>
                  {uniqueRanks.map((rank) => (
                    <SelectItem key={rank.id} value={rank.id.toString()}>
                      {rank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                  <Filter className="h-4 sm:h-4.5 w-4 text-bold text-primary sm:w-4.5" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Filter by Status</SelectItem>
                  <SelectItem value="active">On Board</SelectItem>
                  <SelectItem value="inactive">Off Board</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={inactiveFilter}
                onValueChange={setInactiveFilter}
              >
                <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                  <Filter className="h-4 sm:h-4.5 w-4 text-bold text-primary sm:w-4.5" />
                  <SelectValue placeholder="Filter by inactive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allCrews">All Crews</SelectItem>
                  <SelectItem value="verified">Active</SelectItem>
                  <SelectItem value="pending">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-11 px-4 bg-white border border-[#E5E7EB] shadow-none rounded-xl text-[#6366F1]"
              >
                Clear Filters
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">Loading crew data...</p>
            </div>
          ) : (
            <div className="bg-white rounded-md border pb-3">
              <DataTable columns={columns} data={filteredCrew} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
