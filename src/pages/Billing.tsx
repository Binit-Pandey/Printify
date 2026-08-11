import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Download } from 'lucide-react';
import { useStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import type { Bill } from '../types';
import BillForm from '../components/BillForm';
import InvoicePreview from '../components/InvoicePreview';

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, addBill, findOrCreateCustomer } = useStore();
  const [preview, setPreview] = useState<Bill | null>(null);

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

  const handleDownloadPDF = async () => {
    if (!preview || preview.items.length === 0) return;
    const { downloadBillPDF } = await import('../utils/pdfGenerator');
    downloadBillPDF(preview, settings.name, settings.address, settings.contactNumber, settings.vatRate ?? 13);
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Create Invoice</h1>
          <p className="text-gray-500 mt-1">{preview?.billNumber}</p>
        </div>
        <div className="flex gap-3">
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
                <InvoicePreview bill={preview} settings={settings} />
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
