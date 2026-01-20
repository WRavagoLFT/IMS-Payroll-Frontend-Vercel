import { Suspense } from "react";
import CrewGovtRecords from "@/components/pages/CrewGovtRecords";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewGovtRecords />
    </Suspense>
  );
}