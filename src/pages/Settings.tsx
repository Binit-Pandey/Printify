import { useState, useRef, useEffect } from 'react';
import { useStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Save, AlertCircle, Sun, Moon, Upload, Download, Database, Image, Send, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { fileToLogoDataUrl, isUploadedLogo } from '../utils/image';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { localDateKey } from '../utils/date';

const Settings = () => {
  const { settings, updateSettings, initialize } = useStore();
  const { dark, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState(settings);
  // True while the user has unsaved edits. Live refreshes push a fresh
  // `settings` object on every data change, so syncing unconditionally would
  // wipe whatever is half-typed in the form.
  const dirtyRef = useRef(false);
  // Mirror of dirtyRef that React can re-render on (the ref alone cannot).
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const markDirty = (value: boolean) => {
    dirtyRef.current = value;
    setHasUnsaved(value);
  };

  // Adopt settings pushed in by the store (first load, data import, DB
  // restore) — but never while the user has unsaved edits.
  useEffect(() => {
    if (dirtyRef.current) return;
    setFormData(settings);
  }, [settings]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [importConfirm, setImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [dbRestoreConfirm, setDbRestoreConfirm] = useState(false);
  const [pendingDbRestore, setPendingDbRestore] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

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
    markDirty(true);
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) setFormErrors({ ...formErrors, [field]: '' });
  };

  // ── Logo upload ────────────────────────────────────────────────────────────
  const [logoPreview, setLogoPreview] = useState('');
  const [isReadingLogo, setIsReadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Show the stored logo only when it is a real uploaded image. Legacy records
  // hold a bare path such as "/logo.png", which renders as a broken image.
  useEffect(() => {
    setLogoPreview(isUploadedLogo(formData.logo) ? formData.logo! : '');
  }, [formData.logo]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsReadingLogo(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setLogoPreview(dataUrl);
      handleChange('logo', dataUrl);
      setToastType('success');
      setToast('Logo added. Remember to save your changes.');
    } catch (err: any) {
      setToastType('error');
      setToast(err?.message || 'That image could not be used');
    } finally {
      setIsReadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    handleChange('logo', '');
  };

  const handleDiscard = () => {
    markDirty(false);
    setFormErrors({});
    setFormData(settings);
    setToastType('success');
    setToast('Unsaved changes discarded');
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await updateSettings(formData);
      markDirty(false);
      setToastType('success');
      setToast('Settings saved successfully');
    } catch (e: any) {
      setToastType('error');
      setToast(e?.message || 'Failed to save settings');
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
      a.download = `printpress-backup-${localDateKey()}.json`;
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

  const handleDbBackup = async () => {
    try {
      const blob = await api.settings.downloadDbBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `printpress-db-backup-${localDateKey()}.db`;
      a.click();
      URL.revokeObjectURL(url);
      setToastType('success');
      setToast('Database backup downloaded');
    } catch {
      setToastType('error');
      setToast('Failed to create database backup');
    }
  };

  const handleDbRestoreClick = () => {
    dbFileInputRef.current?.click();
  };

  const handleDbFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingDbRestore(file);
    setDbRestoreConfirm(true);
    e.target.value = '';
  };

  const handleDbRestoreConfirm = async () => {
    if (!pendingDbRestore) return;
    try {
      await api.settings.restoreDb(pendingDbRestore);
      setDbRestoreConfirm(false);
      setPendingDbRestore(null);
      setToastType('success');
      setToast('Database restored successfully. Page will refresh.');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setDbRestoreConfirm(false);
      setPendingDbRestore(null);
      setToastType('error');
      setToast('Failed to restore database');
    }
  };

  const [testEmailTo, setTestEmailTo] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // SMTP is a separate secret: the fields stay hidden and unsaved until the
  // verification token is accepted by the backend.
  const [smtpToken, setSmtpToken] = useState('');
  const [isUnlockingSmtp, setIsUnlockingSmtp] = useState(false);
  const [smtpUnlockError, setSmtpUnlockError] = useState('');
  const [smtpUnlocked, setSmtpUnlocked] = useState(!!formData.smtpUnlocked);

  const handleUnlockSmtp = async () => {
    if (!smtpToken.trim()) return;
    setIsUnlockingSmtp(true);
    setSmtpUnlockError('');
    try {
      await api.settings.unlockSmtp(smtpToken.trim());
      // Pull the real values now that the backend will disclose them. Only the
      // SMTP fields are adopted so unsaved edits elsewhere in the form survive,
      // and unlocking is not itself an edit, so the form stays clean.
      const fresh = await api.settings.get();
      setFormData((prev) => ({
        ...prev,
        smtpHost: fresh.smtpHost,
        smtpPort: fresh.smtpPort,
        smtpSecure: fresh.smtpSecure,
        smtpUser: fresh.smtpUser,
        smtpPass: fresh.smtpPass,
        smtpFrom: fresh.smtpFrom,
        smtpUnlocked: true,
      }));
      setSmtpToken('');
      setSmtpUnlocked(true);
      setToastType('success');
      setToast('SMTP settings unlocked');
    } catch (e: any) {
      setSmtpUnlockError(e?.message || 'Incorrect verification token');
    } finally {
      setIsUnlockingSmtp(false);
    }
  };

  const handleLockSmtp = async () => {
    try {
      await api.settings.lockSmtp();
    } catch {
      // Locking locally is enough even if the request fails.
    }
    setSmtpUnlocked(false);
    setSmtpToken('');
    setSmtpUnlockError('');
    // Clear the revealed secrets from local form state.
    setFormData((prev) => ({ ...prev, smtpPass: '' }));
    setToastType('success');
    setToast('SMTP settings locked');
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwDone(false);
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword === pwForm.currentPassword) {
      setPwError('New password must be different from the current one.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.auth.changePassword(pwForm);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwDone(true);
      setToastType('success');
      setToast('Password changed successfully');
    } catch (e: any) {
      setPwError(e?.message || 'Could not change the password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo.trim()) return;
    setIsTestingEmail(true);
    try {
      const res = await api.settings.testEmail(testEmailTo.trim());
      setToastType('success');
      setToast(res.message || 'Test email sent successfully');
    } catch (e: any) {
      setToastType('error');
      setToast(e?.message || 'Failed to send test email');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const smtpConfigured = smtpUnlocked
    ? Boolean(formData.smtpUser && formData.smtpPass)
    : Boolean(formData.smtpConfigured);

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
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company Logo</label>
            <div className="flex gap-4 items-start">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Image className="w-8 h-8 text-gray-400" />
                )}
              </div>

              <div className="flex-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isReadingLogo}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-bold"
                  >
                    <Upload className="w-4 h-4" />
                    {isReadingLogo ? 'Processing...' : logoPreview ? 'Replace logo' : 'Upload logo'}
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-5 py-3 border-2 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, WebP or SVG. Images are resized to fit the invoice automatically.
                  Click Save Changes to apply.
                </p>
                {!logoPreview && settings.logo && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    The previous logo was saved as a link ({settings.logo}) and could not be displayed.
                    Upload a file to replace it.
                  </p>
                )}
              </div>
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

      {/* Email (SMTP) */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-2">Email (SMTP)</h2>
        <p className="text-sm text-gray-500 mb-6">
          Used to send OTP verification codes and password reset emails. Configure your provider (Gmail, Outlook, Zoho, etc.)
          below — settings are saved to this device and take effect immediately, no restart needed.
        </p>

        {!smtpUnlocked ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
            <Lock className="w-10 h-10 text-gray-400 mx-auto mb-4" />
            <p className="font-bold text-lg text-gray-800 dark:text-gray-100">SMTP settings are locked</p>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              These fields hold a live mailbox password. Enter the verification token to view or change them.
              {formData.smtpConfigured && ' Email sending is currently configured on this device.'}
            </p>

            <div className="max-w-sm mx-auto mt-6">
              <input
                type="password"
                value={smtpToken}
                onChange={(e) => { setSmtpToken(e.target.value); setSmtpUnlockError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockSmtp(); }}
                placeholder="Verification token"
                autoComplete="off"
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {smtpUnlockError && <p className="text-red-500 text-xs mt-2 text-left">{smtpUnlockError}</p>}
              <button
                onClick={handleUnlockSmtp}
                disabled={isUnlockingSmtp || !smtpToken.trim()}
                className="mt-3 w-full px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                {isUnlockingSmtp ? 'Verifying...' : 'Unlock'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleLockSmtp}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-300"
              >
                <Lock className="w-4 h-4" />
                Lock again
              </button>
            </div>

            <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">SMTP Host</label>
              <input
                value={formData.smtpHost || ''}
                onChange={(e) => handleChange('smtpHost', e.target.value)}
                placeholder="e.g. smtp.gmail.com"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Port</label>
              <input
                type="number"
                value={formData.smtpPort || 587}
                onChange={(e) => handleChange('smtpPort', parseInt(e.target.value) || 0)}
                placeholder="587"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Username / Email</label>
              <input
                value={formData.smtpUser || ''}
                onChange={(e) => handleChange('smtpUser', e.target.value)}
                placeholder="e.g. accounts@yourcompany.com"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">App Password</label>
              <input
                type="password"
                value={formData.smtpPass || ''}
                onChange={(e) => handleChange('smtpPass', e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">From Address</label>
              <input
                type="email"
                value={formData.smtpFrom || ''}
                onChange={(e) => handleChange('smtpFrom', e.target.value)}
                placeholder="e.g. noreply@yourcompany.com"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">Optional. Falls back to the username when left blank.</p>
            </div>
            <div>
              <label className="flex items-start gap-4 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={!!formData.smtpSecure}
                  onChange={(e) => handleChange('smtpSecure', e.target.checked)}
                  className="mt-1 size-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">Use TLS/SSL (secure connection)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable for ports like 465 (SSL) or startTLS on 587. Most providers require this.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <p className="font-bold text-blue-900 dark:text-blue-200">Test your settings</p>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              {smtpConfigured
                ? 'Send a test message to verify the configuration works before using it for OTP / password reset emails.'
                : 'Save SMTP host, username and password first to enable sending.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleTestEmail}
                disabled={!smtpConfigured || isTestingEmail || !testEmailTo.trim()}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                <Send className="w-4 h-4" />
                {isTestingEmail ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
            </div>
          </>
        )}
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

      {/* Staff Permissions */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Staff Permissions</h2>

        <label className="flex items-start gap-4 cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.staffExpenseEdit}
            onChange={(e) => handleChange('staffExpenseEdit', e.target.checked)}
            className="mt-1 size-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">Allow staff to edit their own expense submissions</p>
            <p className="text-sm text-gray-500 mt-1">
              When enabled, staff accounts can edit the expense entries they submitted. Staff can never view the company&apos;s
              expense list, reports, or other financial data.
            </p>
          </div>
        </label>
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

      {/* Database */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Database</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Back up or restore the entire SQLite database file. Restoring replaces <strong>all</strong> current ERP data with the backup.
        </p>
        <div className="space-y-4">
          <button
            onClick={handleDbBackup}
            className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" />
            Download Database Backup (.db)
          </button>

          <button
            onClick={handleDbRestoreClick}
            className="w-full p-4 border-2 border-dashed border-rose-300 dark:border-rose-900/60 rounded-2xl hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-3"
          >
            <Upload className="w-5 h-5" />
            Restore Database from Backup
          </button>
          <input
            ref={dbFileInputRef}
            type="file"
            accept=".db,application/octet-stream,application/x-sqlite3"
            onChange={handleDbFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Account Security — password change for the signed-in user */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <KeyRound className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Account Security</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Change the password for <strong>{user?.username || user?.email}</strong>. You will stay signed in on this
          device, and any other signed-in devices will be signed out.
        </p>

        {pwError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{pwError}</span>
          </div>
        )}
        {pwDone && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Password changed successfully.</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Current password</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => { setPwForm({ ...pwForm, currentPassword: e.target.value }); setPwError(''); }}
              autoComplete="current-password"
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">New password</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => { setPwForm({ ...pwForm, newPassword: e.target.value }); setPwError(''); }}
              autoComplete="new-password"
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            />
            {pwForm.newPassword && pwForm.newPassword.length < 6 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Must be at least 6 characters.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Confirm new password</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => { setPwForm({ ...pwForm, confirmPassword: e.target.value }); setPwError(''); }}
              autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={isChangingPassword || !pwForm.currentPassword || !pwForm.newPassword}
          className={`mt-5 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            isChangingPassword ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <KeyRound className="w-5 h-5" />
          {isChangingPassword ? 'Changing...' : 'Change password'}
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        {hasUnsaved && (
          <button
            onClick={handleDiscard}
            className="px-6 py-4 rounded-2xl font-bold text-lg border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Discard changes
          </button>
        )}
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

      {/* Database Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={dbRestoreConfirm}
        title="Restore Database"
        message="Restoring a database will replace current ERP data with the backup. Create a backup before continuing? This cannot be undone. Continue?"
        confirmLabel="Restore"
        variant="warning"
        onConfirm={handleDbRestoreConfirm}
        onCancel={() => { setDbRestoreConfirm(false); setPendingDbRestore(null); }}
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} type={toastType} />}
    </div>
  );
};

export default Settings;
