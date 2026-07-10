import { useState } from 'react';
import { useStore } from '../contexts/store';
import type { Vendor } from '../types';
import { Plus, Search, Edit2, Trash2, X, Phone, MapPin } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';

const Vendors = () => {
  const { vendors, addVendor, updateVendor, deleteVendor } = useStore();
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(vendors, ['name', 'phone', 'address', 'panNumber']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({});

  const handleAddVendor = () => {
    if (formData.name && formData.phone) {
      const newVendor: Vendor = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        phone: formData.phone,
        address: formData.address || '',
        panNumber: formData.panNumber || '',
        outstandingBalance: 0,
      };
      addVendor(newVendor);
      setFormData({});
      setShowAddModal(false);
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
  };

  const handleUpdateVendor = () => {
    if (editingVendor && formData.name && formData.phone) {
      const updated: Vendor = {
        ...editingVendor,
        ...formData,
      };
      updateVendor(updated);
      setEditingVendor(null);
      setFormData({});
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Vendors & Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your supplier relationships</p>
        </div>
        <button 
          onClick={() => {
            setEditingVendor(null);
            setFormData({});
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          New Vendor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by name, phone, or address..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:border-blue-300 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length > 0 ? (
            filteredItems.map(vendor => (
              <div key={vendor.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg transition-all hover:border-blue-200 dark:hover:border-blue-900">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{vendor.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">PAN: {vendor.panNumber || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditVendor(vendor)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this vendor?')) {
                          deleteVendor(vendor.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-4 pb-4 border-b dark:border-gray-800">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{vendor.phone}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{vendor.address}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase">Outstanding Balance</span>
                  <span className="text-lg font-bold text-orange-600">NPR {vendor.outstandingBalance.toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500">
              No vendors found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingVendor) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingVendor(null);
                  setFormData({});
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Vendor Name *</label>
                <input 
                  placeholder="e.g. Paper Mart" 
                  value={formData.name || ''} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
                <input 
                  placeholder="e.g. 9851234567" 
                  value={formData.phone || ''} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <input 
                  placeholder="e.g. Biratnagar" 
                  value={formData.address || ''} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">PAN Number</label>
                <input 
                  placeholder="e.g. PAN123456" 
                  value={formData.panNumber || ''} 
                  onChange={(e) => setFormData({...formData, panNumber: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t dark:border-gray-800">
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVendor(null);
                    setFormData({});
                  }}
                  className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={editingVendor ? handleUpdateVendor : handleAddVendor}
                  disabled={!formData.name || !formData.phone}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
