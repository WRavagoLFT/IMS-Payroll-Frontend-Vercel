import { LayoutDashboard, Users, Ship, CircleMinus, UserCheck, SquareUserRound, Footprints, Banknote, Undo2 } from "lucide-react";
import { RiCoinsFill } from "react-icons/ri";
import { TbCurrencyDollarOff } from "react-icons/tb";
import { BiReceipt } from "react-icons/bi";
import { MdOutlinePendingActions } from "react-icons/md";
import { PiClockCounterClockwiseBold } from "react-icons/pi";
import { LogIn } from "lucide-react";

export const getHomeRoutes = (pathname: string, userType: number) => {
  const allRoutes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/home/dashboard",
      active: pathname.startsWith("/home/dashboard"),
      allowedUserTypes: [1, 3, 4, 5],
    },
    {
      label: "Crew List",
      icon: Users,
      href: "/home/crew",
      active:
        pathname === "/home/crew" ||
        (pathname.startsWith("/home/crew/") &&
          !pathname.startsWith("/home/crew-payroll")),
      allowedUserTypes: [3],
    },
    {
      label: "Vessel Profile",
      icon: Ship,
      href: "/home/vessel",
      active:
        pathname === "/home/vessel" ||
        (pathname.startsWith("/home/vessel/") &&
          !pathname.startsWith("home/vessel-movement/")),
      allowedUserTypes: [3],
    },
    {
      label: "Wages",
      icon: RiCoinsFill,
      href: "/home/wages",
      active: pathname.startsWith("/home/wages"),
      allowedUserTypes: [3],
    },
    {
      label: "Crew Records",
      icon: Users,
      href: "/home/crew-govt-records",
      active: pathname.startsWith("/home/crew-govt-records"),
      allowedUserTypes: [5],
    },
    {
      label: "Payment Reference",
      icon: Banknote,
      href: "/home/payment-reference",
      active: pathname.startsWith("/home/payment-reference"),
      allowedUserTypes: [5],
    },
    {
      label: "Deduction",
      icon: TbCurrencyDollarOff,
      href: "/home/deduction",
      active: pathname.startsWith("/home/deduction"),
      allowedUserTypes: [3, 5],
      subItems: [
        {
          label: "Crew Entries",
          href: "/home/deduction",
          active:
            pathname === "/home/deduction" ||
            pathname === "/home/deduction/deduction-entries",
          allowedUserTypes: [3],
        },
        {
          label: "Description",
          href: "/home/deduction/description",
          active: pathname === "/home/deduction/description",
          allowedUserTypes: [3],
        },
        {
          label: "Government",
          href: "/home/deduction/government-deductions",
          active: pathname === "/home/deduction/government-deductions",
          allowedUserTypes: [5],
        },
        {
          label: "Reports",
          href: "/home/deduction/reports",
          active: pathname === "/home/deduction/reports",
          allowedUserTypes: [5],
        },
      ],
    },
    {
      label: "Remittance",
      icon: CircleMinus,
      href: "/home/remittance",
      active: pathname.startsWith("/home/remittance"),
      allowedUserTypes: [3],
    },
    {
      label: "Allotment Payroll",
      icon: BiReceipt,
      href: "/home/allotment",
      active: pathname.startsWith("/home/allotment"),
      allowedUserTypes: [3, 4],
    },
    {
      label: "Crew Records",
      icon: SquareUserRound,
      href: "/home/crew-payroll",
      active: pathname.startsWith("/home/crew-payroll"),
      allowedUserTypes: [3, 4],
    },
    {
      label: "Crew Movement",
      icon: Footprints,
      href: "/home/crew-movement",
      active: pathname.startsWith("/home/crew-movement"),
      allowedUserTypes: [3],
    },
    {
      label: "Applications",
      icon: MdOutlinePendingActions,
      href: "/home/application_crew",
      active: pathname.startsWith("/home/application_crew"),
      allowedUserTypes: [3],
    },
    {
      label: "Audit Log",
      icon: PiClockCounterClockwiseBold,
      href: "/home/audit-log",
      active: pathname.startsWith("/home/audit-log"),
      allowedUserTypes: [1],
    },
    {
      label: "Login History",
      icon: LogIn,
      href: "/home/login-history",
      active: pathname.startsWith("/home/login-history"),
      allowedUserTypes: [1],
    },
    {
      label: "Manage Users",
      icon: UserCheck,
      href: "/home/manage-users",
      active: pathname.startsWith("/home/manage-users"),
      allowedUserTypes: [1],
    },
    {
      label: "Unpost Payroll",
      icon: Undo2,
      href: "/home/payroll-unposting",
      active: pathname.startsWith("/home/payroll-unposting"),
      allowedUserTypes: [1],
    },
  ];

  // Filter routes based on user type
  const filteredRoutes = allRoutes
    .filter((route) => route.allowedUserTypes.includes(userType))
    .map((route) => ({
      ...route,
      // Filter subItems as well, if they exist
      subItems: route.subItems?.filter((sub) =>
        sub.allowedUserTypes.includes(userType)
      ),
    }));

  return filteredRoutes;
};
