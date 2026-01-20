import { Suspense } from "react";
import LoginHistory from "@/components/pages/LoginHistory";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <LoginHistory />
    </Suspense>
  );
}
