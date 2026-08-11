import { useState } from 'react';
import { useStore } from '../contexts/store';
import { api } from '../services/api';
import type { Customer, CustomerPayment } from '../types';
import { Search, Trash2, Phone, MapPin, Mail, AlertCircle, HandCoins, X } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online', 'Cheque', 'Other'];

const Customers = () => {
  const { customers, bills, deleteCustomer, recordCustomerPayment } = useStore();
  const dueCustomers = customers.filter(c => c.outstandingBalance > 0);
  const { searchQuery, setSearchQuery, filteredItems: filteredCustomers } = useFilter(dueCustomers, ['name', 'phone', 'address', 'email']);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [toast, setToast] = useState('');

  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentBillId, setPaymentBillId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      setToast('Customer deleted');
    }
  };

  const pendingBills = paymentCustomer
    ? bills.filter(b => b.status === 'Pending' && b.customer?.id === paymentCustomer.id)
    : [];

  const openPaymentModal = async (customer: Customer) => {
    setPaymentCustomer(customer);
    setPaymentError('');
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentNote('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    const firstPending = bills.find(b => b.status === 'Pending' && b.customer?.id === customer.id);
    setPaymentBillId(firstPending?.id ?? '');
    setPaymentsLoading(true);
    setPayments([]);
    try {
      const history = await api.customerPayments.list(customer.id);
      setPayments(history);
    } catch (err: any) {
      console.error('Failed to load payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentCustomer(null);
    setPayments([]);
  };

  const handleRecordPayment = async () => {
    if (!paymentCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      setPaymentError('Enter a payment amount greater than 0');
      return;
    }
    setPaymentSubmitting(true);
    setPaymentError('');
    try {
      await recordCustomerPayment({
        customerId: paymentCustomer.id,
        billId: paymentBillId || null,
        amount,
        date: paymentDate,
        method: paymentMethod,
        note: paymentNote,
      });
      setPaymentAmount('');
      setPaymentNote('');
      setToast('Credit payment recorded');
      const history = await api.customerPayments.list(paymentCustomer.id);
      setPayments(history);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const totalDue = dueCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Due Customers</h1>
          <p className="text-gray-500 mt-1">
            Customers with pending payments ({dueCustomers.length})
          </p>
        </div>
        {dueCustomers.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-6 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Total Outstanding</p>
            <p className="text-2xl font-black text-orange-600 mt-0.5">
              NPR {totalDue.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:border-blue-300 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
          />
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4 text-right">Outstanding Balance</th>
                  <th className="px-6 py-4 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {customer.name}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{customer.address || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-xl font-bold text-sm">
                        <AlertCircle className="w-3.5 h-3.5" />
                        NPR {customer.outstandingBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openPaymentModal(customer)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                          title="View bills and record payment"
                        >
                          <HandCoins className="w-4 h-4" />
                          Payment
                        </button>
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-bold text-gray-500">No customers found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-bold text-gray-500">No outstanding dues</p>
              <p className="text-sm text-gray-400 mt-1">
                All customers are paid up. Customers with pending bills will appear here.
              </p>
            </>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold">{paymentCustomer.name}</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  {paymentCustomer.phone} · Outstanding{' '}
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    NPR {paymentCustomer.outstandingBalance.toLocaleString()}
                  </span>
                </p>
              </div>
              <button onClick={closePaymentModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pending bills */}
              <div>
                <h3 className="font-bold text-lg mb-4">Pending Bills</h3>
                {pendingBills.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3">Invoice No</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {pendingBills.map(bill => (
                          <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-blue-600 text-sm">{bill.billNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(bill.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right font-bold text-sm">NPR {bill.grandTotal.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Pending</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 text-center">
                    No pending bills for this customer.
                  </p>
                )}
              </div>

              {/* Record payment */}
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">Record Credit Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Apply to Bill</label>
                    <select
                      value={paymentBillId}
                      onChange={(e) => setPaymentBillId(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Not tied to a specific bill</option>
                      {pendingBills.map(bill => (
                        <option key={bill.id} value={bill.id}>{bill.billNumber} — NPR {bill.grandTotal.toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Amount (NPR) *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Note</label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Optional"
                      className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                {paymentError && <p className="text-red-500 text-xs mt-3">{paymentError}</p>}
                <button
                  onClick={handleRecordPayment}
                  disabled={paymentSubmitting}
                  className="mt-4 w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {paymentSubmitting ? 'Recording…' : 'Record Payment'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  When a payment fully covers a bill's balance, that bill is automatically marked as Paid.
                </p>
              </div>

              {/* Payment history */}
              <div>
                <h3 className="font-bold text-lg mb-4">Payment History</h3>
                {paymentsLoading ? (
                  <p className="text-sm text-gray-500 text-center py-6">Loading…</p>
                ) : payments.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Bill</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Note</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {payments.map(p => {
                          const bill = bills.find(b => b.id === p.billId);
                          return (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(p.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-sm">{bill ? <span className="font-mono font-bold text-blue-600 text-xs">{bill.billNumber}</span> : <span className="text-gray-400">—</span>}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.method || 'Cash'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 max-w-40 truncate">{p.note || '—'}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">NPR {p.amount.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 text-center">
                    No payments recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default Customers;
