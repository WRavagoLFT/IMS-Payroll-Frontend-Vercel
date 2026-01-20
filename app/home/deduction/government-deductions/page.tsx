import { Suspense } from "react";
import GovermentDeductions from "@/components/pages/GovernmentDeductions";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <GovermentDeductions />
    </Suspense>
  );
}
