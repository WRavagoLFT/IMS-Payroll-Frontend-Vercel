"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useEffect, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { Icon } from "@iconify/react";
import { Check } from "lucide-react";
import { useToast } from "../ui/use-toast";
import Swal from "sweetalert2";
import { useLocationStore } from "@/src/store/useLocationStore";
import { useCrewStore } from "@/src/store/useCrewStore";
import { addCrew, AddCrewDataForm } from "@/src/services/crew/crew.api";
import { useRef } from "react";
import Image from "next/image";
import { AxiosError } from "axios";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import { GovIDCardInput } from "../ui/govtinputs";

export default function AddCrew() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  const { cities, provinces, fetchCities, fetchProvinces, loading } =
    useLocationStore();
  const { crewRanks, fetchCrewRanks } = useCrewStore();
  const [citySearch, setCitySearch] = useState("");
  const [provinceSearch, setProvinceSearch] = useState("");
  const [rankSearch, setRankSearch] = useState("");
  const [crewPhotoFile, setCrewPhotoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>("/image.png"); // For image preview
  const [isSubmitting, setIsSubmitting] = useState(false); // For loading state during submission
  const fileInputRef = useRef<HTMLInputElement>(null); // For triggering file input
  const [duplicateError, setDuplicateError] = useState(false); // For duplicate crew code error
  const [noMiddleName, setNoMiddleName] = useState(false); // For no middle name checkbox
  const { fetchCrews: refreshCrewList } = useCrewStore.getState(); // To refresh list after adding
  const [tabErrors, setTabErrors] = useState<{ [key: string]: boolean }>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCrewPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCrewPhotoFile(null);
      setImagePreview("/image.png");
    }
  };

  //const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<{ [tab: string]: boolean }>({});

  // Add form state
  const [formData, setFormData] = useState({
    rank: "",
    crewCode: "",
    currentVessel: "",
    mobileNumber: "",
    landlineNumber: "",
    emailAddress: "",
    lastName: "",
    firstName: "",
    middleName: "",
    maritalStatus: "",
    sex: "",
    birthdate: "",
    city: "",
    province: "",
    address: "",
    // Add Government IDs fields
    sssNumber: "",
    taxIdNumber: "",
    philhealthNumber: "",
    hdmfNumber: "",
    // Add Travel Documents fields
    passportNumber: "",
    passportIssueDate: "",
    passportExpiryDate: "",
    seamansBook: "",
    seamansBookIssueDate: "",
    seamansBookExpiryDate: "",
  });

  const maritalStatuses = [
    { value: "1", label: "Single" },
    { value: "2", label: "Married" },
    { value: "4", label: "Separated" },
    { value: "3", label: "Widowed" },
  ];

  const sexOptions = [
    { value: "1", label: "Male" },
    { value: "2", label: "Female" },
  ];

  useEffect(() => {
    fetchCities();
    fetchProvinces();
    fetchCrewRanks();
  }, [fetchCities, fetchProvinces, fetchCrewRanks]);
  // Add tab order array
  const tabOrder = ["details", "movement", "travel", "summary"];

  // Add navigation functions
  const handleNext = () => {
    const currentIndex = tabOrder.indexOf(activeTab);

    //const skipValidation = activeTab === "movement"; // Skip validation for "movement"
    //const isValid = skipValidation ? true : validateTab(activeTab);
    const isValid = validateTab(activeTab);

    setSubmitted((prev) => ({ ...prev, [activeTab]: true }));

    if (!isValid) {
      setTabErrors((prev) => ({ ...prev, [activeTab]: true }));
      return;
    }

    if (!completedTabs.includes(activeTab)) {
      setCompletedTabs([...completedTabs, activeTab]);
    }

    if (currentIndex < tabOrder.length - 1) {
      const nextTab = tabOrder[currentIndex + 1];
      setActiveTab(nextTab);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setCompletedTabs(completedTabs.filter((tab) => tab !== activeTab));
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  // Calculate progress percentage
  const getProgress = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    return ((currentIndex + 1) / tabOrder.length) * 100;
  };

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateDetailsTab = () => {
    const isNameValid = (name: string) =>
      name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);

    const isSelectValid = (value: string) => value.trim() !== "";

    const isDateValid = (date: string) => date.trim() !== "";

    const isLocationValid = (value: string) => value.trim() !== "";

    const lastNameValid = isNameValid(formData.lastName);
    const firstNameValid = isNameValid(formData.firstName);
    const middleNameValid =
      noMiddleName ||
      formData.middleName.trim().length === 0 ||
      isNameValid(formData.middleName);

    const maritalStatusValid = isSelectValid(formData.maritalStatus);
    const sexValid = isSelectValid(formData.sex);
    const birthdateValid = isDateValid(formData.birthdate);
    const provinceValid = isLocationValid(formData.province);
    const cityValid = isLocationValid(formData.city);

    return (
      lastNameValid &&
      firstNameValid &&
      middleNameValid &&
      maritalStatusValid &&
      sexValid &&
      birthdateValid &&
      provinceValid &&
      cityValid
    );
  };

  // Validations Temporarily removed
  const validateMovementTab = () => {
    const sssValid =
      !formData.sssNumber || formData.sssNumber.length === 10;

    const taxIdLength = formData.taxIdNumber.length;
    const taxIdValid =
      !formData.taxIdNumber || (taxIdLength > 8 && taxIdLength < 13);

    const philhealthValid =
      !formData.philhealthNumber || formData.philhealthNumber.length === 12;

    const hdmfValid =
      !formData.hdmfNumber || formData.hdmfNumber.length === 12;

    return sssValid && taxIdValid && philhealthValid && hdmfValid;
  };

  const validateTravelTab = (): boolean => {
    const passportValid =
      formData.passportNumber.length >= 7 &&
      formData.passportNumber.length <= 9;

    const passportIssueValid = !!formData.passportIssueDate;
    const passportExpiryValid = !!formData.passportExpiryDate;
    const passportDatesNotEqual =
      formData.passportIssueDate !== formData.passportExpiryDate;
    const passportExpiryNotEarlier =
      formData.passportExpiryDate >= formData.passportIssueDate;

    const seamansBookValid =
      formData.seamansBook.length >= 7 &&
      formData.seamansBook.length <= 9;

    const seamansBookIssueValid = !!formData.seamansBookIssueDate;
    const seamansBookExpiryValid = !!formData.seamansBookExpiryDate;
    const seamansBookDatesNotEqual =
      formData.seamansBookIssueDate !== formData.seamansBookExpiryDate;
    const seamansBookExpiryNotEarlier =
      formData.seamansBookExpiryDate >= formData.seamansBookIssueDate;

    return (
      passportValid &&
      passportIssueValid &&
      passportExpiryValid &&
      passportDatesNotEqual &&
      passportExpiryNotEarlier &&
      seamansBookValid &&
      seamansBookIssueValid &&
      seamansBookExpiryValid &&
      seamansBookDatesNotEqual &&
      seamansBookExpiryNotEarlier
    );
  };

  const validateTab = (tab: string): boolean => {
    switch (tab) {
      case "details":
        return validateDetailsTab();
      case "movement":
        return validateMovementTab();
      case "travel":
        return validateTravelTab();
      default:
        return true;
    }
  };

  // Handle tab change
  const handleTabChange = (nextTab: string) => {
    const isValid = validateTab(activeTab);

    setSubmitted((prev) => ({ ...prev, [activeTab]: true }));

    if (!isValid) {
      setTabErrors((prev) => ({ ...prev, [activeTab]: true }));
      return; // don't allow change
    }

    // Mark tab as completed
    setCompletedTabs((prev) =>
      prev.includes(activeTab) ? prev : [...prev, activeTab]
    );

    setTabErrors((prev) => ({ ...prev, [activeTab]: false }));
    setActiveTab(nextTab);
    setSubmitted((prev) => ({ ...prev, [nextTab]: false }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitted((prev) => ({ ...prev, [activeTab]: true }));

    const requiredFields: (keyof typeof formData)[] = [
      "crewCode",
      "rank",
      "lastName",
      "firstName",
      "sex",
      "maritalStatus",
      "birthdate",
      "city",
      "province",
      "mobileNumber",
      "emailAddress",
      "passportNumber",
      "passportIssueDate",
      "passportExpiryDate",
      "seamansBook",
      "seamansBookIssueDate",
      "seamansBookExpiryDate",
    ];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        console.warn(`Missing required field: ${field}`);
        toast({
          title: "Missing Information",
          description: `Please fill in the '${field.replace(/([A-Z])/g, " $1")}' field.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    // Email validation
    if (formData.emailAddress && !/\S+@\S+\.\S+/.test(formData.emailAddress)) {
      console.warn("Invalid email entered:", formData.emailAddress);
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const payload: AddCrewDataForm = {
      crewCode: formData.crewCode,
      rank: formData.rank,
      vessel: formData.currentVessel || undefined,
      mobileNumber: formData.mobileNumber,
      landlineNumber: formData.landlineNumber || undefined,
      emailAddress: formData.emailAddress,
      lastName: formData.lastName,
      firstName: formData.firstName,
      middleName: formData.middleName || undefined,
      sex: formData.sex,
      maritalStatus: formData.maritalStatus,
      dateOfBirth: formData.birthdate,
      city: formData.city,
      province: formData.province,
      address: formData.address,
      passportNumber: formData.passportNumber,
      passportIssueDate: formData.passportIssueDate,
      passportExpiryDate: formData.passportExpiryDate,
      seamanBookNumber: formData.seamansBook,
      seamanBookIssueDate: formData.seamansBookIssueDate,
      seamanBookExpiryDate: formData.seamansBookExpiryDate,
      crewPhoto: crewPhotoFile || undefined,
      ...(formData.sssNumber && formData.sssNumber.length >= 10 && { sssNumber: formData.sssNumber }),
      ...(formData.taxIdNumber && formData.taxIdNumber.length >= 9 && { tinNumber: formData.taxIdNumber }),
      ...(formData.philhealthNumber && formData.philhealthNumber.length >= 12 && { philhealthNumber: formData.philhealthNumber }),
      ...(formData.hdmfNumber && formData.hdmfNumber.length >= 12 && { hdmfNumber: formData.hdmfNumber }),
    };

    try {
      const response = await addCrew(payload);

      if (response.success) {
        Swal.fire({
          title: "Success!",
          text: response.message || "Crew member has been added successfully.",
          icon: "success",
          confirmButtonColor: "#3085d6",
        }).then(() => {
          refreshCrewList();
          router.push("/home/crew");
        });
      } else {
        console.error("API returned an error response:", response);
        Swal.fire({
          title: "Error!",
          text: response.message || "Failed to add crew member. Please check the details and try again.",
          icon: "error",
        });
      }
    } catch (error: unknown) {

      interface ApiErrorResponse {
        message: string | unknown[];
      }

      if (
        error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError
      ) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        const responseData = axiosError.response?.data;
        console.error("Axios error response:", responseData);

        if (
          responseData?.message &&
          typeof responseData.message === "string" &&
          (
            responseData.message.includes("Unique constraint failed") ||
            responseData.message.includes("Duplicate Crew Code") ||
            responseData.message.includes("dbo.CrewData")
          )
        ) {
          //console.warn("Duplicate Crew Code detected");
          Swal.fire({
            title: "Duplicate Crew Code",
            text: "This Crew Code already exists in the system. Please use a different Crew Code.",
            icon: "warning",
          });
          setDuplicateError(true);
        } else {
          const errorMessage = axiosError.message;
          let errorDetails = "";

          if (axiosError.response?.data) {
            const responseData = axiosError.response.data;

            if (responseData.message && Array.isArray(responseData.message)) {
              errorDetails = responseData.message
                .map((msg: unknown) =>
                  typeof msg === "object"
                    ? JSON.stringify(msg, null, 2)
                    : String(msg)
                )
                .join("<br/>");
            } else if (responseData.message) {
              errorDetails = String(responseData.message);
            }
          }

          Swal.fire({
            title: errorMessage,
            html: errorDetails || axiosError.name,
            icon: "error",
            width: "auto",
            customClass: {
              htmlContainer: "swal2-html-container-custom",
            },
          });
        }
      } else {
        const err = error as Error;
        console.error("Non-Axios error:", err);

        Swal.fire({
          title: err.message,
          html: err.name,
          icon: "error",
          width: "auto",
          customClass: {
            htmlContainer: "swal2-html-container-custom",
          },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCities = useMemo(() => {
    // If no province is selected, return empty array
    if (!formData.province) {
      return [];
    }

    const provinceId = parseInt(formData.province);
    const citiesInProvince = cities.filter(
      (city) => city.ProvinceID === provinceId
    );

    if (!citySearch.trim()) {
      return citiesInProvince.slice(0, 50); // Only show first 50 cities initially
    }

    return citiesInProvince
      .filter((city) =>
        city.CityName.toLowerCase().includes(citySearch.toLowerCase())
      )
      .slice(0, 100); // Limit to 100 results maximum for performance
  }, [cities, citySearch, formData.province]);

  const filteredProvinces = useMemo(() => {
    if (!provinceSearch.trim()) {
      return provinces; // Usually provinces are fewer, so we can show all
    }
    return provinces.filter((province) =>
      province.ProvinceName.toLowerCase().includes(provinceSearch.toLowerCase())
    );
  }, [provinces, provinceSearch]);
  const filteredRanks = useMemo(() => {
    if (!rankSearch.trim()) {
      return crewRanks; // Usually ranks are fewer, so we can show all
    }
    return crewRanks.filter((rank) =>
      rank.RankName.toLowerCase().includes(rankSearch.toLowerCase())
    );
  }, [crewRanks, rankSearch]);

  const handleCancel = () => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton:
          "bg-primary hover:bg-primary text-white font-bold py-2 px-4 mx-2 rounded",
        cancelButton:
          "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 mx-2 rounded",
      },
      buttonsStyling: false,
    });

    swalWithBootstrapButtons
      .fire({
        title: "Leave this page?",
        text: "You have unsaved changes. Are you sure you want to leave this page? Any unsaved details will be lost.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, leave anyway!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true,
      })
      .then((result) => {
        if (result.isConfirmed) {
          setTimeout(() => {
            router.push("/home/crew");
          }, 500);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
  };

  return (
    <>
      <div className="h-full w-full p-4 pt-3">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Link href="/home/crew">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-semibold">Add Crew</h1>
            </div>
            <div className="flex gap-2">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={
                    activeTab === "details" ? handleCancel : handlePrevious
                  }
                  disabled={isSubmitting}
                  className="px-4"
                >
                  {activeTab === "details" ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/90 px-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Icon
                        icon="line-md:loading-twotone-loop"
                        className="w-4 h-4 mr-2"
                      />
                      Submitting...
                    </>
                  ) : activeTab === tabOrder[tabOrder.length - 1] ? (
                    "Finish & Submit"
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left sidebar with crew info */}
            <div className="md:col-span-1">
              <Card className="h-[calc(100vh-180px)] flex flex-col overflow-hidden">
                <CardContent className="p-4 flex flex-col items-center text-center overflow-y-auto scrollbar-hide flex-1">
                  <style jsx global>{`
                    /* Hide scrollbar for Chrome, Safari and Opera */
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }

                    /* Hide scrollbar for IE, Edge and Firefox */
                    .scrollbar-hide {
                      -ms-overflow-style: none; /* IE and Edge */
                      scrollbar-width: none; /* Firefox */
                    }
                  `}</style>
                  <div className="flex flex-col items-center mb-3">
                    <div className="w-60 h-60 min-w-[160px] bg-white rounded-md flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 relative">
                      <Image
                        src={imagePreview || "/image.png"} // Use the state for preview
                        alt="Crew Photo"
                        width={100}
                        height={100}
                        className="w-full h-full object-contain p-1" // Ensure image fits well
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-60"
                      onClick={() => fileInputRef.current?.click()} // Trigger file input
                    >
                      Upload Photo
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/*,.jpeg,.jpg,.png" // Specify accepted image types
                      onChange={handleFileChange}
                    />
                    {/* <p className="text-red-400 text-sm">image is optional</p> */}
                  </div>

                  <div className="w-full space-y-2 text-left min-w-0">
                    <div className="flex flex-col items-start">
                      <label
                        htmlFor="crewCode"
                        className="text-sm font-semibold text-gray-500"
                      >
                        Crew Code
                      </label>
                      <Input
                        value={formData.crewCode}
                        onChange={(e) =>
                          handleInputChange("crewCode", e.target.value)
                        }
                        className={`h-8 mt-1 text-sm ${submitted["details"] &&
                          (duplicateError || formData.crewCode.length === 0)
                          ? "border-red-500 focus:!ring-red-500/50"
                          : ""
                          }`}
                      />
                      {submitted["details"] &&
                        formData.crewCode.length == 0 && (
                          <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            <Info className="w-4 h-4" />
                            Please enter a valid crew code.
                          </p>
                        )}
                      {duplicateError && (
                        <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                          <Info className="w-4 h-4" />
                          This Crew Code already exists.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <label className="text-sm font-semibold text-gray-500">
                          Rank
                        </label>
                        <Select
                          value={formData.rank}
                          onValueChange={(value) =>
                            handleInputChange("rank", value)
                          }
                        >
                          <SelectTrigger
                            className={`w-full ${submitted["details"] && formData.rank.length == 0
                              ? "border-red-500 focus:!ring-red-500/60"
                              : ""
                              }`}
                          >
                            <SelectValue placeholder="Select rank" />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            <div className="px-2 py-2 sticky top-0 bg-white z-10">
                              <Input
                                placeholder="Search ranks..."
                                value={rankSearch}
                                onChange={(e) => setRankSearch(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            {filteredRanks.length > 0 ? (
                              filteredRanks.map((rank) => (
                                <SelectItem
                                  key={rank.RankID}
                                  value={rank.RankID.toString()}
                                >
                                  {rank.RankName}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-2 text-sm text-gray-500">
                                No ranks found
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {submitted["details"] && formData.rank.length == 0 && (
                          <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            <Info className="w-4 h-4" />
                            Please enter a rank.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full mt-4 pt-4 border-t min-w-0">
                    <h3 className="text-md font-semibold mb-3 text-left">
                      Contact Information
                    </h3>

                    <div className="space-y-3 text-left">
                      <div className="flex flex-col items-start">
                        <div className="text-sm font-semibold text-gray-500">
                          Mobile Number
                        </div>

                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.mobileNumber}
                          onChange={(e) => {
                            const onlyNums = e.target.value.replace(/\D/g, "");
                            handleInputChange("mobileNumber", onlyNums);
                          }}
                          className={`h-8 text-sm ${submitted["details"] &&
                            (!formData.mobileNumber ||
                              !/^09\d{9}$/.test(formData.mobileNumber))
                            ? "border-red-500 focus:!ring-red-500/50"
                            : ""
                            }`}
                        />

                        {submitted["details"] &&
                          (!formData.mobileNumber ||
                            !/^09\d{9}$/.test(formData.mobileNumber)) && (
                            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                              <Info className="w-4 h-4" />
                              {!formData.mobileNumber
                                ? "Mobile number is required."
                                : 'Mobile number must be 11 digits and start with "09".'}
                            </p>
                          )}
                      </div>

                      <div className="flex flex-col items-start">
                        <label className="text-sm font-semibold text-gray-500">
                          Landline Number
                        </label>
                        <Input
                          value={formData.landlineNumber}
                          onChange={(e) => {
                            const onlyNums = e.target.value.replace(/\D/g, "");
                            handleInputChange("landlineNumber", onlyNums);
                          }}
                          // className={`h-8 text-sm ${
                          //   !fieldsError ? "border-red-500" : ""
                          // }`}
                          className={`h-8 text-sm`}
                        />
                        {/* {!fieldsError && (
                          <p className="text-red-500 text-sm">
                            Please enter a valid CrewCode.
                          </p>
                        )} */}
                      </div>

                      <div className="flex flex-col items-start">
                        <label className="text-sm font-semibold text-gray-500">
                          Email Address
                        </label>

                        <Input
                          value={formData.emailAddress}
                          onChange={(e) =>
                            handleInputChange("emailAddress", e.target.value)
                          }
                          className={`h-8 text-sm ${submitted["details"] &&
                            (!formData.emailAddress ||
                              !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(
                                formData.emailAddress
                              ))
                            ? "border-red-500 focus:!ring-red-500/50"
                            : ""
                            }`}
                        />

                        {submitted["details"] && !formData.emailAddress && (
                          <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            <Info className="w-4 h-4" />
                            Email is required.
                          </p>
                        )}

                        {submitted["details"] &&
                          formData.emailAddress &&
                          !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(
                            formData.emailAddress
                          ) && (
                            <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                              <Info className="w-4 h-4" />
                              Please enter a valid email.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right content area with tabs */}
            <div className="md:col-span-3">
              <Card className="h-[calc(100vh-180px)] flex flex-col">
                <Tabs
                  defaultValue={activeTab}
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="w-full flex flex-col h-full"
                >
                  <div className="border-b">
                    <div className="px-4">
                      <TabsList className="bg-transparent p-0 h-11 w-full flex justify-between space-x-0">
                        <TabsTrigger
                          value="details"
                          className={cn(
                            "flex-1 px-0 pb-4 h-full text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none relative pointer-events-none",
                            tabErrors["details"] && " border-red-500"
                          )}
                          onClick={(e) => {
                            if (!validateTab("details")) {
                              e.preventDefault();
                              setSubmitted((prev) => ({
                                ...prev,
                                details: true,
                              }));
                            }
                          }}
                        >
                          {completedTabs.includes("details") && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary/10 rounded-full p-0 w-6 h-6 flex items-center justify-center">
                              <Check className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <span className="mt-5 fonr-bold">
                            Personal Information
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="movement"
                          className={cn(
                            "flex-1 px-0 pb-4 h-full text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none relative pointer-events-none",
                            tabErrors["movement"] && " border-red-500"
                          )}
                          onClick={(e) => {
                            if (!validateTab("movement")) {
                              e.preventDefault();
                              setSubmitted((prev) => ({
                                ...prev,
                                movement: true,
                              }));
                            }
                          }}
                        >
                          {completedTabs.includes("movement") && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary/10 rounded-full p-0 w-6 h-6 flex items-center justify-center">
                              <Check className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <span className="mt-5 font-bold">Government IDs</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="travel"
                          className={cn(
                            "flex-1 px-0 pb-4 h-full text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none relative pointer-events-none",
                            tabErrors["travel"] && " border-red-500"
                          )}
                          onClick={(e) => {
                            if (!validateTab("travel")) {
                              e.preventDefault();
                              setSubmitted((prev) => ({
                                ...prev,
                                travel: true,
                              }));
                            }
                          }}
                        >
                          {completedTabs.includes("travel") && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary/10 rounded-full p-0 w-6 h-6 flex items-center justify-center">
                              <Check className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <span className="mt-5 font-bold">
                            Travel Documents
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="summary"
                          className={cn(
                            "flex-1 px-0 pb-4 h-full text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none relative pointer-events-none",
                            tabErrors["summary"] && " border-red-500"
                          )}
                          onClick={(e) => {
                            if (!validateTab("summary")) {
                              e.preventDefault();
                              setSubmitted((prev) => ({
                                ...prev,
                                summary: true,
                              }));
                            }
                          }}
                        >
                          {completedTabs.includes("summary") && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary/10 rounded-full p-0 w-6 h-6 flex items-center justify-center">
                              <Check className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <span className="mt-5 font-bold">Summary</span>
                        </TabsTrigger>
                      </TabsList>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-gray-200 mt-0">
                        <div
                          className="h-full bg-primary transition-all duration-700 ease-in-out rounded-full"
                          style={{ width: `${getProgress()}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <TabsContent
                    value="details"
                    className="p-6 mt-0 overflow-y-auto scrollbar-hide flex-1"
                  >
                    <div className="space-y-8">
                      {/* Personal Information Section */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 text-primary">
                          Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Last Name
                            </label>
                            <Input
                              placeholder="Enter last name"
                              value={formData.lastName}
                              onChange={(e) =>
                                handleInputChange("lastName", e.target.value)
                              }
                              className={`${submitted["details"] &&
                                (formData.lastName.length === 0 ||
                                  !/^[a-zA-Z\s]+$/.test(formData.lastName))
                                ? "border-red-500 focus:!ring-red-500/50"
                                : ""
                                }`}
                            />

                            {submitted["details"] &&
                              formData.lastName.length === 0 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Last name must be at least 2 characters.
                                </p>
                              )}

                            {submitted["details"] &&
                              formData.lastName.length > 0 &&
                              !/^[a-zA-Z\s]+$/.test(formData.lastName) && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Last name should only contain letters.
                                </p>
                              )}
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              First Name
                            </label>
                            <Input
                              placeholder="Enter first name"
                              value={formData.firstName}
                              onChange={(e) =>
                                handleInputChange("firstName", e.target.value)
                              }
                              className={`${submitted["details"] &&
                                (formData.firstName.length === 0 ||
                                  !/^[a-zA-Z\s]+$/.test(formData.firstName))
                                ? "border-red-500 focus:!ring-red-500/50"
                                : ""
                                }`}
                            />

                            {submitted["details"] &&
                              formData.firstName.length === 0 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  First name must be at least 2 characters.
                                </p>
                              )}

                            {submitted["details"] &&
                              formData.firstName.length > 0 &&
                              !/^[a-zA-Z\s]+$/.test(formData.firstName) && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  First name should only contain letters.
                                </p>
                              )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-10">
                              <label className="text-sm font-semibold text-gray-500 mb-1 block">
                                Middle Name
                              </label>
                              <div className="flex items-center space-x-2 mb-1">
                                <Checkbox
                                  id="middlename"
                                  className=""
                                  onClick={() => {
                                    setNoMiddleName((prev) => !prev);
                                  }}
                                />
                                <label
                                  htmlFor="middlename"
                                  className="text-sm text-gray-500"
                                >
                                  No Middle Name
                                </label>
                              </div>
                            </div>

                            <Input
                              placeholder="Enter middle name"
                              value={formData.middleName}
                              disabled={noMiddleName}
                              onChange={(e) =>
                                handleInputChange("middleName", e.target.value)
                              }
                            />
                            {/* {!fieldsError && (
                              <p className="text-red-500 text-sm">
                                Please enter a valid CrewCode.
                              </p>
                            )} */}
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Marital Status
                            </label>
                            <Select
                              value={formData.maritalStatus}
                              onValueChange={(value) =>
                                handleInputChange("maritalStatus", value)
                              }
                            >
                              <SelectTrigger
                                className={`w-full ${submitted["details"] &&
                                  formData.maritalStatus.length == 0
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              >
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                              <SelectContent>
                                {maritalStatuses.map((status) => (
                                  <SelectItem
                                    key={status.value}
                                    value={status.value}
                                  >
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {submitted["details"] &&
                              formData.maritalStatus.length === 0 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a status.
                                </p>
                              )}
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Sex
                            </label>
                            <Select
                              value={formData.sex}
                              onValueChange={(value) =>
                                handleInputChange("sex", value)
                              }
                            >
                              <SelectTrigger
                                className={`w-full ${submitted["details"] &&
                                  formData.sex.length == 0
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              >
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                              <SelectContent>
                                {sexOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {submitted["details"] &&
                              formData.sex.length == 0 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a valid sex.
                                </p>
                              )}
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Birthdate
                            </label>
                            <div className="relative">
                              <Input
                                type="date"
                                placeholder="Pick a date"
                                value={formData.birthdate}
                                onChange={(e) =>
                                  handleInputChange("birthdate", e.target.value)
                                }
                                className={`${submitted["details"] &&
                                  formData.birthdate.length == 0
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              />
                              {submitted["details"] &&
                                formData.birthdate.length == 0 && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Please enter a valid birthdate.
                                  </p>
                                )}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Province
                            </label>
                            <Select
                              value={formData.province}
                              onValueChange={(value) =>
                                handleInputChange("province", value)
                              }
                            >
                              <SelectTrigger
                                className={`w-full ${submitted["details"] &&
                                  formData.province.length == 0
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              >
                                <SelectValue placeholder="Select a province" />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                <div className="px-2 py-2 sticky top-0 bg-white z-10">
                                  <Input
                                    placeholder="Search provinces..."
                                    value={provinceSearch}
                                    onChange={(e) =>
                                      setProvinceSearch(e.target.value)
                                    }
                                    className="h-8"
                                  />
                                </div>
                                {loading ? (
                                  <SelectItem value="loading">
                                    Loading...
                                  </SelectItem>
                                ) : filteredProvinces.length > 0 ? (
                                  filteredProvinces.map((province) => (
                                    <SelectItem
                                      key={province.ProvinceID}
                                      value={province.ProvinceID.toString()}
                                    >
                                      {province.ProvinceName}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-2 py-2 text-sm text-gray-500">
                                    No provinces found
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            {submitted["details"] &&
                              formData.province.length == 0 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a province.
                                </p>
                              )}
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              City
                            </label>
                            <Select
                              value={formData.city}
                              onValueChange={(value) =>
                                handleInputChange("city", value)
                              }
                            >
                              <SelectTrigger
                                className={`w-full ${submitted["details"] &&
                                  formData.city.length == 0
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                                disabled={!formData.province}
                              >
                                <SelectValue placeholder="Select a city" />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                <div className="px-2 py-2 sticky top-0 bg-white z-10">
                                  <Input
                                    placeholder="Search cities..."
                                    value={citySearch}
                                    onChange={(e) =>
                                      setCitySearch(e.target.value)
                                    }
                                    className="h-8"
                                  />
                                </div>
                                {loading ? (
                                  <SelectItem value="loading">
                                    Loading...
                                  </SelectItem>
                                ) : filteredCities.length > 0 ? (
                                  filteredCities.map((city) => (
                                    <SelectItem
                                      key={city.CityID}
                                      value={city.CityID.toString()}
                                    >
                                      {city.CityName}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-2 py-2 text-sm text-gray-500">
                                    No cities found
                                  </div>
                                )}
                                {!citySearch && cities.length > 50 && (
                                  <div className="px-2 py-2 text-sm text-gray-500"></div>
                                )}
                              </SelectContent>
                            </Select>
                            {submitted["details"] &&
                              formData.city.length == 0 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a city.
                                </p>
                              )}
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Address (House/Unit No., Lot/Block, Street, Subdivision/Village, Barangay, ZIP Code)
                            </label>
                            <Input
                              placeholder="Enter home address"
                              value={formData.address}
                              onChange={(e) =>
                                handleInputChange("address", e.target.value)
                              }
                            // className={`${
                            //   submitted["details"] &&
                            //   (formData.address.length === 0 ||
                            //     !/^[a-zA-Z\s]+$/.test(formData.address))
                            //     ? "border-red-500 focus:!ring-red-500/50"
                            //     : ""
                            // }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="movement"
                    className="p-6 mt-0 overflow-y-auto scrollbar-hide flex-1"
                  >
                    <div className="space-y-8">
                      {/* Government IDs Section */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 text-primary">
                          Government IDs
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <GovIDCardInput
                              label="SSS Number"
                              value={formData.sssNumber}
                              onChange={(val) => handleInputChange("sssNumber", val)}
                              placeholder="Enter SSS number"
                              isInvalid={
                                submitted["movement"] &&
                                !!formData.sssNumber &&
                                formData.sssNumber.length !== 10
                              }
                            />

                            {submitted["movement"] &&
                              !!formData.sssNumber &&
                              formData.sssNumber.length !== 10 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Enter your 10-digit SSS Number.
                                </p>
                              )}
                          </div>
                          <div>
                            {/* <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Tax ID Number
                            </label>
                            <Input
                              placeholder="Enter Tax ID number"
                              value={formData.taxIdNumber}
                              onChange={(e) =>
                                handleInputChange("taxIdNumber", e.target.value)
                              }
                              //className="border-gray-300 focus:ring-primary/50"
                              className={`${
                                 (submitted["movement"] &&
                                   formData.taxIdNumber.length <= 8) ||
                                 formData.taxIdNumber.length >= 13
                                   ? "border-red-500 focus:!ring-red-500/50"
                                   : ""
                               }`}
                            /> */}
                            <GovIDCardInput
                              label="Tax Number"
                              value={formData.taxIdNumber}
                              onChange={(val) => handleInputChange("taxIdNumber", val)}
                              placeholder="Enter Tax ID number"
                              isInvalid={
                                submitted["movement"] &&
                                !!formData.taxIdNumber &&
                                (formData.taxIdNumber.length <= 8 || formData.taxIdNumber.length >= 13)
                              }
                            />

                            {submitted["movement"] &&
                              !!formData.taxIdNumber &&
                              (formData.taxIdNumber.length <= 8 || formData.taxIdNumber.length >= 13) && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a 9-digit Tax ID Number.
                                </p>
                              )}
                          </div>
                          <div>
                            {/* <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Philhealth Number
                            </label>
                            <Input
                              placeholder="Enter Philhealth number"
                              value={formData.philhealthNumber}
                              onChange={(e) =>
                                handleInputChange(
                                  "philhealthNumber",
                                  e.target.value
                                )
                              }
                              //className="border-gray-300 focus:ring-primary/50"
                              className={`${
                                 submitted["movement"] &&
                                 formData.philhealthNumber.length !== 12
                                   ? "border-red-500 focus:!ring-red-500/50"
                                   : ""
                               }`}
                            /> */}
                            <GovIDCardInput
                              label="Philhealth Number"
                              value={formData.philhealthNumber}
                              onChange={(val) => handleInputChange("philhealthNumber", val)}
                              placeholder="Enter Philhealth number"
                              isInvalid={
                                submitted["movement"] &&
                                !!formData.philhealthNumber &&
                                formData.philhealthNumber.length !== 12
                              }
                            />

                            {submitted["movement"] &&
                              !!formData.philhealthNumber &&
                              formData.philhealthNumber.length !== 12 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a 12-digit Philhealth Number.
                                </p>
                              )}
                          </div>
                          <div>
                            {/* <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              HDMF Number
                            </label>
                            <Input
                              placeholder="Enter HDMF number"
                              value={formData.hdmfNumber}
                              onChange={(e) =>
                                handleInputChange("hdmfNumber", e.target.value)
                              }
                              //className="border-gray-300 focus:ring-primary/50"
                              className={`${
                                 submitted["movement"] &&
                                 formData.hdmfNumber.length !== 12
                                   ? "border-red-500 focus:!ring-red-500/50"
                                   : ""
                               }`}
                            /> */}
                            <GovIDCardInput
                              label="HDMF Number"
                              value={formData.hdmfNumber}
                              onChange={(val) => handleInputChange("hdmfNumber", val)}
                              placeholder="Enter HDMF number"
                              isInvalid={
                                submitted["movement"] &&
                                !!formData.hdmfNumber &&
                                formData.hdmfNumber.length !== 12
                              }
                            />

                            {submitted["movement"] &&
                              !!formData.hdmfNumber &&
                              formData.hdmfNumber.length !== 12 && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a 12-digit HDMF Number.
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="travel"
                    className="p-6 mt-0 overflow-y-auto scrollbar-hide flex-1"
                  >
                    <div className="space-y-8">
                      {/* Travel Documents Section */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 text-primary">
                          Travel Documents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            {/* <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Passport Number
                            </label>
                            <Input
                              placeholder="Enter passport number"
                              value={formData.passportNumber}
                              onChange={(e) =>
                                handleInputChange(
                                  "passportNumber",
                                  e.target.value
                                )
                              }
                              className={`${submitted["travel"] &&
                                  (formData.passportNumber.length <= 6 || formData.passportNumber.length >= 10)
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                }`}
                            /> */}
                            <GovIDCardInput
                              label="Passport Number"
                              value={formData.passportNumber}
                              onChange={(val) => handleInputChange("passportNumber", val)}
                              placeholder="Enter passport number"
                              isInvalid={
                                Boolean(
                                  submitted["travel"] && formData.passportNumber.length <= 6 || formData.passportNumber.length >= 10
                                )
                              }
                            />
                            {submitted["travel"] &&
                              (formData.passportNumber.length <= 6 ||
                                formData.passportNumber.length >= 10) && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a valid Passport number.
                                </p>
                              )}
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Passport Issue Date
                            </label>
                            <div className="relative">
                              <Input
                                type="date"
                                value={formData.passportIssueDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "passportIssueDate",
                                    e.target.value
                                  )
                                }
                                className={`${submitted["travel"] &&
                                  (!formData.passportIssueDate ||
                                    formData.passportIssueDate ===
                                    formData.passportExpiryDate ||
                                    (formData.passportExpiryDate &&
                                      formData.passportExpiryDate <
                                      formData.passportIssueDate))
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              />

                              {submitted["travel"] &&
                                !formData.passportIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Please enter a valid Passport Issue Date.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.passportIssueDate &&
                                formData.passportIssueDate ===
                                formData.passportExpiryDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Issue Date and Expiration Date cannot be the
                                    same.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.passportIssueDate &&
                                formData.passportExpiryDate &&
                                formData.passportExpiryDate <
                                formData.passportIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Expiration Date cannot be earlier than Issue
                                    Date.
                                  </p>
                                )}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Passport Expiration Date
                            </label>
                            <div className="relative">
                              <Input
                                type="date"
                                value={formData.passportExpiryDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "passportExpiryDate",
                                    e.target.value
                                  )
                                }
                                className={`${submitted["travel"] &&
                                  (!formData.passportExpiryDate ||
                                    formData.passportIssueDate ===
                                    formData.passportExpiryDate ||
                                    (formData.passportIssueDate &&
                                      formData.passportExpiryDate <
                                      formData.passportIssueDate))
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              />

                              {submitted["travel"] &&
                                !formData.passportExpiryDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Please enter a valid Passport Expiration
                                    Date.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.passportExpiryDate &&
                                formData.passportIssueDate ===
                                formData.passportExpiryDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Issue Date and Expiration Date cannot be the
                                    same.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.passportExpiryDate &&
                                formData.passportIssueDate &&
                                formData.passportExpiryDate <
                                formData.passportIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Expiration Date cannot be earlier than Issue
                                    Date.
                                  </p>
                                )}
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            {/* <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Seamans Book
                            </label>
                            <Input
                              placeholder="Enter seamans book number"
                              value={formData.seamansBook}
                              onChange={(e) =>
                                handleInputChange("seamansBook", e.target.value)
                              }
                              className={`${submitted["travel"] &&
                                  (formData.seamansBook.length <= 6 || formData.seamansBook.length >= 10)
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                }`}
                            /> */}
                            <GovIDCardInput
                              label="Seamans Book"
                              value={formData.seamansBook}
                              onChange={(val) => handleInputChange("seamansBook", val)}
                              placeholder="Enter seamans book number"
                              isInvalid={
                                Boolean(
                                  submitted["travel"] && formData.seamansBook.length <= 6 || formData.seamansBook.length >= 10
                                )
                              }
                            />
                            {submitted["travel"] &&
                              (formData.seamansBook.length <= 6 || formData.seamansBook.length >= 10) && (
                                <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                  <Info className="w-4 h-4" />
                                  Please enter a valid Seamans Book.
                                </p>
                              )}
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Seamans Book Issue Date
                            </label>
                            <div className="relative">
                              <Input
                                type="date"
                                placeholder="Pick a date"
                                value={formData.seamansBookIssueDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "seamansBookIssueDate",
                                    e.target.value
                                  )
                                }
                                className={`${submitted["travel"] &&
                                  (!formData.seamansBookIssueDate ||
                                    formData.seamansBookIssueDate ===
                                    formData.seamansBookExpiryDate ||
                                    (formData.seamansBookExpiryDate &&
                                      formData.seamansBookExpiryDate <
                                      formData.seamansBookIssueDate))
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              />

                              {submitted["travel"] &&
                                !formData.seamansBookIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Please enter a valid Seamans Book Issue
                                    Date.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.seamansBookIssueDate &&
                                formData.seamansBookIssueDate ===
                                formData.seamansBookExpiryDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Issue Date and Expiration Date cannot be the
                                    same.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.seamansBookIssueDate &&
                                formData.seamansBookExpiryDate &&
                                formData.seamansBookExpiryDate <
                                formData.seamansBookIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Expiration Date cannot be earlier than Issue
                                    Date.
                                  </p>
                                )}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Seamans Book Expiration Date
                            </label>
                            <div className="relative">
                              <Input
                                type="date"
                                placeholder="Pick a date"
                                value={formData.seamansBookExpiryDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "seamansBookExpiryDate",
                                    e.target.value
                                  )
                                }
                                className={`${submitted["travel"] &&
                                  (!formData.seamansBookExpiryDate ||
                                    formData.seamansBookExpiryDate ===
                                    formData.seamansBookIssueDate ||
                                    (formData.seamansBookIssueDate &&
                                      formData.seamansBookExpiryDate <
                                      formData.seamansBookIssueDate))
                                  ? "border-red-500 focus:!ring-red-500/50"
                                  : ""
                                  }`}
                              />

                              {submitted["travel"] &&
                                !formData.seamansBookExpiryDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Please enter a valid Seamans Book Expiration
                                    Date.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.seamansBookExpiryDate &&
                                formData.seamansBookExpiryDate ===
                                formData.seamansBookIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Issue Date and Expiration Date cannot be the
                                    same.
                                  </p>
                                )}

                              {submitted["travel"] &&
                                formData.seamansBookExpiryDate &&
                                formData.seamansBookIssueDate &&
                                formData.seamansBookExpiryDate <
                                formData.seamansBookIssueDate && (
                                  <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                    <Info className="w-4 h-4" />
                                    Expiration Date cannot be earlier than Issue
                                    Date.
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Add Summary Tab Content */}
                  <TabsContent
                    value="summary"
                    className="p-6 mt-0 overflow-y-auto scrollbar-hide flex-1"
                  >
                    <div className="space-y-8">
                      {/* Personal Information Summary */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 text-primary">
                          Personal Information Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Last Name
                            </label>
                            <Input
                              value={formData.lastName}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              First Name
                            </label>
                            <Input
                              value={formData.firstName}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Middle Name
                            </label>
                            <Input
                              value={formData.middleName}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Marital Status
                            </label>
                            <Select
                              value={formData.maritalStatus || ""}
                              disabled
                            >
                              <SelectTrigger className="w-full bg-gray-50">
                                <SelectValue placeholder="Not specified" />
                              </SelectTrigger>
                              <SelectContent>
                                {maritalStatuses.map((status) => (
                                  <SelectItem
                                    key={status.value}
                                    value={status.value.toString()}
                                  >
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Sex
                            </label>
                            <Select value={formData.sex || ""} disabled>
                              <SelectTrigger className="w-full bg-gray-50">
                                <SelectValue placeholder="Not specified" />
                              </SelectTrigger>
                              <SelectContent>
                                {sexOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Birthdate
                            </label>
                            <Input
                              type="date"
                              value={formData.birthdate}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              City
                            </label>
                            <Input
                              value={
                                filteredCities.find(
                                  (city) =>
                                    city.CityID.toString() === formData.city
                                )?.CityName
                              }
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Province
                            </label>
                            <Input
                              value={
                                filteredProvinces.find(
                                  (province) =>
                                    province.ProvinceID.toString() ===
                                    formData.province
                                )?.ProvinceName
                              }
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Address (House/Unit No., Lot/Block, Street, Subdivision/Village, Barangay, ZIP Code)
                            </label>
                            <Input
                              value={formData.address}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Government IDs Summary */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 text-primary">
                          Government IDs Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              SSS Number
                            </label>
                            <Input
                              value={formData.sssNumber}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Tax ID Number
                            </label>
                            <Input
                              value={formData.taxIdNumber}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Philhealth Number
                            </label>
                            <Input
                              value={formData.philhealthNumber}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              HDMF Number
                            </label>
                            <Input
                              value={formData.hdmfNumber}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Travel Documents Summary */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 text-primary">
                          Travel Documents Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Passport Number
                            </label>
                            <Input
                              value={formData.passportNumber}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Passport Issue Date
                            </label>
                            <Input
                              type="date"
                              value={formData.passportIssueDate}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Passport Expiry Date
                            </label>
                            <Input
                              type="date"
                              value={formData.passportExpiryDate}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Seamans Book Number
                            </label>
                            <Input
                              value={formData.seamansBook}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Seamans Book Issue Date
                            </label>
                            <Input
                              type="date"
                              value={formData.seamansBookIssueDate}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-500 mb-1 block">
                              Seamans Book Expiry Date
                            </label>
                            <Input
                              type="date"
                              value={formData.seamansBookExpiryDate}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
