import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/ui/Card';
import Toast from '../components/Toast';
import { useMemo, useState } from 'react';
import type { Expense } from '../types';
import { ArrowUpRight, BarChart3, Clock3, Edit2, Paperclip, Plus, Receipt, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function MetricCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string; detail?: string; icon: typeof Wallet; tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
  };
  return <Card className="flex min-h-36 flex-col justify-between p-5"><div className="flex items-start justify-between gap-3"><div className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">{label}</div><div className={`flex size-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon aria-hidden="true" className="size-4" /></div></div><div><div className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{value}</div>{detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}</div></Card>;
}

function BillsTable({ bills }: { bills: any[] }) {
  if (!bills.length) return <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center dark:border-slate-800"><Receipt aria-hidden="true" className="mb-3 size-7 text-slate-300 dark:text-slate-600" /><p className="font-semibold">No bills yet</p><p className="mt-1 text-sm text-slate-500">New bills will appear here.</p></div>;
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400"><th className="pb-3 font-semibold">Bill no.</th><th className="pb-3 font-semibold">Customer</th><th className="pb-3 text-right font-semibold">Amount</th><th className="pb-3 text-center font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{bills.slice(-5).reverse().map(bill => <tr key={bill.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"><td className="py-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{bill.billNumber}</td><td className="py-4 font-medium">{bill.customer.name}</td><td className="py-4 text-right font-semibold">NPR {bill.grandTotal.toLocaleString()}</td><td className="py-4 text-center"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>{bill.status}</span></td></tr>)}</tbody></table></div>;
}

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Salary', 'Transport', 'Other'];

function StaffExpenseDashboard() {
  const { user } = useAuth();
  const { expenses, addExpense, updateExpense, canEditOwnExpense } = useStore();
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

  const myExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

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
        await updateExpense(payload);
        setToast('Expense updated successfully');
      } else {
        await addExpense(payload);
        setToast('Expense submitted successfully');
      }
      resetForm();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewReceipt = (exp: Expense) => {
    if (exp.receiptData) window.open(exp.receiptData, '_blank');
  };

  const inputCls = 'w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">Expense entry</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Staff dashboard</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Welcome back, <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span></p>
      </header>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
              <Plus aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <p className="text-sm text-slate-500">Submit an expense for approval</p>
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
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Expense Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">Select Category</option>
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {formErrors.category && <p className="mt-1 text-xs text-red-500">{formErrors.category}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Amount (NPR) *</label>
              <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              {formErrors.amount && <p className="mt-1 text-xs text-red-500">{formErrors.amount}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              {formErrors.date && <p className="mt-1 text-xs text-red-500">{formErrors.date}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Description / Notes</label>
              <textarea
                placeholder="e.g. Monthly office rent"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Receipt / Bill Attachment</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
                <Paperclip aria-hidden="true" className="size-6 text-slate-400" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {receiptName || 'Click to attach a receipt or bill image'}
                </span>
                <span className="text-xs text-slate-400">PNG, JPG or PDF · max 5 MB</span>
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
              <Plus aria-hidden="true" className="size-5" />
              {submitting ? 'Submitting…' : editingId ? 'Update Expense' : 'Submit Expense'}
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Receipt aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">My submitted expenses</h2>
              <p className="text-sm text-slate-500">Only your own submissions are shown here.</p>
            </div>
          </div>

          {myExpenses.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center dark:border-slate-800">
              <Receipt aria-hidden="true" className="mb-3 size-7 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold">No expenses submitted yet</p>
              <p className="mt-1 text-sm text-slate-500">Your submitted expenses will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 text-right font-semibold">Amount</th>
                    <th className="pb-3 text-center font-semibold">Receipt</th>
                    <th className="pb-3 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myExpenses.map(exp => (
                    <tr key={exp.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-4 text-slate-600 dark:text-slate-400">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="py-4 font-medium">{exp.category}</td>
                      <td className="max-w-52 truncate py-4 text-slate-600 dark:text-slate-400">{exp.reason || '—'}</td>
                      <td className="py-4 text-right font-semibold text-red-600 dark:text-red-400">NPR {exp.amount.toLocaleString()}</td>
                      <td className="py-4 text-center">
                        {exp.receiptData ? (
                          <button onClick={() => viewReceipt(exp)} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        {canEditOwnExpense ? (
                          <button onClick={() => startEdit(exp)} className="inline-flex items-center gap-1.5 rounded-xl p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Edit expense">
                            <Edit2 aria-hidden="true" className="size-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  const { bills, customers, expenses } = useStore();
  const { dark } = useTheme();
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBills = bills.filter(b => b.date === today);
    const todaySales = todayBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
    const monthlyRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const monthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pending = bills.filter(b => b.status === 'Pending');
    return { todaySales, todayBillsCount: todayBills.length, todayExpenses, todayProfit: todaySales - todayExpenses, monthlyRevenue, monthlyProfit: monthlyRevenue - monthlyExpenses, activeCustomers: customers.length, pendingBills: pending.length, pendingAmount: pending.reduce((s, b) => s + b.grandTotal, 0) };
  }, [bills, customers, expenses]);
  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { name: days[d.getDay()], date: d.toISOString().split('T')[0], sales: 0, expenses: 0 }; });
    last7Days.forEach(day => { day.sales = bills.filter(b => b.date === day.date).reduce((sum, b) => sum + b.grandTotal, 0); day.expenses = expenses.filter(e => e.date === day.date).reduce((sum, e) => sum + e.amount, 0); });
    const serviceMap: Record<string, number> = {}; bills.forEach(b => b.items.forEach(item => { serviceMap[item.name] = (serviceMap[item.name] || 0) + item.quantity; }));
    const topServices = Object.entries(serviceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const expenseMap: Record<string, number> = {}; expenses.forEach(e => { expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount; });
    const expenseBreakdown = Object.entries(expenseMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    return { last7Days, topServices, expenseBreakdown };
  }, [bills, expenses]);

  if (user?.role === 'staff') return <StaffExpenseDashboard />;

  return <div className="flex flex-col gap-7"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">Print floor overview</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1><p className="mt-2 text-slate-500 dark:text-slate-400">A real-time view of your printing press.</p></div><div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><span className="size-2 rounded-full bg-emerald-500" />Live data</div></header>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"><MetricCard label="Today&apos;s sales" value={`NPR ${metrics.todaySales.toLocaleString()}`} icon={Wallet} /><MetricCard label="Today&apos;s profit" value={`NPR ${metrics.todayProfit.toLocaleString()}`} icon={metrics.todayProfit >= 0 ? TrendingUp : TrendingDown} tone={metrics.todayProfit >= 0 ? 'emerald' : 'rose'} /><MetricCard label="Active customers" value={String(metrics.activeCustomers)} icon={Users} tone="amber" /><MetricCard label="Pending bills" value={String(metrics.pendingBills)} detail={`NPR ${metrics.pendingAmount.toLocaleString()} outstanding`} icon={Clock3} tone="rose" /><MetricCard label="Monthly profit" value={`NPR ${metrics.monthlyProfit.toLocaleString()}`} detail={`Revenue NPR ${metrics.monthlyRevenue.toLocaleString()}`} icon={BarChart3} tone="violet" /></div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3"><Card className="lg:col-span-2"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-lg font-bold">Sales vs expenses</h2><p className="mt-1 text-sm text-slate-500">Last seven days</p></div><ArrowUpRight aria-hidden="true" className="size-5 text-slate-400" /></div><div className="h-80">{chartData.last7Days.some(day => day.sales || day.expenses) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.last7Days}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#1e293b' : '#e2e8f0'} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip cursor={{ fill: dark ? '#1e293b' : '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, backgroundColor: dark ? '#0f172a' : '#ffffff', color: dark ? '#f1f5f9' : '#0f172a' }} formatter={(value, name) => [`NPR ${Number(value ?? 0).toLocaleString()}`, String(name ?? '').replace(/^./, c => c.toUpperCase())]} /><Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} name="Sales" /><Bar dataKey="expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Expenses" /></BarChart></ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center text-center"><BarChart3 aria-hidden="true" className="mb-3 size-8 text-slate-300 dark:text-slate-600" /><p className="font-semibold">No activity this week</p><p className="mt-1 text-sm text-slate-500">Sales and expenses will appear here.</p></div>}</div></Card>
      <Card><div className="mb-4 flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"><Wallet aria-hidden="true" className="size-4" /></div><div><h2 className="text-lg font-bold">Expense breakdown</h2><p className="text-sm text-slate-500">By category</p></div></div><div className="h-48">{chartData.expenseBreakdown.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">{chartData.expenseBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number | string | ReadonlyArray<number | string> | undefined) => [`NPR ${Number(value ?? 0).toLocaleString()}`, 'Amount']} /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No expenses recorded</div>}</div><div className="mt-3 flex flex-col gap-2">{chartData.expenseBreakdown.map((exp, index) => <div key={exp.name} className="flex items-center justify-between text-sm"><div className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} /><span className="truncate text-slate-500 dark:text-slate-400">{exp.name}</span></div><span className="font-semibold">NPR {exp.value.toLocaleString()}</span></div>)}</div></Card></div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Card><div className="mb-5"><h2 className="text-lg font-bold">Top selling services</h2><p className="mt-1 text-sm text-slate-500">What customers order most.</p></div><div className="h-72">{chartData.topServices.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.topServices} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">{chartData.topServices.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, backgroundColor: dark ? '#0f172a' : '#ffffff' }} /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No services recorded</div>}</div><div className="mt-4 grid grid-cols-2 gap-3">{chartData.topServices.map((service, index) => <div key={service.name} className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} /><span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{service.name}</span></div>)}</div></Card><Card><div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-bold">Recent bills</h2><p className="mt-1 text-sm text-slate-500">Latest customer transactions.</p></div><Receipt aria-hidden="true" className="size-5 text-slate-400" /></div><BillsTable bills={bills} /></Card></div>
  </div>;
};

export default Dashboard;
