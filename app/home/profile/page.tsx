import { Suspense } from "react";
import UserProfile from "@/components/pages/Profile";

export default function Page() {
  return (
    <Suspense fallback={<></>}>
        <UserProfile />
    </Suspense>
  );
}