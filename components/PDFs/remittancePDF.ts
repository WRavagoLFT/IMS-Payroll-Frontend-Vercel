"use client";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, formatCurrency, getMonthName } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "../ui/use-toast";
import { crewRemittanceRegisterCrew, crewRemittanceRegisterData } from "@/src/services/remittance/crewRemittance.api";

export interface CrewRemittanceRegisterResponse {
    success: boolean;
    message: string;
    data: crewRemittanceRegisterData;
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
        month: "FEBRUARY",
        year: 2025
    };
}

function calculateTotals(crew: crewRemittanceRegisterCrew[]): { cashAdvTotal: number, deductionTotal: number } {
    let cashAdvTotal = 0;
    let deductionTotal = 0;

    crew.forEach(crewMember => {
        let amount = 0;
        // if (crewMember.Currency === 2) {
        //     amount = crewMember.OriginalAmount;
        // } else {
        //     amount = crewMember.DeductionAmount / crewMember.ExchangeRate;
        // }
        amount = crewMember.Amount
        cashAdvTotal += amount;
        deductionTotal += amount;

        // if (crewMember.DeductionName.toLowerCase().includes("cash advance")) {
        //     cashAdvTotal += amount;
        // } else {
        //     deductionTotal += amount;
        // }
    });

    return { cashAdvTotal, deductionTotal };
}

// NEW FUNCTION: Calculate sub-totals for a specific vessel
function calculateVesselSubtotals(crew: crewRemittanceRegisterCrew[], vesselName: string): { cashAdvTotal: number, deductionTotal: number } {
    let cashAdvTotal = 0;
    let deductionTotal = 0;

    crew
        .filter(crewMember => crewMember.VesselName === vesselName)
        .forEach(crewMember => {
            let amount = 0;
            // if (crewMember.Currency === 2) {
            //     amount = crewMember.OriginalAmount;
            // } else {
            //     amount = crewMember.DeductionAmount / crewMember.ExchangeRate;
            // }
            amount = crewMember.Amount
            cashAdvTotal += amount;
            deductionTotal += amount;

            // if (crewMember.DeductionName.toLowerCase().includes("cash advance")) {
            //     cashAdvTotal += amount;
            // } else {
            //     deductionTotal += amount;
            // }
        });

    return { cashAdvTotal, deductionTotal };
}


