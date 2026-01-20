import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;

  if (!sessionCookie) {
    //console.log("[MIDDLEWARE] No session cookie found");
    return NextResponse.redirect(new URL("/not-found", req.url));
  }

  try {
    const session = JSON.parse(sessionCookie);
    const { isAuthenticated, userType } = session;

    if (!isAuthenticated) {
      //console.log("[MIDDLEWARE] Not authenticated");
      return NextResponse.redirect(new URL("/not-found", req.url));
    }

    // Role-based route access map
    const roleMap: Record<number, string[]> = {
      1: ["/home/dashboard", "/home/profile", "/home/manage-users", "/home/login-history", "/home/audit-log", "/home/payroll-unposting"],
      3: [
        "/home/dashboard",
        "/home/profile",
        "/home/crew",
        "/home/vessel",
        "/home/wages",
        "/home/deduction",
        "/home/remittance",
        "/home/allotment",
        "/home/crew-payroll",
        "/home/crew-movement",
        "/home/application_crew",
      ],
      4: ["/home/dashboard", "/home/profile", "/home/crew-payroll", "/home/allotment"],
      5: ["/home/dashboard", "/home/profile", "/home/crew-govt-records", "/home/payment-reference", "/home/deduction"],
    };

    const currentPath = req.nextUrl.pathname;

    // Check if path is allowed for this user type
    const allowedPaths = roleMap[userType] || [];
    const isAllowed = allowedPaths.some((path) => currentPath.startsWith(path));

    if (!isAllowed) {
      console.warn(`[MIDDLEWARE] Unauthorized access: ${currentPath} for userType ${userType}`);
      return NextResponse.redirect(new URL("/not-found", req.url)); // or redirect to /home/dashboard
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[MIDDLEWARE] Invalid session cookie:", error);
    return NextResponse.redirect(new URL("/not-found", req.url));
  }
}

export const config = {
  matcher: ["/home/:path*"], // applies only to /home routes
};
