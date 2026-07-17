import { useState, useRef } from 'react';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/ThemeContext';
import { Save, AlertCircle, CheckCircle2, Sun, Moon, Upload, Download, Image } from 'lucide-react';
import { api } from '../services/api';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const Settings = () => {
  const { settings, updateSettings, initialize } = useStore();
  const { dark, toggle: toggleTheme } = useTheme();
  const [formData, setFormData] = useState(settings);

  // Keep formData in sync when the store's settings are updated (e.g. after data import)
  useEffect(() => {
    setFormData(settings);
  }, [settings]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [importConfirm, setImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name || formData.name.trim().length < 2) errors.name = 'Company name must be at least 2 characters';
    if (!formData.address || formData.address.trim().length < 5) errors.address = 'Address must be at least 5 characters';
    if (!formData.contactNumber || formData.contactNumber.trim().length < 7) errors.contactNumber = 'Contact number must be at least 7 characters';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address';
    if (formData.vatRate !== undefined && (formData.vatRate < 0 || formData.vatRate > 100)) errors.vatRate = 'VAT rate must be between 0 and 100';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) setFormErrors({ ...formErrors, [field]: '' });
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await updateSettings(formData);
      setToastType('success');
      setToast('Settings saved successfully');
    } catch {
      setToastType('error');
      setToast('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.settings.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `printpress-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToastType('success');
      setToast('Data exported successfully');
    } catch {
      setToastType('error');
      setToast('Failed to export data');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.customers && !data.inventory && !data.vendors && !data.bills) {
          setToastType('error');
          setToast('Invalid backup file format');
          return;
        }
        setPendingImport(data);
        setImportConfirm(true);
      } catch {
        setToastType('error');
        setToast('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!pendingImport) return;
    try {
      await api.settings.importData(pendingImport);
      await initialize();
      setImportConfirm(false);
      setPendingImport(null);
      setToastType('success');
      setToast('Data imported successfully. Page will refresh.');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setToastType('error');
      setToast('Failed to import data');
    }
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
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company Name *</label>
            <input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Shree Printing Press"
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Logo URL</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  value={formData.logo || ''}
                  onChange={(e) => handleChange('logo', e.target.value)}
                  placeholder="e.g. https://example.com/logo.png"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {formData.logo && (
                <div className="w-16 h-16 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                  <img
                    src={formData.logo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {!formData.logo && <Image className="w-6 h-6 text-gray-400" />}
                </div>
              )}
            </div>
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
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address *</label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. New Road, Kathmandu, Nepal"
              rows={3}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contact Number *</label>
              <input
                value={formData.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                placeholder="e.g. 01-4567890"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {formErrors.contactNumber && <p className="text-red-500 text-xs mt-1">{formErrors.contactNumber}</p>}
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
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
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
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">This rate will be applied to all new bills automatically</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">VAT Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.vatRate ?? 13}
                  onChange={(e) => handleChange('vatRate', parseFloat(e.target.value) || 0)}
                  placeholder="13"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="absolute right-4 top-4 text-gray-500 font-bold">%</span>
              </div>
              {formErrors.vatRate && <p className="text-red-500 text-xs mt-1">{formErrors.vatRate}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Preview</label>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Example: NPR 1,000 x {formData.vatRate ?? 13}% = NPR {((1000 * (formData.vatRate ?? 13)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Appearance</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => dark && toggleTheme()}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
              !dark
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Sun className="w-8 h-8 text-amber-500" />
            <span className="font-bold text-sm">Light Mode</span>
          </button>
          <button
            onClick={() => !dark && toggleTheme()}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
              dark
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Moon className="w-8 h-8 text-indigo-400" />
            <span className="font-bold text-sm">Dark Mode</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          {dark ? 'Currently using dark mode. Click Light Mode to switch.' : 'Currently using light mode. Click Dark Mode to switch.'}
        </p>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Data Management</h2>

        <div className="space-y-4">
          <button
            onClick={handleExport}
            className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" />
            Export Data as JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-3"
          >
            <Upload className="w-5 h-5" />
            Import Data from JSON
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isSaving
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-6 h-6" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Import Confirmation Modal */}
      <ConfirmModal
        isOpen={importConfirm}
        title="Import Data"
        message="This will replace ALL existing data with the imported data. This cannot be undone. Continue?"
        onConfirm={handleImportConfirm}
        onCancel={() => { setImportConfirm(false); setPendingImport(null); }}
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} type={toastType} />}
    </div>
  );
};

export default Settings;
