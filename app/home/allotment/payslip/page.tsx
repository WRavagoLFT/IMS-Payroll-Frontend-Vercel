import { Suspense } from "react";
import AllotmentPayslip from "@/components/pages/allotment_payroll/AllotmentPayslip";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <AllotmentPayslip />
    </Suspense>
  );
}
