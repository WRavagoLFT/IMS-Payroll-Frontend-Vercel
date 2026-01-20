"use client";

import { useEffect, useState, useMemo } from "react";
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
  MoreHorizontal,
  Filter,
  Loader2,
  Plus,
  Pencil,
  Lock,
  Trash,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  deleteUser,
  getUsersList,
  UsersItem,
} from "@/src/services/users/users.api";
import { AddUserDialog } from "../dialogs/AddUserDialog";
import { EditUserDialog } from "../dialogs/EditUserDialog";
import { Badge } from "../ui/badge";
import Swal from "sweetalert2";
import { toast } from "../ui/use-toast";
import ManagePasswordDialog from "../dialogs/ManagePasswordDialog";

export default function ManageUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setroleFilter] = useState("all");
  const [statusFilter, setstatusFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [userData, setUserData] = useState<UsersItem[]>([]);
  const [isAddUser, setAddUser] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState<UsersItem | null>(null);
  const [editselectedUserDialogOpen, setEditselectedUserDialogOpen] = useState(false);
  const [managePasswordDialogOpen, setManagePasswordDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState({
    users: true,
    vessels: true,
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);

  const handleUserUpdated = (updatedUser: UsersItem) => {
    setUserData((prev) =>
      prev.map((item) =>
        item.UserID === updatedUser.UserID
          ? {
            ...item,
            ...updatedUser,
            Name: `${updatedUser.FirstName} ${updatedUser.LastName}`,
          }
          : item
      )
    );
  };

  useEffect(() => {
    setIsLoading((prev) => ({ ...prev, users: true }));

    getUsersList()
      .then((response) => {
        if (response.success) {
          const validUsers = response.data.filter(
            (user: { Name: string }) => user.Name && user.Name.trim() !== ""
          );
          setUserData(validUsers);
        } else {
          console.error("Failed to fetch users:", response.message);
        }
      })
      .catch((error) => console.error("Error fetching users:", error))
      .finally(() => setIsLoading((prev) => ({ ...prev, users: false })));
  }, []);

  const filteredUsersList = useMemo(() => {
    return userData.filter((item) => {
      const matchesSearch =
        item.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.UserID?.toString().includes(searchTerm);

      const matchesRole = roleFilter === "all" || item.Role === roleFilter;
      const matchesUserType =
        userTypeFilter === "all" || item.UserType === parseInt(userTypeFilter);

      const matchesStatus =
        statusFilter === "all" ||
        !!item.IsVerified === (statusFilter === "true");

      return matchesSearch && matchesRole && matchesUserType && matchesStatus;
    });
  }, [userData, searchTerm, roleFilter, userTypeFilter, statusFilter]);

  const uniqueRoles = useMemo(() => {
    const rolesSet = new Set(userData.map((user) => user.Role));
    return Array.from(rolesSet);
  }, [userData]);

  const uniqueStatus = useMemo(() => {
    if (!Array.isArray(userData)) return [];
    const statusSet = new Set(userData.map((user) => !!user.IsVerified));
    return Array.from(statusSet);
  }, [userData]);

  // Columns definition
  const userManagementColumns: ColumnDef<UsersItem>[] = [
    {
      accessorKey: "UserID",
      header: () => <div className="text-justify">User ID</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("UserID")}</div>
      ),
    },
    {
      accessorKey: "Name",
      header: () => <div className="text-justify">Name</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("Name")}</div>
      ),
    },
    {
      accessorKey: "Role",
      header: () => <div className="text-justify">Role</div>,
      cell: ({ row }) => (
        <div className="text-justify">{row.getValue("Role")}</div>
      ),
    },
    {
      accessorKey: "IsVerified",
      header: () => <div className="text-justify">Status</div>,
      cell: ({ row }) => {
        const isVerified = row.getValue("IsVerified") === 1;

        return (
          <div className="text-justify">
            <Badge variant={isVerified ? "default" : "outline"}>
              {isVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const userId = row.original.UserID;
        //const isVerified = Number(row.original.IsVerified) === 0;

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
                    setSelectedUserData(row.original);
                    setEditselectedUserDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  Edit User
                </DropdownMenuItem>
                {/* {!isVerified && (
                  <DropdownMenuItem
                    className="text-xs sm:text-sm"
                    onClick={() => {
                      handleResetPassword(userId);
                    }}
                  >
                    <Mail className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                    Reset Password via Email
                  </DropdownMenuItem>
                )} */}
                <DropdownMenuItem
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setSelectedUserId(userId);
                    setSelectedUserName(row.original.Name);
                    setManagePasswordDialogOpen(true);
                  }}
                >
                  <Lock className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  Update Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => {
                    handleUserDelete(userId);
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

  const clearFilters = () => {
    setSearchTerm("");
    setUserTypeFilter("all");
    setroleFilter("all");
    setstatusFilter("all");
  };

  const handleUserDelete = async (userId: number) => {
    const user = userData.find((u) => u.UserID === userId);
    const userName = user ? user.Name : "this user";

    const result = await Swal.fire({
      title: `Delete ${userName}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      // User clicked "Cancel"
      Swal.fire({
        title: "Cancelled",
        text: "Process cancelled.",
        icon: "info",
      });
      return;
    }

    try {
      const response = await deleteUser(userId);

      if (response.success) {
        setUserData((prev) => prev.filter((user) => user.UserID !== userId));

        toast({
          title: "Deleted",
          description: `${userName} has been deleted successfully.`,
          variant: "success",
          duration: 3000,
        });
      } else {
        Swal.fire("Error", `Failed to delete ${userName}.`, "error");
      }
    } catch (error) {
      Swal.fire("Error", "An error occurred while deleting the user.", "error");
      console.error(error);
    }
  };

  // const handleResetPassword = async (userId: number) => {
  //   const user = userData.find((u) => u.UserID === userId);
  //   const userName = user ? user.Name : "this user";

  //   const result = await Swal.fire({
  //     title: `Reset password for ${userName}?`,
  //     text: "This action cannot be undone.",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonColor: "#d33",
  //     cancelButtonColor: "#6c757d",
  //     confirmButtonText: "Yes, reset it",
  //     reverseButtons: true,
  //   });

  //   if (!result.isConfirmed) {
  //     // User clicked "Cancel"
  //     Swal.fire({
  //       title: "Cancelled",
  //       text: "Process cancelled.",
  //       icon: "info",
  //     });
  //     return;
  //   }

  //   try {
  //     const response = await resetPassword(userId);

  //     if (response.success) {
  //       toast({
  //         title: "Password Reset",
  //         description: `Password for ${userName} has been reset successfully.`,
  //         variant: "success",
  //         duration: 3000,
  //       });
  //     } else {
  //       Swal.fire(
  //         "Error",
  //         response.message || "Failed to reset the password.",
  //         "error"
  //       );
  //     }
  //   } catch (error) {
  //     Swal.fire(
  //       "Error",
  //       "An error occurred while resetting the password.",
  //       "error"
  //     );
  //     console.error(error);
  //   }
  // };

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
              <h1 className="text-3xl font-semibold mb-0">Manage Users</h1>
            </div>

            <div className="flex flex-col space-y-4 sm:space-y-5 min-h-full">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:flex-1">
                  <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-4 sm:h-4.5 w-4 sm:w-4.5 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="bg-[#EAEBF9] pl-8 sm:pl-9 py-4 sm:py-5 text-xs sm:text-sm h-9 sm:h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                  <Select
                    value={roleFilter}
                    onValueChange={setroleFilter}
                    disabled={isLoading.users}
                  >
                    <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                      {isLoading.users ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Filter className="h-4 sm:h-4.5 w-4 sm:w-4.5" />
                      )}
                      <SelectValue
                        defaultValue="all"
                        placeholder="Filter by Role"
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles
                        .filter(
                          (role) =>
                            typeof role === "string" && role.trim() !== ""
                        )
                        .map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={setstatusFilter}
                    disabled={isLoading.users}
                  >
                    <SelectTrigger className="h-9 sm:h-10 px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-[160px] sm:min-w-[170px] w-full sm:w-auto">
                      {isLoading.users ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Filter className="h-4 sm:h-4.5 w-4 sm:w-4.5" />
                      )}
                      <SelectValue
                        defaultValue="all"
                        placeholder="Filter by Status"
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">All Status</SelectItem>
                      {uniqueStatus
                        .filter(
                          (status): status is boolean =>
                            typeof status === "boolean"
                        )
                        .map((status) => (
                          <SelectItem
                            key={String(status)}
                            value={String(status)}
                          >
                            {status ? "Verified" : "Unverified"}
                          </SelectItem>
                        ))}
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
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                  <Button
                    className="bg-[#21299D] hover:bg-indigo-700 px-6 w-40"
                    onClick={() => setAddUser(true)}
                  >
                    <Plus />
                    Add User
                  </Button>
                </div>
              </div>
              {/* DataTable with custom styling */}
              <div className="bg-[#F9F9F9] rounded-md border pb-3">
                {isLoading.users ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <DataTable
                    columns={userManagementColumns}
                    data={filteredUsersList}
                    pageSize={8}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <AddUserDialog
          open={isAddUser}
          onOpenChange={setAddUser}
          onSuccess={(newUser) => {
            setUserData((prev) => [...prev, newUser]);
          }}
        />

        {selectedUserData && editselectedUserDialogOpen && (
          <EditUserDialog
            open={editselectedUserDialogOpen}
            onOpenChange={setEditselectedUserDialogOpen}
            SelectedUserData={selectedUserData}
            onSuccess={handleUserUpdated}
          />
        )}

        {selectedUserId != null && (
          <ManagePasswordDialog
            open={managePasswordDialogOpen}
            onOpenChange={setManagePasswordDialogOpen}
            userId={selectedUserId ?? 0}
            userName={selectedUserName ?? ""}
            onSuccess={() => {
              getUsersList();
            }}
          />
        )}
      </div>
    </>
  );
}
