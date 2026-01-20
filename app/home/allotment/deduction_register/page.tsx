import { Suspense } from "react";
import DeductionRegister from "@/components/pages/allotment_payroll/DeductionRegister";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <DeductionRegister />
    </Suspense>
  );
}
