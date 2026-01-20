"use client";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, formatCurrency, getMonthName } from "@/lib/utils";
import { DeductionResponse, HDMFDeductionCrew } from "@/src/services/deduction/governmentReports.api";

interface CrewMember {
    CrewID: number;
    CrewName: string;
    HDMFNumber: string;
    Rank: string;
    Salary: number;
    Allotment: number;
    Gross: number;
    EE: number,
    ER: number
}

interface VesselData {
    VesselID: number;
    VesselName: string;
    VesselCode: string;
    VesselType: string;
    Principal: string;
    IsActive: number;
    Crew: CrewMember[];
}

export interface HDMFRegisterData {
    success: boolean;
    message: string;
    data: VesselData[];
}

// Get month and year from message (e.g., "3/2025")
function extractPeriod(message: string): { month: string, year: number } {
    const regex = /(\d+)\/(\d+)/;
    const match = message.match(regex);
    if (match && match.length >= 3) {
        const monthNum = parseInt(match[1], 10);
        const year = parseInt(match[2], 10);
        return {
            month: getMonthName(monthNum),
            year: year
        };
    }
    return {
        month: "FEBRUARY", // Default for testing
        year: 2025 // Default for testing
    };
}

export function generateHDMFRegisterPDF(
    data: DeductionResponse<HDMFDeductionCrew>,
    dateGenerated: string = "04/14/25 9:55 AM",
    mode: 'all' | 'vessel' = 'vessel'
): boolean {
    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!data.success || !data.data || data.data.length === 0 || !data.data[0].Crew || data.data[0].Crew.length === 0) {
        console.error('Invalid or empty data for deduction register');
        return false;
    }

    try {
        // Extract vessel data
        const vesselData = data.data[0];
        // Extract period information from message
        const period = extractPeriod(data.message);

        // Create a new PDF document in landscape orientation with LEGAL size
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "letter"
        });

        // Add custom font with peso symbol support
        try {
            addFont(doc);
            doc.setFont('NotoSans', 'normal');
        } catch (error) {
            console.warn("Could not load custom font, using default", error);
            doc.setFont('helvetica', 'normal');
        }

        // Set document properties
        doc.setProperties({
            title: `HDMF Contribution Register - ${mode === 'vessel' ? vesselData.VesselName: 'All Vessels'} - ${period.month} ${period.year}`,
            subject: `HDMF Contribution Register for ${mode === 'vessel' ? vesselData.VesselName: 'All Vessels'}`,
            author: 'IMS Philippines Maritime Corp.',
            creator: 'jsPDF'
        });

        // Get page dimensions
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = { left: 10, right: 10, top: 10, bottom: 10 };

        // Initialize current Y position
        let currentY = margins.top;

        // Calculate table dimensions
        const mainTableWidth = pageWidth - margins.left - margins.right;

        // Define columns for the main table
        const colWidths = [
            mainTableWidth * 0.3, // CREW NAME
            mainTableWidth * 0.15, // HDMF Number
            mainTableWidth * 0.1, // DOB
            mainTableWidth * 0.1, // YYYYMMDD
            mainTableWidth * 0.08, // GROSS
            mainTableWidth * 0.08, // EE
            mainTableWidth * 0.08, // ER
            mainTableWidth * 0.1, // Total  
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

        // Function to draw the header (company info, vessel info, etc.)
        const drawPageHeader = () => {
            // Draw header table (3-column structure)
            const headerWidth = pageWidth - margins.left - margins.right;
            const companyColWidth = 90;
            const middleColWidth = headerWidth - companyColWidth - 100;
            const rightColWidth = 100;

            // Draw header table borders
            doc.setLineWidth(0.1);
            doc.setDrawColor(0);

            // Header container
            doc.rect(margins.left, currentY, pageWidth - margins.right - 10, 40);
            
            // Logo
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
                `${period.month} ${period.year}`,
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                currentY + 6.5,
                { align: 'right' }
            );
            doc.text(
                "HDMF CONTRIBUTION REGISTER",
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                currentY + 16,
                { align: 'right' }
            );

            currentY += 20;

            // Draw vessel information table
            const vesselInfoY = currentY;
            doc.line(margins.left, vesselInfoY, pageWidth - margins.right, vesselInfoY);
            doc.setFontSize(8);
            
            // Text Gray
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            doc.text("VESSEL", margins.left + 2, vesselInfoY + 4.5);
            doc.setTextColor(0);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(mode === 'vessel' ? vesselData.VesselName: 'All Vessels', margins.left + 2, vesselInfoY + 7.5);
            doc.line(margins.left, vesselInfoY + 10, pageWidth - margins.right, vesselInfoY + 10);

            doc.line(margins.left + companyColWidth + middleColWidth, 30, margins.left + companyColWidth + middleColWidth, 40);

            // Add exchange rate and date
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `EXCHANGE RATE: USD 1.00 = PHP ${data.data[0].ExchangeRate}`,
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
            const headers = ["CREW NAME", "HDMF No.", "DOB", "YYYYMMDD", "Gross", "EE", "ER", "Total"];
            headers.forEach((header, index) => {
                const colX = colPositions[index];
                const colWidth = colWidths[index];
                if (index <= 3) {
                    // Left align crew name header (same as data)
                    doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' });
                } else {
                    // Right align numeric headers (same as data)
                    doc.text(header, colX + colWidth - 5, currentY + tableHeaderHeight / 2 + 1, { align: 'right' });
                }
            });

            currentY += tableHeaderHeight;
        };

        // Function to add a new page
        const addNewPage = (isFirstPage: boolean = false) => {
            if (!isFirstPage) {
                doc.addPage();
            }
            currentY = margins.top;
            
            // Draw header only on first page
            if (isFirstPage) {
                drawPageHeader();
            }
            
            // Draw table header on all pages
            drawTableHeader();
        };

        // Start with first page
        addNewPage(true);

        // Process each crew member
        vesselData.Crew.forEach((crew, crewIndex) => {
            // Calculate height needed for this crew entry
            const crewHeight = rowHeight;
            const totalEntryHeight = crewHeight;

            // Check if we need a new page
            if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) { // Leave space for page number
                addNewPage(false);
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
                "HDMFNumber",
                "DateOfBirth",
                "YYYYMMDD",
                "Gross",
                "EE",
                "ER",
                "Total"
            ];

            columnKeys.forEach((key, i) => {
                if(i === 0) {
                    // Crew Name
                    doc.text(crew[key as keyof CrewMember].toString(), colPositions[0] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                }
                else if (key === 'HDMFNumber' || key === 'DateOfBirth' || key === 'YYYYMMDD') {
                    doc.text(crew[key as keyof CrewMember].toString(), colPositions[i] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                }
                else if (key === 'Total') {
                    const value = Number(crew.EE) + Number(crew.ER);
                    doc.text(formatCurrency(value || 0), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                }
                else {
                    const value = crew[key as keyof CrewMember];
                    doc.text(formatCurrency(Number(value) || 0), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                }
            });

            // Draw horizontal line at the bottom of crew row
            doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            // Move to next row
            currentY += rowHeight;
        });

        // NOW ADD PAGE NUMBERS TO ALL PAGES
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

        // Save the PDF
        const fileName = mode === 'vessel' ?
        `HDMF_${capitalizeFirstLetter(vesselData.VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(period.month)}-${period.year}.pdf` : 
        `HDMF_ALL_${capitalizeFirstLetter(period.month)}-${period.year}.pdf`;
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error("Error generating HDMF register PDF:", error);
        return false;
    }
}

// Function to generate the PDF with real data
export function generateHDMFRegister(data: DeductionResponse<HDMFDeductionCrew>, dateGenerated: string, mode: 'all' | 'vessel' = 'vessel'): boolean {
    return generateHDMFRegisterPDF(
        data,
        dateGenerated,
        mode
    );
}

// Default export for easy importing
export default generateHDMFRegister;