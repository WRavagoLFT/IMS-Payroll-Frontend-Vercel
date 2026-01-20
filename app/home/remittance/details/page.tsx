import { Suspense } from "react";
import RemittanceDetails from "@/components/pages/RemittanceDetails";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <RemittanceDetails />
    </Suspense>
  );
}
