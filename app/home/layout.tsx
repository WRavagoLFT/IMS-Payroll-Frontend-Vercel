import HomeLayoutClient from "@/components/pages/HomeClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) redirect("/");

  let session;
  try {
    session = JSON.parse(sessionCookie);
  } catch {
    redirect("/");
  }

  if (!session?.isAuthenticated) redirect("/");

  return (
    <HomeLayoutClient
      user={{
        Email: session.email,
        UserType: session.userType,
        isAuthenticated: session.isAuthenticated,
      }}
    >
      {children}
    </HomeLayoutClient>
  );
}
