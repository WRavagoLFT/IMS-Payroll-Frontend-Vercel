import { Suspense } from "react";
import DeductionDescription from "@/components/pages/DeductionDescription";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <DeductionDescription />
    </Suspense>
  );
}
