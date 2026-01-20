import { Suspense } from "react";
import CrewPayrollHistory from "@/components/pages/CrewPayrollHistory";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewPayrollHistory />
    </Suspense>
  );
}
