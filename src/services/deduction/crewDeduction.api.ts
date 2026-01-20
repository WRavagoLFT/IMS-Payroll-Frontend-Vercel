import axiosInstance from "@/src/lib/axios";
import { DeductionDescriptionItem } from "./deductionDescription.api";

export interface CrewDeductionItem {
  vesselId: any;
  CrewCode: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  Rank: string;
  VesselName: string;
}

export interface CrewDeductionResponse {
  success: boolean;
  data: CrewDeductionItem[];
  message?: string;
}
export const getCrewDeductionList = async (): Promise<CrewDeductionResponse> => {
  const response = await axiosInstance.get<CrewDeductionResponse>("/deductions");
  return response.data;
}

export interface DeductionEntries {
  DeductionDetailID: number;
  Month: string;
  Year: number;
  Deduction: string;
  Amount: number;
  Remarks: string;
  Status: number;
  DeductionDate?: Date;
}

export interface DeductionEntriesResponse {
  success: boolean;
  data: DeductionEntries[];
  message?: string;
}

export const getDeductionEntries = async (crewCode: string): Promise<DeductionEntriesResponse> => {
  const response = await axiosInstance.get<DeductionEntriesResponse>(`/deductions/${crewCode}/entries`);
  return response.data;
}

export interface AddDeductionResponse {
  success: boolean;
  data: DeductionDescriptionItem;
  message?: string;
}

export interface DeductionEntriesPayload {
  deductionID: number;
  deductionAmount: number;
  deductionRemarks?: string;
  deductionStatus: number;
}

export const addCrewDeductionEntry = async (crewCode: string, payload: DeductionEntriesPayload): Promise<AddDeductionResponse> => {
  const response = await axiosInstance.post<AddDeductionResponse>(`/deductions/${crewCode}/entries`, payload);
  return response.data;
}

export interface UpdateDeductionEntryPayload {
  deductionAmount?: number;
  deductionRemarks?: string;
  status?: number;
  deductionDate: Date;
}

export const updateCrewDeductionEntry = async (crewCode: string, deductionId: number, payload: UpdateDeductionEntryPayload): Promise<AddDeductionResponse> => {
  const response = await axiosInstance.patch<AddDeductionResponse>(`/deductions/${crewCode}/entries/${deductionId}`, payload);
  return response.data;
}

export const deleteCrewDeductionEntry = async (crewCode: string, deductionId: number): Promise<AddDeductionResponse> => {
  const response = await axiosInstance.delete<AddDeductionResponse>(`/deductions/${crewCode}/entries/${deductionId}`);
  return response.data;
}

export const addHDMFUpgrade = async (crewCode: string, hdmfAmount: number, isDollar: number): Promise<AddDeductionResponse> => {
  const response = await axiosInstance.post<AddDeductionResponse>(`/deductions/${crewCode}/hdmf`, {
    hdmfAmount,
    isDollar
  });
  return response.data;
}

export interface HDMFHistoryEntry {
  EE: number;
  ER: number;
  PayMonth: number;
  PayYear: number;
  Salary: number;
}

export interface HDMFAmountInfo {
  HDMFAmount: number;
  DollarCurrency: number;
}

export interface HDMFUpgradeData {
  Amount: HDMFAmountInfo;
  History: HDMFHistoryEntry[];
}

export interface hdmfUpgradeResponse {
  success: boolean;
  data: HDMFUpgradeData;
  message: string;
}

export const getCrewHDMFUpgrade = async (crewCode: string): Promise<hdmfUpgradeResponse> => {
  const response = await axiosInstance.get<hdmfUpgradeResponse>(`/deductions/${crewCode}/hdmf`);
  return response.data;
}

export interface philhealthDeductionItem {
  PayrollMonth: number;
  PayrollYear: number;
  Salary: number;
  EEPremiumRate: number;
  EEPremium: number;
}

export interface philhealthDeductionResponse {
  success: boolean;
  data: philhealthDeductionItem[];
  message?: string;
}

export const getCrewPhilhealth = async (crewCode: string, year: number): Promise<philhealthDeductionResponse> => {
  const response = await axiosInstance.get<philhealthDeductionResponse>(`/v2/deductions/${crewCode}/philhealth?year=${year}`);
  return response.data;
}

export interface sssDeductionItem {
  PayrollMonth: number;
  PayrollYear: number;
  Salary: number;
  RegularSS: number;
  MutualFund: number;
  ERSS: number;
  ERMF: number;
  EC: number;
  EESS: number;
  EEMF: number;
}

export interface sssDeductionResponse {
  success: boolean;
  data: sssDeductionItem[];
  message?: string;
}

export const getCrewSSS = async (crewCode: string, year: number): Promise<sssDeductionResponse> => {
  const response = await axiosInstance.get<sssDeductionResponse>(`/v2/deductions/${crewCode}/sss?year=${year}`);
  return response.data;
}

// export interface otherDeductionsCrew {
//   CrewID: number;
//   CrewName: string;
//   Rank: string;
//   Salary: number;
//   Allotment: number;
//   Gross: number;
//   Deduction: number;
//   Deductions: DeductionItem[];
// }

// export interface otherDeductionsData {
//   ExchangeRate: number,
//   VesselName: string | undefined,
//   Crew: otherDeductionsCrew[],
// }

// export interface otherDeductionsResponse {
//   success: boolean;
//   data: otherDeductionsData;
//   message: string;
// }

export interface otherDeductionsCrew {
  CrewID: number,
  CrewCode: string,
  FirstName: string,
  MiddleName: string | null,
  LastName: string,
  Rank: string,
  RankID: number,
  DeductionAmount: number,
  DeductionName: string, 
  DeductionRemarks: string,
  OriginalAmount: number,
  Currency: number,
  ExchangeRate: number,
  VesselName: string
}

export interface otherDeductionsData {
  ExchangeRate: number,
  VesselName: string | undefined,
  Crew: otherDeductionsCrew[],
}

export interface otherDeductionsResponse {
  success: boolean;
  data: otherDeductionsData;
  message: string;
}

export const otherDeductions = async (
  year: number,
  month: number,
  vesselId?: number,
  posted?: number
): Promise<otherDeductionsResponse> => {
  let url = vesselId
    ? `/deductions/other-deductions/${vesselId}/${year}/${month}`
    : `/deductions/other-deductions/${year}/${month}`;

  if (posted !== undefined) {
    // Add posted as a query parameter
    url += `?posted=${posted}`;
  }

  const response = await axiosInstance.get<otherDeductionsResponse>(url);
  return response.data;
};
