"use client";

import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getHomeRoutes } from "@/src/routes/homeRoutes";
import { getHomeBreadcrumb } from "@/src/routes/getHomeBreadcrumb";
import { Sidebar } from "@/src/routes/sidebar";
import { toast } from "@/components/ui/use-toast";
import { logoutUser } from "@/src/services/auth/auth.api";

interface User {
  Email: string;
  UserType: number;
  isAuthenticated: boolean;
}

export default function HomeLayoutClient({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const routes = useMemo(
    () => getHomeRoutes(pathname, user.UserType),
    [pathname, user.UserType]
  );

  const handleLogout = async () => {
    try {
      await logoutUser();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      toast({
        title: "Logout Successful",
        description: "Successfully logged out.",
      });
      setTimeout(() => router.push("/"), 100);
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout Failed",
        description: "Something went wrong while logging out.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-4 z-40"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation</span>
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="p-0 pt-10">
          <Sidebar
            routes={routes}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            user={{
              Email: user.Email,
              FirstName: "N/A",
              LastName: "N/A",
              UserType: user.UserType,
              UserTypeName: "Unknown",
            }}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:block transition-all duration-300 mr-0",
          isSidebarCollapsed ? "md:w-20 mr-3" : "md:w-64",
          "md:p-4"
        )}
      >
        <Sidebar
          routes={routes}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          user={{
            Email: user.Email,
            FirstName: "N/A",
            LastName: "N/A",
            UserType: user.UserType,
            UserTypeName: "Unknown",
          }}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pl-1 pr-4 py-4">
        <div className="flex flex-col h-full w-full rounded-xl overflow-hidden shadow-sm">
          {/* Breadcrumb / Header */}
          <div className="flex items-center p-4 bg-[#F9F9F9] border-b">
            <span
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="cursor-pointer mr-4 hidden md:flex hover:bg-gray-50"
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="h-5 w-5 text-primary" />
              ) : (
                <PanelLeftClose className="h-5 w-5 text-primary" />
              )}
            </span>
            <div className="flex items-center text-base text-muted-foreground">
              <div className="font-medium text-foreground text-sm">
                {getHomeBreadcrumb(pathname, user.UserType)}
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-auto bg-[#F9F9F9]">{children}</main>
        </div>
      </div>
    </div>
  );
}
