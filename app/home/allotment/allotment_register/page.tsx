import { Suspense } from "react";
import AllotmentRegister from "@/components/pages/allotment_payroll/AllotmentRegister";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <AllotmentRegister />
    </Suspense>
  );
}
