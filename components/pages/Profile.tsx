"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "../ui/card";
import Image from "next/image";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Save } from "lucide-react";
import { updatePassword } from "@/src/services/users/users.api";
import { toast } from "../ui/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCurrentUser, UserItem } from "@/src/services/auth/auth.api";

type UpdatePasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function UserProfile() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserItem | null>(null);

  const fetchUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getCurrentUser();
      if (response.success) {
        setUser(response.data);
      } else {
        setError(response.message || "Failed to fetch user data");
      }
    } catch (err) {
      setError("An error occurred while fetching user data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

const passwordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, "Old password is required"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        "Password must include uppercase, lowercase, and a number"
      ),

    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

  type UpdatePasswordForm = z.infer<typeof passwordSchema>;

  const form = useForm<UpdatePasswordForm>({
  resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: UpdatePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updatePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Password updated successfully.",
          variant: "success",
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Unexpected Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="h-full w-full p-3 pt-3 overflow-hidden">
        <style jsx global>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .overflow-y-auto::-webkit-scrollbar,
          .overflow-auto::-webkit-scrollbar,
          .overflow-scroll::-webkit-scrollbar {
            display: none;
          }

          .overflow-y-auto,
          .overflow-auto,
          .overflow-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <div className="h-full overflow-hidden">
          <div className="p-3 pt-0 sm:p-4 flex flex-col space-y-4 sm:space-y-5 h-full">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-semibold mb-0">Profile</h1>
            </div>

            <div className="h-full w-full pt-1">
              <div className="flex flex-col space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="p-6 rounded-2xl shadow-md bg-white justify-center">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Image
                        src="/user-profile.svg"
                        alt="User Profile Image"
                        width={200}
                        height={200}
                      />
                      <div className="flex flex-col items-center text-center">
                        <h2 className="text-2xl font-bold">
                          {user?.FirstName || "N/A"} {user?.LastName || "N/A"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {user?.Email || "N/A"}
                        </p>
                        <p className="text-sm font-medium text-secondary-foreground mt-1 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-800"></span>
                          {user?.UserTypeName || "N/A"}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Change Password Card */}
                  <div className="md:col-span-3">
                    <Card className="h-auto flex flex-col p-6 rounded-2xl space-y-4">
                      <h2 className="text-xl font-semibold text-primary my-2">
                        Change Password
                      </h2>

                      <FormProvider {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-6"
                        >
                          <FormField
                            control={form.control}
                            name="oldPassword"
                            render={({ field, fieldState}) => (
                              <FormItem>
                                <FormLabel className="text-sm text-gray-600">
                                  Old Password
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        showOldPassword ? "text" : "password"
                                      }
                                      placeholder="Enter Old Password"
                                      {...field}
                                      className={fieldState.invalid ? "border-red-500 focus-visible:ring-red-300 focus-visible:border-transparent" : ""}
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowOldPassword(!showOldPassword)
                                      }
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                                    >
                                      {showOldPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field, fieldState }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-gray-600">
                                  New Password
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        showNewPassword ? "text" : "password"
                                      }
                                      placeholder="Enter New Password"
                                      {...field}
                                      className={fieldState.invalid ? "border-red-500 focus-visible:ring-red-300 focus-visible:border-transparent" : ""}
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowNewPassword(!showNewPassword)
                                      }
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                                    >
                                      {showNewPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field, fieldState }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-gray-600">
                                  Confirm New Password
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        showConfirmPassword
                                          ? "text"
                                          : "password"
                                      }
                                      placeholder="Enter Confirm Password"
                                      {...field}
                                      className={fieldState.invalid ? "border-red-500 focus-visible:ring-red-300 focus-visible:border-transparent" : ""}
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowConfirmPassword(
                                          !showConfirmPassword
                                        )
                                      }
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                                    >
                                      {showConfirmPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <div className="pt-4 flex flex-col items-end">
                            <Button className="h-9" type="submit">
                              <Save className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                              Save Changes
                            </Button>
                          </div>
                        </form>
                      </FormProvider>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
