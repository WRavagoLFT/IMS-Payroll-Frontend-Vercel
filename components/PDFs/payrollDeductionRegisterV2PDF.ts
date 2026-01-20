"use client";

import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, truncateText } from "@/lib/utils";
import { Deductions } from "@/src/services/payroll/payroll.api";

// Define interfaces based on your updated data structure
export interface Allottee {
    AllotteeName: string;
    AccountNumber: string;
    Bank: string;
    NetAllotment: number;
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
export interface DeductionRegisterVesselData {
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
    Vessels: DeductionRegisterVesselData[]
}

export interface AllotmentRegisterResponse {
    success: boolean;
    message: string;
    data: DeductionRegisterData[];
}

// Format currency values with commas and 2 decimal places
function formatCurrency(amount: number | string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numAmount);
}

// Get formatted date string (MM/DD/YY H:MM AM/PM)
function getFormattedDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12

    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

function getMonthName(monthNum: number): string {
    const months = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return months[monthNum - 1];
}

function calculateVesselDeductionTotals(vessel: DeductionRegisterVesselData): { [key: string]: number } {
    // Define the standard deduction types
    const standardDeductions = [
        'SSS Premium',
        'Pag-Ibig Contribution', 
        'Philhealth Contribution',
        'SSS Provident'
    ];
    
    // Initialize totals object with standard deductions
    const totals: { [key: string]: number } = {
        'SSS Premium': 0,
        'Pag-Ibig Contribution': 0,
        'Philhealth Contribution': 0,
        'SSS Provident': 0,
        'Other Deductions': 0
    };
    
    vessel.Crew.forEach(crew => {
        if (crew.Deductions) {
            crew.Deductions.forEach(deduction => {
                if (standardDeductions.includes(deduction.Name)) {
                    // Add to the specific standard deduction category
                    totals[deduction.Name] += deduction.Amount;
                } else {
                    // Add to "Other Deductions" for any non-standard deductions
                    totals['Other Deductions'] += deduction.Amount;
                }
            });
        }
    });
    
    return totals;
}

/**
 * Generate allotment payroll register PDF directly from AllotmentRegisterData array
 * @param vesselData Array of vessel data
 * @param month Month name in uppercase (e.g., "JANUARY")
 * @param year Year (e.g., 2025)
 * @param exchangeRate Exchange rate for USD to PHP
 * @returns boolean indicating if PDF generation was successful
 */
