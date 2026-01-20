"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Activity,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { loginHistory, LoginHistoryItem } from "@/src/services/users/users.api";

const ITEMS_PER_PAGE = 10;

function getActionIcon(action: string = "", size = "h-8 w-8") {
  const actionLower = action.toLowerCase();

  if (actionLower === "login") {
    return <LogIn className={`${size} text-white`} />;
  } else if (actionLower === "logout") {
    return <LogOut className={`${size} text-white`} />;
  }

  return <Activity className={`${size} text-white`} />; // fallback
}

function getActionCircleColor(action: string = ""): string {
  const actionLower = action.toLowerCase();

  if (actionLower === "login") {
    return "bg-green-500";
  } else if (actionLower === "logout") {
    return "bg-gray-500";
  }

  return "bg-slate-400"; // fallback for unknown actions
}

export default function LoginHistory() {
  const [loginHistoryData, setLoginHistoryLogs] = useState<LoginHistoryItem[]>(
    []
  );
  const [filteredLogs, setFilteredLogs] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    loadHistoryLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    loginHistoryData,
    selectedUser,
    selectedAction,
    selectedModule,
    dateFrom,
    dateTo,
  ]);

  const loadHistoryLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await loginHistory();

      if (response.success) {
        const sortedLogs = response.data.sort(
          (a, b) =>
            new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
        );
        setLoginHistoryLogs(sortedLogs);
      } else {
        setError(response.message || "Failed to load audit logs.");
      }
    } catch (error: any) {
      setError(
        error?.response?.data?.message ??
          "Failed to load audit logs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loginHistoryData];

    if (selectedUser !== "all") {
      filtered = filtered.filter(
        (log) =>
          `${log.FirstName ?? ""} ${log.LastName ?? ""}`.trim() === selectedUser
      );
    }

    if (selectedAction !== "all") {
      filtered = filtered.filter(
        (log) => log.Action?.toLowerCase() === selectedAction.toLowerCase()
      );
    }

    if (dateFrom) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.CreatedAt);
        return logDate >= dateFrom;
      });
    }

    if (dateTo) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.CreatedAt);
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        return logDate <= endOfDay;
      });
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedUser("all");
    setSelectedAction("all");
    setSelectedModule("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const groupedLogs = currentLogs.reduce((groups, log) => {
    const date = new Date(log.CreatedAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, LoginHistoryItem[]>);

  const createDescription = (log: LoginHistoryItem): string => {
    const user = `${log.FirstName ?? ""} ${log.LastName ?? ""}`.trim();
    const action = log.Action?.toLowerCase() ?? "logged in";

    switch (action) {
      case "login":
        return `${user} logged in.`;
      case "logout":
        return `${user} logged out.`;
      default:
        return `${user} performed ${action}`;
    }
  };

  const uniqueUsers = [
    ...new Set(
      loginHistoryData
        .map((log) => `${log.FirstName ?? ""} ${log.LastName ?? ""}`.trim())
        .filter((name) => name !== "")
    ),
  ];

  const uniqueActions = [
    ...new Set(
      loginHistoryData
        .map((log) => log.Action?.trim())
        .filter((action) => !!action)
    ),
  ];

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePrevious = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
    <div className="h-full w-full p-6 pt-5 bg-[#F6F8FC]">
      <h1 className="text-3xl font-semibold my-4">Login History</h1>

      <div className="flex flex-wrap gap-4 items-center mb-6">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[220px] h-11 bg-white border border-[#E5E7EB] shadow-none rounded-xl">
            <User className="h-5 w-5 mr-2 text-[#6366F1]" />
            <SelectValue placeholder="Filter by users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {uniqueUsers.map((user) => (
              <SelectItem key={user} value={user}>
                {user.includes("@") ? user.split("@")[0] : user}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger className="w-[220px] h-11 bg-white border border-[#E5E7EB] shadow-none rounded-xl">
            <Activity className="h-5 w-5 mr-2 text-[#6366F1]" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action ?? "unknown"} value={action ?? "unknown"}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[150px] h-11 bg-white border border-[#E5E7EB] shadow-none rounded-xl text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-[#6366F1]" />
                {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                //showYearPicker={true}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[150px] h-11 bg-white border border-[#E5E7EB] shadow-none rounded-xl text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-[#6366F1]" />
                {dateTo ? format(dateTo, "MMM dd, yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                //showYearPicker={true}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button
          variant="outline"
          onClick={clearFilters}
          className="h-11 px-4 bg-white border border-[#E5E7EB] shadow-none rounded-xl text-[#6366F1]"
        >
          Clear Filters
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          Showing {totalItems} result{totalItems !== 1 ? "s" : ""}
          {totalItems !== loginHistoryData.length &&
            ` of ${loginHistoryData.length} total`}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : Object.keys(groupedLogs).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">
                  {error
                    ? "Unable to load audit logs."
                    : "No audit logs found matching your filters."}
                </p>
                {!error &&
                  (selectedUser !== "all" ||
                    selectedAction !== "all" ||
                    selectedModule !== "all" ||
                    dateFrom ||
                    dateTo) && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="mt-4"
                    >
                      Clear all filters
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedLogs).map(([date, logs]) => (
              <div key={date}>
                <h2 className="text-base font-semibold text-gray-700 mb-4">
                  {date}
                </h2>
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.LoginHistoryId}
                      className="flex items-center gap-4 bg-white rounded-xl shadow-sm px-6 py-5"
                    >
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center justify-center rounded-full h-14 w-14 ${getActionCircleColor(
                            log.Action ?? ""
                          )}`}
                        >
                          {getActionIcon(log.Action ?? "", "h-8 w-8")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-base">
                          {createDescription(log)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {log.UserAgent}
                          {/* - {log.IPAddress} */}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 whitespace-nowrap">
                        {new Date(log.CreatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(log.CreatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 my-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="h-10 w-10 p-0 border-gray-300 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    onClick={() => handlePageChange(pageNumber)}
                    className={cn(
                      "h-9 w-9 p-0 border-gray-300",
                      currentPage === pageNumber
                        ? "bg-[#1f279c] text-white border-[#1f279c] hover:bg-[#1f279c]"
                        : "bg-[#e8edf3] text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="h-10 w-10 p-0 border-gray-300 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
