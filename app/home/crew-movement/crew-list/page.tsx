import { Suspense } from "react";
import CrewMovementCrew from "@/components/pages/CrewMovementList";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewMovementCrew />
    </Suspense>
  );
}
