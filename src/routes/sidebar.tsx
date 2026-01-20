import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  LogOut,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  MoreVertical,
  User2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  routes: {
    label: string;
    icon: React.ElementType;
    href: string;
    active: boolean;
    subItems?: {
      label: string;
      href: string;
      active: boolean;
    }[];
  }[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: {
    Email: string
    FirstName: string
    LastName: string
    UserType: number
    UserTypeName: string
  }
  onLogout: () => void;
}

// Sidebar component
export function Sidebar({
  user,
  routes,
  isCollapsed,
  // onToggleCollapse,
  onLogout,
}: SidebarProps) {
  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: boolean;
  }>({
    Deduction: true,
  });  
  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      <div
        className={cn(
          "flex h-full flex-col rounded-xl bg-background text-sidebar-foreground transition-all duration-300 gap-y-3",
          isCollapsed ? "w-18" : "w-full"
        )}
      >
        <div
          className={cn(
            "flex h-20 items-center bg-[#F9F9F9] rounded-lg shadow-sm",
            isCollapsed ? "justify-center px-2" : "px-4"
          )}
        >
          <div
            className={cn(
              "flex h-15 w-15 items-center justify-center",
              isCollapsed ? "mr-0" : "mr-3"
            )}
          >
            <Image
              src="/logo.png"
              alt="Profile Logo"
              width={50}
              height={50}
              className="object-contain h-full w-full"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-sidebar-primary">IMS</h2>
              <p className="text-sm text-sidebar-foreground">Payroll</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto py-6 bg-[#F9F9F9] rounded-lg shadow-sm scrollbar-hide">
          <nav className={cn("grid gap-2", isCollapsed ? "px-2" : "px-4")}>
            {routes.map((route) => (
              <div key={route.href}>
                {route.subItems ? (
                  <>
                    <Link
                      href={route.href}
                      className={cn(
                        "flex items-center rounded-lg transition-colors cursor-pointer",
                        isCollapsed ? "justify-center" : "gap-3 px-3",
                        "py-3 text-base font-medium",
                        route.active
                          ? cn(
                              "text-primary bg-white shadow-md font-bold",
                              isCollapsed
                                ? ""
                                : "border-l-4 border-primary pl-2"
                            )
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={(e) => {
                        if (!isCollapsed) {
                          e.preventDefault();
                          toggleDropdown(route.label);
                        }
                      }}
                      title={isCollapsed ? route.label : ""}
                    >
                      <route.icon
                        className={cn(
                          "h-6 w-6",
                          route.active ? "text-primary" : ""
                        )}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{route.label}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              openDropdowns[route.label]
                                ? "transform rotate-180"
                                : ""
                            )}
                          />
                        </>
                      )}
                    </Link>
                    {!isCollapsed && openDropdowns[route.label] && (
                      <div className="ml-8 mt-1 space-y-1">
                        {route.subItems.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "block py-2 pl-3 rounded-lg text-sm",
                              subItem.active
                                ? "bg-white text-primary font-medium shadow-sm"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center rounded-lg transition-colors relative",
                      isCollapsed ? "justify-center" : "gap-3 px-3",
                      "py-3 text-base font-medium",
                      route.active
                        ? cn(
                            "text-primary bg-white shadow-md font-bold",
                            isCollapsed ? "" : "border-l-4 border-primary pl-2"
                          )
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    title={isCollapsed ? route.label : ""}
                  >
                    <route.icon
                      className={cn(
                        "h-6 w-6",
                        route.active ? "text-primary" : ""
                      )}
                    />
                    {!isCollapsed && route.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div
          className={cn(
            "mt-auto bg-[#F9F9F9] rounded-lg shadow-sm",
            isCollapsed ? "p-2" : "p-4"
          )}
        >
          <div
            className={cn(
              "flex items-center rounded-lg",
              isCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2"
            )}
          >
            <Avatar
              className={cn(
                isCollapsed ? "h-10 w-10 flex-shrink-0" : "flex-shrink-0"
              )}
            >
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-base">
                {user?.Email ? user?.Email.substring(0, 2).toUpperCase() : ""}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <p className="text-base font-medium truncate">
                    {user?.Email || ""}
                  </p>
                  <p className="text-sm text-sidebar-foreground truncate">
                    {user?.Email || "Not logged in"}
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 sm:h-4 w-3.5 sm:w-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    side="right"
                    align="end"
                    className="w-48 sm:w-56 p-2 bg-white dark:bg-gray-900 rounded-md shadow-lg"
                  >
                    <div className="flex flex-col space-y-1 text-xs sm:text-sm">
                      <Link
                        href={`/home/profile`}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <User2 className="h-5 w-5 text-sidebar-foreground hover:text-sidebar-accent-foreground" />
                        User Profile
                      </Link>
                      <div className="border-t my-1 border-gray-200 dark:border-gray-700" />

                      <button
                        className="flex items-center gap-2 p-2 rounded-md text-destructive hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={onLogout}
                      >
                        <LogOut className="h-5 w-5 text-sidebar-foreground hover:text-sidebar-accent-foreground" />
                        Logout
                      </button>

                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