export function generateDeductionAllotmentV2Register(
    vesselData: DeductionRegisterData,
    month: number,
    year: number,
    exchangeRate: number,
    postedValue: number
): boolean {
    const postedStatus = postedValue === 1? "Posted" : "Unposted";

    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!vesselData || vesselData.Vessels.length === 0) {
        console.error('Invalid or empty data for allotment register');
        return false;
    }

    try {

        const periodMonth = getMonthName(month);
        const periodYear = year;
        
        // Create a single PDF document for all vessels
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "legal" // Legal size (8.5" × 14")
        });

        // Add the custom font with peso symbol support
        try {
            addFont(doc);
            doc.setFont('NotoSans', 'normal');
        } catch (error) {
            console.warn("Could not load custom font, using default", error);
            doc.setFont('helvetica', 'normal');
        }

        // Set document properties
        doc.setProperties({
            title: `Allotment Deduction Register - ${month} ${year} - ${postedStatus}`,
            subject: `Alltoment Deduction Register`,
            author: 'IMS Philippines Maritime Corp.',
            creator: 'jsPDF'
        });

        // Page dimensions and constants
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = { left: 10, right: 10, top: 10, bottom: 20 }; // Reduced bottom margin

        const mainTableWidth = pageWidth - margins.left - margins.right;

        // Define table column widths for the main data table
        const colWidths = [
            mainTableWidth * 0.22, // CREW NAME
            mainTableWidth * 0.10, // RANK
            mainTableWidth * 0.08, // SALARY
            mainTableWidth * 0.10, // GROSS
            mainTableWidth * 0.50  // Deduction details
        ];

        // Calculate total table width and scale if needed
        const totalWidth = colWidths.reduce((a, b) => a + b, 0);
        const scaleFactor = (pageWidth - margins.left - margins.right) / totalWidth;

        // Calculate column positions
        const colPositions: number[] = [];
        let runningPosition = margins.left;
        colWidths.forEach(width => {
            colPositions.push(runningPosition);
            runningPosition += width * scaleFactor;
        });
        colPositions.push(runningPosition); // Add end position

        // Define heights
        const headerHeight = 16;
        const vesselInfoHeight = 16;
        const tableHeaderHeight = 10;
        const rowHeight = 8;

        // Keep track of pagination
        let currentPage = 1;

        // Variables to track current position
        let currentY = margins.top;
        let isFirstPage = true;

        // Add this function to draw the summary section
        function drawVesselSummary(doc: jsPDF, vessel: DeductionRegisterVesselData, currentY: number, margins: any, pageWidth: number, colPositions: number[], colWidths: number[], scaleFactor: number): number {
            const totals = calculateVesselDeductionTotals(vessel);
            
            // Check if we have any totals to display
            if (Object.keys(totals).length === 0) {
                return currentY;
            }
            
            let y = currentY;
            const summaryRowHeight = 8;
            const summaryHeaderHeight = 10;
            
            // Add some spacing before summary
            y += 5;
            
            // Draw summary header
            doc.setFillColor(220, 220, 220); // Darker gray for summary header
            doc.rect(margins.left, y, pageWidth - margins.left - margins.right, summaryHeaderHeight, "FD");
            
            doc.setFontSize(8);
            doc.setFont('NotoSans', 'bold');
            doc.text(`${vessel.VesselName.toUpperCase()} - DEDUCTION SUMMARY`, margins.left + 5, y + summaryHeaderHeight / 2 + 1);
            
            y += summaryHeaderHeight;
            
            // Draw summary rows
            doc.setFontSize(7);
            doc.setFont('NotoSans', 'normal');
            
            // Define the order of deductions you want to show
            const deductionOrder = [
                'SSS Premium',
                'Pag-Ibig Contribution', 
                'Philhealth Contribution',
                'SSS Provident',
                'Deductions'
            ];
            
            // First show the standard deductions in order
            deductionOrder.forEach(deductionName => {
                if (totals[deductionName]) {
                    // Draw summary row background (alternating)
                    doc.setFillColor(248, 248, 248);
                    doc.rect(margins.left, y, pageWidth - margins.left - margins.right, summaryRowHeight, "F");
                    
                    // Draw the deduction name in the deduction details column area
                    const namePosition = margins.left + (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]) * scaleFactor + 20;
                    doc.text(deductionName, namePosition, y + summaryRowHeight / 2 + 1);
                    
                    // Draw the total amount in the rightmost column
                    doc.text(formatCurrency(totals[deductionName]), pageWidth - margins.right - 5, y + summaryRowHeight / 2 + 1, { align: 'right' });
                    
                    // Draw horizontal line
                    doc.line(margins.left, y + summaryRowHeight, pageWidth - margins.right, y + summaryRowHeight);
                    
                    y += summaryRowHeight;
                }
            });
            
            // Then show other deductions
            Object.keys(totals).forEach(deductionName => {
                if (!deductionOrder.includes(deductionName)) {
                    // Draw summary row background
                    doc.setFillColor(248, 248, 248);
                    doc.rect(margins.left, y, pageWidth - margins.left - margins.right, summaryRowHeight, "F");
                    
                    // Draw the deduction name
                    const namePosition = margins.left + (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]) * scaleFactor + 20;
                    doc.text(deductionName, namePosition, y + summaryRowHeight / 2 + 1);
                    
                    // Draw the total amount
                    doc.text(formatCurrency(totals[deductionName]), pageWidth - margins.right - 5, y + summaryRowHeight / 2 + 1, { align: 'right' });
                    
                    // Draw horizontal line
                    doc.line(margins.left, y + summaryRowHeight, pageWidth - margins.right, y + summaryRowHeight);
                    
                    y += summaryRowHeight;
                }
            });
            
            // Calculate and display grand total
            const grandTotal = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
            
            // Draw grand total row with different styling
            doc.setFillColor(200, 200, 200);
            doc.rect(margins.left, y, pageWidth - margins.left - margins.right, summaryRowHeight, "FD");
            
            doc.setFont('NotoSans', 'bold');
            const namePosition = margins.left + (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]) * scaleFactor + 20;
            doc.text('TOTAL DEDUCTIONS', namePosition, y + summaryRowHeight / 2 + 1);
            doc.text(formatCurrency(grandTotal), pageWidth - margins.right - 5, y + summaryRowHeight / 2 + 1, { align: 'right' });
            
            y += summaryRowHeight;
            
            // Draw vertical lines for the summary section
            doc.line(margins.left, currentY + 5, margins.left, y);
            doc.line(pageWidth - margins.right, currentY + 5, pageWidth - margins.right, y);
            
            // Add extra spacing after summary
            y += 10;
            
            return y;
        }

        // Function to add headers to a page
        function addPageHeaders(vessel: DeductionRegisterVesselData, withTableHeader: boolean = true): void {
            // If not the first page, add a new page
            if (!isFirstPage) {
                doc.addPage();
                currentPage++;
                currentY = margins.top;
            } else {
                isFirstPage = false;
            }

            // Draw header table (3-column structure)
            const headerWidth = pageWidth - margins.left - margins.right;
            const companyColWidth = 90;
            const middleColWidth = headerWidth - companyColWidth - 100;
            const rightColWidth = 100;

            // Draw header table borders
            doc.setLineWidth(0.1);
            doc.setDrawColor(0);

            // Header rect for company info
            doc.rect(margins.left, currentY, headerWidth, headerHeight);

            // Right column boxes for month/year and report title
            doc.rect(margins.left + companyColWidth + middleColWidth, currentY, rightColWidth, 8); // Month/Year cell
            doc.rect(margins.left + companyColWidth + middleColWidth, currentY + 8, rightColWidth, 8); // Report Title cell

            // Add IMS Philippines logo
            doc.addImage(logoBase64Image, 'PNG', margins.left, currentY, 16, 16);

            // Add company name text
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'bold');
            doc.text("IMS PHILIPPINES", margins.left + 23, currentY + 7.5);
            doc.text("MARITIME CORP.", margins.left + 23, currentY + 11.5);

            // Add month/year and report title
            doc.setFontSize(7);
            doc.setFont('NotoSans', 'normal');
            doc.text(`${periodMonth} ${year}`, margins.left + companyColWidth + middleColWidth + rightColWidth - 5, currentY + 5, { align: 'right' });
            doc.text("ALLOTMENT DEDUCTION REGISTER", margins.left + companyColWidth + middleColWidth + rightColWidth - 5, currentY + 13, { align: 'right' });

            currentY += headerHeight;

            // Draw vessel information table
            const vesselInfoY = currentY;

            // Main rectangle for vessel info
            doc.rect(margins.left, vesselInfoY, headerWidth, vesselInfoHeight);

            // Vessel name info
            doc.setFontSize(7);
            doc.setTextColor(130);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(0);
            doc.text("VESSEL", margins.left + 2, vesselInfoY + 3);
            doc.setFontSize(7);
            doc.setFont('NotoSans', 'bold');
            doc.text(vessel.VesselName, margins.left + 2, vesselInfoY + 6.5);

            // Vertical line for right column
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.setFont('NotoSans', 'normal');
            doc.text(`${postedStatus}`, margins.left + 2, vesselInfoY + 13.5);
            doc.line(margins.left + companyColWidth + middleColWidth, vesselInfoY, margins.left + companyColWidth + middleColWidth, vesselInfoY + vesselInfoHeight);

            // IMPORTANT: Add horizontal line between exchange rate and date
            doc.line(margins.left, vesselInfoY + 8, margins.left + companyColWidth + middleColWidth + rightColWidth, vesselInfoY + 8);

            // Add exchange rate and date
            doc.setFontSize(7);
            doc.setFont('NotoSans', 'normal');
            doc.text(`EXCHANGE RATE: USD 1.00 = PHP ${vesselData.ExchangeRate.toFixed(2)}`, margins.left + companyColWidth + middleColWidth + rightColWidth - 5, vesselInfoY + 5, { align: 'right' });
            doc.text(getFormattedDate(), margins.left + companyColWidth + middleColWidth + rightColWidth - 5, vesselInfoY + 13, { align: 'right' });

            currentY += vesselInfoHeight;

            // Add gray separator line (simplified - no vessel header)
            doc.setDrawColor(180);
            doc.setLineWidth(1);
            doc.line(margins.left, currentY + 4, pageWidth - margins.right, currentY + 4);
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);

            currentY += 8; // Just space for the separator

            if(withTableHeader){

                // Draw table header
                doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
                doc.setFillColor(235, 235, 235); // Light gray background
                doc.rect(margins.left, currentY, pageWidth - 20, tableHeaderHeight, "FD"); // Header row background
    
                // Draw header text
                const headers = [
                    "CREW NAME", "RANK", "SALARY", "GROSS"
                ];
    
                doc.setFontSize(7);
                doc.setFont('NotoSans', 'normal');
                headers.forEach((header, index) => {
                    const colWidth = colWidths[index] * scaleFactor;
                    const colX = colPositions[index];
                     if (index <= 1) {
                        // Left align crew name header (same as data)
                        doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' });
                    }
                    else if(header === "ALLOTTEE NAME" || header === "BANK"){
                        doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' });
                    } 
                    else {
                        // Right align numeric headers (same as data)
                        doc.text(header, colX + colWidth - 5, currentY + tableHeaderHeight / 2 + 1, { align: 'right' });
                    }
                });
    
                // Draw horizontal line after headers
                doc.line(margins.left, currentY + tableHeaderHeight, pageWidth - margins.right, currentY + tableHeaderHeight);
    
                currentY += tableHeaderHeight;
            }
        }

        // Function to add a footer to the current pages
        function addPageFooter(currentPage: number, totalPages: number): void {
            // Draw page number box at bottom
            doc.rect(margins.left, pageHeight - margins.bottom + 3, pageWidth - margins.left - margins.right, 8);
            doc.setFontSize(7);
            doc.text(`Page ${currentPage} out of ${totalPages}`, pageWidth - margins.right - 6, pageHeight - margins.bottom + 8, { align: 'right' });
        }

        // Process each vessel - without adding vessel header between vessels
        vesselData.Vessels.forEach((vessel, vesselIndex) => {
            // On new vessel, always start with headers
            if (vesselIndex === 0 || !isFirstPage) {
                addPageHeaders(vessel);
            }

            // Draw table data rows
            let y = currentY;
            let tableStartY = currentY; // Start of current table section

            // Process each crew member
            vessel.Crew.forEach((crew) => {
                // Calculate how much space this crew entry will need
                const allotteeCount = crew.Deductions ? crew.Deductions.length : 0;
                const crewEntryHeight = rowHeight + (allotteeCount * rowHeight);

                // Check if we need a new page
                if (y + crewEntryHeight > pageHeight - margins.bottom - 8) {
                    // Draw vertical lines on left and right sides of the table for this page
                    doc.line(margins.left, tableStartY, margins.left, y); // Left vertical line
                    doc.line(pageWidth - margins.right, tableStartY, pageWidth - margins.right, y); // Right vertical line

                    

                    // Start a new page with headers
                    addPageHeaders(vessel);

                    // Reset table position trackers for new page
                    y = currentY;
                    tableStartY = currentY;
                }

                // Set font for data
                doc.setFontSize(7);
                doc.setFont('NotoSans', 'normal');

                 const columnKeys: string[] = [
                    "CrewName",
                    "Rank",
                    "Salary",
                    "Gross",
                ];

                // Draw crew data
                columnKeys.forEach((key, i) => {
                    if(i == 0) {
                        // Crew Name
                        doc.text(crew[key as keyof DeductionRegisterCrew].toString(), colPositions[0] + 5, y + 5, {align: 'left'});
                    }
                    else if(key === 'Rank') {
                        doc.text(crew[key as keyof DeductionRegisterCrew].toString(), colPositions[i] + 5,  y + 5, {align: 'left'});
                    }
                    else {
                        const value = crew[key as keyof DeductionRegisterCrew];
                        doc.text(formatCurrency(Number(value) || 0), colPositions[i] + colWidths[i] * scaleFactor - 5, y + 5, { align: 'right' });
                    }
                });

                // Draw horizontal line at bottom of crew row
                doc.line(margins.left, y + rowHeight, pageWidth - margins.right, y + rowHeight);

                // Move to next row
                y += rowHeight;
                currentY = y

                // If crew has allottees, draw them in subsequent rows
                if (crew.Deductions && crew.Deductions.length > 0) {
                    crew.Deductions.forEach(deduction => {
                        // Check if we need a new page for this allottee
                        if (y + rowHeight > pageHeight - margins.bottom - 8) {
                            // Draw vertical lines on left and right sides of the table for this page
                            doc.line(margins.left, tableStartY, margins.left, y); // Left vertical line
                            doc.line(pageWidth - margins.right, tableStartY, pageWidth - margins.right, y); // Right vertical line

                            

                            // Start a new page with headers
                            addPageHeaders(vessel);

                            // Reset table position trackers for new page
                            y = currentY;
                            tableStartY = currentY;
                        }

                         // Format the deduction details - important to use fixed positions that match the image
                        const currencyLabel = deduction.Currency === 1 ? "Usd" : "PhP";
                        const amountWithRate = deduction.Currency === 1 ? `${formatCurrency(deduction.Amount / deduction.ExchangeRate)} X ${deduction.ExchangeRate}` : `${formatCurrency(deduction.Amount)}`;

                        // Calculate dollar amount based on currency
                        const dollarAmount = deduction.Amount

                        // Define fixed positions for deduction details based on the sample image
                        const namePosition = margins.left + mainTableWidth * 0.5; // Deduction name position
                        const currencyPosition = margins.left + mainTableWidth * 0.7; // Currency label position
                        const amountPosition = margins.left + mainTableWidth * 0.8; // Amount/rate position
                        
                        doc.text(deduction.Name, namePosition + 20, y + rowHeight / 2 + 1);
                        doc.text(currencyLabel, currencyPosition + 12, y + rowHeight / 2 + 1);
                        doc.text(amountWithRate, amountPosition + 6, y + rowHeight / 2 + 1);
                        doc.text(formatCurrency(dollarAmount), pageWidth - margins.right - 5, y + rowHeight / 2 + 1, { align: 'right' });

                        // Move to next row
                        y += rowHeight;
                    });
                }
                doc.line(margins.left, y, pageWidth - margins.right, y);
            });

            // Draw vertical lines on left and right sides of the table for the last section
            doc.line(margins.left, tableStartY, margins.left, y); // Left vertical line
            doc.line(pageWidth - margins.right, tableStartY, pageWidth - margins.right, y); // Right vertical line

            // ADD VESSEL SUMMARY HERE
            // Check if we need a new page for the summary
            const estimatedSummaryHeight = 100; // Rough estimate
            if (y + estimatedSummaryHeight > pageHeight - margins.bottom - 8) {
                addPageHeaders(vessel, false);
                y = currentY;
            }
            
            // Draw the vessel summary
            y = drawVesselSummary(doc, vessel, y, margins, pageWidth, colPositions, colWidths, scaleFactor);
            currentY = y;

            // If there are more vessels, prepare for the next vessel
            if (vesselIndex < vesselData.Vessels.length - 1) {
                isFirstPage = false;
            }
        });

       // NOW ADD PAGE NUMBERS TO ALL PAGES - Get actual total pages
        const totalPages = doc.internal.pages.length - 1; // Subtract 1 because pages array includes a blank first element

        // Loop through all pages and add page numbers
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'italic');
            // Draw page number box at bottom
            addPageFooter(i, totalPages)
        }
        // Save the final PDF
        const fileName = vesselData.Vessels.length > 1
                    ? `Deduction_ALL_${capitalizeFirstLetter(getMonthName(month))}-${year} - ${postedStatus}.pdf`
                    : `Deduction_${capitalizeFirstLetter(vesselData.Vessels[0].VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(getMonthName(month))}-${year}.pdf`;
        doc.save(fileName)
        return true;
    } catch (error) {
        console.error("Error generating PDF:", error);
        return false;
    }
}

// Example usage function
export function generateDeductionAllotmentV2PDF(
    vesselData: DeductionRegisterData,
    month: number,
    year: number,
    exchangeRate: number = 57.53,
    postedValue: number
): void {
    generateDeductionAllotmentV2Register(vesselData, month, year, exchangeRate, postedValue);
}
