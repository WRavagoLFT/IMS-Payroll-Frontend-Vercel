import { Suspense } from "react";
import CrewPayroll from "@/components/pages/CrewPayroll";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewPayroll />
    </Suspense>
  );
}
