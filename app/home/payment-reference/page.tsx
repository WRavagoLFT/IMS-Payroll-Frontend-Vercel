import { Suspense } from "react";
import PaymentReference from "@/components/pages/PaymentReference";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <PaymentReference />
    </Suspense>
  );
}
