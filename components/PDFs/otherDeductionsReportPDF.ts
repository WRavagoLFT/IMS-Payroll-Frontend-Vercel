"use client";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { addFont } from "./lib/font";
import { logoBase64Image } from "./lib/base64items";
import { capitalizeFirstLetter, formatCurrency, getMonthName } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "../ui/use-toast";
import { otherDeductionsCrew, otherDeductionsData } from "@/src/services/deduction/crewDeduction.api";

export interface OtherDeductionsResponse {
    success: boolean;
    message: string;
    data: otherDeductionsData;
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

function calculateTotals(crew: otherDeductionsCrew[]): { cashAdvTotal: number, deductionTotal: number } {
    let cashAdvTotal = 0;
    let deductionTotal = 0;

    crew.forEach(crewMember => {
        let amount = 0;
        if (crewMember.Currency === 2) {
            amount = crewMember.OriginalAmount;
        } else {
            amount = crewMember.DeductionAmount / crewMember.ExchangeRate;
        }

        if (crewMember.DeductionName.toLowerCase().includes("cash advance")) {
            cashAdvTotal += amount;
        } else {
            deductionTotal += amount;
        }
    });

    return { cashAdvTotal, deductionTotal };
}

// NEW FUNCTION: Calculate sub-totals for a specific vessel
function calculateVesselSubtotals(crew: otherDeductionsCrew[], vesselName: string): { cashAdvTotal: number, deductionTotal: number } {
    let cashAdvTotal = 0;
    let deductionTotal = 0;

    crew
        .filter(crewMember => crewMember.VesselName === vesselName)
        .forEach(crewMember => {
            let amount = 0;
            if (crewMember.Currency === 2) {
                amount = crewMember.OriginalAmount;
            } else {
                amount = crewMember.DeductionAmount / crewMember.ExchangeRate;
            }

            if (crewMember.DeductionName.toLowerCase().includes("cash advance")) {
                cashAdvTotal += amount;
            } else {
                deductionTotal += amount;
            }
        });

    return { cashAdvTotal, deductionTotal };
}


export function generateOtherDeductionsReportPDF(
    data: OtherDeductionsResponse,
    dateGenerated: Date,
    mode: 'all' | 'vessel' = 'vessel',
    postedValue: number
): boolean {
    const postedStatus = postedValue === 1 ? "Posted" : "Unposted";

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
            title: `Crew Deductions Report - ${period.month}/${period.year} - ${postedStatus}`,
            subject: `Crew Deductions Report - ${period.month}/${period.year}`,
            author: 'IMS Philippines Maritime Corp.',
            creator: 'jsPDF'
        });

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = { left: 10, right: 10, top: 10, bottom: 10 };

        let currentY = margins.top;

        const mainTableWidth = pageWidth - margins.left - margins.right;

        const colWidths = [
            mainTableWidth * 0.20,
            mainTableWidth * 0.25,
            mainTableWidth * 0.05,
            mainTableWidth * 0.15,
            mainTableWidth * 0.15,
            mainTableWidth * 0.05,
            mainTableWidth * 0.25,
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
        const drawVesselSubtotalRow = (vesselName: string) => {
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
            doc.text(`SUB-TOTAL (${vesselName})`, colPositions[0] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });

            // Draw Cash Advance Sub-total
            if (subtotals.cashAdvTotal > 0) {
                doc.setFont('NotoSans', 'bold');
                doc.text(`$${formatCurrency(subtotals.cashAdvTotal)}`, colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.setFont('helvetica', 'bold');
            }

            // Draw Deduction Sub-total
            if (subtotals.deductionTotal > 0) {
                doc.setFont('NotoSans', 'bold');
                doc.text(`$${formatCurrency(subtotals.deductionTotal)}`, colPositions[5] + colWidths[5] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.setFont('helvetica', 'bold');
            }

            doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            currentY += rowHeight;
            //currentY += 2; // Add spacing after sub-total
        };

        const drawTotalsRow = () => {
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
                doc.text(`$${formatCurrency(totals.cashAdvTotal)}`, colPositions[2] + colWidths[2] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.setFont('helvetica', 'bold');
            }

            if (totals.deductionTotal > 0) {
                doc.setFont('NotoSans', 'bold');
                doc.text(`$${formatCurrency(totals.deductionTotal)}`, colPositions[5] + colWidths[5] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                doc.setFont('helvetica', 'bold');
            }

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
                "CREW DEDUCTIONS REPORT",
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

            // --- NEW: Posted/Unposted and Date justified ---
            const leftPadding = 3; // space from left margin
            const rightPadding = 5; // space from right margin

            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(8);
            doc.text(
                postedStatus, // your posted/unposted value
                margins.left + leftPadding,
                vesselInfoY + 16.5
            );

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text(
                format(dateGenerated, 'yyyy-MM-dd HH:mm aa'),
                pageWidth - margins.right - rightPadding,
                vesselInfoY + 16.5,
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

            const headers = ["Vessel Name", "Crew Name", "Cash Adv. Amount", "Cash Adv. Remarks", "Deduction Name", "Deduction Amount", "Deduction Remarks"];
            headers.forEach((header, index) => {
                const colX = colPositions[index];
                const colWidth = colWidths[index];
                if (header.includes("Amount")) {
                    doc.text(header, colX + colWidth - 5, currentY + tableHeaderHeight / 2 + 1, { align: 'right' })
                }
                else {
                    doc.text(header, colX + 5, currentY + tableHeaderHeight / 2 + 1, { align: 'left' })
                }
            });

            currentY += tableHeaderHeight;
        };

        currentY = margins.top;
        drawPageHeader(data.data.VesselName);
        drawTableHeader();

        // Track current vessel for sub-totals
        let currentVessel = sortedCrew[0]?.VesselName || '';

        sortedCrew.forEach((crew, crewIndex) => {
            // Check if vessel changed - if so, draw sub-total for previous vessel
            if (crew.VesselName !== currentVessel && currentVessel) {
                drawVesselSubtotalRow(currentVessel);
                currentVessel = crew.VesselName;
            }

            const crewHeight = rowHeight;
            const totalEntryHeight = crewHeight;

            if (currentY + totalEntryHeight > pageHeight - margins.bottom - 20) {
                doc.addPage();
                currentY = margins.top;
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
                "DeductionAmount",
                "DeductionName",
                "DeductionRemarks",
            ];

            columnKeys.forEach((key, i) => {
                if (i === 1) {
                    const crewName = `${crew.LastName}, ${crew.FirstName} ${crew.MiddleName ? crew.MiddleName[0] + '.' : ''}`;
                    doc.text(crewName, colPositions[i] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
                }
                else if (i === 2) {
                    let value = 0
                    if (crew.Currency === 2) {
                        value = crew.OriginalAmount
                    }
                    else {
                        value = (crew.DeductionAmount / crew.ExchangeRate)
                    }

                    let positionIdx = 0
                    if (crew.DeductionName.toLowerCase().includes("cash advance")) {
                        positionIdx = 2
                    }
                    else {
                        positionIdx = 5
                    }

                    doc.setFont('NotoSans', 'normal');
                    doc.text(`$${formatCurrency(value)}`, colPositions[positionIdx] + colWidths[i] - 5, currentY + rowHeight / 2 + 1, { align: 'right' });
                    doc.setFont('helvetica', 'normal');
                }
                else if (i == 3) {
                    let positionIdx = 0
                    if (!crew.DeductionName.toLowerCase().includes("cash advance")) {
                        positionIdx = 4
                        doc.text(crew[key as keyof otherDeductionsCrew]?.toString() || '', colPositions[positionIdx] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
                    }
                }
                else if (i == 4) {
                    let positionIdx = 0
                    if (crew.DeductionName.toLowerCase().includes("cash advance")) {
                        positionIdx = 3
                    }
                    else {
                        positionIdx = 6
                    }
                    doc.text(crew[key as keyof otherDeductionsCrew]?.toString() || '', colPositions[positionIdx] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
                }
                else {
                    doc.text(crew[key as keyof otherDeductionsCrew]?.toString() || '', colPositions[i] + 5, currentY + rowHeight / 2 + 1, { align: 'left' });
                }
            });

            //doc.line(margins.left, currentY + rowHeight, pageWidth - margins.right, currentY + rowHeight);

            currentY += rowHeight;

            // If this is the last crew member, draw sub-total for their vessel
            if (crewIndex === sortedCrew.length - 1) {
                drawVesselSubtotalRow(crew.VesselName);
            }
        });

        drawTotalsRow();

        const totalPages = doc.internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);

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

        const fileName = mode === 'vessel' ?
            `CrewDeductions_${capitalizeFirstLetter(data.data.VesselName?.replace(' ', '-') || "")}_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.pdf` :
            `CrewDeductions_ALL_${capitalizeFirstLetter(period.month)}-${period.year} - ${postedStatus}.pdf`;
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error("Error generating Crew Deductions List:", error);
        return false;
    }
}

export function generateOtherDeductionsReport(data: OtherDeductionsResponse, dateGenerated: Date, mode: 'all' | 'vessel' = 'vessel', postedValue: number): boolean {
    return generateOtherDeductionsReportPDF(
        data,
        dateGenerated,
        mode,
        postedValue
    );
}

export default generateOtherDeductionsReport;