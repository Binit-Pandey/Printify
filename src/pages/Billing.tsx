import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Download } from 'lucide-react';
import { useStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import type { Bill } from '../types';
import BillForm from '../components/BillForm';
import InvoicePreview, { type InvoiceFormat } from '../components/InvoicePreview';

interface SystemPrinter {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
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

  useEffect(() => {
    if (!isDesktop) return;
    window.printpressDesktop!.printService!.listPrinters()
      .then((list) => {
        setPrinters(list);
        if (!localStorage.getItem('printpress_printer') && list.length > 0) {
          const preferred = list.find((p) => p.isDefault) || list[0];
          setPrinter(preferred.name);
          localStorage.setItem('printpress_printer', preferred.name);
        }
      })
      .catch(() => setPrinters([]));
  }, [isDesktop]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleDirectPrint = async () => {
    if (!preview || preview.items.length === 0 || !isDesktop) return;
    setDirectPrinting(true);
    try {
      await window.printpressDesktop!.printService!.directPrint(printer || undefined);
    } catch (err) {
      console.error('Direct print failed:', err);
    } finally {
      setDirectPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!preview || preview.items.length === 0) return;
    const { downloadInvoicePDF } = await import('../utils/pdfGenerator');
    downloadInvoicePDF(preview, settings.name, settings.address, settings.contactNumber, settings.vatRate ?? 13, format);
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
                title="Print straight to the selected bill printer without the dialog"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-2xl hover:bg-emerald-800 transition-colors disabled:opacity-50 font-semibold">
                <Printer className="w-4 h-4" /> {directPrinting ? 'Printing…' : 'Direct Print'}
              </button>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-7 space-y-6 no-print">
          <BillForm onChange={handleBillChange} onSubmit={handleSubmit} />
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
    </div>
  );
};

export default Billing;
