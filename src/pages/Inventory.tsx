import { useState, useMemo } from 'react';
import { useStore } from '../contexts/store';
import type { InventoryItem } from '../types';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';

const Inventory = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useStore();
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(inventory, ['name', 'category', 'vendor']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [inventory]);

  const filteredByCategory = useMemo(() => {
    if (selectedCategory === 'All') return filteredItems;
    return filteredItems.filter(i => i.category === selectedCategory);
  }, [filteredItems, selectedCategory]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.quantity < 10).length;
  }, [inventory]);

  const handleAddItem = () => {
    if (formData.name && formData.category && formData.unit && formData.purchasePrice !== undefined) {
      const newItem: InventoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        quantity: formData.quantity || 0,
        purchasePrice: formData.purchasePrice,
        vendor: formData.vendor || '',
        status: formData.quantity! > 20 ? 'In Stock' : formData.quantity! > 0 ? 'Low Stock' : 'Out of Stock',
      };
      addInventoryItem(newItem);
      setFormData({});
      setShowAddModal(false);
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData(item);
  };

  const handleUpdateItem = () => {
    if (editingItem && formData.name && formData.category) {
      const updated: InventoryItem = {
        ...editingItem,
        ...formData,
        status: formData.quantity! > 20 ? 'In Stock' : formData.quantity! > 0 ? 'Low Stock' : 'Out of Stock',
      };
      updateInventoryItem(updated);
      setEditingItem(null);
      setFormData({});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-100 text-emerald-700';
      case 'Low Stock':
        return 'bg-orange-100 text-orange-700';
      case 'Out of Stock':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track and manage your printing supplies</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setFormData({});
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {lowStockItems > 0 && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-orange-900 dark:text-orange-200">{lowStockItems} items have low stock</p>
            <p className="text-sm text-orange-800 dark:text-orange-300">Consider ordering more supplies soon</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, category, or vendor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:border-blue-300 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-800 text-left text-sm text-gray-500">
                <th className="pb-4 font-medium">Item Name</th>
                <th className="pb-4 font-medium">Category</th>
                <th className="pb-4 font-medium">Unit</th>
                <th className="pb-4 font-medium text-center">Quantity</th>
                <th className="pb-4 font-medium text-right">Unit Price</th>
                <th className="pb-4 font-medium">Vendor</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {filteredByCategory.length > 0 ? (
                filteredByCategory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-5 font-bold">{item.name}</td>
                    <td className="py-5 text-gray-600 dark:text-gray-400">{item.category}</td>
                    <td className="py-5 text-gray-600 dark:text-gray-400">{item.unit}</td>
                    <td className="py-5 text-center font-bold text-blue-600">{item.quantity}</td>
                    <td className="py-5 text-right font-semibold">NPR {item.purchasePrice.toLocaleString()}</td>
                    <td className="py-5 text-gray-600 dark:text-gray-400">{item.vendor}</td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-5">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleEditItem(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this item?')) {
                              deleteInventoryItem(item.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">No items found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  setFormData({});
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Item Name *</label>
                  <input 
                    placeholder="e.g. A4 Paper" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                  <input 
                    placeholder="e.g. Paper" 
                    value={formData.category || ''} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Unit *</label>
                  <input 
                    placeholder="e.g. Ream, Liter, Box" 
                    value={formData.unit || ''} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
                  <input 
                    type="number"
                    placeholder="0" 
                    value={formData.quantity || 0} 
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Unit Price (NPR) *</label>
                  <input 
                    type="number"
                    placeholder="0" 
                    value={formData.purchasePrice || 0} 
                    onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Vendor</label>
                  <input 
                    placeholder="e.g. Paper Mart" 
                    value={formData.vendor || ''} 
                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t dark:border-gray-800">
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({});
                  }}
                  className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                  disabled={!formData.name || !formData.category || !formData.unit || formData.purchasePrice === undefined}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
