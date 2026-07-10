import { useState, useMemo } from 'react';
import { useStore } from '../contexts/store';
import type { Expense } from '../types';
import { Plus, Search, Trash2, X, TrendingDown } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Salary', 'Transport', 'Other'];

const Expenses = () => {
  const { expenses, addExpense, deleteExpense } = useStore();
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(expenses, ['category', 'reason']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const filteredByMonth = useMemo(() => {
    return filteredItems.filter(e => e.date.startsWith(selectedMonth));
  }, [filteredItems, selectedMonth]);

  const monthlySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    filteredByMonth.forEach(e => {
      summary[e.category] = (summary[e.category] || 0) + e.amount;
    });
    return summary;
  }, [filteredByMonth]);

  const totalExpenses = useMemo(() => {
    return filteredByMonth.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredByMonth]);

  const handleAddExpense = () => {
    if (formData.category && formData.amount && formData.amount > 0) {
      const newExpense: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        category: formData.category,
        amount: formData.amount,
        reason: formData.reason || '',
        date: formData.date || new Date().toISOString().split('T')[0],
        addedBy: 'Admin',
      };
      addExpense(newExpense);
      setFormData({});
      setShowAddModal(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Rent': 'bg-blue-100 text-blue-700',
      'Utilities': 'bg-yellow-100 text-yellow-700',
      'Supplies': 'bg-green-100 text-green-700',
      'Maintenance': 'bg-purple-100 text-purple-700',
      'Salary': 'bg-pink-100 text-pink-700',
      'Transport': 'bg-indigo-100 text-indigo-700',
      'Other': 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Expenses</h1>
          <p className="text-gray-500 mt-1">Track and manage your business expenses</p>
        </div>
        <button 
          onClick={() => {
            setFormData({});
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Expenses</div>
          <div className="text-3xl font-black mt-3 text-red-600">NPR {totalExpenses.toLocaleString()}</div>
        </div>
        
        {Object.entries(monthlySummary).slice(0, 3).map(([category, amount]) => (
          <div key={category} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="text-sm font-bold uppercase tracking-wider text-gray-400">{category}</div>
            <div className="text-2xl font-black mt-3">NPR {amount.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by category or reason..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:border-blue-300 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
              />
            </div>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-800 text-left text-sm text-gray-500">
                  <th className="pb-4 font-medium">Date</th>
                  <th className="pb-4 font-medium">Category</th>
                  <th className="pb-4 font-medium">Reason</th>
                  <th className="pb-4 font-medium text-right">Amount</th>
                  <th className="pb-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {filteredByMonth.length > 0 ? (
                  filteredByMonth.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-5 font-medium text-gray-600 dark:text-gray-400">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-5 text-gray-600 dark:text-gray-400">{expense.reason}</td>
                      <td className="py-5 text-right font-bold text-red-600">NPR {expense.amount.toLocaleString()}</td>
                      <td className="py-5">
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this expense?')) {
                              deleteExpense(expense.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">No expenses found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Category Breakdown
          </h3>
          <div className="space-y-4">
            {Object.entries(monthlySummary).length > 0 ? (
              Object.entries(monthlySummary)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm font-bold">NPR {amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all"
                        style={{width: `${(amount / totalExpenses) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-gray-500 py-8">No expenses recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Expense</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({});
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date *</label>
                <input 
                  type="date"
                  value={formData.date || new Date().toISOString().split('T')[0]} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                <select 
                  value={formData.category || ''} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Amount (NPR) *</label>
                <input 
                  type="number"
                  placeholder="0" 
                  value={formData.amount || ''} 
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Reason</label>
                <textarea 
                  placeholder="e.g. Monthly office rent" 
                  value={formData.reason || ''} 
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows={3}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t dark:border-gray-800">
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({});
                  }}
                  className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddExpense}
                  disabled={!formData.category || !formData.amount || formData.amount <= 0}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
