import { Suspense } from "react";
import VesselProfile from "@/components/pages/VesselProfile";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <VesselProfile />
    </Suspense>
  );
}
