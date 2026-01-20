import { Suspense } from "react";
import JoinCrew from "@/components/pages/JoinCrew";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <JoinCrew />
    </Suspense>
  );
}
