import { Suspense } from "react";
import Remittance from "@/components/pages/Remittance";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <Remittance />
    </Suspense>
  )
}
