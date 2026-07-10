import jsPDF from 'jspdf';
import type { Bill } from '../types';

export const generateBillPDF = (bill: Bill, companyName: string, companyAddress: string, companyPhone: string, vatRate: number) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyName.toUpperCase(), 15, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyAddress, 15, yPosition);
  yPosition += 5;
  pdf.text(`Phone: ${companyPhone}`, 15, yPosition);
  yPosition += 10;

  // Bill Number and Date
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Bill No: ${bill.billNumber}`, 15, yPosition);
  pdf.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, pageWidth - 60, yPosition);
  yPosition += 10;

  // Separator
  pdf.setDrawColor(200);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 5;

  // Bill To
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILLED TO:', 15, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(bill.customer.name, 15, yPosition);
  yPosition += 4;
  pdf.setFontSize(9);
  pdf.text(bill.customer.phone, 15, yPosition);
  yPosition += 4;
  pdf.text(bill.customer.address, 15, yPosition);
  yPosition += 8;

  // Table Header
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPosition - 2, pageWidth - 30, 6, 'F');
  pdf.text('Description', 15, yPosition + 2);
  pdf.text('Qty', 100, yPosition + 2);
  pdf.text('Rate', 130, yPosition + 2);
  pdf.text('Amount', pageWidth - 30, yPosition + 2, { align: 'right' } as any);
  yPosition += 8;

  // Table Body
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  bill.items.forEach((item) => {
    const amount = item.quantity * item.unitPrice;
    pdf.text(item.name, 15, yPosition);
    pdf.text(item.quantity.toString(), 100, yPosition);
    pdf.text(`NPR ${item.unitPrice}`, 130, yPosition);
    pdf.text(`NPR ${amount.toLocaleString()}`, pageWidth - 30, yPosition, { align: 'right' } as any);
    yPosition += 5;
  });

  yPosition += 5;

  // Separator
  pdf.setDrawColor(200);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 5;

  // Totals
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Subtotal:', 100, yPosition);
  pdf.text(`NPR ${bill.subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, pageWidth - 30, yPosition, { align: 'right' } as any);
  yPosition += 6;

  pdf.text(`VAT (${vatRate}%):`, 100, yPosition);
  pdf.text(`NPR ${bill.vat.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, pageWidth - 30, yPosition, { align: 'right' } as any);
  yPosition += 6;

  // Grand Total
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setFillColor(59, 130, 246); // Blue
  pdf.rect(100, yPosition - 3, pageWidth - 130, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL:', 100, yPosition + 2);
  pdf.text(`NPR ${bill.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, pageWidth - 30, yPosition + 2, { align: 'right' } as any);
  pdf.setTextColor(0, 0, 0);
  yPosition += 12;

  // Status
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  const statusText = `Status: ${bill.status}`;
  const statusColor: [number, number, number] = bill.status === 'Paid' ? [16, 185, 129] : [249, 115, 22];
  pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.text(statusText, 15, yPosition);
  pdf.setTextColor(0, 0, 0);

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' } as any);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, yPosition + 5, { align: 'center' } as any);

  return pdf;
};

export const downloadBillPDF = (bill: Bill, companyName: string, companyAddress: string, companyPhone: string, vatRate: number) => {
  const pdf = generateBillPDF(bill, companyName, companyAddress, companyPhone, vatRate);
  pdf.save(`${bill.billNumber}.pdf`);
};
