import type { Bill, CompanySettings } from '../types';
import { numberToWords } from '../utils/numberToWords';

interface InvoicePreviewProps {
  bill: Bill;
  settings: CompanySettings;
}

const InvoicePreview = ({ bill, settings }: InvoicePreviewProps) => {
  const vatRate = settings.vatRate ?? 13;
  const amountInWords = numberToWords(bill.grandTotal);

  return (
    <div id="invoice-print" className="bg-white text-gray-900 w-full" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Company Header */}
      <div className="border-b-2 border-blue-600 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-blue-600 uppercase">{settings.name || 'Company Name'}</h1>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">{settings.address || 'Company Address'}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              {settings.contactNumber && <span>Ph: {settings.contactNumber}</span>}
              {settings.email && <span>{settings.email}</span>}
            </div>
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              {settings.panNumber && <span className="font-semibold">PAN: {settings.panNumber}</span>}
              {settings.vatNumber && <span className="font-semibold">VAT: {settings.vatNumber}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="bg-blue-600 text-white px-6 py-2 rounded-lg inline-block">
              <span className="text-lg font-black tracking-wider">TAX INVOICE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Meta */}
      <div className="flex justify-between mb-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Billed To</h3>
          <p className="font-bold text-base">{bill.customer.name}</p>
          <p className="text-sm text-gray-600">{bill.customer.phone}</p>
          <p className="text-sm text-gray-600">{bill.customer.address}</p>
          {bill.customer.email && <p className="text-sm text-gray-600">{bill.customer.email}</p>}
        </div>
        <div className="text-right">
          <table className="text-sm ml-auto">
            <tbody>
              <tr>
                <td className="py-1 pr-4 text-gray-500 font-medium">Invoice No:</td>
                <td className="py-1 font-bold text-blue-600">{bill.billNumber}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-500 font-medium">Date:</td>
                <td className="py-1 font-semibold">{new Date(bill.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-500 font-medium">Status:</td>
                <td className="py-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>{bill.status}</span>
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-500 font-medium">Payment:</td>
                <td className="py-1 font-semibold">{bill.paymentMethod || 'Cash'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider" style={{ width: '5%' }}>#</th>
            <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider" style={{ width: '35%' }}>Description</th>
            <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider" style={{ width: '10%' }}>Qty</th>
            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider" style={{ width: '15%' }}>Unit Price</th>
            <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider" style={{ width: '10%' }}>Disc%</th>
            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider" style={{ width: '15%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => {
            const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
            return (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 px-4 text-sm text-gray-500 border-b border-gray-100">{index + 1}</td>
                <td className="py-3 px-4 text-sm font-semibold border-b border-gray-100">{item.name}</td>
                <td className="py-3 px-4 text-sm text-center border-b border-gray-100">{item.quantity}</td>
                <td className="py-3 px-4 text-sm text-right border-b border-gray-100">NPR {item.unitPrice.toLocaleString()}</td>
                <td className="py-3 px-4 text-sm text-center border-b border-gray-100">
                  {item.discount > 0 ? `${item.discount}%` : '-'}
                </td>
                <td className="py-3 px-4 text-sm text-right font-bold border-b border-gray-100">
                  NPR {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
          {bill.items.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400 text-sm border-b border-gray-100">No items</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-between mb-6 totals-section">
        <div className="w-56 amount-words-box">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-bold uppercase text-gray-400 mb-1">Amount in Words</p>
            <p className="text-xs font-semibold text-gray-700 leading-relaxed">{amountInWords}</p>
          </div>
        </div>
        <div className="w-72">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500 font-medium">Subtotal</td>
                <td className="py-2 text-right font-semibold">NPR {bill.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              </tr>
              {bill.discount > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500 font-medium">
                    Discount {bill.discountType === 'percentage' ? `(${bill.discount}%)` : ''}
                  </td>
                  <td className="py-2 text-right font-semibold text-red-600">
                    - NPR {(bill.discountType === 'percentage' ? bill.subtotal * bill.discount / 100 : bill.discount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500 font-medium">VAT ({vatRate}%)</td>
                <td className="py-2 text-right font-semibold">NPR {bill.vat.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              </tr>
              <tr className="bg-blue-600 text-white">
                <td className="py-3 px-4 font-black text-base">GRAND TOTAL</td>
                <td className="py-3 px-4 text-right font-black text-base">NPR {bill.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {bill.notes && (
        <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs font-bold uppercase text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-600">{bill.notes}</p>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <p className="text-xs font-bold uppercase text-gray-400 mb-2">Terms & Conditions</p>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
          <li>Payment is due within 30 days of invoice date.</li>
          <li>Please include invoice number on all payments.</li>
          <li>Goods once sold will not be taken back or exchanged.</li>
          <li>All disputes subject to local jurisdiction only.</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-blue-600 pt-4 flex justify-between items-end">
        <div>
          <p className="text-xs text-gray-400">Thank you for your business!</p>
        </div>
        <div className="text-right">
          <div className="border-t border-gray-300 w-40 mb-1"></div>
          <p className="text-xs font-semibold text-gray-500">Authorized Signature</p>
          <p className="text-xs text-gray-400">{settings.name}</p>
        </div>
      </div>

      {/* Branding Footer */}
      <div className="pt-6 pb-2 text-center">
        <p className="text-[10px] text-gray-400" style={{ color: '#6B7280' }}>Powered by Prime Logic Tech</p>
      </div>
    </div>
  );
};

export default InvoicePreview;
