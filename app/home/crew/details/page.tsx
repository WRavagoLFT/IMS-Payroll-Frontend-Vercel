import { Suspense } from "react";
import CrewDetails from "@/components/pages/CrewDetails";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewDetails />
    </Suspense>
  );
}
