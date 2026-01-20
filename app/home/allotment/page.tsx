import { Suspense } from "react";
import Allotment from "@/components/pages/Allotment";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <Allotment />
    </Suspense>
  );
}
