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

type InvoiceFormat = 'a4' | 'a5' | 'thermal';

const npr = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// ── A5 (148×210 mm) — compact version of the A4 layout ───────────────────────
export const generateA5BillPDF = (bill: Bill, companyName: string, companyAddress: string, companyPhone: string, vatRate: number) => {
  const pdf = new jsPDF({ format: 'a5' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const m = 8;
  let y = 12;

  // === HEADER ===
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageWidth, 26, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyName.toUpperCase(), m, 11);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyAddress, m, 16);
  if (companyPhone) pdf.text(`Phone: ${companyPhone}`, m, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TAX INVOICE', pageWidth - m, 11, { align: 'right' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Bill No: ${bill.billNumber}`, pageWidth - m, 16, { align: 'right' });
  pdf.text(`Date: ${new Date(bill.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - m, 20, { align: 'right' });

  y = 33;

  // === BILLED TO (left) ===
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILLED TO', m, y);
  y += 4;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(bill.customer.name, m, y);
  y += 3.5;
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(bill.customer.phone, m, y);
  y += 3.5;
  pdf.text(bill.customer.address, m, y);
  y += 6;

  // === STATUS & PAYMENT (right) ===
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const statusColor = bill.status === 'Paid' ? [16, 185, 129] : [249, 115, 22];
  pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.text(`Status: ${bill.status}`, pageWidth - m - 40, y - 13);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Payment: ${bill.paymentMethod || 'Cash'}`, pageWidth - m - 40, y - 9);

  // === TABLE HEADER ===
  pdf.setFillColor(37, 99, 235);
  pdf.rect(m, y - 3, pageWidth - 2 * m, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('#', m + 2, y + 1);
  pdf.text('Description', m + 8, y + 1);
  pdf.text('Qty', 76, y + 1);
  pdf.text('Rate', 92, y + 1);
  pdf.text('Amount', pageWidth - m, y + 1, { align: 'right' });
  y += 7.5;

  // === TABLE BODY ===
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  bill.items.forEach((item, index) => {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);

    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(m, y - 2.5, pageWidth - 2 * m, 5, 'F');
    }

    pdf.setTextColor(150, 150, 150);
    pdf.text(`${index + 1}`, m + 2, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.name, m + 8, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.quantity.toString(), 76, y);
    pdf.text(`NPR ${npr(item.unitPrice)}`, 92, y);
    pdf.text(`NPR ${npr(lineTotal)}`, pageWidth - m, y, { align: 'right' });
    y += 5.5;
  });

  y += 2;

  // === SEPARATOR ===
  pdf.setDrawColor(220, 220, 220);
  pdf.line(m, y, pageWidth - m, y);
  y += 6;

  // === AMOUNT IN WORDS (left) ===
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(150, 150, 150);
  pdf.text('AMOUNT IN WORDS', m, y);
  y += 3.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  const wordsLines = pdf.splitTextToSize(numberToWords(bill.grandTotal), 62);
  pdf.text(wordsLines, m, y);
  const totalsY = y - 3.5;

  // === TOTALS (right) ===
  const totalsX = pageWidth - 57;
  const totalsValX = pageWidth - m;
  let ty = totalsY;

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);

  pdf.text('Subtotal:', totalsX, ty);
  pdf.text(`NPR ${npr(bill.subtotal)}`, totalsValX, ty, { align: 'right' });
  ty += 4.5;

  if (bill.discount > 0) {
    const discLabel = bill.discountType === 'percentage' ? `Discount (${bill.discount}%):` : 'Discount:';
    pdf.text(discLabel, totalsX, ty);
    pdf.setTextColor(220, 38, 38);
    pdf.text(`- NPR ${npr(bill.discountType === 'percentage' ? bill.subtotal * bill.discount / 100 : bill.discount)}`, totalsValX, ty, { align: 'right' });
    pdf.setTextColor(100, 100, 100);
    ty += 4.5;
  }

  pdf.text(`VAT (${vatRate}%):`, totalsX, ty);
  pdf.text(`NPR ${npr(bill.vat)}`, totalsValX, ty, { align: 'right' });
  ty += 2.5;

  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(0.5);
  pdf.line(totalsX, ty, totalsValX + 2, ty);
  ty += 4;

  pdf.setFillColor(37, 99, 235);
  pdf.rect(totalsX - 2, ty - 3.5, totalsValX - (totalsX - 2) + 2, 6.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totalsX, ty + 1);
  pdf.text(`NPR ${npr(bill.grandTotal)}`, totalsValX, ty + 1, { align: 'right' });

  y = Math.max(y + wordsLines.length * 2.5, ty + 12);

  // === NOTES ===
  if (bill.notes) {
    y += 3;
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTES', m, y);
    y += 3.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    const noteLines = pdf.splitTextToSize(bill.notes, pageWidth - 2 * m);
    pdf.text(noteLines, m, y);
    y += noteLines.length * 3 + 3;
  }

  // === SIGNATURE ===
  y += 4;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(pageWidth - 48, y, pageWidth - m, y);
  y += 4;
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Authorized Signature', pageWidth - 28, y, { align: 'center' });
  y += 3;
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyName, pageWidth - 28, y, { align: 'center' });

  // === FOOTER ===
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(180, 180, 180);
  pdf.text('Thank you for your business!', pageWidth / 2, 190, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Powered by Prime Logic Tech', pageWidth / 2, 205, { align: 'center' });

  return pdf;
};

