import jsPDF from 'jspdf';
import type { Bill } from '../types';
import { numberToWords } from './numberToWords';

export const generateBillPDF = (bill: Bill, companyName: string, companyAddress: string, companyPhone: string, vatRate: number) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 15;

  // === HEADER ===
  pdf.setFillColor(37, 99, 235); // Blue
  pdf.rect(0, 0, pageWidth, 35, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyName.toUpperCase(), 15, 15);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyAddress, 15, 22);
  if (companyPhone) pdf.text(`Phone: ${companyPhone}`, 15, 27);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TAX INVOICE', pageWidth - 15, 15, { align: 'right' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Bill No: ${bill.billNumber}`, pageWidth - 15, 22, { align: 'right' });
  pdf.text(`Date: ${new Date(bill.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - 15, 27, { align: 'right' });

  y = 42;

  // === BILLED TO ===
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(150, 150, 150);
  pdf.text('BILLED TO', 15, y);
  y += 5;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(bill.customer.name, 15, y);
  y += 4;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(bill.customer.phone, 15, y);
  y += 4;
  pdf.text(bill.customer.address, 15, y);
  y += 8;

  // === STATUS & PAYMENT (right side) ===
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const statusColor = bill.status === 'Paid' ? [16, 185, 129] : [249, 115, 22];
  pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.text(`Status: ${bill.status}`, pageWidth - 60, y - 12);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Payment: ${bill.paymentMethod || 'Cash'}`, pageWidth - 60, y - 7);

  // === TABLE HEADER ===
  y += 2;
  pdf.setFillColor(37, 99, 235);
  pdf.rect(15, y - 3, pageWidth - 30, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('#', 17, y + 2);
  pdf.text('Description', 25, y + 2);
  pdf.text('Qty', 105, y + 2);
  pdf.text('Rate', 125, y + 2);
  pdf.text('Disc', 148, y + 2);
  pdf.text('Amount', pageWidth - 17, y + 2, { align: 'right' });
  y += 10;

  // === TABLE BODY ===
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  bill.items.forEach((item, index) => {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);

    // Alternate row bg
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(15, y - 3, pageWidth - 30, 6, 'F');
    }

    pdf.setTextColor(150, 150, 150);
    pdf.text(`${index + 1}`, 17, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.name, 25, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.quantity.toString(), 108, y);
    pdf.text(`NPR ${item.unitPrice.toLocaleString()}`, 125, y);
    pdf.text(item.discount > 0 ? `${item.discount}%` : '-', 150, y);
    pdf.text(`NPR ${lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, pageWidth - 17, y, { align: 'right' });
    y += 7;
  });

  y += 3;

  // === SEPARATOR ===
  pdf.setDrawColor(220, 220, 220);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // === AMOUNT IN WORDS (left) ===
  const amountWords = numberToWords(bill.grandTotal);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(150, 150, 150);
  pdf.text('AMOUNT IN WORDS', 15, y);
  y += 4;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  const splitWords = pdf.splitTextToSize(amountWords, 80);
  pdf.text(splitWords, 15, y);
  y += splitWords.length * 4 + 5;

  // === TOTALS (right) ===
  const totalsX = pageWidth - 75;
  const totalsValX = pageWidth - 17;
  let totalsY = y - splitWords.length * 4 - 5;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);

  pdf.text('Subtotal:', totalsX, totalsY);
  pdf.text(`NPR ${bill.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, totalsValX, totalsY, { align: 'right' });
  totalsY += 6;

  if (bill.discount > 0) {
    const discLabel = bill.discountType === 'percentage' ? `Discount (${bill.discount}%):` : `Discount:`;
    pdf.text(discLabel, totalsX, totalsY);
    pdf.setTextColor(220, 38, 38);
    pdf.text(`- NPR ${bill.discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, totalsValX, totalsY, { align: 'right' });
    pdf.setTextColor(100, 100, 100);
    totalsY += 6;
  }

  pdf.text(`VAT (${vatRate}%):`, totalsX, totalsY);
  pdf.text(`NPR ${bill.vat.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, totalsValX, totalsY, { align: 'right' });
  totalsY += 3;

  // Grand Total bar
  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(0.5);
  pdf.line(totalsX, totalsY, totalsValX + 2, totalsY);
  totalsY += 5;

  pdf.setFillColor(37, 99, 235);
  pdf.rect(totalsX - 2, totalsY - 4, pageWidth - totalsX - totalsX + 25, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totalsX, totalsY + 1);
  pdf.text(`NPR ${bill.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, totalsValX, totalsY + 1, { align: 'right' });

  y = Math.max(y, totalsY + 15);

  // === NOTES ===
  if (bill.notes) {
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTES', 15, y);
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    const noteLines = pdf.splitTextToSize(bill.notes, pageWidth - 30);
    pdf.text(noteLines, 15, y);
    y += noteLines.length * 4 + 5;
  }

  // === TERMS ===
  y += 3;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(15, y, pageWidth - 15, y);
  y += 5;

  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TERMS & CONDITIONS', 15, y);
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  const terms = [
    '1. Payment is due within 30 days of invoice date.',
    '2. Please include invoice number on all payments.',
    '3. Goods once sold will not be taken back or exchanged.',
    '4. All disputes subject to local jurisdiction only.',
  ];
  terms.forEach(term => {
    pdf.text(term, 15, y);
    y += 3.5;
  });

  // === SIGNATURE ===
  y += 5;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(pageWidth - 60, y, pageWidth - 15, y);
  y += 4;
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Authorized Signature', pageWidth - 37.5, y, { align: 'center' });
  y += 3;
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyName, pageWidth - 37.5, y, { align: 'center' });

  // === FOOTER ===
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(180, 180, 180);
  pdf.text('Thank you for your business!', pageWidth / 2, pageHeight - 14, { align: 'center' });

  // === BRANDING FOOTER ===
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128); // #6B7280
  pdf.text('Powered by Prime Logic Tech', pageWidth / 2, pageHeight - 8, { align: 'center' });

  return pdf;
};

export const downloadBillPDF = (bill: Bill, companyName: string, companyAddress: string, companyPhone: string, vatRate: number) => {
  const pdf = generateBillPDF(bill, companyName, companyAddress, companyPhone, vatRate);
  pdf.save(`${bill.billNumber}.pdf`);
};
