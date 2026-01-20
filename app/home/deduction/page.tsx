import { Suspense } from "react";
import CrewEntries from "@/components/pages/CrewEntries";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewEntries />
    </Suspense>
  );
}
