"use client";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, getMonthName } from "@/lib/utils";
import { OnboardCrewReportResponse } from "@/src/services/vessel/vessel.api";
import { format } from "date-fns";
import { toast } from "../ui/use-toast";

interface Crew {
    FirstName: string,
    MiddleName: string | null,
    LastName: string,
    SeamansBook: string | null,
    Birthday: Date,
    JoinDate: Date,
    Rank: string,
    RSequence: number
}

interface VesselData {
    VesselID: number;
    VesselName: string;
    Crew: Crew[];
}

export interface OnboardCrewReportData {
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

export function generateOnboardCrewReportPDF(
    data: OnboardCrewReportResponse,
    dateGenerated: Date,
    mode: 'all' | 'vessel' = 'vessel'
): boolean {
    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!data.success || !data.data || data.data.length === 0 || !data.data.some(v => v.Crew && v.Crew.length > 0)) {
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
            title: `On-Board Crew List - ${mode === 'vessel' ? vesselData[0].VesselName: 'All Vessels'} - ${period.month} ${period.year}`,
            subject: `On-Board Crew List for ${mode === 'vessel' ? vesselData[0].VesselName: 'all vessels'} - ${period.month} ${period.year}`,
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
            mainTableWidth * 0.05, // No.
            mainTableWidth * 0.15, // Rank
            mainTableWidth * 0.45, // Crew Name
            mainTableWidth * 0.175, // Join Date
            mainTableWidth * 0.175, // Birthday
            //mainTableWidth * 0.15, // Seamans Book
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
                "ON-BOARD CREW LIST",
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
            if(crewNumber){
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(
                    `${crewNumber} CREW ON-BOARD`,
                    margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                    vesselInfoY + 6,
                    { align: 'right' }
                );

            }

            doc.setFont('helvetica', 'italic');
            doc.text(
                format(dateGenerated, 'yyyy-MM-dd hh:mm aa'),
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
            const headers = ["", "RANK", "CREW NAME", "JOINED DATE", "BIRTHDAY"];
            headers.forEach((header, index) => {
                const colX = colPositions[index];
                const colWidth = colWidths[index];
                doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' })
            });

            currentY += tableHeaderHeight;
        };

        // Process each vessel, starting each on a new page with full header
        vesselData.forEach((vessel, vesselIndex) => {
            // For the first vessel, no addPage; for subsequent, add a new page
            if (vesselIndex > 0) {
                doc.addPage();
            }
            currentY = margins.top;
            drawPageHeader(mode === 'vessel' ? vesselData[0].VesselName : vessel.VesselName, vessel.Crew.length);
            drawTableHeader();

            vessel.Crew.forEach((crew, crewIndex) => {
                // Calculate height needed for this crew entry
                const crewHeight = rowHeight;
                const totalEntryHeight = crewHeight;
    
                // Check if we need a new page
                if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) { // Leave space for page number
                    doc.addPage();
                    currentY = margins.top;
                    drawPageHeader(mode === 'vessel' ? vesselData[0].VesselName : vessel.VesselName, vessel.Crew.length);
                    drawTableHeader();
                }
    
                // Set font for crew data
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
    
                // Draw horizontal line at the top of crew row
                // if (crewIndex > 0 || vesselIndex > 0) {
                //     //doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
                // }
    
                // Draw left and right borders only
                doc.line(margins.left, currentY, margins.left, currentY + rowHeight); // Left border
                doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight); // Right border
    
                // Draw crew data
                const columnKeys: string[] = [
                    "No.",
                    "Rank",
                    "CrewName",
                    "JoinDate",
                    "Birthday",
                    
                ];
    
                columnKeys.forEach((key, i) => {
                    if(i === 2) {
                        // Crew Name
                        const crewName = `${crew.LastName.toUpperCase()}, ${crew.FirstName.toUpperCase()} ${crew.MiddleName ? crew.MiddleName + ' ' : ''}`;
                        doc.text(crewName, colPositions[2] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                    }
                    else if (i === 0) {
                        // No.
                        doc.text((crewIndex + 1).toString(), colPositions[0] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                    }
                    else {
                        let value = '-'
                        if(crew[key as keyof Crew]) {
                            if (key === "Birthday" || key === "JoinDate") {
                                value = format(crew[key as keyof Crew] as Date, 'yyyy-MM-dd');
                            }
                            else {
                                value = crew[key as keyof Crew] as string;
                            }
                        }
                        doc.text(value, colPositions[i] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                    }
                });
    
                // Draw horizontal line at the bottom of crew row
                doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);
    
                // Move to next row
                currentY += rowHeight;
            });
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

        // Save the PDF
        const fileName = mode === 'vessel' ?
        `OnBoardCrewList_${capitalizeFirstLetter(vesselData[0].VesselName.replace(' ', '-'))}_${capitalizeFirstLetter(period.month)}-${period.year}.pdf` : 
        `OnBoardCrewList_ALL_${capitalizeFirstLetter(period.month)}-${period.year}.pdf`;
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error("Error generating On Board Crew List:", error);
        return false;
    }
}

// Function to generate the PDF with real data
export function generateOnboardCrewReport(data: OnboardCrewReportResponse, dateGenerated: Date, mode: 'all' | 'vessel' = 'vessel'): boolean {
    return generateOnboardCrewReportPDF(
        data,
        dateGenerated,
        mode
    );
}

// Default export for easy importing
export default generateOnboardCrewReport;