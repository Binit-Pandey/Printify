import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Download, FileDown } from 'lucide-react';
import { useStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import type { Bill } from '../types';
import BillForm from '../components/BillForm';
import InvoicePreview, { type InvoiceFormat } from '../components/InvoicePreview';
import Toast from '../components/Toast';

interface SystemPrinter {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
}

interface ToastState {
  message: string;
  type?: 'success' | 'error';
}

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, addBill, findOrCreateCustomer } = useStore();
  const [preview, setPreview] = useState<Bill | null>(null);
  const [format, setFormat] = useState<InvoiceFormat>(() => {
    const saved = localStorage.getItem('printpress_invoice_format');
    return saved === 'a5' || saved === 'thermal' ? saved : 'a4';
  });

  const isDesktop = Boolean(window.printpressDesktop?.printService);
  const [printers, setPrinters] = useState<SystemPrinter[]>([]);
  const [printer, setPrinter] = useState<string>(() => localStorage.getItem('printpress_printer') || '');
  const [directPrinting, setDirectPrinting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    window.printpressDesktop!.printService!.listPrinters()
      .then((list) => {
        setPrinters(list);
        // A previously selected printer may have been removed or renamed.
        if (list.length > 0 && !list.some((p) => p.name === localStorage.getItem('printpress_printer'))) {
          const preferred = list.find((p) => p.isDefault) || list[0];
          setPrinter(preferred.name);
          localStorage.setItem('printpress_printer', preferred.name);
        }
      })
      .catch((err) => {
        console.error('Could not list printers:', err);
        setPrinters([]);
      });
  }, [isDesktop]);

  // The main process broadcasts this when a PDF download cannot be written, so
  // the user is not left thinking the invoice was saved.
  useEffect(() => {
    const onFailed = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setToast({ message: `Could not save PDF${detail ? `: ${detail}` : ''}`, type: 'error' });
    };
    window.addEventListener('printpress:download-failed', onFailed);
    return () => window.removeEventListener('printpress:download-failed', onFailed);
  }, []);

  const selectPrinter = (name: string) => {
    setPrinter(name);
    localStorage.setItem('printpress_printer', name);
  };

  const changeFormat = (f: InvoiceFormat) => {
    setFormat(f);
    localStorage.setItem('printpress_invoice_format', f);
  };

  const handleBillChange = useCallback((bill: Bill) => {
    setPreview(bill);
  }, []);

  const handleSubmit = async (bill: Bill) => {
    let customer = bill.customer;
    if (bill.paymentMethod === 'Credit') {
      // Credit/due: store customer in DB for tracking
      customer = await findOrCreateCustomer({
        name: bill.customer.name,
        phone: bill.customer.phone,
        address: bill.customer.address,
        email: bill.customer.email || undefined,
      });
    }
    await addBill({ ...bill, customer });
    setTimeout(() => {
      navigate(user?.role === 'staff' ? '/billing' : '/bills');
    }, 1500);
  };

  const handleDirectPrint = async () => {
    if (!preview || preview.items.length === 0 || !isDesktop) return;
    if (printers.length === 0) {
      setToast({ message: 'No printer configured. Use "Save as PDF" instead.', type: 'error' });
      return;
    }
    setDirectPrinting(true);
    try {
      await window.printpressDesktop!.printService!.directPrint(printer || undefined);
      setToast({ message: 'Sent to printer.' });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error('Direct print failed:', err);
      // A silent job is rejected outright when no usable printer exists, so
      // retry through the system dialog where the user can pick a destination.
      try {
        await window.printpressDesktop!.printService!.printWithDialog();
        setToast({ message: 'Opening the print dialog…' });
      } catch {
        setToast({ message: `Print failed: ${reason}. Try "Save as PDF".`, type: 'error' });
      }
    } finally {
      setDirectPrinting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Renders the invoice to a PDF file without needing a printer driver.
  const handleSaveAsPDF = async () => {
    if (!preview || preview.items.length === 0 || !isDesktop) return;
    try {
      const result = await window.printpressDesktop!.printService!.saveAsPdf(preview.billNumber);
      if (result.ok) setToast({ message: `PDF saved to ${result.path}` });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error('Save as PDF failed:', err);
      setToast({ message: `Could not save PDF: ${reason}`, type: 'error' });
    }
  };

  const handleDownloadPDF = async () => {
    if (!preview || preview.items.length === 0) return;
    try {
      const { downloadInvoicePDF } = await import('../utils/pdfGenerator');
      downloadInvoicePDF(preview, settings.name, settings.address, settings.contactNumber, settings.vatRate ?? 13, format);
      if (isDesktop) setToast({ message: 'Choose where to save the PDF.' });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error('PDF generation failed:', err);
      setToast({ message: `Could not generate PDF: ${reason}`, type: 'error' });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Create Invoice</h1>
          <p className="text-gray-500 mt-1">{preview?.billNumber}</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center rounded-2xl border border-gray-300 dark:border-gray-700 p-1">
            {([['a4', 'A4'], ['a5', 'A5'], ['thermal', '80mm']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => changeFormat(value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  format === value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {isDesktop && (
            <>
              <select
                value={printer}
                onChange={(e) => selectPrinter(e.target.value)}
                disabled={printers.length === 0}
                title="Printer for direct printing"
                className="max-w-[220px] px-3 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold disabled:opacity-50"
              >
                {printers.length === 0 ? (
                  <option value="">No printers found</option>
                ) : (
                  printers.map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName}</option>
                  ))
                )}
              </select>
              <button onClick={handleDirectPrint} disabled={!preview || preview.items.length === 0 || directPrinting}
                title={printers.length === 0 ? 'No printer is configured in your operating system' : 'Print straight to the selected bill printer without the dialog'}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-2xl hover:bg-emerald-800 transition-colors disabled:opacity-50 font-semibold">
                <Printer className="w-4 h-4" /> {directPrinting ? 'Printing…' : 'Direct Print'}
              </button>
              {printers.length === 0 && (
                <span className="text-xs text-gray-500 max-w-[240px] leading-snug">
                  No printer configured — use Save as PDF, or add a printer in your operating system.
                </span>
              )}
            </>
          )}
          <button onClick={handlePrint} disabled={!preview || preview.items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-2xl hover:bg-black transition-colors disabled:opacity-50 font-semibold">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF} disabled={!preview || preview.items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-semibold">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          {isDesktop && (
            <button onClick={handleSaveAsPDF} disabled={!preview || preview.items.length === 0}
              title="Save the invoice as a PDF file. Works without a printer."
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-semibold">
              <FileDown className="w-4 h-4" /> Save as PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-7 space-y-6 no-print">
          <BillForm onChange={handleBillChange} onSubmit={handleSubmit} onError={(msg) => setToast({ message: `Could not save invoice: ${msg}`, type: 'error' })} />
        </div>

        {/* Right: Invoice Preview */}
        <div className="lg:col-span-5 print-invoice-wrap">
          <div className="sticky top-6 print:shadow-none print:border-none print:p-0">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 print:rounded-none print:border-none no-print">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Preview
              </h3>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 print:rounded-none print:border-none print:p-0">
              {preview ? (
                <div className={format === 'thermal' ? 'invoice-preview-thermal' : format === 'a5' ? 'invoice-preview-a5' : ''}>
                  <InvoicePreview bill={preview} settings={settings} format={format} />
                </div>
              ) : (
                <div className="text-center text-gray-400 py-16">
                  <p className="font-medium">No invoice to preview yet</p>
                  <p className="text-sm mt-1">Start filling in the form on the left.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.type === 'error' ? 5000 : 2500}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Billing;
