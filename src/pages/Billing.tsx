import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Printer, Download, CheckCircle2 } from 'lucide-react';
import { useStore } from '../contexts/store';
import type { BillItem, Bill } from '../types';

const billSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  date: z.string(),
});

type BillForm = z.infer<typeof billSchema>;

const Billing = () => {
  const { customers, settings, addBill } = useStore();
  const [items, setItems] = useState<BillItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unitPrice: 0, discount: 0 });
  const [billNumber] = useState(`BILL-${String(Date.now()).slice(-6)}`);
  const [isSaved, setIsSaved] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      customerId: customers[0]?.id || '',
    }
  });

  const selectedCustomerId = useWatch({ control, name: 'customerId' });
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  const vatRate = (settings.vatRate ?? 13) / 100;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount / 100)), 0);
  const vat = subtotal * vatRate;
  const grandTotal = subtotal + vat;

  const addItem = () => {
    if (newItem.name && newItem.unitPrice > 0) {
      setItems([...items, { ...newItem, id: Math.random().toString(36).substr(2, 9) }]);
      setNewItem({ name: '', quantity: 1, unitPrice: 0, discount: 0 });
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const onSubmit: SubmitHandler<BillForm> = (data) => {
    if (items.length === 0) {
      alert('Please add at least one item to the bill.');
      return;
    }

    if (!selectedCustomer) return;

    const bill: Bill = {
      id: Math.random().toString(36).substr(2, 9),
      billNumber,
      date: data.date,
      customer: selectedCustomer,
      items,
      subtotal,
      discount: 0,
      vat,
      grandTotal,
      status: 'Pending',
    };

    addBill(bill);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-bold">Create New Bill</h1>
          <p className="text-gray-500">Bill No: {billNumber}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-2xl hover:bg-black transition-colors" aria-label="Print bill">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" aria-label="Download PDF">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 no-print">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="customer" className="block text-sm mb-2 font-medium text-gray-700 dark:text-gray-300">Customer</label>
                <select 
                  id="customer" 
                  {...register('customerId')} 
                  className={`w-full p-4 bg-gray-50 dark:bg-gray-800 border ${errors.customerId ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none`}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
                {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
              </div>
              <div>
                <label htmlFor="bill-date" className="block text-sm mb-2 font-medium text-gray-700 dark:text-gray-300">Date</label>
                <input 
                  id="bill-date" 
                  type="date" 
                  {...register('date')} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Bill Items</h3>
                <button 
                  type="button" 
                  onClick={addItem} 
                  className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="p-4 font-medium">Item</th>
                      <th className="p-4 font-medium">Qty</th>
                      <th className="p-4 font-medium">Rate</th>
                      <th className="p-4 font-medium">Disc %</th>
                      <th className="p-4 font-medium text-right">Amount</th>
                      <th className="p-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-4 font-medium">{item.name}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">NPR {item.unitPrice.toLocaleString()}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{item.discount}%</td>
                        <td className="p-4 text-right font-semibold">NPR {(item.quantity * item.unitPrice * (1 - item.discount/100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="p-4">
                          <button 
                            type="button" 
                            onClick={() => removeItem(item.id)} 
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" 
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-400">No items added yet. Add some services or products.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3 p-6 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
                <div className="md:col-span-2">
                  <input
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="Item name (e.g. Visiting Cards)"
                    className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Item name"
                  />
                </div>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                  placeholder="Qty"
                  className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Quantity"
                />
                <input
                  type="number"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})}
                  placeholder="Rate"
                  className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Unit price"
                />
                <button 
                  type="button" 
                  onClick={addItem} 
                  disabled={!newItem.name || newItem.unitPrice <= 0}
                  className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className={`w-full py-4 ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  Bill Saved Successfully!
                </>
              ) : (
                'Save & Generate Bill'
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-6 print:shadow-none print:border-none print:p-0">
            <div className="border-b dark:border-gray-800 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-2xl tracking-tight text-blue-600">{settings.name.toUpperCase()}</div>
                  <div className="text-sm text-gray-500 mt-1 max-w-[200px]">{settings.address}</div>
                  <div className="text-sm text-gray-500">{settings.contactNumber}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold">{billNumber}</div>
                  <div className="text-sm text-gray-500">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">BILLED TO</div>
                {selectedCustomer ? (
                  <>
                    <div className="font-bold text-lg">{selectedCustomer.name}</div>
                    <div className="text-sm text-gray-500">{selectedCustomer.phone}</div>
                    <div className="text-sm text-gray-500">{selectedCustomer.address}</div>
                  </>
                ) : (
                  <div className="text-gray-400 italic">Select a customer to see details</div>
                )}
              </div>

              <div className="min-h-[200px]">
                {items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-800 text-gray-400">
                        <th className="text-left py-3 font-medium">Description</th>
                        <th className="text-right py-3 font-medium">Qty</th>
                        <th className="text-right py-3 font-medium">Rate</th>
                        <th className="text-right py-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="py-4 font-medium">{item.name}</td>
                          <td className="text-right py-4">{item.quantity}</td>
                          <td className="text-right py-4">{item.unitPrice.toLocaleString()}</td>
                          <td className="text-right py-4 font-bold">{(item.quantity * item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                    Invoice preview will appear here
                  </div>
                )}
              </div>

              <div className="pt-6 border-t dark:border-gray-800 space-y-3">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-medium">NPR {subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>VAT ({(vatRate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">NPR {vat.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-2xl font-black border-t dark:border-gray-800 pt-4 text-blue-600">
                  <span>Total</span>
                  <span>NPR {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="pt-8 text-center no-print">
                <p className="text-xs text-gray-400">Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
