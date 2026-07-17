import { useState, useMemo } from 'react';
import { useStore } from '../contexts/store';
import { Eye, Trash2, CheckCircle2, Clock, Search, Copy, X } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';
import InvoicePreview from '../components/InvoicePreview';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Bills = () => {
  const { bills, settings, updateBill, deleteBill, addBill } = useStore();
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(bills, ['billNumber', 'customer.name', 'customer.phone']);
  const [selectedBill, setSelectedBill] = useState<typeof bills[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [deleteTarget, setDeleteTarget] = useState<typeof bills[0] | null>(null);
  const [toast, setToast] = useState('');

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'All') return filteredItems;
    return filteredItems.filter(b => b.status === statusFilter);
  }, [filteredItems, statusFilter]);

  const stats = useMemo(() => {
    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.status === 'Paid').length;
    const pendingBills = bills.filter(b => b.status === 'Pending').length;
    const totalRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const paidRevenue = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.grandTotal, 0);
    return { totalBills, paidBills, pendingBills, totalRevenue, paidRevenue };
  }, [bills]);

  const handleToggleStatus = (bill: typeof bills[0]) => {
    updateBill({ ...bill, status: bill.status === 'Paid' ? 'Pending' : 'Paid' });
    setToast(`Bill marked as ${bill.status === 'Paid' ? 'Pending' : 'Paid'}`);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteBill(deleteTarget.id);
      setDeleteTarget(null);
      setToast('Bill deleted');
      if (selectedBill?.id === deleteTarget.id) setSelectedBill(null);
    }
  };

  const handleDuplicate = (bill: typeof bills[0]) => {
    const now = new Date();
    const newBillNumber = `INV-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-5)}`;
    const duplicate = {
      ...bill,
      id: Math.random().toString(36).substr(2, 9),
      billNumber: newBillNumber,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending' as const,
    };
    addBill(duplicate);
    setToast('Bill duplicated as new invoice');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bills & Invoices</h1>
          <p className="text-gray-500 mt-1">View and manage all invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Bills</div>
          <div className="text-3xl font-black mt-3 text-blue-600">{stats.totalBills}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Paid</div>
          <div className="text-3xl font-black mt-3 text-emerald-600">{stats.paidBills}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Pending</div>
          <div className="text-3xl font-black mt-3 text-orange-600">{stats.pendingBills}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Revenue</div>
          <div className="text-2xl font-black mt-3 text-blue-600">NPR {stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Paid Revenue</div>
          <div className="text-2xl font-black mt-3 text-emerald-600">NPR {stats.paidRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by bill number or customer..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:border-blue-300 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none" />
          </div>
          <div className="flex gap-2">
            {(['All', 'Paid', 'Pending'] as const).map(status => (
              <button key={status} onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>{status}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-800 text-left text-sm text-gray-500">
                <th className="pb-4 font-medium">Invoice No</th>
                <th className="pb-4 font-medium">Date</th>
                <th className="pb-4 font-medium">Customer</th>
                <th className="pb-4 font-medium text-right">Amount</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Payment</th>
                <th className="pb-4 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {filteredByStatus.length > 0 ? (
                filteredByStatus.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(bill => (
                  <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-5 font-mono font-bold text-blue-600 text-sm">{bill.billNumber}</td>
                    <td className="py-5 text-gray-600 dark:text-gray-400 text-sm">{new Date(bill.date).toLocaleDateString()}</td>
                    <td className="py-5 font-medium text-sm">{bill.customer.name}</td>
                    <td className="py-5 text-right font-bold text-sm">NPR {bill.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {bill.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-5 text-sm text-gray-500">{bill.paymentMethod || 'Cash'}</td>
                    <td className="py-5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setSelectedBill(bill)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(bill)}
                          className={`p-2 rounded-xl transition-colors ${bill.status === 'Pending' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30'}`}
                          title={bill.status === 'Pending' ? 'Mark as Paid' : 'Mark as Pending'}>
                          {bill.status === 'Pending' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDuplicate(bill)}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-colors" title="Duplicate">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(bill)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">No bills found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-3xl no-print">
              <div>
                <h2 className="text-xl font-bold">{selectedBill.billNumber}</h2>
                <p className="text-gray-500 text-sm mt-0.5">{new Date(selectedBill.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-black transition-colors text-sm font-semibold">
                  Print
                </button>
                <button onClick={() => setSelectedBill(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="p-6 print:p-0">
              <div className="print-invoice-wrap">
                <InvoicePreview bill={selectedBill} settings={settings} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t dark:border-gray-800 no-print">
              <button onClick={() => setSelectedBill(null)}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Close
              </button>
              <button onClick={() => handleToggleStatus(selectedBill)}
                className={`flex-1 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                  selectedBill.status === 'Pending'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}>
                {selectedBill.status === 'Pending' ? <><CheckCircle2 className="w-4 h-4" /> Mark as Paid</> : <><Clock className="w-4 h-4" /> Mark as Pending</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteTarget} title="Delete Invoice"
        message={`Delete invoice ${deleteTarget?.billNumber}? This action cannot be undone.`}
        confirmLabel="Delete" onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default Bills;
