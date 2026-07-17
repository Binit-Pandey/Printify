import { useState } from 'react';
import { useStore } from '../contexts/store';
import type { Customer } from '../types';
import { Search, Trash2, X } from 'lucide-react';
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Due Customers</h1>
          <p className="text-gray-500 mt-1">Customers with pending payments ({dueCustomers.length})</p>
        </div>
      </div>

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
