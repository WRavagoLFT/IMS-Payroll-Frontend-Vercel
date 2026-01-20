"use client";

import { useRouter } from "next/navigation";
import Login from "@/components/Login";
import Image from "next/image";
import { Loader } from "lucide-react";

export default function Home() {
  const router = useRouter();
  return (

    <main className="flex h-screen relative">
      <div className="hidden lg:block lg:w-3/4 bg-[#1e2f8d] relative pl-5">
        <Image
          src="/boat-image.jpg"
          alt="Ship Background"
          fill
          className="object-cover opacity-20"
        />
        <div className="relative z-10 p-12 text-white">
          <div className="flex items-center gap-3 mb-20">
            <Image src="/ims-logo.png" alt="IMS PHIL Logo" width={70} height={70} />
            <span className="text-2xl font-medium">IMS Phil Payroll</span>
          </div>
          <div className="flex justify-center flex-col gap-1">
            <h1 className="text-8xl font-bold leading-tight mb-1 mt-16">
              IMS
              <br />
              PHILIPPINES
              <br />
              MARITIME CORP
            </h1>
            <p className="font-bold text-5xl mt-0">Crew Payroll System</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/4 bg-[#E8EDF3]" />
      <div className="absolute inset-y-0 left-[75%] -translate-x-1/2 flex items-center z-20">
        <Login />
      </div>
    </main>
  );
}
