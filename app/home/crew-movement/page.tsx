import { Suspense } from "react";
import CrewMovement from "@/components/pages/CrewMovement";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewMovement />
    </Suspense>
  );
}