export function generateCrewRemittanceReportPDF(
    data: CrewRemittanceRegisterResponse,
    dateGenerated: Date,
    mode: 'all' | 'vessel' = 'vessel'
): boolean {
    if (typeof window === 'undefined') {
        console.warn('PDF generation attempted during server-side rendering');
        return false;
    }

    if (!data.success || !data.data || data.data.Crew.length === 0) {
        toast({
          title: "Error",
          description: 'Invalid or empty data for date.',
          variant: "destructive",
        });
        return false;
    }

    try {
        const vesselData = data.data;
        const period = extractPeriod(data.message);

        // Sort crew data by vessel name, then by crew last name
        const sortedCrew = [...data.data.Crew].sort((a, b) => {
            const vesselCompare = a.VesselName.localeCompare(b.VesselName);
            if (vesselCompare !== 0) return vesselCompare;
            return a.LastName.localeCompare(b.LastName);
        });

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "legal"
        });

        try {
            addFont(doc);
            doc.setFont('NotoSans', 'normal');
        } catch (error) {
            console.warn("Could not load custom font, using default", error);
            doc.setFont('helvetica', 'normal');
        }

        doc.setProperties({
            title: `Crew Remittances Report - ${period.month}/${period.year}`,
            subject: `Crew Remittances Report - ${period.month}/${period.year}`,
            author: 'IMS Philippines Maritime Corp.',
            creator: 'jsPDF'
        });

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = { left: 10, right: 10, top: 10, bottom: 10 };

        let currentY = margins.top;

        const mainTableWidth = pageWidth - margins.left - margins.right;

        const colWidths = [
            mainTableWidth * 0.25, // Vessel Name
            mainTableWidth * 0.25, // Crew Name
            mainTableWidth * 0.25,  // Remittance Amount
            mainTableWidth * 0.25,  // Remarks
        ];

        const colPositions: number[] = [];
        let runningPosition = margins.left;
        colWidths.forEach(width => {
            colPositions.push(runningPosition);
            runningPosition += width;
        });
        colPositions.push(runningPosition);

        const rowHeight = 8;
        const tableHeaderHeight = 8;

        // NEW FUNCTION: Draw vessel sub-total row
        const drawVesselSubtotalRow = (vesselName?: string) => {
            if(!vesselName) return;
            const subtotals = calculateVesselSubtotals(data.data.Crew, vesselName);
            
            if (currentY + rowHeight * 2 > pageHeight - margins.bottom - 20) {
                doc.addPage();
                currentY = margins.top;
                drawPageHeader();
                drawTableHeader();
            }

            //currentY += 1;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');

            // Draw borders with light gray background
            doc.setFillColor(240, 240, 240);
            doc.rect(margins.left, currentY, pageWidth - margins.right - margins.left, rowHeight, 'F');
            
            doc.line(margins.left, currentY, margins.left, currentY + rowHeight);
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight);
            doc.line(margins.left, currentY, pageWidth - margins.right, currentY);

            // Draw "SUB-TOTAL" label
            console.log('drawing subtotal for', vesselName, subtotals)
            doc.text(`SUB-TOTAL (${vesselName})`, colPositions[0] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });

            // Draw Cash Advance Sub-total
            if (subtotals.cashAdvTotal > 0) {
                console.log("drawing cash advance subtotal", subtotals.cashAdvTotal)
                doc.setFont('NotoSans', 'bold');
                doc.text(`$${formatCurrency(subtotals.cashAdvTotal)}`, colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.setFont('helvetica', 'bold');
            }

            // // Draw Deduction Sub-total
            // if (subtotals.deductionTotal > 0) {
            //     console.log("drawing deduction subtotal", formatCurrency(subtotals.deductionTotal))
            //     doc.setFont('NotoSans', 'bold');
            //     doc.text(`$${formatCurrency(subtotals.deductionTotal)}`, colPositions[5] + colWidths[5] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            //     doc.setFont('helvetica', 'bold');
            // }

            doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            currentY += rowHeight;
            //currentY += 2; // Add spacing after sub-total
        };

        const drawTotalsRow = () => {
            //console.log("drawing totals")
            const totals = calculateTotals(data.data.Crew);
            
            if (currentY + rowHeight * 2 > pageHeight - margins.bottom - 20) {
                doc.addPage();
                currentY = margins.top;
                drawPageHeader();
                drawTableHeader();
            }

            currentY += 2;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');

            doc.line(margins.left, currentY, margins.left, currentY + rowHeight);
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight);
            doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
            
            doc.text("TOTALS", colPositions[0] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });

            if (totals.cashAdvTotal > 0) {
                doc.setFont('NotoSans', 'bold');
                //console.log("drawing cash advance total", totals.cashAdvTotal)
                doc.text(`$${formatCurrency(totals.cashAdvTotal)}`, colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.setFont('helvetica', 'bold');
            }

            // if (totals.deductionTotal > 0) {
            //     doc.setFont('NotoSans', 'bold');                
            //     console.log("drawing deduction total", totals.deductionTotal)
            //     doc.text(`$${formatCurrency(totals.deductionTotal)}`, colPositions[5] + colWidths[5] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
            //     doc.setFont('helvetica', 'bold');
            // }

            doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            currentY += rowHeight;
        };

        const drawPageHeader = (vesselName?: string) => {
            const headerWidth = pageWidth - margins.left - margins.right;
            const companyColWidth = 90;
            const middleColWidth = headerWidth - companyColWidth - 100;
            const rightColWidth = 100;

            doc.setLineWidth(0.1);
            doc.setDrawColor(0);

            doc.rect(margins.left, currentY, pageWidth - margins.right - 10, 40);
            
            doc.addImage(logoBase64Image, 'PNG', margins.left, currentY, 20, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("IMS PHILIPPINES", margins.left + 25, currentY + 9);
            doc.text("MARITIME CORP.", margins.left + 25, currentY + 14);

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
                "CREW REMITTANCES REPORT",
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                currentY + 16,
                { align: 'right' }
            );

            currentY += 20;

            const vesselInfoY = currentY;
            doc.line(margins.left, vesselInfoY, pageWidth - margins.right, vesselInfoY);
            doc.setFontSize(8);
            
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            doc.text("VESSEL", margins.left + 2, vesselInfoY + 4.5);
            doc.setTextColor(0);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(vesselName || 'ALL VESSELS', margins.left + 2, vesselInfoY + 7.5);
            doc.line(margins.left, vesselInfoY + 10, pageWidth - margins.right, vesselInfoY + 10);

            doc.line(margins.left + companyColWidth + middleColWidth, 30, margins.left + companyColWidth + middleColWidth, 40);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `EXCHANGE RATE: 1 USD = ${formatCurrency(data.data.ExchangeRate)} PHP`,
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                vesselInfoY + 6,
                { align: 'right' }
            );

            doc.setFont('helvetica', 'italic');
            doc.text(
                format(dateGenerated, 'yyyy-MM-dd HH:mm aa'),
                margins.left + companyColWidth + middleColWidth + rightColWidth - 5,
                vesselInfoY + 16,
                { align: 'right' }
            );

            currentY += 20;

            const separatorY = currentY + 4;
            doc.setDrawColor(180);
            doc.setLineWidth(1);
            doc.line(margins.left, separatorY, pageWidth - margins.right, separatorY);
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            currentY = separatorY + 4;
        };

        const drawTableHeader = () => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            
            doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
            doc.line(margins.left, currentY + tableHeaderHeight, pageWidth - margins.right, currentY + tableHeaderHeight);

            doc.line(margins.left, currentY, margins.left, currentY + tableHeaderHeight);
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + tableHeaderHeight);

            const headers = ["Vessel Name", "Crew Name", "Remittance Amount", "Remarks"];
            headers.forEach((header, index) => {
                const colX = colPositions[index];
                const colWidth = colWidths[index];
                if(header.includes("Amount")) {
                    doc.text(header, colX + colWidth - 5, currentY + tableHeaderHeight / 2 + 1, { align: 'right' })
                }
                else {
                    doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' })
                }
            });

            currentY += tableHeaderHeight;
        };

        currentY = margins.top;
        drawPageHeader(data.data.VesselName || undefined);
        drawTableHeader();

        // Track current vessel for sub-totals
        let currentVessel = sortedCrew[0]?.VesselName || '';

        sortedCrew.forEach((crew, crewIndex) => {
            //console.log("current", crew)
            // Check if vessel changed - if so, draw sub-total for previous vessel
            if (crew.VesselName !== currentVessel && currentVessel) {
                //console.log("previous vessel", crew)
                drawVesselSubtotalRow(currentVessel);
                currentVessel = crew.VesselName;
            }

            const crewHeight = rowHeight;
            const totalEntryHeight = crewHeight;

            if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) {
                doc.addPage();
                currentY = margins.top;
                //console.log("new page", crew)
                drawPageHeader();
                drawTableHeader();
            }

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');

            // Draw top border for this row
            //doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
            // Draw left and right borders
            doc.line(margins.left, currentY, margins.left, currentY + rowHeight);
            doc.line(pageWidth - margins.right, currentY, pageWidth - margins.right, currentY + rowHeight);

            const columnKeys: string[] = [
                "VesselName",
                "CrewName",
                "Amount",
                "Remarks",
            ];

            //console.log("rendering row", crew)

            columnKeys.forEach((key, i) => {
                if(i === 1) {
                    //console.log(" Crew Name")

                    const crewName = `${crew.LastName}, ${crew.FirstName} ${crew.MiddleName ? crew.MiddleName[0] + '.' : ''}`;
                    //console.log(crewName)
                    doc.text(crewName, colPositions[i] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                }
                else if (i === 2) {
                    //console.log(" Amount ")
                    let value = crew.Amount

                    doc.setFont('NotoSans', 'normal');
                    //console.log(`$${formatCurrency(value)}`)
                    doc.text(`$${formatCurrency(value)}`, colPositions[i] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, {align: 'right'});
                    doc.setFont('helvetica', 'normal');
                }
                else {
                    //console.log(" others ")
                    //console.log(crew[key as keyof crewRemittanceRegisterCrew])
                    doc.text(crew[key as keyof crewRemittanceRegisterCrew]?.toString() || '', colPositions[i] + 5, currentY + rowHeight / 2 + 1, {align: 'left'});
                }
            });

            //doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            currentY += rowHeight;

            // If this is the last crew member, draw sub-total for their vessel
            if (crewIndex === sortedCrew.length - 1) {
                //console.log("last vessel", crew)
                drawVesselSubtotalRow(crew.VesselName);
                //console.log("drew last vessel subtotal success")
            }
        });

        //console.log("drawing totals")
        drawTotalsRow();

        const totalPages = doc.internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            doc.rect(margins.left, pageHeight - margins.bottom - 10, mainTableWidth, 10);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            //console.log(`Page ${i} out of ${totalPages}`)
            //console.log('drawing page number')
            doc.text(
                `Page ${i} out of ${totalPages}`, 
                pageWidth - margins.right - 5, 
                pageHeight - margins.bottom - 4, 
                { align: 'right' }
            );
        }

        const fileName = mode === 'vessel' ?
        `CrewDeductions_${capitalizeFirstLetter(data.data.VesselName?.replace(' ', '-') || "")}_${capitalizeFirstLetter(period.month)}-${period.year}.pdf` : 
        `CrewDeductions_ALL_${capitalizeFirstLetter(period.month)}-${period.year}.pdf`;
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error("Error generating Crew Remittances List:", error);
        return false;
    }
}

export function generateCrewRemittanceReport(data: CrewRemittanceRegisterResponse, dateGenerated: Date, mode: 'all' | 'vessel' = 'vessel'): boolean {
    return generateCrewRemittanceReportPDF(
        data,
        dateGenerated,
        mode
    );
}
 
export default generateCrewRemittanceReport;