import { ChevronLeft, Pencil, Save, X, Plus, CircleMinus } from "lucide-react";
import { TbUserCheck } from "react-icons/tb";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CrewHeaderProps {
  isEditing: boolean;
  activeTab: string;
  toggleEditMode: () => void;
  saveChanges: () => void;
  isEditingAllottee: boolean;
  toggleAllotteeEdit: () => void;
  handleDelete: (selectedAllottee: string) => void;
}

export function CrewHeader({
  isEditing,
  activeTab,
  toggleEditMode,
  saveChanges,
  isEditingAllottee,
  toggleAllotteeEdit,
}: CrewHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link href="/home/crew">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-semibold">Crew Details</h1>
      </div>

      {isEditing ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={toggleEditMode}
            className="border-gray-300 w-40"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 w-40"
            onClick={saveChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      ) : (
        activeTab === "details" && (
          <Button
            className="bg-primary hover:bg-primary/90 w-40"
            onClick={toggleEditMode}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Crew
          </Button>
        )
      )}
      {activeTab === "allottee" && (
        <div className="px-4 pt-0 flex justify-end gap-3">
          <Button
            variant="destructive"
            className="px-6 bg-[#B63C3C] w-40"
          >
            <CircleMinus />
            Remove
          </Button>
          {isEditingAllottee ? (
            <>
              <Button
                variant="outline"
                onClick={toggleAllotteeEdit}
                className="border-gray-300 w-40"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 w-40"
                onClick={toggleAllotteeEdit}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={toggleAllotteeEdit}
                className="bg-[#2BA148] hover:bg-green-700 px-6 w-40"
              >
                <Pencil />
                Edit
              </Button>
              <Button className="bg-[#21299D] hover:bg-indigo-700 px-6 w-40">
                <Plus />
                Add Allottee
              </Button>
            </>
          )}
        </div>
      )}
      {activeTab === "validation" && (
        <div className="px-4 pt-0 flex justify-end gap-3">
          <Button variant="destructive" className="px-6 bg-[#B63C3C] w-40">
            <CircleMinus className="h-4 w-4 mr-2" />
            Decline
          </Button>

          <Button className="bg-[#21299D] hover:bg-indigo-700 px-6 w-40">
            <TbUserCheck className="h-4 w-4 mr-2" />
            Verify Account
          </Button>
        </div>
      )}
    </div>
  );
}