import { Suspense } from "react";
import VesselCrewList from "@/components/pages/VesselCrewList";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <VesselCrewList />
    </Suspense>
  );
}
