import { Suspense } from "react";
import CrewList from "@/components/pages/CrewList";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewList/>
    </Suspense>
  );
}