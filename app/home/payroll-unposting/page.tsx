import { Suspense } from "react";
import PayrollUnposting from "@/components/pages/PayrollUnposting";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <PayrollUnposting />
    </Suspense>
  );
}
