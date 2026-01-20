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
import {
  addCrewRemittance,
  type AddCrewRemittanceData,
  type AllotteeOption,
} from "@/src/services/remittance/crewRemittance.api";
import { toast } from "../ui/use-toast";

const REMITTANCE_STATUS_OPTIONS = [
  { value: "0", label: "Pending" },
  { value: "1", label: "Completed" },
  { value: "2", label: "Declined" },
  { value: "3", label: "On Hold" },
] as const;

const formSchema = z.object({
  allotteeID: z.string().min(1, "Please select an allottee"),
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Please enter a valid amount greater than 0" }
    ),
  remarks: z.string().min(1, "Please enter remarks"),
  status: z.string().min(1, "Please select a status"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddRemittanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crewCode: string;
  allottees: AllotteeOption[];
  onSuccess: () => void;
}

export function AddRemittanceDialog({
  open,
  onOpenChange,
  crewCode,
  allottees,
  onSuccess,
}: AddRemittanceDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      allotteeID: "",
      amount: "",
      remarks: "",
      status: "",
    },
  });

  const { reset, formState } = form;
  const { isSubmitting } = formState;

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      const allotteeID = parseInt(data.allotteeID);
      const amount = parseFloat(data.amount);

      const cleanData: AddCrewRemittanceData = {
        allotteeID: allotteeID,
        amount: amount,
        remarks: data.remarks.trim(),
        status: data.status,
      };

      const response = await addCrewRemittance(crewCode, cleanData);

      if (response && response.success) {
        onSuccess();
        onOpenChange(false);
        reset();

        toast({
          title: "Remittance Added",
          description: "The remittance has been successfully added.",
          variant: "success",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to add remittance",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding remittance:", error);
      const err = error as Error;
      toast({
        title: "Error",
        description:
          err?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hasValidAllottees =
    allottees && Array.isArray(allottees) && allottees.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#FCFCFC] p-10">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold text-[#2E37A4]">
            Add Remittance
          </DialogTitle>
          {/* <DialogDescription className="text-center text-sm text-gray-600">
            Add a new remittance entry for the selected allottee
          </DialogDescription> */}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className=" space-y-4">
            <FormField
              control={form.control}
              name="allotteeID"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600 font-medium">
                    Allottee
                  </FormLabel>
                  <Select
                    disabled={!hasValidAllottees}
                    onValueChange={field.onChange}
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full border border-[#E0E0E0] rounded-md">
                        <SelectValue placeholder="Select allottee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hasValidAllottees ? (
                        allottees.map((allottee) => (
                          <SelectItem
                            key={allottee.AllotteeDetailID}
                            value={allottee.AllotteeDetailID.toString()}
                            className="hover:bg-gray-100">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {allottee.AllotteeName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {allottee.RelationName} • {allottee.BankName}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-data" disabled>
                          No allottees available for this crew member
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {!hasValidAllottees && (
                    <p className="text-xs text-gray-500">
                      No allottees found for crew code: {crewCode}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600 font-medium">
                    Amount
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount"
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
              name="remarks"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600 font-medium">
                    Remarks
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter remarks"
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
              name="status"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600 font-medium">
                    Status
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full border border-[#E0E0E0] rounded-md">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REMITTANCE_STATUS_OPTIONS.map((statusOption) => (
                        <SelectItem
                          key={statusOption.value}
                          value={statusOption.value}>
                          {statusOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-sm"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 text-sm bg-[#2E37A4] hover:bg-[#2E37A4]/90"
                disabled={isSubmitting || !hasValidAllottees}>
                {isSubmitting ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Remittance
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
