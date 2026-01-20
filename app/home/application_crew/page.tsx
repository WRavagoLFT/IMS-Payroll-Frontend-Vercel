import { Suspense } from "react";
import CrewApplication from "@/components/pages/CrewApplication";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <CrewApplication />
    </Suspense>
  );
}
