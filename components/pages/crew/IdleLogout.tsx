"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function IdleLogout({ timeout = 300000, warningTime = 5000 }) {
  const router = useRouter();
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [countdown, setCountdown] = useState(warningTime / 1000);

  const logoutUser = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      router.push("/"); // redirect
    }
  };

  const startCountdown = () => {
    setCountdown(warningTime / 1000);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          logoutUser(); // logout when countdown reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setDialogOpen(false);
    setIdle(false);

    warningRef.current = setTimeout(() => {
      setDialogOpen(true); // show dialog
      setIdle(true);
    }, timeout - warningTime);
  };

  const stayLoggedIn = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDialogOpen(false);
    setIdle(false);
    resetTimer(); // restart idle detection
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // start initial timer

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Start countdown when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      startCountdown();
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [dialogOpen]);

  return (
    <Dialog open={dialogOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session Expiring</DialogTitle>
          <DialogDescription>
            You will be logged out soon due to inactivity. 
            Please stay active to continue.{" "}
            <strong>{countdown} second{countdown !== 1 ? "s" : ""} remaining</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={stayLoggedIn}>Stay Logged In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
