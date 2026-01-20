"use client";

import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, truncateText } from "@/lib/utils";

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

export interface DeductionRegisterData {
    VesselID: number;
    VesselName: string;
    VesselCode: string;
    VesselType: string;
    Principal: string;
    IsActive: number;
    Crew: DeductionRegisterCrew[];
}

// Format currency values with commas and 2 decimal places
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Function to convert month number to name
function getMonthName(monthNum: number): string {
    const months = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return months[monthNum - 1];
}

/**
 * Generate a deduction register PDF for all vessels
 * @param vesselData The vessel data array to use for the PDF
 * @param month Month number (1-12)
 * @param year Year (e.g. 2025)
 * @param exchangeRate Exchange rate to use (default: 57.53)
 * @param dateGenerated Formatted date string (default: current date)
 * @returns boolean indicating success
 */
export function generateDeductionRegisterPDF(
    vesselData: DeductionRegisterData[],
    month: number,
    year: number,
    exchangeRate: number,
    dateGenerated: string = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "numeric",
        minute: "numeric",
        hour12: true
    }),
): boolean {
    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!vesselData || vesselData.length === 0) {
        console.error('Invalid or empty data for deduction register');
        return false;
    }

    try {
        // Get month name from month number
        const periodMonth = getMonthName(month);
        const periodYear = year;

        // Create a new PDF document in landscape orientation with LETTER size
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "letter" // Letter size (8.5" × 11")
        });

        // Add custom font with peso symbol support
        try {
            addFont(doc);
            doc.setFont('NotoSans', 'normal');
        } catch (error) {
            console.warn("Could not load custom font, using default", error);
            doc.setFont('helvetica', 'normal');
        }

        // Determine vessel name for header - "All Vessels" if multiple, specific name if single
        const headerVesselName = vesselData.length > 1 ? "All Vessels" : vesselData[0].VesselName;

        // Set document properties
        doc.setProperties({
            title: `Allotment Deduction Register - ${headerVesselName} - ${periodMonth} ${periodYear}`,
            subject: `Deduction Register for ${headerVesselName}`,
            author: 'IMS Philippines Maritime Corp.',
            creator: 'jsPDF'
        });

        // Get page dimensions
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = { left: 10, right: 10, top: 10, bottom: 15 }; // Reduced bottom margin

        // Define footer height and page number box height
        const footerHeight = 20;
        const pageNumberBoxHeight = 10;

        // Calculate table dimensions
        const mainTableWidth = pageWidth - margins.left - margins.right;

        // Define columns for the main table
        const colWidths = [
            mainTableWidth * 0.20, // CREW NAME
            mainTableWidth * 0.14, // RANK
            mainTableWidth * 0.09, // SALARY
            mainTableWidth * 0.10, // GROSS
            mainTableWidth * 0.50  // Deduction details
        ];

        // Calculate column positions
        const colPositions: number[] = [];
        let runningPosition = margins.left;
        colWidths.forEach(width => {
            colPositions.push(runningPosition);
            runningPosition += width;
        });
        colPositions.push(runningPosition); // Add end position

        // Define heights
        const rowHeight = 8;
        const tableHeaderHeight = 8;

        // Variables to track current position
        let currentY = margins.top;

        // Function to draw the main header (company info, title, etc.) - ONLY FOR FIRST PAGE
        const drawMainHeader = () => {
            // Draw header table (3-column structure)
            const headerWidth = pageWidth - margins.left - margins.right;
            const companyColWidth = 90;
            const middleColWidth = headerWidth - companyColWidth - 100;
            const rightColWidth = 100;

            // Draw header table borders
            doc.setLineWidth(0.1);
            doc.setDrawColor(0);

            // CrewHeader
            doc.rect(margins.left, currentY, pageWidth - margins.right - 10, 40);

            //logo
            doc.addImage(logoBase64Image, 'PNG', margins.left, currentY, 20, 20);

            // Add company name text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("IMS PHILIPPINES", margins.left + 25, currentY + 9);
            doc.text("MARITIME CORP.", margins.left + 25, currentY + 14);

            // Add month/year and report title
            doc.rect(margins.left + companyColWidth + middleColWidth, currentY, rightColWidth, 10);
            doc.rect(margins.left + companyColWidth + middleColWidth, currentY + 10, rightColWidth, 10);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `${periodMonth} ${periodYear}`,
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                currentY + 6.5,
                { align: 'right' }
            );
            doc.text(
                "ALLOTMENT DEDUCTION REGISTER",
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                currentY + 16,
                { align: 'right' }
            );

            currentY += 20;

            // Draw vessel information table
            const vesselInfoY = currentY;

            // Left column (Vessel name)
            doc.line(margins.left, vesselInfoY, pageWidth - margins.right, vesselInfoY);
            doc.setFontSize(8);
            //text Gray
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            doc.text("VESSEL", margins.left + 2, vesselInfoY + 4.5);
            doc.setTextColor(0);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');

            // Display "All Vessels" if multiple vessels, otherwise the single vessel name
            doc.text(headerVesselName, margins.left + 2, vesselInfoY + 7.5);

            doc.line(margins.left, vesselInfoY + 10, pageWidth - margins.right, vesselInfoY + 10);

            // Right column division line
            doc.line(margins.left + companyColWidth + middleColWidth, 30, margins.left + companyColWidth + middleColWidth, 40);

            // Add exchange rate and date
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `EXCHANGE RATE: USD 1.00 = PHP ${vesselData[0].Crew[0].Deductions[0].ExchangeRate.toFixed(2)}`,
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                vesselInfoY + 6,
                { align: 'right' }
            );
            doc.setFont('helvetica', 'italic');

            doc.text(
                dateGenerated,
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                vesselInfoY + 16,
                { align: 'right' }
            );

            currentY += 20;

            // Gray separator line
            const separatorY = currentY + 4;
            doc.setDrawColor(180);
            doc.setLineWidth(1);
            doc.line(margins.left, separatorY, pageWidth - margins.right, separatorY);
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);

            currentY = separatorY + 4;
        };

        // Function to draw the table header
        const drawTableHeader = () => {
            // Draw table headers
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');

            // Draw horizontal borders for header row only
            doc.line(margins.left, currentY, pageWidth - margins.right, currentY); // Top border
            doc.line(margins.left, currentY + tableHeaderHeight, pageWidth - margins.right, currentY + tableHeaderHeight); // Bottom border

            // Draw left and right borders
            doc.line(margins.left, currentY, margins.left, currentY + tableHeaderHeight); // Left border
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + tableHeaderHeight); // Right border

            // Add header text
            const headers = ["CREW NAME", "RANK", "SALARY", "GROSS"];
            headers.forEach((header, index) => {
                const colX = colPositions[index];
                const colWidth = colWidths[index];
                if (index <= 1) {
                    // Left align crew name header (same as data)
                    doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' });
                } else {
                    // Right align numeric headers (same as data)
                    doc.text(header, colX + colWidth - 5, currentY + tableHeaderHeight / 2 + 1, { align: 'right' });
                }
            });

            currentY += tableHeaderHeight;
        };

        // Function to add a new page - without main header after first page
        const addNewPage = (isFirstPage: boolean = false) => {
            if (!isFirstPage) {
                doc.addPage();
            }
            currentY = margins.top;
            
            // Draw header only on first page
            if (isFirstPage) {
                drawMainHeader();
            }
            
            // Draw table header on all pages
            drawTableHeader();
        };

        // Calculate max Y position before footer
        const getMaxYPosition = () => {
            return pageHeight - margins.bottom - footerHeight;
        };

        // FIRST PAGE ONLY - Draw the main header and table header
        addNewPage(true);

        // Process each vessel
        vesselData.forEach((vessel) => {
            // Skip if vessel has no crew
            if (!vessel.Crew || vessel.Crew.length === 0) {
                return;
            }

            // Track the starting position for table section
            let tableStartY = currentY;

            // Process each crew member
            vessel.Crew.forEach((crew, crewIndex) => {
                // Calculate height needed for this crew entry (crew row + deduction rows)
                const crewHeight = rowHeight;
                const deductionsHeight = crew.Deductions ? crew.Deductions.length * rowHeight : 0;
                const totalEntryHeight = crewHeight + deductionsHeight;

                // Check if we need a new page
                if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) { // Leave space for page number
                    addNewPage(false);
                    tableStartY = currentY; // Reset table starting position
                }

                // Set font for crew data
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                // Draw horizontal line at the top of crew row
                if (crewIndex > 0) {
                    doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
                }

                // Draw left and right borders only
                doc.line(margins.left, currentY, margins.left, currentY + rowHeight); // Left border
                doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight); // Right border

                // Draw crew data
                const columnKeys: string[] = [
                    "CrewName",
                    "Rank",
                    "Salary",
                    "Gross",
                ];
                columnKeys.forEach((key, i) => {
                    if(i == 0) {
                        // Crew Name
                        doc.text(truncateText(crew[key as keyof DeductionRegisterCrew].toString(), 22), colPositions[0] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                    }
                    else if(key === 'Rank') {
                        doc.text(truncateText(crew[key as keyof DeductionRegisterCrew].toString(), 22), colPositions[i] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                    }
                    else {
                        const value = crew[key as keyof DeductionRegisterCrew];
                        doc.text(formatCurrency(Number(value) || 0), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                    }
                });
                // Draw horizontal line at the bottom of crew row
                doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

                // Move to next row
                currentY += rowHeight;

                // Process deductions for this crew
                if (crew.Deductions && crew.Deductions.length > 0) {
                    crew.Deductions.forEach((deduction) => {
                        // Check if we need a new page - more precise calculation
                        if (currentY + rowHeight > getMaxYPosition()) {
                            // Draw vertical lines for current table section
                            doc.line(margins.left, tableStartY, margins.left, currentY); // Left vertical line
                            doc.line(pageWidth - margins.right, tableStartY, pageWidth - margins.right, currentY); // Right vertical line

                            // Add new page but WITHOUT main header
                            addNewPage();

                            // Reset table starting position
                            tableStartY = currentY;
                        }

                        // Draw left and right borders only (no horizontal borders between deduction rows)
                        doc.line(margins.left, currentY, margins.left, currentY + rowHeight); // Left border
                        doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight); // Right border

                        // Format the deduction details - important to use fixed positions that match the image
                        const currencyLabel = deduction.Currency === 1 ? "Usd" : "PhP";
                        const amountWithRate = deduction.Currency === 1 ? `${formatCurrency(deduction.Amount)} X ${deduction.ExchangeRate}` : `${formatCurrency(deduction.Amount)}`;

                        // Calculate dollar amount based on currency
                        const dollarAmount = deduction.Currency === 1
                            ? deduction.Amount * deduction.ExchangeRate
                            : deduction.Amount;

                        // Define fixed positions for deduction details based on the sample image
                        const namePosition = margins.left + mainTableWidth * 0.5; // Deduction name position
                        const currencyPosition = margins.left + mainTableWidth * 0.7; // Currency label position
                        const amountPosition = margins.left + mainTableWidth * 0.8; // Amount/rate position

                        // Draw deduction details using fixed positions
                        doc.text(deduction.Name, namePosition + 20, currentY + rowHeight / 2 + 1);
                        doc.text(currencyLabel, currencyPosition + 12, currentY + rowHeight / 2 + 1);
                        doc.text(amountWithRate, amountPosition + 6, currentY + rowHeight / 2 + 1);
                        doc.text(formatCurrency(dollarAmount), pageWidth - margins.right - 5, currentY + rowHeight / 2 + 1, { align: 'right' });

                        // Move to next row without drawing horizontal line
                        currentY += rowHeight;
                    });

                    // Draw horizontal line after last deduction for this crew
                    doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
                }
            });

            // Draw vertical lines for last table section of this vessel
            doc.line(margins.left, tableStartY, margins.left, currentY); // Left vertical line
            doc.line(pageWidth - margins.right, tableStartY, pageWidth - margins.right, currentY); // Right vertical line
        });

        // NOW ADD PAGE NUMBERS TO ALL PAGES - Get actual total pages
        const totalPages = doc.internal.pages.length - 1; // Subtract 1 because pages array includes a blank first element

        // Loop through all pages and add page numbers
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Draw page number box at bottom
            doc.rect(margins.left, pageHeight - margins.bottom - 10, mainTableWidth, 10);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text(
                `Page ${i} out of ${totalPages}`, 
                pageWidth - margins.right - 5, 
                pageHeight - margins.bottom - 4, 
                { align: 'right' }
            );
        }

        // Save the PDF with an appropriate filename
        const fileName = vesselData.length > 1
            ? `Deduction_ALL_${capitalizeFirstLetter(getMonthName(month))}-${year}.pdf`
            : `Deduction_${capitalizeFirstLetter(vesselData[0].VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(getMonthName(month))}-${year}.pdf`;

        doc.save(fileName);

        return true;
    } catch (error) {
        console.error("Error generating deduction register PDF:", error);
        return false;
    }
}

/**
 * Wrapper function to generate a deduction register PDF with default values
 * @param vesselData The vessel data to use for the PDF
 * @param month Month number (1-12)
 * @param year Year (e.g. 2025)
 * @param exchangeRate Exchange rate to use
 */
export function generateDeductionRegister(
    vesselData: DeductionRegisterData[],
    month: number,
    year: number,
    exchangeRate: number = 57.53,
): boolean {
    return generateDeductionRegisterPDF(
        vesselData,
        month,
        year,
        exchangeRate,
        undefined, // Use default date generated
    );
}

// Default export for easy importing
export default generateDeductionRegister;