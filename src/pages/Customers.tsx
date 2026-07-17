import { useState } from 'react';
import { useStore } from '../contexts/store';
import type { Customer } from '../types';
import { Search, Trash2, Phone, MapPin, Mail, AlertCircle } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Customers = () => {
  const { customers, deleteCustomer } = useStore();
  const dueCustomers = customers.filter(c => c.outstandingBalance > 0);
  const { searchQuery, setSearchQuery, filteredItems: filteredCustomers } = useFilter(dueCustomers, ['name', 'phone', 'address', 'email']);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [toast, setToast] = useState('');

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      setToast('Customer deleted');
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
                  <th className="px-6 py-4 w-16"></th>
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
                      <button
                        onClick={() => setDeleteTarget(customer)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        title="Delete customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
