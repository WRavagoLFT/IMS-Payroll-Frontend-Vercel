"use client";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, formatCurrency, getMonthName, truncateText } from "@/lib/utils";
import { DeductionResponse, HDMFDeductionCrew } from "@/src/services/deduction/governmentReports.api";
import { OnboardCrewReportResponse } from "@/src/services/vessel/vessel.api";
import { format } from "date-fns";
import { toast } from "../ui/use-toast";
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
    data: DeductionRegisterData;
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

export function generateDeductionRegisterV3PDF(
    data: AllotmentRegisterResponse,
    dateGenerated: Date,
    mode: 'all' | 'vessel' = 'vessel',
    postedValue: number
): boolean {
    const postedStatus = postedValue === 1 ? "Posted" : "Unposted";

    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!data.success || !data.data || data.data.Vessels.length === 0 || !data.data.Vessels.some(v => v.Crew && v.Crew.length > 0)) {
        toast({
            title: "Error",
            description: 'Invalid or empty data for date.',
            variant: "destructive",
        });
        //console.error('Invalid or empty data for deduction register');
        return false;
    }

    try {
        // Extract vessel data
        const vesselData = data.data;
        // Extract period information from message
        const period = extractPeriod(data.message);
        const exchangeRate = vesselData.ExchangeRate

        // Create a new PDF document in landscape orientation with LEGAL size
        const doc = new jsPDF({
            orientation: "portrait",
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
            title: `Government Deduction Register - ${mode === 'vessel' ? vesselData.Vessels[0].VesselName : 'All Vessels'} - ${period.month} ${period.year} - ${postedStatus}`,
            subject: `Government Deduction Register for ${mode === 'vessel' ? vesselData.Vessels[0].VesselName : 'all vessels'} - ${period.month} ${period.year}`,
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
            mainTableWidth * 0.40, // Crew Name
            mainTableWidth * 0.15, // SSS
            mainTableWidth * 0.15, // HDMF
            mainTableWidth * 0.15, // PhilHealth
            mainTableWidth * 0.15, // Provident
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

        // --- Put this before you start rendering pages (near where you compute margins/rowHeight etc.) ---
        // Calculate usable rows per page (same logic you use later when checking page overflow)
        const headerHeight = 48; // derived from drawPageHeader: margins.top + 20 + 20 + 4 + 4 (as in your function)
        const usableBottom = pageHeight - margins.bottom - 20; // same constant used in overflow checks
        const rowsPerPage = Math.floor((usableBottom - (margins.top + headerHeight + tableHeaderHeight)) / rowHeight) || 1;

        // Precompute how many pages each vessel will need and the number of summary pages
        const vesselPages = vesselData.Vessels.map(v => {
            const crewCount = v.Crew?.length || 0;
            return Math.max(1, Math.ceil(crewCount / rowsPerPage)); // at least 1 page per vessel
        });

        const summaryPages = Math.max(1, Math.ceil(vesselData.Vessels.length / rowsPerPage));

        // Compute starting page number for each vessel (1-based page numbering)
        const vesselStartPage: number[] = [];
        let runningStart = summaryPages + 1; // summary occupies pages 1..summaryPages
        for (let i = 0; i < vesselPages.length; i++) {
            vesselStartPage.push(runningStart);
            runningStart += vesselPages[i];
        }

        // We'll collect link rectangles while drawing the summary so we can add link annotations later
        type LinkRect = { summaryPage: number; x: number; y: number; w: number; h: number; targetVesselIndex: number };
        const linkRects: LinkRect[] = [];
        let currentSummaryPage = 1;
        let isDrawingSummary = false;

        // Function to draw the header (company info, vessel info, etc.)
        const drawPageHeader = (vesselName: string, crewNumber?: number) => {
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
                "GOVERNMENT DEDUCTION REGISTER",
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
            doc.text(vesselName, margins.left + 2, vesselInfoY + 7.5);
            doc.line(margins.left, vesselInfoY + 10, pageWidth - margins.right, vesselInfoY + 10);

            doc.line(margins.left + companyColWidth + middleColWidth, 30, margins.left + companyColWidth + middleColWidth, 40);

            // Add exchange rate and date
            if (crewNumber) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(
                    `EXCHANGE RATE: 1 USD = ${exchangeRate} PHP`,
                    margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                    vesselInfoY + 6,
                    { align: 'right' }
                );

            }

            const leftPadding = 3; // adjust as needed
            const rightPadding = 5; // adjust as needed

            // Draw the posted/unposted status on the left
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(8);
            doc.text(
                postedStatus,
                margins.left + leftPadding, // left side
                vesselInfoY + 16.5 // row under vessel
            );

            // Draw the formatted date on the right
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text(
                format(dateGenerated, 'yyyy-MM-dd HH:mm aa'),
                pageWidth - margins.right - rightPadding, // move left from right margin
                vesselInfoY + 16.5, // same row
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
        const drawTableHeader = (isSummary: boolean = false) => {
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
            let headers = []
            if (isSummary) {
                headers = ["VESSEL NAME", "SSS", "HDMF", "PHILHEALTH", "PROVIDENT"];
            } else {
                headers = ["CREW NAME", "SSS", "HDMF", "PHILHEALTH", "PROVIDENT"];
            }
            headers.forEach((header, index) => {
                const colX = colPositions[index];
                const colWidth = colWidths[index];
                if (index === 0) {
                    doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' })
                }
                else {
                    doc.text(header, colX + colWidth - 5, currentY + tableHeaderHeight / 2 + 1, { align: 'right' })
                }
            });

            currentY += tableHeaderHeight;
        };

        if (mode === 'all') {
            // Compute totals per vessel
            const vesselTotals = vesselData.Vessels.map(vessel => {
                let totalSSS = 0;
                let totalHDMF = 0;
                let totalPhilhealth = 0;
                let totalProvident = 0;

                vessel.Crew.forEach(crew => {
                    const sssDeduction = crew.Deductions.find(d => d.Name.toLowerCase() === 'sss premium');
                    totalSSS += sssDeduction?.Amount || 0;

                    const hdmfDeduction = crew.Deductions.find(d => d.Name.toLowerCase().includes('pag-ibig'));
                    totalHDMF += hdmfDeduction?.Amount || 0;

                    const philhealthDeduction = crew.Deductions.find(d => d.Name.toLowerCase().includes('philhealth'));
                    totalPhilhealth += philhealthDeduction?.Amount || 0;

                    const providentDeduction = crew.Deductions.find(d => d.Name.toLowerCase().includes('provident'));
                    totalProvident += providentDeduction?.Amount || 0;
                });

                return {
                    VesselName: vessel.VesselName,
                    totalSSS,
                    totalHDMF,
                    totalPhilhealth,
                    totalProvident
                };
            });

            // Calculate grand totals
            let grandTotalSSS = 0;
            let grandTotalHDMF = 0;
            let grandTotalPhilhealth = 0;
            let grandTotalProvident = 0;

            // Calculate total crews across all vessels
            const totalCrews = vesselData.Vessels.reduce((acc, v) => acc + v.Crew.length, 0);

            // Draw header for summary page
            currentY = margins.top;
            isDrawingSummary = true;
            drawPageHeader('ALL VESSELS', totalCrews);
            drawTableHeader(true);

            currentSummaryPage = 1;

            vesselTotals.forEach((vt, index) => {
                // Calculate height needed for this vessel entry
                const vesselHeight = rowHeight;
                const totalEntryHeight = vesselHeight;

                // Check if we need a new page
                if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) { // Leave space for page number
                    doc.addPage();
                    currentY = margins.top;
                    currentSummaryPage += 1;
                    drawPageHeader('ALL VESSELS', totalCrews);
                    drawTableHeader(true);
                }

                // Set font for vessel data
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                // Draw horizontal line at the top of vessel row
                if (index > 0) {
                    doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
                }

                // Draw left and right borders only
                doc.line(margins.left, currentY, margins.left, currentY + rowHeight); // Left border
                doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight); // Right border

                // Draw vessel data
                doc.text(vt.VesselName, colPositions[0] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });


                // record link rectangle for this vessel pointing to the precomputed vessel page
                const linkX = colPositions[0]; // left edge of the first column
                const linkY = currentY; // top of row
                const linkW = colWidths[0];
                const linkH = rowHeight;

                // map vesselTotals index -> vesselStartPage (same order as vesselData)
                const targetPage = vesselStartPage[index] || (summaryPages + 1);

                linkRects.push({
                    summaryPage: currentSummaryPage,
                    x: linkX,
                    y: linkY,
                    w: linkW,
                    h: linkH,
                    targetVesselIndex: index
                });

                doc.text(vt.totalSSS.toFixed(2), colPositions[1] + colWidths[1] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.text(vt.totalHDMF.toFixed(2), colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.text(vt.totalPhilhealth.toFixed(2), colPositions[3] + colWidths[3] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.text(vt.totalProvident.toFixed(2), colPositions[4] + colWidths[4] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });

                // Accumulate grand totals
                grandTotalSSS += vt.totalSSS;
                grandTotalHDMF += vt.totalHDMF;
                grandTotalPhilhealth += vt.totalPhilhealth;
                grandTotalProvident += vt.totalProvident;

                // Draw bottom horizontal line for vessel row
                doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

                // Move to next row
                currentY += rowHeight;
            });

            // Add grand total row
            const totalHeight = rowHeight;
            if (currentY + totalHeight > pageHeight - margins.bottom - 20) {
                doc.addPage();
                currentY = margins.top;
                drawPageHeader('ALL VESSELS', totalCrews);
                drawTableHeader(true);
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');

            // Draw left and right borders for grand total row
            doc.line(margins.left, currentY, margins.left, currentY + rowHeight);
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight);

            // Draw grand total data
            doc.text("GRAND TOTAL", colPositions[0] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
            doc.text(grandTotalSSS.toFixed(2), colPositions[1] + colWidths[1] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            doc.text(grandTotalHDMF.toFixed(2), colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            doc.text(grandTotalPhilhealth.toFixed(2), colPositions[3] + colWidths[3] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            doc.text(grandTotalProvident.toFixed(2), colPositions[4] + colWidths[4] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });

            // Draw bottom horizontal line for grand total row
            doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            // Move to next row (though not needed)
            currentY += rowHeight;
            isDrawingSummary = false;
        }

        if (mode === 'all') {
            doc.addPage();
        }

        const vesselStartPages: number[] = [];


        // Process each vessel, starting each on a new page with full header
        vesselData.Vessels.forEach((vessel, vesselIndex) => {
            // For the first vessel, no addPage; for subsequent, add a new page
            if (vesselIndex > 0) {
                doc.addPage();
            }

            if (mode === 'all' && vesselIndex === 0) {
                // if you added a page after summary, doc is already on that new page; that's fine
            }

            const currentPageNumber = doc.getNumberOfPages();
            const vesselStartPageNumber = currentPageNumber; // 1-based page count
            vesselStartPages.push(vesselStartPageNumber);

            currentY = margins.top;
            drawPageHeader(mode === 'vessel' ? vesselData.Vessels[0].VesselName : vessel.VesselName, vessel.Crew.length);
            drawTableHeader();

            let totalSSS = 0;
            let totalHDMF = 0;
            let totalPhilhealth = 0;
            let totalProvident = 0;

            vessel.Crew.forEach((crew, crewIndex) => {
                // Calculate height needed for this crew entry
                const crewHeight = rowHeight;
                const totalEntryHeight = crewHeight;

                // Check if we need a new page
                if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) { // Leave space for page number
                    doc.addPage();
                    currentY = margins.top;
                    drawPageHeader(mode === 'vessel' ? vesselData.Vessels[0].VesselName : vessel.VesselName, vessel.Crew.length);
                    drawTableHeader();
                }

                // Set font for crew data
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                // Draw horizontal line at the top of crew row
                if (crewIndex > 0 || vesselIndex > 0) {
                    doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
                }

                // Draw left and right borders only
                doc.line(margins.left, currentY, margins.left, currentY + rowHeight); // Left border
                doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight); // Right border

                // Draw crew data
                const columnKeys: string[] = [
                    "CrewName",
                    "SSS",
                    "HDMF",
                    "Philhealth",
                    "Provident"
                ];

                columnKeys.forEach((key, i) => {
                    if (i === 0) {
                        // Crew Name
                        const crewName = `${crew.CrewName}`;
                        doc.text(crewName, colPositions[i] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
                    }
                    else {
                        if (key === "SSS") {
                            const deduction = crew.Deductions.find(d => d.Name.toLowerCase() === 'sss premium');
                            totalSSS += deduction?.Amount || 0;
                            doc.text((deduction?.Amount.toString() || "0"), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                        }
                        else if (key === "HDMF") {
                            const deduction = crew.Deductions.find(d => d.Name.toLowerCase().includes('pag-ibig'));
                            totalHDMF += deduction?.Amount || 0;
                            doc.text((deduction?.Amount.toString() || "0"), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                        }
                        else if (key === "Philhealth") {
                            const deduction = crew.Deductions.find(d => d.Name.toLowerCase().includes('philhealth'));
                            totalPhilhealth += deduction?.Amount || 0;
                            doc.text((deduction?.Amount.toString() || "0"), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                        }
                        else if (key === "Provident") {
                            const deduction = crew.Deductions.find(d => d.Name.toLowerCase().includes('provident'));
                            totalProvident += deduction?.Amount || 0;
                            doc.text((deduction?.Amount.toString() || "0"), colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                        }
                    }
                });

                // Draw bottom horizontal line for total row
                doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

                // Move to next row
                currentY += rowHeight;
            });

            const totalHeight = rowHeight;
            if (currentY + totalHeight > pageHeight - margins.bottom - 20) {
                doc.addPage();
                currentY = margins.top;
                drawPageHeader(mode === 'vessel' ? vesselData.Vessels[0].VesselName : vessel.VesselName, vessel.Crew.length);
                drawTableHeader();
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');

            // Draw left and right borders for total row
            doc.line(margins.left, currentY, margins.left, currentY + rowHeight);
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight);

            // Draw total data
            doc.text("TOTAL", colPositions[0] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
            doc.text(totalSSS.toFixed(2).toString(), colPositions[1] + colWidths[1] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            doc.text(totalHDMF.toFixed(2).toString(), colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            doc.text(totalPhilhealth.toFixed(2).toString(), colPositions[3] + colWidths[3] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            doc.text(totalProvident.toFixed(2).toString(), colPositions[4] + colWidths[4] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });

            // Draw bottom horizontal line for total row
            doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            // Move to next row
            currentY += rowHeight;
        });

        // NOW ADD PAGE NUMBERS TO ALL PAGES
        const totalPages = doc.internal.pages.length - 1;
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

        // AFTER all pages are added (i.e., at the end, before adding page numbers or saving)
        linkRects.forEach(l => {
            // set page to the summary page where the rectangle lives
            doc.setPage(l.summaryPage);
            // add an internal link annotation that jumps to targetPage
            // jsPDF accepts { pageNumber: <1-based page index> } for internal links
            const targetPage = vesselStartPages[l.targetVesselIndex] || 1;
            doc.link(l.x, l.y, l.w, l.h, { pageNumber: targetPage });
        });

        // Save the PDF
        const fileName = mode === 'vessel' ?
            `GovDeductionRegister_${capitalizeFirstLetter(vesselData.Vessels[0].VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.pdf` :
            `GovDeductionRegister_ALL_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.pdf`;
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error("Error generating Gov Deduction Register:", error);
        return false;
    }
}

// Function to generate the PDF with real data
export function generateDeductionRegisterV3(data: AllotmentRegisterResponse, dateGenerated: Date, mode: 'all' | 'vessel' = 'vessel', postedValue: number): boolean {
    return generateDeductionRegisterV3PDF(
        data,
        dateGenerated,
        mode,
        postedValue
    );
}

// Default export for easy importing
export default generateDeductionRegisterV3;