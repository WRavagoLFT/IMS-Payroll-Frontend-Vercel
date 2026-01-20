import Wages from "@/components/pages/Wages";
import { Suspense } from "react";

export default function page() {
  return (
     <Suspense fallback={<div>Loading...</div>}>
      <Wages />
    </Suspense>
  );
}