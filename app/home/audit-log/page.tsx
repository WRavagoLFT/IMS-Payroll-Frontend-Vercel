import { Suspense } from "react";
import AuditLog from "@/components/pages/allotment_payroll/AuditLog";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <AuditLog/>
    </Suspense>
  );
}