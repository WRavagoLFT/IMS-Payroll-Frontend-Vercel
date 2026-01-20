import { Suspense } from "react";
import PhilhealthContribution from "@/components/pages/PhilhealthContribution";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <PhilhealthContribution />
    </Suspense>
  );
}
