import { Suspense } from "react";
import ManageUsers from "@/components/pages/ManageUsers";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
      <ManageUsers />
    </Suspense>
  );
}
