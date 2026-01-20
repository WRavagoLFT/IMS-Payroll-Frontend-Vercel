import axiosInstance from "@/src/lib/axios";

export interface PayrollItem {
  VesselId: number;
  VesselName: string;
  OnBoardCrew: number;
  GrossAllotment: number;
  NetAllotment: number;
  TotalDeduction: number;
  IsPosted?: boolean;
}
export interface PayrollResponse {
  success: boolean;
  data: PayrollItem[];
  message?: string;
}

export const getPayrollList = async (month: number, year: number, posted?: number): Promise<PayrollResponse> => {
  if (posted) {
    const response = await axiosInstance.get<PayrollResponse>(`/payroll?month=${month}&year=${year}&posted=${posted}`);
    return response.data;
  }
  else {
    const response = await axiosInstance.get<PayrollResponse>(`/payroll?month=${month}&year=${year}`);
    return response.data;
  }
}

export interface Allottee {
  AllotteeName: string;
  AccountNumber: string;
  Bank: string;
  NetAllotment: number;
  Currency: number;
}

export interface AllotmentRegisterCrew {
  CrewID: number;
  CrewName: string;
  Rank: string;
  BasicWage: string;
  FixedOT: string;
  GuarOT: string;
  DollarGross: string;
  PesoGross: number;
  TotalDeduction: number;
  Net: number;
  Allottee: Allottee[];
}

export interface AllotmentRegisterData {
  VesselID: number;
  VesselName: string;
  VesselCode: string;
  VesselType: string;
  Principal: string;
  IsActive: number;
  ExchangeRate: number;
  Crew: AllotmentRegisterCrew[];
}


export interface AllotmentRegisterResponse {
  success: boolean;
  message: string;
  data: AllotmentRegisterData[];
}

export const getVesselAllotmentRegister = async (vesselId: string | number | null, month: number | null, year: number | null, posted?: number): Promise<AllotmentRegisterResponse> => {
  if (posted) {
    const response = await axiosInstance.get<AllotmentRegisterResponse>(`/payroll/${vesselId}/allotment?month=${month}&year=${year}&posted=${posted}`);
    return response.data;
  }
  else {
    const response = await axiosInstance.get<AllotmentRegisterResponse>(`/payroll/${vesselId}/allotment?month=${month}&year=${year}`);
    return response.data;
  }
}

export interface Deductions {
  Name: string;
  Amount: number;
  ExchangeRate: number;
  Currency: number;
}

export interface DeductionRegisterCrew {
  CrewID: number;
  CrewName: string;
  Rank: string;
  Salary: number;
  Allotment: number;
  Gross: number;
  Deduction: number;
  Deductions: Deductions[];
}

export interface DeductionRegisterVessel {
  VesselID: number;
  VesselName: string;
  VesselCode: string;
  VesselType: string;
  Principal: string;
  IsActive: number;
  Crew: DeductionRegisterCrew[];
}

export interface DeductionRegisterData {
  ExchangeRate: number,
  Vessels: DeductionRegisterVessel[]
}

export interface DeductionRegisterResponse {
  success: boolean;
  message: string;
  data: DeductionRegisterData;
}

export const getVesselDeductionRegister = async (vesselId: string | number | null, month: number | null, year: number | null, posted?: number): Promise<DeductionRegisterResponse> => {
  if(posted){
    const response = await axiosInstance.get<DeductionRegisterResponse>(`/payroll/${vesselId}/deduction?month=${month}&year=${year}&posted=${posted}`);
    return response.data;
  }
  else {
    const response = await axiosInstance.get<DeductionRegisterResponse>(`/payroll/${vesselId}/deduction?month=${month}&year=${year}`);
    return response.data;
  }
}

export interface AllotteeDistribution {
  name: string;
  amount: number;
  currency: string | number;
}

export interface AllotmentDeduction {
  name: string;
  currency: string;
  amount: number;
  forex: number;
  dollar: number;
}

export interface PayrollDetails {
  basicWage: number;
  fixedOT: number;
  guaranteedOT: number;
  dollarGross: number;
  pesoGross: number;
  totalDeduction: number;
  netWage: number;
}

export interface CrewPayroll {
  PayrollMonth?: number,
  PayrollYear?: number,
  crewId: number;
  crewCode: string;
  crewName: string;
  rank: string;
  vesselId: number;
  vesselName: string;
  payrollDetails: PayrollDetails;
  allotmentDeductions: AllotmentDeduction[];
  allotteeDistribution: AllotteeDistribution[];
}

export interface PayslipPeriod {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  formattedPeriod: string;
  exchangeRate: number;
}


export interface PayrollSummary {
  crewCount: number;
  totalBasicWage: number;
  totalFOT: number;
  totalGOT: number;
  totalDollarGross: number;
  totalPesoGross: number;
  totalDeductions: number;
  totalNetAllotment: number;
}

export interface Payroll {
  vesselId: number;
  vesselName: string;
  vesselCode: string;
  vesselType: string;
  principal: string;
  isActive: number;
  summary: PayrollSummary;
  payrolls: CrewPayroll[];
}

export interface PayslipData {
  period: PayslipPeriod;
  overallSummary: PayrollSummary;
  vessels: Payroll[];
}

export interface PayslipResponse {
  success: boolean;
  message: string;
  data: PayslipData;
}

export interface Forex {
  ExchangeRateID: number,
  ExchangeRateYear: number,
  ExchangeRateMonth: number,
  ExchangeRate: number
}

export const getVesselPayslip = async (vesselId: string | number, month: number, year: number): Promise<PayslipResponse> => {
  const response = await axiosInstance.get<PayslipResponse>(`/payroll/${vesselId}/payslip?month=${month}&year=${year}`);
  return response.data;
}

export const getVesselPayslipV2 = async (vesselId: string | number | null, month: number | null, year: number | null, posted?: number): Promise<PayslipResponse> => {
  if(posted){
    const response = await axiosInstance.get<PayslipResponse>(`/v2/payroll/${vesselId}/payslip?month=${month}&year=${year}&posted=${posted}`);
    return response.data;
  } else {
    const response = await axiosInstance.get<PayslipResponse>(`v2/payroll/${vesselId}/payslip?month=${month}&year=${year}`);
    return response.data;
  }
}

export const postPayrolls = async (month: string, year: number): Promise<PayslipResponse> => {
  const response = await axiosInstance.post<PayslipResponse>("/payroll", { month, year });
  return response.data;
}

export const postVesselPayrolls = async (month: string, year: string, vesselId: number): Promise<PayslipResponse> => {
  const response = await axiosInstance.post<PayslipResponse>("/payroll", {month, year, vesselId });
  return response.data;
};

export const getForex = async(month: string, year: string): Promise<Forex[]> => {
  const response = await axiosInstance.get(`/wages/forex?month=${month}&year=${year}`);
  return response.data.data;
}

export const unpostPayrolls = async (
  month: string,
  year: string,
): Promise<PayslipResponse> => {
  const response = await axiosInstance.delete<PayslipResponse>(
    "/payroll/remove",
    {
      data: { month, year },
    }
  );

  return response.data;
};

export const unpostVesselPayrolls = async (
  month: string,
  year: string,
  vesselId: number
): Promise<PayslipResponse> => {
  const response = await axiosInstance.delete<PayslipResponse>(
    "/payroll/remove",
    {
      data: { month, year, vesselId },
    }
  );

  return response.data;
};
