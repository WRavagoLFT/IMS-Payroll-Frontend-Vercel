import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Plus, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { addDeductionDescription } from "@/src/services/deduction/deductionDescription.api";
import { toast } from "../ui/use-toast";
import { AxiosError } from "axios";

const formSchema = z.object({
  deductionCode: z.string().min(1, "Deduction code is required"),
  deductionName: z.string().min(1, "Deduction name is required"),
  deductionType: z.string().min(1, "Deduction type is required"),
  currency: z.string().min(1, "Currency is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDeductionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setOnSuccess: Dispatch<SetStateAction<boolean>>;
}

export function AddDeductionTypeDialog({
  open,
  onOpenChange,
  setOnSuccess,
}: AddDeductionTypeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deductionCode: "",
      deductionName: "",
      deductionType: "",
      currency: "",
    },
  });

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    const payload = {
      deductionCode: values.deductionCode,
      deductionName: values.deductionName,
      deductionType: parseInt(values.deductionType),
      currency: values.currency,
    };

    await addDeductionDescription(payload)
      .then(() => {
        toast({
          title: "Deduction Type Added",
          description: "The deduction type has been successfully added.",
          variant: "success",
        });
        form.reset();
        onOpenChange(false);
        setOnSuccess(true);
      })
      .catch((error: unknown) => {
        const err = error as Error;
        if (
          err instanceof AxiosError &&
          err.response?.data.message.includes("already exists")
        ) {
          toast({
            title: "Error",
            description:
              err.response.data.message || "Failed to add deduction type.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // Handler for when the dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset the form when dialog closes

      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#FCFCFC]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold text-[#2E37A4]">
            Add Deduction Type
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-6">
            <FormField
              control={form.control}
              name="deductionCode"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600">
                    Deduction Code
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter deduction code"
                      className="border border-[#E0E0E0] rounded-md"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deductionName"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600">
                    Deduction Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter deduction name"
                      className="border border-[#E0E0E0] rounded-md"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deductionType"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600">
                    Deduction Type
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full border border-[#E0E0E0] rounded-md">
                        <SelectValue placeholder="Select deduction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Common Deduction</SelectItem>
                      <SelectItem value="2">Loan Type</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-sm text-gray-600">
                    Currency
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full border border-[#E0E0E0] rounded-md">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">PHP</SelectItem>
                      <SelectItem value="2">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-sm h-11"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 text-sm h-11 bg-[#2E37A4] hover:bg-[#2E37A4]/90"
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Save Deduction Type
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
