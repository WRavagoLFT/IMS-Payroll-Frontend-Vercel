import { Suspense } from "react";
import SSSContribution from "@/components/pages/SSSContribution";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <SSSContribution />
    </Suspense>
  );
}
