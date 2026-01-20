import { Suspense } from "react";
import HMDFContribution from "@/components/pages/HDMFContributions";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <HMDFContribution />
    </Suspense>
  );
}
