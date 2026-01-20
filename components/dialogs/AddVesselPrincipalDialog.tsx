import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { addVesselPrincipal } from "@/src/services/vessel/vesselPrincipal.api";
import { VesselPrincipalItem } from "@/src/services/vessel/vesselPrincipal.api";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { AxiosError } from "axios"; 
import { Plus } from "lucide-react";

const formSchema = z.object({
  principalCode: z.string().min(1, "Principal Code is required"),
  principalName: z.string().min(1, "Principal Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddVesselPrincipalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newVesselPrincipal: VesselPrincipalItem) => void;
}

export function AddVesselPrincipalDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddVesselPrincipalDialogProps) {
  const { toast } = useToast();

  const [uniqueError, setUniqueError] = useState<boolean>(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      principalCode: "",
      principalName: "",
    },
  });

  const {
    setError,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUniqueError(false);
      reset();
    }
    onOpenChange(open);
  };

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setUniqueError(false);
    try {
      const response = await addVesselPrincipal({
        principalCode: data.principalCode.trim(),
        principalName: data.principalName.trim(),
      });

      if (response.success) {
        toast({
          title: "Success",
          description:
            response.message || "Vessel principal added successfully.",
          variant: "success",
        });

        // Call the onSuccess callback if provided
        if (onSuccess && response.data) {
          // Ensure we pass a single VesselPrincipalItem
          const principalData = Array.isArray(response.data)
            ? response.data[0]
            : response.data;
          onSuccess(principalData);
        }

        handleOpenChange(false); // Close the dialog after success
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add vessel principal.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const err = error as Error;

      if (err instanceof AxiosError) {
        // if (err.response?.data?.message.includes("Unique constraint failed")) {

        setError("principalCode", {
          type: "manual",
          message: "This vessel principal code is already in use.",
        });

        setError("principalName", {
          type: "manual",
          message: "This vessel principal name is already in use",
        });

        setUniqueError(true);
        return;
        // }
      }

      toast({
        title: "Error",
        description: "An error occurred while adding the vessel principal.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-4 bg-[#FCFCFC]">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-primary w-full text-center">
              Add Vessel Principal
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 flex flex-col space-y-6">
            <FormField
              control={form.control}
              name="principalCode"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel
                    className={`text-sm text-gray-600 ${
                      uniqueError ? "text-destructive" : ""
                    }`}>
                    Vessel Principal Code
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vessel principal code"
                      className={`h-10 ${
                        uniqueError
                          ? "border-destructive focus:!ring-destructive/50"
                          : ""
                      }`}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="principalName"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel
                    className={`text-sm text-gray-600 ${
                      uniqueError ? "text-destructive" : ""
                    }`}>
                    Vessel Principal Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vessel principal name"
                      className={`h-10 ${
                        uniqueError
                          ? "border-destructive focus:!ring-destructive/50"
                          : ""
                      }`}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Save Vessel Principal
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
