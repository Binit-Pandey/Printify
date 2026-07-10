import { useState } from 'react';
import { useStore } from '../contexts/store';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const Settings = () => {
  const { settings, updateSettings } = useStore();
  const [formData, setFormData] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: keyof typeof settings, value: any) => {
    setFormData({...formData, [field]: value});
    setHasChanges(true);
    setIsSaved(false);
  };

  const handleSave = () => {
    updateSettings(formData);
    setHasChanges(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your company information and preferences</p>
      </div>

      {/* Company Information */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Company Information</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
            <input 
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Shree Printing Press"
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">PAN Number</label>
              <input 
                value={formData.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value)}
                placeholder="e.g. PAN987654"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">VAT Number</label>
              <input 
                value={formData.vatNumber}
                onChange={(e) => handleChange('vatNumber', e.target.value)}
                placeholder="e.g. VAT123456"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address</label>
            <textarea 
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. New Road, Kathmandu, Nepal"
              rows={3}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contact Number</label>
              <input 
                value={formData.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                placeholder="e.g. 01-4567890"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input 
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. info@shreeprint.com"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Tax Settings</h2>
        
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-200">VAT Rate Configuration</p>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">This rate will be applied to all bills automatically</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">VAT Rate (%)</label>
              <div className="relative">
                <input 
                  type="number"
                  value={formData.vatRate || 13}
                  onChange={(e) => handleChange('vatRate', parseFloat(e.target.value) || 0)}
                  placeholder="13"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="absolute right-4 top-4 text-gray-500 font-bold">%</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Preview</label>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Example: NPR 1,000 × {formData.vatRate || 13}% = NPR {((1000 * (formData.vatRate || 13)) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Data */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Data Management</h2>
        
        <div className="space-y-4">
          <button className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors font-bold text-gray-700 dark:text-gray-300">
            📥 Export Data as JSON
          </button>
          <button className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors font-bold text-gray-700 dark:text-gray-300">
            📤 Import Data from JSON
          </button>
          <button className="w-full p-4 border-2 border-dashed border-red-300 dark:border-red-700 rounded-2xl hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-bold text-red-700 dark:text-red-300">
            🗑️ Clear All Data (Cannot be undone)
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button 
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isSaved 
              ? 'bg-emerald-600 text-white' 
              : hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-6 h-6" />
              Settings Saved!
            </>
          ) : (
            <>
              <Save className="w-6 h-6" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Settings;
