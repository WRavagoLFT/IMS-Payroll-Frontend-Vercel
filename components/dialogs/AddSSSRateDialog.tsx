"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { toast } from "../ui/use-toast";
import {
  addDeductionGovtRates,
  SSSDeductionRate,
} from "@/src/services/deduction/governmentDeduction.api";
import { cn } from "@/lib/utils";

interface SSSDeductionFormValues {
  year: string | number;
  salaryFrom: string | number;
  salaryTo: string | number;
  regularSS: string | number;
  mutualFund: string | number;
  ec: string | number;
  eess: string | number;
  erss: string | number;
  eemf: string | number;
  ermf: string | number;
}

export const formSchema = z.object({
  contributionId: z.number().optional(),
  year: z
    .string()
    .min(1, "Please enter the year")
    .refine((val) => !isNaN(Number(val)), {
      message: "Year must be a valid number",
    }),

  salaryFrom: z
    .string()
    .min(1, "Please enter salary from")
    .min(0, "Salary From must be a positive number")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Salary From must be a number greater than 0",
    }),

  salaryTo: z
    .string()
    .min(1, "Please enter salary to")
    .min(0, "Salary To must be a positive number")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Salary To must be a number greater than 0",
    }),

  regularSS: z
    .string()
    .min(1, "Please enter Regular SS")
    .refine((val) => !isNaN(Number(val)), {
      message: "Regular SS must be a number",
    }),

  mutualFund: z
    .string()
    .min(1, "Please enter Mutual Fund")
    .refine((val) => !isNaN(Number(val)), {
      message: "Mutual Fund must be a number",
    }),

  ec: z
    .string()
    .min(1, "Please enter EC")
    .refine((val) => !isNaN(Number(val)), {
      message: "EC must be a number",
    }),

  eess: z
    .string()
    .min(1, "Please enter EE SS")
    .refine((val) => !isNaN(Number(val)), {
      message: "EE SS must be a number",
    }),

  erss: z
    .string()
    .min(1, "Please enter ER SS")
    .refine((val) => !isNaN(Number(val)), {
      message: "ER SS must be a number",
    }),

  eemf: z
    .string()
    .min(1, "Please enter EE MF")
    .refine((val) => !isNaN(Number(val)), {
      message: "EE MF must be a number",
    }),

  ermf: z
    .string()
    .min(1, "Please enter ER MF")
    .refine((val) => !isNaN(Number(val)), {
      message: "ER MF must be a number",
    }),
})
  .refine((data) => data.salaryFrom <= data.salaryTo, {
    message: "Salary From must be less than or equal to Salary To",
    path: ["salaryFrom"],
  });

interface AddSSSRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newRate: SSSDeductionRate) => void;
}

export function AddSSSRateDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddSSSRateDialogProps) {
  const form = useForm<SSSDeductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: "",
      salaryFrom: "",
      salaryTo: "",
      regularSS: "",
      mutualFund: "",
      ec: "",
      eess: "",
      erss: "",
      eemf: "",
      ermf: "",
    },
  });

  type SSSDeductionFormValues = z.infer<typeof formSchema>;
  const { reset, formState } = form;
  const { isSubmitting } = formState;
  const years = Array.from(
    { length: 8 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: SSSDeductionFormValues) => {
    try {
      const payload = {
        contributionId: Number(data.contributionId),
        type: "SSS" as const,
        year: Number(data.year),
        salaryFrom: Number(data.salaryFrom),
        salaryTo: Number(data.salaryTo),
        regularSS: Number(data.regularSS),
        mutualFund: Number(data.mutualFund),
        ec: Number(data.ec),
        eess: Number(data.eess),
        erss: Number(data.erss),
        eemf: Number(data.eemf),
        ermf: Number(data.ermf),
      };

      const response = await addDeductionGovtRates(payload);

      if (response && response.success) {
        const newRate: SSSDeductionRate = {
          contributionId: Number(data.contributionId),
          Year: Number(data.year),
          salaryFrom: Number(data.salaryFrom),
          salaryTo: Number(data.salaryTo),
          regularSS: Number(data.regularSS),
          mutualFund: Number(data.mutualFund),
          ec: Number(data.ec),
          eess: Number(data.eess),
          erss: Number(data.erss),
          eemf: Number(data.eemf),
          ermf: Number(data.ermf),
        };

        onSuccess?.(newRate);
        onOpenChange(false);
        reset();

        toast({
          title: "SSS Deduction Added",
          description: "The SSS deduction rate has been successfully added.",
          variant: "success",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to add SSS deduction",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding SSS deduction:", error);
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#FCFCFC] p-10">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold text-[#2E37A4]">
            Add SSS Contribution Rate
          </DialogTitle>
          {/* <DialogDescription className="text-center text-sm text-gray-600">
            Add a new remittance entry for the selected allottee
          </DialogDescription> */}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className=" space-y-1">
            <FormField
              control={form.control}
              name="year"
              render={({ field, fieldState }) => (
                <FormItem className="w-full gap-1">
                  <FormLabel className="text-sm text-gray-600 font-medium">
                    Select Year
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full rounded-md h-10",
                          fieldState.invalid
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#E0E0E0]"
                        )}
                      >
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {years.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-4 my-6">
              <FormField
                control={form.control}
                name="salaryFrom"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      Salary From
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter Salary From"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryTo"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      Salary To
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter Salary To"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 my-6">
              <FormField
                control={form.control}
                name="regularSS"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      Regular SS
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter Regular SS"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mutualFund"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      Mutual Fund
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter Mutual Fund"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 my-6">
              <FormField
                control={form.control}
                name="erss"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      ERSS
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter ERSS"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ermf"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      ERMF
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter ERMF"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 my-6">
              <FormField
                control={form.control}
                name="ec"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      EC
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter EC"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eess"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      EESS
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter EESS"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 my-6">
              <FormField
                control={form.control}
                name="eemf"
                render={({ field }) => (
                  <FormItem className="w-full gap-1">
                    <FormLabel className="text-sm text-gray-600 font-medium">
                      EEMF
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter EEMF"
                        className="border border-[#E0E0E0] rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-sm"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 text-sm bg-[#2E37A4] hover:bg-[#2E37A4]/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add SSS year
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
