import { Suspense } from "react";
import GovernmentReports from "@/components/pages/GovernmentReports";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <GovernmentReports />
    </Suspense>
  );
}
