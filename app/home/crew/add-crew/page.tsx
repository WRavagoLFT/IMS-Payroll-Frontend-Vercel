import { Suspense } from "react";
import AddCrew from "@/components/pages/AddCrew";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <AddCrew />
    </Suspense>
  )
}
