import { Suspense } from "react";
import DeductionEntries from "@/components/pages/DeductionEntries";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <DeductionEntries />
    </Suspense>
  );
}
