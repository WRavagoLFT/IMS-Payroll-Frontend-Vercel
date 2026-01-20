"use client";

import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter } from "@/lib/utils";

// Define interfaces based on your updated data structure
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
    ExchangeRate: number;
    Crew: AllotmentRegisterCrew[];
}

export interface AllotmentRegisterResponse {
    success: boolean;
    message: string;
    data: AllotmentRegisterData[];
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

/**
 * Generate allotment payroll register PDF directly from AllotmentRegisterData array
 * @param vesselData Array of vessel data
 * @param month Month name in uppercase (e.g., "JANUARY")
 * @param year Year (e.g., 2025)
 * @param exchangeRate Exchange rate for USD to PHP
 * @returns boolean indicating if PDF generation was successful
 */
export function generateAllotmentPayrollRegister(
    vesselData: AllotmentRegisterData[],
    month: string,
    year: number,
    exchangeRate: number,
    postedValue: number
): boolean {
    const postedStatus = postedValue === 1 ? "Posted" : "Unposted";

    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!vesselData || vesselData.length === 0) {
        console.error('Invalid or empty data for allotment register');
        return false;
    }

    try {
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
            title: `Allotment Payroll Register - ${month} ${year} - ${postedStatus}`,
            subject: `Allotment Payroll Register`,
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
            mainTableWidth * 0.15,  // CREW NAME
            mainTableWidth * 0.10,  // RANK
            mainTableWidth * 0.06,  // BASIC WAGE
            mainTableWidth * 0.06,  // FIXED OT
            mainTableWidth * 0.06,  // GUAR OT
            mainTableWidth * 0.07,  // DOLLAR GROSS
            mainTableWidth * 0.07,  // PESO GROSS
            mainTableWidth * 0.07,  // TOTAL DED
            mainTableWidth * 0.07,  // NET
            mainTableWidth * 0.15,  // ALLOTTEE NAME
            mainTableWidth * 0.07,  // ACCOUNT NUMBER
            mainTableWidth * 0.10,  // BANK
            mainTableWidth * 0.07   // ALLOTMENT
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
        const summaryRowHeight = 10; // Height for summary row

        // Keep track of pagination
        let currentPage = 1;

        // Variables to track current position
        let currentY = margins.top;
        let isFirstPage = true;

        function addVesselSummaryRow(vessel: AllotmentRegisterData, y: number): number {
            const totals = calculateVesselTotals(vessel);
            
            // Set background color for summary row
            doc.setFillColor(245, 245, 245); // Light gray background
            doc.rect(margins.left, y, pageWidth - margins.left - margins.right, summaryRowHeight, "F");
            
            // Draw border around summary row
            doc.setLineWidth(0.2);
            doc.rect(margins.left, y, pageWidth - margins.left - margins.right, summaryRowHeight);
            doc.setLineWidth(0.1); // Reset line width
            
            // Set font for summary text
            doc.setFontSize(7);
            doc.setFont('NotoSans', 'bold');
            
            // Add "VESSEL TOTAL:" label
            doc.text(`TOTAL`, colPositions[0] + 5, y + summaryRowHeight / 2 + 1, { align: 'left' });
            
            // Add totals in respective columns
            doc.text(formatCurrency(totals.totalPesoGross), colPositions[6] + colWidths[6] * scaleFactor - 5, y + summaryRowHeight / 2 + 1, { align: 'right' });
            doc.text(formatCurrency(totals.totalDeduction), colPositions[7] + colWidths[7] * scaleFactor - 5, y + summaryRowHeight / 2 + 1, { align: 'right' });
            doc.text(formatCurrency(totals.totalNet), colPositions[8] + colWidths[8] * scaleFactor - 5, y + summaryRowHeight / 2 + 1, { align: 'right' });
            
            return y + summaryRowHeight;
        }

        function calculateVesselTotals(vessel: AllotmentRegisterData) {
            let totalDollarGross = 0;
            let totalPesoGross = 0;
            let totalDeduction = 0;
            let totalNet = 0;

            vessel.Crew.forEach(crew => {
                totalDollarGross += Number(crew.DollarGross) || 0;
                totalPesoGross += Number(crew.PesoGross) || 0;
                totalDeduction += Number(crew.TotalDeduction) || 0;
                totalNet += Number(crew.Net) || 0;
            });

            return {
                totalDollarGross,
                totalPesoGross,
                totalDeduction,
                totalNet
            };
        }

        // Function to add headers to a page
        function addPageHeaders(vessel: AllotmentRegisterData): void {
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
            doc.text(`${month} ${year}`, margins.left + companyColWidth + middleColWidth + rightColWidth - 5, currentY + 5, { align: 'right' });
            doc.text("ALLOTMENT PAYROLL REGISTER", margins.left + companyColWidth + middleColWidth + rightColWidth - 5, currentY + 13, { align: 'right' });

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
            doc.text(`EXCHANGE RATE: USD 1.00 = PHP ${vessel.ExchangeRate}`, margins.left + companyColWidth + middleColWidth + rightColWidth - 5, vesselInfoY + 5, { align: 'right' });
            doc.text(getFormattedDate(), margins.left + companyColWidth + middleColWidth + rightColWidth - 5, vesselInfoY + 13, { align: 'right' });

            currentY += vesselInfoHeight;

            // Add gray separator line (simplified - no vessel header)
            doc.setDrawColor(180);
            doc.setLineWidth(1);
            doc.line(margins.left, currentY + 4, pageWidth - margins.right, currentY + 4);
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);

            currentY += 8; // Just space for the separator

            // Draw table header
            doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
            doc.setFillColor(235, 235, 235); // Light gray background
            doc.rect(margins.left, currentY, pageWidth - 20, tableHeaderHeight, "FD"); // Header row background

            // Draw header text
            const headers = [
                "CREW NAME", "RANK", "BASIC", "FOT", "GOT", "GROSS ($)",
                "GROSS (₱)", "TOTAL DED.", "NET", "ALLOTTEE", "ACCOUNT NO.", "BANK", "ALLOTMENT"
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
                else if(header === "ALLOTTEE" || header === "BANK" || header === "ALLOTMENT" || header === "ACCOUNT NO.") {
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

             // DEBUG: Draw red column borders for the header area
            //  drawDebugColumnBorders(currentY - tableHeaderHeight, currentY);
        }

        // Function to add a footer to the current pages
        function addPageFooter(currentPage: number, totalPages: number): void {
            // Draw page number box at bottom
            //console.log(pageHeight, margins.bottom);
            doc.rect(margins.left, pageHeight - margins.bottom + 3, pageWidth - margins.left - margins.right, 8);
            doc.setFontSize(7);
            doc.text(`Page ${currentPage} out of ${totalPages}`, pageWidth - margins.right - 6, pageHeight - margins.bottom + 8, { align: 'right' });
        }

        // Process each vessel - without adding vessel header between vessels
        vesselData.forEach((vessel, vesselIndex) => {
            // On new vessel, always start with headers
            if (vesselIndex === 0 || !isFirstPage) {
                addPageHeaders(vessel);
            }

            // Draw table data rows
            let y = currentY;
            let tableStartY = currentY; // Start of current table section

            let totalGross = 0
            let totalDeductions = 0
            let totalNet = 0

            // Process each crew member
            vessel.Crew.forEach((crew) => {
                // Calculate how much space this crew entry will need
                const allotteeCount = crew.Allottee ? crew.Allottee.length : 0;
                const crewEntryHeight = rowHeight + (allotteeCount * rowHeight);

                totalGross =+ crew.PesoGross
                totalDeductions =+ crew.TotalDeduction
                totalNet =+ crew.Net

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
                doc.setFontSize(6);
                doc.setFont('NotoSans', 'normal');

                const columnKeys: string[] = [
                    "CrewName",
                    "Rank",
                    "BasicWage",
                    "FixedOT",
                    "GuarOT",
                    "DollarGross",
                    "PesoGross",
                    "TotalDeduction",
                    "Net",
                ]

                // Draw crew data
                columnKeys.forEach((key, i) => {
                    if(i == 0) {
                        // Crew Name
                        doc.text(crew[key as keyof AllotmentRegisterCrew].toString(), colPositions[0] + 5, y + 5, {align: 'left'});
                    }
                    else if(key === 'Rank') {
                        doc.text(crew[key as keyof AllotmentRegisterCrew].toString(), colPositions[i] + 5,  y + 5, {align: 'left'});
                    }
                    else {
                        const value = crew[key as keyof AllotmentRegisterCrew];
                        doc.text(formatCurrency(Number(value) || 0), colPositions[i] + colWidths[i] * scaleFactor - 5, y + 5, { align: 'right' });
                    }
                });

                // Draw horizontal line at bottom of crew row
                doc.line(margins.left, y + rowHeight, pageWidth - margins.right, y + rowHeight);

                // Move to next row
                y += rowHeight;


                // If crew has allottees, draw them in subsequent rows
                if (crew.Allottee && crew.Allottee.length > 0) {
                    crew.Allottee.forEach(allottee => {
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
                        
                        const netAllotment = allottee.NetAllotment || 0;

                        // Add allottee details - using the updated property names
                        doc.text(allottee.AllotteeName, colPositions[9] + 5, y + 5, { align: 'left' });
                        doc.text(allottee.AccountNumber, colPositions[10] + 9, y + 5, { align: 'left' });
                        doc.text(allottee.Bank, colPositions[11] + 5, y + 5, { align: 'left' });
                        doc.text(formatCurrency(netAllotment), colPositions[12] + colWidths[12] * scaleFactor - 5, y + 5, { align: 'right' });

                        // Move to next row
                        y += rowHeight;
                    });
                }
                doc.line(margins.left, y, pageWidth - margins.right, y);
            });

           // Draw vertical lines on left and right sides of the table for the last section
            doc.line(margins.left, tableStartY, margins.left, y); // Left vertical line
            doc.line(pageWidth - margins.right, tableStartY, pageWidth - margins.right, y); // Right vertical line

            // ADD VESSEL SUMMARY ROW AFTER EACH VESSEL
            // Check if we have space for the summary row
            if (y + summaryRowHeight > pageHeight - margins.bottom - 8) {
                // Start a new page for the summary row
                addPageHeaders(vessel);
                y = currentY;
                tableStartY = currentY;
            }

            // Add the vessel summary row
            y = addVesselSummaryRow(vessel, y);

            // Draw vertical lines for the summary row section
            doc.line(margins.left, y - summaryRowHeight, margins.left, y); // Left vertical line
            doc.line(pageWidth - margins.right, y - summaryRowHeight, pageWidth - margins.right, y); // Right vertical line

            // If there are more vessels, prepare for the next vessel (forcing new page)
            if (vesselIndex < vesselData.length - 1) {
                isFirstPage = false;
                // Add some spacing before the next vessel
                currentY = y + 5;
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
        const fileName = vesselData.length > 1
                            ? `Allotment_ALL_${capitalizeFirstLetter(month)}-${year} - ${postedStatus}.pdf`
                            : `Allotment_${capitalizeFirstLetter(vesselData[0].VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(month)}-${year}.pdf`;
        doc.save(fileName)

        return true;
    } catch (error) {
        console.error("Error generating PDF:", error);
        return false;
    }
}

// Example usage function
export function generateAllotmentPDF(
    allotmentData: AllotmentRegisterData[],
    month: string,
    year: number,
    exchangeRate: number,
    postedValue: number
): void {
    generateAllotmentPayrollRegister(allotmentData, month, year, exchangeRate, postedValue);
}