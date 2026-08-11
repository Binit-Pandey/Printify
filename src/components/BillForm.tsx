import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Edit2, Package, X } from 'lucide-react';
import { useStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import type { BillItem, Bill } from '../types';
import ConfirmModal from './ConfirmModal';

interface BillFormProps {
  initialBill?: Bill;
  submitLabel?: string;
  onSubmit: (bill: Bill) => void | Promise<void>;
  onChange?: (bill: Bill) => void;
  onSaved?: () => void;
}

const BillForm = ({ initialBill, submitLabel, onSubmit, onChange, onSaved }: BillFormProps) => {
  const { inventory, settings } = useStore();
  const { user } = useAuth();

  const [custName, setCustName] = useState(initialBill?.customer?.name ?? '');
  const [custPhone, setCustPhone] = useState(initialBill?.customer?.phone ?? '');
  const [custAddress, setCustAddress] = useState(initialBill?.customer?.address ?? '');
  const [custEmail, setCustEmail] = useState(initialBill?.customer?.email ?? '');
  const [billDate, setBillDate] = useState(initialBill?.date ?? new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<BillItem[]>(initialBill?.items ?? []);
  const [discount, setDiscount] = useState(initialBill?.discount ?? 0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(initialBill?.discountType ?? 'percentage');
  const [paymentMethod, setPaymentMethod] = useState<Bill['paymentMethod']>(initialBill?.paymentMethod ?? 'Cash');
  const [notes, setNotes] = useState(initialBill?.notes ?? '');
  const [isSaved, setIsSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 1, unitPrice: 0, discount: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const billNumber = useMemo(() => {
    if (initialBill?.billNumber) return initialBill.billNumber;
    const now = new Date();
    const seq = String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(Date.now()).slice(-5);
    return `INV-${seq}`;
  }, [initialBill?.billNumber]);

  const vatRate = (settings.vatRate ?? 13) / 100;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount / 100)), 0);
  const discountAmount = discountType === 'percentage' ? subtotal * discount / 100 : Math.min(discount, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const vat = afterDiscount * vatRate;
  const grandTotal = afterDiscount + vat;

  const isCredit = paymentMethod === 'Credit';
  const phoneRequired = isCredit && custName.trim() !== '';
  const customerValid = custName.trim() !== '' && (!phoneRequired || custPhone.trim() !== '');

  const computedBill: Bill = useMemo(() => ({
    id: initialBill?.id ?? crypto.randomUUID(),
    billNumber,
    date: billDate,
    customer: {
      id: initialBill?.customer?.id ?? '',
      name: custName || 'Customer Name',
      phone: custPhone || '',
      address: custAddress || '',
      email: custEmail || undefined,
      outstandingBalance: 0,
    },
    items,
    subtotal,
    discount: discountAmount,
    discountType,
    vat,
    grandTotal,
    status: initialBill?.status ?? (paymentMethod === 'Credit' ? 'Pending' : 'Paid'),
    paymentMethod,
    notes,
    createdBy: initialBill?.createdBy ?? (user?.name || 'Admin'),
  }), [initialBill, billNumber, billDate, custName, custPhone, custAddress, custEmail, items, subtotal, discountAmount, discountType, vat, grandTotal, paymentMethod, notes, user]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current?.(computedBill);
  }, [computedBill]);

  const addItem = useCallback((item: Omit<BillItem, 'id'>) => {
    setItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
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
    if (items.length === 0 || !customerValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(computedBill);
      setIsSaved(true);
      onSaved?.();
      setTimeout(() => setIsSaved(false), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="space-y-6">
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
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="Optional"
              className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date</label>
            <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as Bill['paymentMethod'])} className={inputCls}>
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
            <button onClick={handleSave} disabled={!customerValid || items.length === 0 || submitting}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSaved
                  ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none disabled:opacity-50'
              }`}>
              {isSaved ? (
                <><CheckCircle2 className="w-6 h-6" /> {initialBill ? 'Invoice Updated!' : 'Invoice Saved!'}</>
              ) : (
                submitLabel ?? 'Save & Generate Invoice'
              )}
            </button>
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

export default BillForm;
