import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Printer, Download, CheckCircle2, Edit2, Package, X } from 'lucide-react';
import { useStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import type { BillItem, Bill } from '../types';
import InvoicePreview from '../components/InvoicePreview';
import ConfirmModal from '../components/ConfirmModal';

const Billing = () => {
  const navigate = useNavigate();
  const { inventory, settings, addBill, findOrCreateCustomer } = useStore();
  const { user } = useAuth();

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [paymentMethod, setPaymentMethod] = useState<Bill['paymentMethod']>('Cash');
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 1, unitPrice: 0, discount: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const billNumber = useMemo(() => {
    const now = new Date();
    const seq = String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(Date.now()).slice(-5);
    return `INV-${seq}`;
  }, []);

  const vatRate = (settings.vatRate ?? 13) / 100;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount / 100)), 0);
  const discountAmount = discountType === 'percentage' ? subtotal * discount / 100 : Math.min(discount, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const vat = afterDiscount * vatRate;
  const grandTotal = afterDiscount + vat;

  const isCredit = paymentMethod === 'Credit';
  const phoneRequired = isCredit && custName.trim() !== '';
  const customerValid = custName.trim() !== '' && (!phoneRequired || custPhone.trim() !== '');

  const addItem = useCallback((item: Omit<BillItem, 'id'>) => {
    setItems(prev => [...prev, { ...item, id: Math.random().toString(36).substr(2, 9) }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const startEditItem = useCallback((item: BillItem) => {
    setEditingItemId(item.id);
    setEditForm({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount });
  }, []);

  const saveEditItem = useCallback(() => {
    if (editingItemId && editForm.name && editForm.unitPrice > 0) {
      setItems(prev => prev.map(item =>
        item.id === editingItemId ? { ...item, ...editForm } : item
      ));
      setEditingItemId(null);
    }
  }, [editingItemId, editForm]);

  const addFromInventory = useCallback((invItem: typeof inventory[0]) => {
    addItem({ name: invItem.name, quantity: 1, unitPrice: invItem.purchasePrice, discount: 0 });
    setShowInventoryPicker(false);
  }, [addItem]);

  const handleSave = async () => {
    if (items.length === 0 || !customerValid) return;

    let customer;
    if (isCredit) {
      // Credit/due: store customer in DB for tracking
      customer = await findOrCreateCustomer({
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        email: custEmail.trim() || undefined,
      });
    } else {
      // Cash/Card/Online: embed customer info in bill but don't store separately
      customer = {
        id: Math.random().toString(36).substr(2, 9),
        name: custName.trim(),
        phone: custPhone.trim() || '',
        address: custAddress.trim() || '',
        email: custEmail.trim() || '',
        outstandingBalance: 0,
      };
    }

    const bill: Bill = {
      id: Math.random().toString(36).substr(2, 9),
      billNumber,
      date: billDate,
      customer,
      items,
      subtotal,
      discount: discountAmount,
      discountType,
      vat,
      grandTotal,
      status: 'Pending',
      paymentMethod,
      notes,
      createdBy: user?.name || 'Admin',
    };

    addBill(bill);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      navigate('/bills');
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const { downloadBillPDF } = await import('../utils/pdfGenerator');
    if (customerValid && items.length > 0) {
      const bill: Bill = {
        id: '', billNumber, date: billDate,
        customer: { id: '', name: custName.trim(), phone: custPhone.trim(), address: custAddress.trim(), email: custEmail.trim() || undefined, outstandingBalance: 0 },
        items, subtotal, discount: discountAmount, discountType, vat, grandTotal,
        status: 'Pending', paymentMethod, notes, createdBy: user?.name || 'Admin',
      };
      downloadBillPDF(bill, settings.name, settings.address, settings.contactNumber, settings.vatRate ?? 13);
    }
  };

  const previewBill: Bill = useMemo(() => ({
    id: 'preview', billNumber, date: billDate,
    customer: { id: '', name: custName || 'Customer Name', phone: custPhone || '', address: custAddress || '', outstandingBalance: 0 },
    items, subtotal, discount: discountAmount, discountType, vat, grandTotal,
    status: 'Pending', paymentMethod, notes, createdBy: user?.name || 'Admin',
  }), [billNumber, billDate, custName, custPhone, custAddress, items, subtotal, discountAmount, discountType, vat, grandTotal, paymentMethod, notes, user]);

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Create Invoice</h1>
          <p className="text-gray-500 mt-1">{billNumber}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} disabled={items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-2xl hover:bg-black transition-colors disabled:opacity-50 font-semibold">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF} disabled={items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-semibold">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-7 space-y-6 no-print">
          {/* Customer & Date */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-lg mb-4">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Customer name"
                  className={`w-full p-3 bg-gray-50 dark:bg-gray-800 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none ${!custName.trim() ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone {phoneRequired ? '*' : ''}</label>
                <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder={isCredit ? 'Required for due payments' : 'Optional'}
                  className={`w-full p-3 bg-gray-50 dark:bg-gray-800 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none ${phoneRequired && !custPhone.trim() ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <input value={custAddress} onChange={e => setCustAddress(e.target.value)} placeholder="City, District"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="Optional"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as Bill['paymentMethod'])}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online Transfer</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Invoice Items</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowInventoryPicker(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                  <Package className="w-4 h-4" /> From Inventory
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium text-center">Qty</th>
                    <th className="p-3 font-medium text-right">Rate</th>
                    <th className="p-3 font-medium text-center">Disc%</th>
                    <th className="p-3 font-medium text-right">Amount</th>
                    <th className="p-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {items.map((item, index) => {
                    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
                    const isEditing = editingItemId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        {isEditing ? (
                          <>
                            <td className="p-2 text-sm text-gray-400">{index + 1}</td>
                            <td className="p-2">
                              <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                                className="w-full p-2 text-sm border border-blue-300 rounded-lg outline-none bg-white dark:bg-gray-900" autoFocus />
                            </td>
                            <td className="p-2">
                              <input type="number" value={editForm.quantity} min={1}
                                onChange={e => setEditForm({...editForm, quantity: parseInt(e.target.value) || 1})}
                                className="w-full p-2 text-sm border border-blue-300 rounded-lg outline-none text-center bg-white dark:bg-gray-900" />
                            </td>
                            <td className="p-2">
                              <input type="number" value={editForm.unitPrice} min={0}
                                onChange={e => setEditForm({...editForm, unitPrice: parseFloat(e.target.value) || 0})}
                                className="w-full p-2 text-sm border border-blue-300 rounded-lg outline-none text-right bg-white dark:bg-gray-900" />
                            </td>
                            <td className="p-2">
                              <input type="number" value={editForm.discount} min={0} max={100}
                                onChange={e => setEditForm({...editForm, discount: parseFloat(e.target.value) || 0})}
                                className="w-full p-2 text-sm border border-blue-300 rounded-lg outline-none text-center bg-white dark:bg-gray-900" />
                            </td>
                            <td className="p-2 text-sm text-right font-bold">
                              NPR {(editForm.quantity * editForm.unitPrice * (1 - editForm.discount / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <button onClick={saveEditItem} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold">Save</button>
                                <button onClick={() => setEditingItemId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-sm text-gray-400">{index + 1}</td>
                            <td className="p-3 text-sm font-semibold">{item.name}</td>
                            <td className="p-3 text-sm text-center">{item.quantity}</td>
                            <td className="p-3 text-sm text-right">NPR {item.unitPrice.toLocaleString()}</td>
                            <td className="p-3 text-sm text-center text-gray-500">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                            <td className="p-3 text-sm text-right font-bold">NPR {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="p-3">
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => startEditItem(item)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => removeItem(item.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No items added yet</p>
                        <p className="text-sm mt-1">Add items below or pick from inventory</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Add Row */}
            <QuickAddRow onAdd={addItem} />

            {/* Discount, Notes, Actions */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Bill Discount</label>
                  <div className="flex gap-2">
                    <input type="number" value={discount} min={0}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                      <option value="percentage">%</option>
                      <option value="fixed">NPR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Delivery within 3 days"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => items.length > 0 ? setShowClearConfirm(true) : null}
                  disabled={items.length === 0}
                  className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
                  Clear All
                </button>
                <button onClick={handleSave} disabled={!customerValid || items.length === 0}
                  className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isSaved
                      ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none disabled:opacity-50'
                  }`}>
                  {isSaved ? (
                    <><CheckCircle2 className="w-6 h-6" /> Invoice Saved!</>
                  ) : (
                    'Save & Generate Invoice'
                  )}
                </button>
              </div>
            </div>
          </div>
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
              <InvoicePreview bill={previewBill} settings={settings} />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Picker Modal */}
      {showInventoryPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Pick from Inventory</h2>
              <button onClick={() => setShowInventoryPicker(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            {inventory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inventory.filter(i => i.status !== 'Out of Stock').map(item => (
                  <button key={item.id} onClick={() => addFromInventory(item)}
                    className="text-left p-4 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{item.category} | {item.unit}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-blue-600">NPR {item.purchasePrice.toLocaleString()}/{item.unit}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}>{item.quantity} {item.unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No inventory items available</p>
            )}
          </div>
        </div>
      )}

      <ConfirmModal isOpen={showClearConfirm} title="Clear All Items"
        message="Remove all items from this invoice? This cannot be undone."
        confirmLabel="Clear All" variant="warning"
        onConfirm={() => { setItems([]); setShowClearConfirm(false); }}
        onCancel={() => setShowClearConfirm(false)} />
    </div>
  );
};

function QuickAddRow({ onAdd }: { onAdd: (item: Omit<BillItem, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);

  const handleAdd = () => {
    if (name && unitPrice > 0) {
      onAdd({ name, quantity, unitPrice, discount });
      setName('');
      setQuantity(1);
      setUnitPrice(0);
      setDiscount(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl" onKeyDown={handleKeyDown}>
      <div className="md:col-span-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name"
          className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>
      <input type="number" value={quantity} min={1} onChange={e => setQuantity(parseInt(e.target.value) || 1)} placeholder="Qty"
        className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center" />
      <input type="number" value={unitPrice || ''} min={0} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} placeholder="Rate"
        className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-right" />
      <input type="number" value={discount || ''} min={0} max={100} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} placeholder="Disc%"
        className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center" />
      <button onClick={handleAdd} disabled={!name || unitPrice <= 0}
        className="w-full p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all text-sm">
        <Plus className="w-4 h-4 mx-auto" />
      </button>
    </div>
  );
}

export default Billing;
