"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  loginUser,
  LoginResponse,
} from "../src/services/auth/auth.api";
import { PiEye, PiEyeSlash } from "react-icons/pi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogClose, DialogTitle } from "@radix-ui/react-dialog";
import Image from "next/image";
import { toast } from "./ui/use-toast";
import { useAuth } from "@/src/store/useAuth";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Please enter a password.",
  }),
});

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle submit
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      const cookieResponse = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          console.warn("Invalid credentials");
          throw new Error("Invalid credentials, please check your email and password.");
        } else if (res.status === 400) {
          console.error("Server error during login");
          throw new Error("Invalid credentials, please check your email and password.");
        } else if (res.status === 500) {
          console.error("Server error during login");
          throw new Error("Internal server error. Please try again later or contact support.");
        } else {
          console.error("Unexpected error:", cookieResponse?.message);
          throw new Error(cookieResponse?.message || "An unexpected error occurred.");
        }
      }

      const response: LoginResponse = await loginUser(values);

      setUser({
        email: response.data.email,
        userType: response.data.userType,
      });

      toast({
        title: "Login Successful",
        variant: "success",
        description: `Welcome back, ${response.data.email || "User"}!`,
      });

      router.push("/home/dashboard");

    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again later.";

      setErrorMessage(message);

      toast({
        title: "Error",
        variant: "destructive",
        description: message,
      });

    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-[550px] px-6">
      <Card className="w-full p-14 bg-[#FDFDFD] shadow-[2px_2px_25%_#C1BAD840] rounded-xl border-0">
        <div className="mb-4">
          <h2 className="flex justify-center text-4xl font-semibold text-[#1F279C] mb-2">
            Log in
          </h2>
        </div>
        <div className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="mb-22 space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel
                        className={`text-sm ${fieldState.error ? "text-red-600" : ""
                          }`}
                      >
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter email address"
                          {...field}
                          className={`h-10 text-sm pr-12 ${fieldState.error
                              ? "border-red-500 ring-red-500 focus-visible:ring-red-200 focus-visible:border-red-500"
                              : ""
                            }`}
                        />
                      </FormControl>
                      <div className="flex items-center gap-1">
                        <FormMessage className="text-base" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel
                        className={`text-sm ${fieldState.error ? "text-red-600" : ""
                          }`}
                      >
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            {...field}
                            className={`h-10 text-sm pr-12 ${fieldState.error
                                ? "border-red-500 ring-red-500 focus-visible:ring-red-200 focus-visible:border-red-500"
                                : ""
                              }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {showPassword ? (
                              <PiEyeSlash size={20} />
                            ) : (
                              <PiEye size={20} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-base" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Display error message if any
              {errorMessage && (
                <div className="text-sm text-red-500 text-center">
                  {errorMessage}
                </div>
              )} */}

              <Button
                suppressHydrationWarning
                type="submit"
                className="w-full h-10 text-sm bg-[#1e2f8d] hover:bg-[#1e2f8d]/90"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </Form>

          <div className="flex items-center justify-center mt-4 flex-col gap-20">
            <Dialog>
              <DialogTrigger className="text-base text-center text-[#1e2f8d] hover:underline">
                Forgot password?
              </DialogTrigger>
              <DialogContent className="p-13">
                <DialogHeader className="gap-3">
                  <DialogTitle> </DialogTitle>
                  <Image
                    src="/mail-logo.png"
                    alt="Forgot Password"
                    width={100}
                    height={100}
                    className="mx-auto"
                  />
                  <DialogDescription className="text-md text-center text-[#1e2f8d]">
                    To reset your password, please send a request to the
                    administrator at admin@gmail.com.
                  </DialogDescription>
                  <DialogClose asChild className="mt-2">
                    <Button
                      variant="outline"
                      className="py-5 px-9 text-sm bg-[#1e2f8d] hover:bg-[#1e2f8d]/90 text-white hover:text-white"
                    >
                      Okay
                    </Button>
                  </DialogClose>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            {/* <p className="text-base text-center text-gray-600">
              Don&apos;t have an account yet?{" "}
              <Link href="/register" className="text-[#1e2f8d] hover:underline">
                Register here
              </Link>
            </p> */}
          </div>
        </div>
      </Card>
    </div>
  );
}
