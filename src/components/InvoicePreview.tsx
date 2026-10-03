import type { Bill, CompanySettings } from '../types';
import { numberToWords } from '../utils/numberToWords';

export type InvoiceFormat = 'a4' | 'a5' | 'thermal';

interface InvoicePreviewProps {
  bill: Bill;
  settings: CompanySettings;
  format?: InvoiceFormat;
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const ThermalReceipt = ({ bill, settings }: { bill: Bill; settings: CompanySettings }) => {
  const vatRate = settings.vatRate ?? 13;
  const amountInWords = numberToWords(bill.grandTotal);

  return (
    <div id="invoice-print" className="invoice-format-thermal bg-white text-gray-900" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", width: '80mm', margin: '0 auto', padding: '2mm 3mm' }}>
      {/* Company Header */}
      <div className="text-center border-b-2 border-blue-600 pb-2 mb-2">
        <h1 className="text-sm font-black tracking-wide text-blue-600 uppercase leading-tight">{settings.name || 'Company Name'}</h1>
        {settings.address && <p className="text-[9px] text-gray-600 mt-0.5">{settings.address}</p>}
        <div className="text-[9px] text-gray-600 mt-0.5">
          {settings.contactNumber && <span>Ph: {settings.contactNumber}</span>}
          {settings.email && <span> | {settings.email}</span>}
        </div>
        <div className="text-[9px] text-gray-600">
          {settings.panNumber && <span>PAN: {settings.panNumber}</span>}
          {settings.vatNumber && <span> | VAT: {settings.vatNumber}</span>}
        </div>
        <div className="inline-block bg-blue-600 text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm mt-1">TAX INVOICE</div>
      </div>

      {/* Invoice Meta */}
      <div className="text-[10px] mb-2 space-y-0.5">
        <div className="flex justify-between"><span className="text-gray-500">Bill No:</span><span className="font-bold">{bill.billNumber}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-bold">{new Date(bill.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`font-bold ${bill.status === 'Paid' ? 'text-emerald-600' : 'text-orange-500'}`}>{bill.status}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Payment:</span><span className="font-bold">{bill.paymentMethod || 'Cash'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Billed by:</span><span className="font-bold">{bill.createdBy || 'Admin'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-bold">{bill.customer.name}</span></div>
        {(bill.customer.phone || bill.customer.address) && <div className="text-[9px] text-gray-600">{bill.customer.phone}{bill.customer.phone && bill.customer.address ? ', ' : ''}{bill.customer.address}</div>}
        {bill.customer.email && <div className="text-[9px] text-gray-600">{bill.customer.email}</div>}
      </div>

      {/* Items */}
      <table className="w-full text-[10px] mb-2" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="py-0.5 px-1 text-left font-bold" style={{ width: '5%' }}>#</th>
            <th className="py-0.5 px-1 text-left font-bold" style={{ width: '52%' }}>Description</th>
            <th className="py-0.5 px-1 text-right font-bold" style={{ width: '16%' }}>Qty×Rate</th>
            <th className="py-0.5 px-1 text-right font-bold" style={{ width: '27%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => {
            const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
            return (
              <tr key={item.id} className="align-top border-b border-gray-100">
                <td className="px-1 py-0.5 font-bold">{index + 1}</td>
                <td className="px-1 py-0.5 font-bold leading-tight">{item.name}</td>
                <td className="px-1 py-0.5 text-right">{item.quantity} × {fmt(item.unitPrice)}</td>
                <td className="px-1 py-0.5 text-right font-bold">NPR {fmt(lineTotal)}</td>
              </tr>
            );
          })}
          {bill.items.length === 0 && (
            <tr><td colSpan={4} className="py-3 text-center text-gray-400 text-[10px]">No items</td></tr>
          )}
        </tbody>
      </table>

      {/* Amount in Words */}
      <div className="text-[9px] text-gray-700 mb-2">
        <span className="text-gray-400 font-bold uppercase">In words: </span>{amountInWords}
      </div>

      {/* Totals */}
      <div className="text-[10px] space-y-0.5 mb-2">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-bold">NPR {fmt(bill.subtotal)}</span></div>
        {bill.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Discount {bill.discountType === 'percentage' ? `(${bill.discount}%)` : ''}</span>
            <span className="font-bold text-red-600">- NPR {fmt(bill.discountType === 'percentage' ? bill.subtotal * bill.discount / 100 : bill.discount)}</span>
          </div>
        )}
        <div className="flex justify-between"><span className="text-gray-500">VAT ({vatRate}%)</span><span className="font-bold">NPR {fmt(bill.vat)}</span></div>
      </div>
      <div className="bg-blue-600 text-white text-[11px] font-black px-2 py-1 mb-2 flex justify-between rounded-sm">
        <span>GRAND TOTAL (NPR)</span>
        <span>{fmt(bill.grandTotal)}</span>
      </div>

      {/* Notes */}
      {bill.notes && (
        <div className="text-[9px] text-gray-600 mb-2">
          <span className="font-bold text-gray-400 uppercase">Notes: </span>{bill.notes}
        </div>
      )}

      {/* Footer */}
      <div className="text-center border-t border-dashed border-gray-300 pt-1 mt-1">
        <p className="text-[9px] text-gray-500">Thank you for your business!</p>
        <p className="text-[9px] font-bold text-gray-600 mt-1">{settings.name}</p>
        <div className="border-t border-gray-300 w-24 mx-auto mt-1"></div>
        <p className="text-[8px] text-gray-500">Authorized Signature</p>
        <p className="text-[8px] text-gray-400 mt-1">Powered by Prime Logic Tech</p>
      </div>
    </div>
  );
};

const InvoicePreview = ({ bill, settings, format = 'a4' }: InvoicePreviewProps) => {
  const vatRate = settings.vatRate ?? 13;
  const amountInWords = numberToWords(bill.grandTotal);

  if (format === 'thermal') {
    return <ThermalReceipt bill={bill} settings={settings} />;
  }

  return (
    <div id="invoice-print" className={`invoice-format-${format} bg-white text-gray-900 w-full`} style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Company Header */}
      <div className="border-b-2 border-blue-600 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-start">
            {settings.logo && (
              <img
                src={settings.logo}
                alt={`${settings.name || 'Company'} logo`}
                className="w-20 h-20 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
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
              <tr>
                <td className="py-1 pr-4 text-gray-500 font-medium">Billed by:</td>
                <td className="py-1 font-semibold">{bill.createdBy || 'Admin'}</td>
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