// ── 80mm thermal receipt (width 80 mm, dynamic height) ──────────────────────
export const generateThermalBillPDF = (bill: Bill, companyName: string, companyAddress: string, companyPhone: string, vatRate: number) => {
  const width = 80;
  const m = 4;
  const nameLines = bill.items.map(i => Math.ceil((i.name.length * 1.7) / (width - 26)));
  const itemsHeight = bill.items.reduce((s, _i, idx) => s + nameLines[idx] * 3.5 + 6.5, 0);
  const height = Math.max(150, 60 + itemsHeight + 62 + (bill.notes ? 14 : 0));

  const pdf = new jsPDF({ unit: 'mm', format: [width, height] });
  const W = width;
  let y = 8;

  const dashedLine = (yy: number) => {
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(m, yy, W - m, yy);
    pdf.setLineDashPattern([], 0);
  };

  // === HEADER (centered) ===
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const nameLinesArr = pdf.splitTextToSize(companyName.toUpperCase(), W - 2 * m);
  pdf.text(nameLinesArr, W / 2, y, { align: 'center' });
  y += nameLinesArr.length * 5 + 1;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const addrLines = pdf.splitTextToSize(companyAddress, W - 2 * m);
  pdf.text(addrLines, W / 2, y, { align: 'center' });
  y += addrLines.length * 3;
  if (companyPhone) {
    pdf.text(`Ph: ${companyPhone}`, W / 2, y, { align: 'center' });
    y += 3;
  }

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFillColor(37, 99, 235);
  pdf.roundedRect(W / 2 - 17, y, 34, 6, 1, 1, 'F');
  pdf.text('TAX INVOICE', W / 2, y + 3.8, { align: 'center' });
  y += 9;

  dashedLine(y);
  y += 4;

  // === META (right-aligned values) ===
  pdf.setFontSize(7);
  const meta: Array<[string, string]> = [
    ['Bill No', bill.billNumber],
    ['Date', new Date(bill.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })],
    ['Status', bill.status],
    ['Payment', bill.paymentMethod || 'Cash'],
    ['Billed by', bill.createdBy || 'Admin'],
  ];
  meta.forEach(([k, v]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${k}:`, m, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(v, W - m, y, { align: 'right' });
    y += 4;
  });

  y += 1;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(7);
  pdf.text('CUSTOMER', m, y);
  y += 4;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.text(bill.customer.name, m, y);
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  const custLines = pdf.splitTextToSize([bill.customer.phone, bill.customer.address].filter(Boolean).join(', '), W - 2 * m);
  if (custLines.length) { pdf.text(custLines, m, y); y += custLines.length * 3; }
  if (bill.customer.email) { pdf.text(bill.customer.email, m, y); y += 3; }

  y += 1;
  dashedLine(y);
  y += 3;

  // === ITEMS ===
  pdf.setFillColor(37, 99, 235);
  pdf.rect(m, y - 3, W - 2 * m, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ITEM', m + 1, y + 0.5);
  pdf.text('QTY', W - 22, y + 0.5);
  pdf.text('RATE', W - 14, y + 0.5);
  pdf.text('AMOUNT', W - m, y + 0.5, { align: 'right' });
  y += 7;

  bill.items.forEach((item, index) => {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
    const upper = (W - m) - (W - 26);
    const itemNameLines = pdf.splitTextToSize(item.name, upper);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(String(index + 1), m + 1, y);
    pdf.text(itemNameLines, m + 5, y);
    pdf.text(`NPR ${npr(lineTotal)}`, W - m, y, { align: 'right' });
    y += itemNameLines.length * 3.5 + 0.5;

    pdf.setTextColor(120, 120, 120);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text(`  ${item.quantity} x NPR ${npr(item.unitPrice)}${item.discount > 0 ? ` (${item.discount}% disc)` : ''}`, m + 5, y);
    y += 3 + 2;
  });

  y += 1;
  dashedLine(y);
  y += 4;

  // === TOTALS ===
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  const totalRow = (label: string, value: string, opts?: { red?: boolean; boldValue?: boolean }) => {
    if (opts?.boldValue) pdf.setFont('helvetica', 'bold');
    if (opts?.red) pdf.setTextColor(220, 38, 38);
    pdf.text(value, W - m, y, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, m, y);
    y += 4;
  };

  totalRow('Subtotal', `NPR ${npr(bill.subtotal)}`);
  if (bill.discount > 0) {
    totalRow(`Discount${bill.discountType === 'percentage' ? ` (${bill.discount}%)` : ''}`, `- NPR ${npr(bill.discountType === 'percentage' ? bill.subtotal * bill.discount / 100 : bill.discount)}`, { red: true });
  }
  totalRow(`VAT (${vatRate}%)`, `NPR ${npr(bill.vat)}`);
  y += 1;

  pdf.setFillColor(37, 99, 235);
  pdf.rect(m, y - 4, W - 2 * m, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('GRAND TOTAL', m + 1, y + 0.5);
  pdf.text(`NPR ${npr(bill.grandTotal)}`, W - m, y + 0.5, { align: 'right' });
  y += 9;

  // === AMOUNT IN WORDS ===
  pdf.setTextColor(60, 60, 60);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  const words = pdf.splitTextToSize(`In words: ${numberToWords(bill.grandTotal)}`, W - 2 * m);
  pdf.text(words, m, y);
  y += words.length * 3 + 2;

  // === NOTES ===
  if (bill.notes) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('NOTES', m, y);
    y += 3;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    const noteLines = pdf.splitTextToSize(bill.notes, W - 2 * m);
    pdf.text(noteLines, m, y);
    y += noteLines.length * 3 + 2;
  }

  // === FOOTER ===
  y += 2;
  dashedLine(y);
  y += 4;
  pdf.setTextColor(80, 80, 80);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('Thank you for your business!', W / 2, y, { align: 'center' });
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text(companyName, W / 2, y, { align: 'center' });
  y += 4;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(W / 2 - 14, y, W / 2 + 14, y);
  y += 3;
  pdf.text('Authorized Signature', W / 2, y, { align: 'center' });
  y += 3;
  pdf.setTextColor(107, 114, 128);
  pdf.text('Powered by Prime Logic Tech', W / 2, y, { align: 'center' });

  return pdf;
};

export const generateInvoicePDF = (
  bill: Bill,
  companyName: string,
  companyAddress: string,
  companyPhone: string,
  vatRate: number,
  format: InvoiceFormat = 'a4',
) => {
  if (format === 'a5') return generateA5BillPDF(bill, companyName, companyAddress, companyPhone, vatRate);
  if (format === 'thermal') return generateThermalBillPDF(bill, companyName, companyAddress, companyPhone, vatRate);
  return generateBillPDF(bill, companyName, companyAddress, companyPhone, vatRate);
};

export const downloadInvoicePDF = (
  bill: Bill,
  companyName: string,
  companyAddress: string,
  companyPhone: string,
  vatRate: number,
  format: InvoiceFormat = 'a4',
) => {
  const pdf = generateInvoicePDF(bill, companyName, companyAddress, companyPhone, vatRate, format);
  pdf.save(`${bill.billNumber}${format === 'a4' ? '' : `-${format}`}.pdf`);
};
