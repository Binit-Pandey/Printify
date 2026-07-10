import { useState, useMemo } from 'react';
import { useStore } from '../contexts/store';
import { Eye, Trash2, CheckCircle2, Clock, Search, FileText } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';

const Bills = () => {
  const { bills, updateBill, deleteBill } = useStore();
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(bills, ['billNumber']);
  const [selectedBill, setSelectedBill] = useState<typeof bills[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');

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

  const handleMarkAsPaid = (bill: typeof bills[0]) => {
    updateBill({ ...bill, status: 'Paid' });
  };

  const handleMarkAsPending = (bill: typeof bills[0]) => {
    updateBill({ ...bill, status: 'Pending' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bills & Invoices</h1>
          <p className="text-gray-500 mt-1">View and manage all bills</p>
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
            <input 
              type="text" 
              placeholder="Search by bill number or customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:border-blue-300 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['All', 'Paid', 'Pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-800 text-left text-sm text-gray-500">
                <th className="pb-4 font-medium">Bill No</th>
                <th className="pb-4 font-medium">Date</th>
                <th className="pb-4 font-medium">Customer</th>
                <th className="pb-4 font-medium text-right">Amount</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {filteredByStatus.length > 0 ? (
                filteredByStatus.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(bill => (
                  <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-5 font-mono font-bold text-blue-600">{bill.billNumber}</td>
                    <td className="py-5 text-gray-600 dark:text-gray-400">{new Date(bill.date).toLocaleDateString()}</td>
                    <td className="py-5 font-medium">{bill.customer.name}</td>
                    <td className="py-5 text-right font-bold">NPR {bill.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        bill.status === 'Paid' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {bill.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-5">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setSelectedBill(bill)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                          title="View bill"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {bill.status === 'Pending' ? (
                          <button 
                            onClick={() => handleMarkAsPaid(bill)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors"
                            title="Mark as paid"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleMarkAsPending(bill)}
                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xl transition-colors"
                            title="Mark as pending"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this bill?')) {
                              deleteBill(bill.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                          title="Delete bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">No bills found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedBill.billNumber}</h2>
                <p className="text-gray-500 mt-1">{new Date(selectedBill.date).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-6 pb-6 border-b dark:border-gray-800">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400 mb-1">Customer</p>
                  <p className="font-bold text-lg">{selectedBill.customer.name}</p>
                  <p className="text-sm text-gray-500">{selectedBill.customer.phone}</p>
                  <p className="text-sm text-gray-500">{selectedBill.customer.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-gray-400 mb-1">Status</p>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold inline-flex items-center gap-1 ${
                    selectedBill.status === 'Paid' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {selectedBill.status === 'Paid' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-3">Items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800">
                      <th className="text-left py-2 font-medium">Description</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Rate</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {selectedBill.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-3">{item.name}</td>
                        <td className="text-right py-3">{item.quantity}</td>
                        <td className="text-right py-3">NPR {item.unitPrice.toLocaleString()}</td>
                        <td className="text-right py-3 font-bold">NPR {(item.quantity * item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-medium">NPR {selectedBill.subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>VAT</span>
                <span className="font-medium">NPR {selectedBill.vat.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-2xl font-black border-t dark:border-gray-800 pt-3 text-blue-600">
                <span>Total</span>
                <span>NPR {selectedBill.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t dark:border-gray-800">
              <button 
                onClick={() => setSelectedBill(null)}
                className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => handlePrint()}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;
