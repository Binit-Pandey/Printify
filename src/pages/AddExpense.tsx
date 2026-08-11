import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Expense } from '../types';
import { Plus, Edit2, Paperclip, Receipt, TrendingDown } from 'lucide-react';
import Toast from '../components/Toast';

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Salary', 'Transport', 'Other'];

const AddExpense = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [canEditOwn, setCanEditOwn] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [receiptData, setReceiptData] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadMine = useCallback(async () => {
    try {
      const res = await api.expenses.mine();
      setExpenses(res.expenses);
      setCanEditOwn(res.canEditOwn);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
    }
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const resetForm = () => {
    setCategory('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setReceiptName('');
    setReceiptData('');
    setEditingId(null);
    setFormErrors({});
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Receipt must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptData(reader.result as string);
      setReceiptName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!category) errors.category = 'Please select a category';
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) errors.amount = 'Enter an amount greater than 0';
    if (!date || isNaN(Date.parse(date))) errors.date = 'Invalid date';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      const payload: Expense = {
        id: editingId ?? crypto.randomUUID(),
        category,
        amount: parseFloat(amount),
        reason: notes,
        date,
        addedBy: user?.name || 'Staff',
        receiptName: receiptName || undefined,
        receiptData: receiptData || undefined,
      };
      if (editingId) {
        await api.expenses.update(payload);
        setToast('Expense updated successfully');
      } else {
        await api.expenses.create(payload);
        setToast('Expense submitted successfully');
      }
      resetForm();
      await loadMine();
    } catch (err: any) {
      setError(err.message || 'Failed to submit expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setCategory(exp.category);
    setAmount(String(exp.amount));
    setDate(exp.date);
    setNotes(exp.reason);
    setReceiptName(exp.receiptName || '');
    setReceiptData(exp.receiptData || '');
  };

  const viewReceipt = (exp: Expense) => {
    if (exp.receiptData) window.open(exp.receiptData, '_blank');
  };

  const inputCls = 'w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Add Expense</h1>
          <p className="text-gray-500 mt-1">Submit an expense for approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{editingId ? 'Edit Expense' : 'New Expense'}</h2>
              <p className="text-sm text-gray-500">{editingId ? 'Update your submitted expense' : 'Fill in the details below'}</p>
            </div>
          </div>

          {editingId && (
            <div className="mb-5 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Editing your submitted expense
              <button onClick={resetForm} className="ml-3 font-bold text-amber-900 underline dark:text-amber-200">Cancel</button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Expense Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">Select Category</option>
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {formErrors.category && <p className="mt-1 text-xs text-red-500">{formErrors.category}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Amount (NPR) *</label>
              <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              {formErrors.amount && <p className="mt-1 text-xs text-red-500">{formErrors.amount}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              {formErrors.date && <p className="mt-1 text-xs text-red-500">{formErrors.date}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Description / Notes</label>
              <textarea
                placeholder="e.g. Monthly office rent"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Receipt / Bill Attachment</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
                <Paperclip className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {receiptName || 'Click to attach a receipt or bill image'}
                </span>
                <span className="text-xs text-gray-400">PNG, JPG or PDF · max 5 MB</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </label>
              {receiptName && receiptData && (
                <button type="button" onClick={() => window.open(receiptData, '_blank')} className="mt-2 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Preview attachment
                </button>
              )}
            </div>

            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
            >
              <Plus className="w-5 h-5" />
              {submitting ? 'Submitting…' : editingId ? 'Update Expense' : 'Submit Expense'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">My recent expenses</h2>
              <p className="text-sm text-gray-500">Only your own submissions are shown here.</p>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 text-center dark:border-gray-800">
              <TrendingDown className="mb-3 w-7 h-7 text-gray-300 dark:text-gray-600" />
              <p className="font-semibold">No expenses submitted yet</p>
              <p className="mt-1 text-sm text-gray-500">Your submitted expenses will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 text-right font-semibold">Amount</th>
                    <th className="pb-3 text-center font-semibold">Receipt</th>
                    <th className="pb-3 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {expenses
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-4 text-gray-600 dark:text-gray-400">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="py-4 font-medium">{exp.category}</td>
                        <td className="max-w-52 truncate py-4 text-gray-600 dark:text-gray-400">{exp.reason || '—'}</td>
                        <td className="py-4 text-right font-semibold text-red-600 dark:text-red-400">NPR {exp.amount.toLocaleString()}</td>
                        <td className="py-4 text-center">
                          {exp.receiptData ? (
                            <button onClick={() => viewReceipt(exp)} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {canEditOwn ? (
                            <button onClick={() => startEdit(exp)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors" title="Edit expense">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Read only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}    </div>
  );
};

export default AddExpense;
