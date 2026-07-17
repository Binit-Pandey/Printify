import { useState, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '../contexts/store';
import type { Vendor, VendorPayment } from '../types';
import { vendorSchema } from '../utils/validationSchemas';
import { Plus, Search, Edit2, Trash2, X, Phone, MapPin, CreditCard, Clock, History, FileText } from 'lucide-react';
import { useFilter } from '../hooks/useFilter';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { api } from '../services/api';

const Vendors = () => {
  const { vendors, settings, addVendor, updateVendor, deleteVendor, addVendorPayment } = useStore();
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(vendors, ['name', 'phone', 'address', 'panNumber']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [payTarget, setPayTarget] = useState<Vendor | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDescription, setPayDescription] = useState('');
  const [historyTarget, setHistoryTarget] = useState<Vendor | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<VendorPayment[]>([]);
  const [allPayments, setAllPayments] = useState<VendorPayment[]>([]);

  const refreshPayments = useCallback(() => {
    api.vendorPayments.listAll().then(setAllPayments).catch(() => {});
  }, []);

  useEffect(() => {
    refreshPayments();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshPayments();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshPayments]);

  const vendorStats = useMemo(() => {
    const stats: Record<string, { totalBill: number; totalPaid: number; dueAmount: number; oldestDue: string | null }> = {};
    for (const v of vendors) {
      const vPayments = allPayments.filter(p => p.vendorId === v.id);
      const purchases = vPayments.filter(p => p.type === 'purchase');
      const payments = vPayments.filter(p => p.type === 'payment');
      const totalBill = purchases.reduce((s, p) => s + p.amount, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const dueAmount = totalBill - totalPaid;
      const oldestPurchase = purchases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      stats[v.id] = {
        totalBill,
        totalPaid,
        dueAmount: Math.max(0, dueAmount),
        oldestDue: dueAmount > 0 ? oldestPurchase?.dueDate || oldestPurchase?.date : null,
      };
    }
    return stats;
  }, [vendors, allPayments]);

  const validateForm = useCallback(() => {
    const result = vendorSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      address: formData.address || '',
      panNumber: formData.panNumber || '',
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  }, [formData]);

  const resetForm = () => {
    setFormData({});
    setFormErrors({});
    setShowAddModal(false);
    setEditingVendor(null);
  };

  const handleAddVendor = async () => {
    if (!validateForm()) return;
    const newVendor: Vendor = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      phone: formData.phone!,
      address: formData.address || '',
      panNumber: formData.panNumber || '',
      outstandingBalance: 0,
    };
    try {
      await addVendor(newVendor);
      resetForm();
      setToast('Vendor added successfully');
    } catch (e: any) {
      setToast(e?.message || 'Failed to add vendor');
      setToastType('error');
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
  };

  const handleUpdateVendor = async () => {
    if (!validateForm() || !editingVendor) return;
    const updated: Vendor = {
      ...editingVendor,
      ...formData,
    };
    try {
      await updateVendor(updated);
      resetForm();
      setToast('Vendor updated successfully');
      setToastType('success');
    } catch (e: any) {
      setToast(e?.message || 'Failed to update vendor');
      setToastType('error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      try {
        await deleteVendor(deleteTarget.id);
        refreshPayments();
        setDeleteTarget(null);
        setToast('Vendor deleted');
        setToastType('success');
      } catch (e: any) {
        setToast(e?.message || 'Failed to delete vendor');
        setToastType('error');
      }
    }
  };

  const handlePay = async () => {
    if (!payTarget || payAmount <= 0) return;
    const vp: VendorPayment = {
      id: Math.random().toString(36).substr(2, 9),
      vendorId: payTarget.id,
      amount: payAmount,
      date: new Date().toISOString().split('T')[0],
      type: 'payment',
      description: payDescription || 'Payment to vendor',
    };
    try {
      await addVendorPayment(vp);
      refreshPayments();
      setPayTarget(null);
      setPayAmount(0);
      setPayDescription('');
      setToast('Payment recorded successfully');
      setToastType('success');
    } catch (e: any) {
      setToast(e?.message || 'Failed to record payment');
      setToastType('error');
    }
  };

  const loadHistory = async (vendor: Vendor) => {
    setHistoryTarget(vendor);
    try {
      const payments = await api.vendorPayments.list(vendor.id);
      setPaymentHistory(payments);
    } catch {
      setPaymentHistory([]);
    }
  };

  const getAgingDays = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getAgingLabel = (days: number) => {
    if (days <= 30) return { label: '0-30 days', color: 'bg-emerald-100 text-emerald-700' };
    if (days <= 60) return { label: '31-60 days', color: 'bg-yellow-100 text-yellow-700' };
    if (days <= 90) return { label: '61-90 days', color: 'bg-orange-100 text-orange-700' };
    return { label: '90+ days', color: 'bg-red-100 text-red-700' };
  };

  const generateAgingPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 15;

    // Header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VENDOR AGING DUE REPORT', 15, 14);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 21);
    pdf.text(settings.name || 'Printing Press', pageWidth - 15, 14, { align: 'right' });

    y = 38;

    // Summary stats
    const vendorsWithDue = vendors.filter(v => vendorStats[v.id]?.dueAmount > 0);
    const totalDue = vendorsWithDue.reduce((s, v) => s + (vendorStats[v.id]?.dueAmount || 0), 0);
    const totalBill = vendors.reduce((s, v) => s + (vendorStats[v.id]?.totalBill || 0), 0);
    const totalPaid = vendors.reduce((s, v) => s + (vendorStats[v.id]?.totalPaid || 0), 0);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    // Summary boxes
    const boxW = (pageWidth - 40) / 3;
    const boxes = [
      { label: 'Total Vendors', value: vendors.length.toString(), color: [37, 99, 235] },
      { label: 'Total Due', value: `NPR ${totalDue.toLocaleString()}`, color: [249, 115, 22] },
      { label: 'Vendors with Due', value: vendorsWithDue.length.toString(), color: [239, 68, 68] },
    ];

    boxes.forEach((box, i) => {
      const bx = 15 + i * (boxW + 5);
      pdf.setFillColor(box.color[0], box.color[1], box.color[2]);
      pdf.roundedRect(bx, y, boxW, 16, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(box.label, bx + 4, y + 5);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(box.value, bx + 4, y + 12);
    });

    y += 24;

    // Table header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(15, y, pageWidth - 30, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Vendor Name', 17, y + 5);
    pdf.text('Phone', 65, y + 5);
    pdf.text('Total Bill', 95, y + 5);
    pdf.text('Paid', 118, y + 5);
    pdf.text('Due Amount', 138, y + 5);
    pdf.text('Aging', 162, y + 5);
    pdf.text('Due Date', 178, y + 5);
    y += 10;

    // Table rows
    const sortedVendors = [...vendors].sort((a, b) => (vendorStats[b.id]?.dueAmount || 0) - (vendorStats[a.id]?.dueAmount || 0));

    sortedVendors.forEach((vendor, index) => {
      const stats = vendorStats[vendor.id];
      if (!stats) return;

      if (y > 265) {
        pdf.addPage();
        y = 15;
        pdf.setFillColor(37, 99, 235);
        pdf.rect(15, y, pageWidth - 30, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Vendor Name', 17, y + 5);
        pdf.text('Phone', 65, y + 5);
        pdf.text('Total Bill', 95, y + 5);
        pdf.text('Paid', 118, y + 5);
        pdf.text('Due Amount', 138, y + 5);
        pdf.text('Aging', 162, y + 5);
        pdf.text('Due Date', 178, y + 5);
        y += 10;
      }

      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(15, y - 3, pageWidth - 30, 7, 'F');
      }

      const agingDays = stats.oldestDue ? getAgingDays(stats.oldestDue) : 0;
      const aging = getAgingLabel(agingDays);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(vendor.name.substring(0, 20), 17, y + 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(7);
      pdf.text(vendor.phone, 65, y + 1);
      pdf.text(`NPR ${stats.totalBill.toLocaleString()}`, 95, y + 1);
      pdf.setTextColor(16, 185, 129);
      pdf.text(`NPR ${stats.totalPaid.toLocaleString()}`, 118, y + 1);

      if (stats.dueAmount > 0) {
        pdf.setTextColor(249, 115, 22);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`NPR ${stats.dueAmount.toLocaleString()}`, 138, y + 1);
        pdf.setFont('helvetica', 'normal');

        // Aging badge
        const agingColors: Record<string, number[]> = {
          '0-30 days': [16, 185, 129],
          '31-60 days': [234, 179, 8],
          '61-90 days': [249, 115, 22],
          '90+ days': [239, 68, 68],
        };
        const ac = agingColors[aging.label] || [100, 100, 100];
        pdf.setFillColor(ac[0], ac[1], ac[2]);
        pdf.roundedRect(160, y - 2, 16, 5, 1, 1, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(5);
        pdf.text(aging.label, 168, y + 1, { align: 'center' });

        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(7);
        pdf.text(stats.oldestDue ? new Date(stats.oldestDue).toLocaleDateString() : '-', 178, y + 1);
      } else {
        pdf.setTextColor(16, 185, 129);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PAID', 138, y + 1);
        pdf.setFont('helvetica', 'normal');
      }

      y += 8;
    });

    // Footer
    y += 5;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(15, y, pageWidth - 15, y);
    y += 5;
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Powered by Prime Logic Tech', pageWidth / 2, pdf.internal.pageSize.getHeight() - 8, { align: 'center' });

    pdf.save(`Vendor-Aging-Due-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Vendors & Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your supplier relationships</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateAgingPDF}
            className="flex items-center gap-2 px-5 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold"
          >
            <FileText className="w-4 h-4" /> Aging Due Report
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none font-bold"
          >
            <Plus className="w-5 h-5" />
            New Vendor
          </button>
        </div>
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
            filteredItems.map(vendor => {
              const stats = vendorStats[vendor.id] || { totalBill: 0, totalPaid: 0, dueAmount: 0, oldestDue: null };
              return (
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
                        onClick={() => setDeleteTarget(vendor)}
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

                  {/* Payment Breakdown */}
                  <div className="space-y-2 mb-4 pb-4 border-b dark:border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Total Bill</span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">NPR {stats.totalBill.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Paid Amount</span>
                      <span className="text-sm font-bold text-emerald-600">NPR {stats.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Due Amount</span>
                      <span className={`text-sm font-bold ${stats.dueAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        NPR {stats.dueAmount.toLocaleString()}
                      </span>
                    </div>
                    {stats.dueAmount > 0 && stats.oldestDue && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Oldest Due</span>
                        <span className="text-xs font-bold text-red-500">
                          {getAgingLabel(getAgingDays(stats.oldestDue)).label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setPayTarget(vendor); setPayAmount(stats.dueAmount > 0 ? stats.dueAmount : 0); }}
                      disabled={stats.dueAmount <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-xl transition-all bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-4 h-4" /> Pay
                    </button>
                    <button
                      onClick={() => loadHistory(vendor)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-xl transition-all bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <History className="w-4 h-4" /> History
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500">
              No vendors found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingVendor) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
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
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
                <input
                  placeholder="e.g. 9851234567"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <input
                  placeholder="e.g. Biratnagar"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">PAN Number</label>
                <input
                  placeholder="e.g. PAN123456"
                  value={formData.panNumber || ''}
                  onChange={(e) => setFormData({...formData, panNumber: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {formErrors.panNumber && <p className="text-red-500 text-xs mt-1">{formErrors.panNumber}</p>}
              </div>

              <div className="flex gap-3 pt-6 border-t dark:border-gray-800">
                <button onClick={resetForm} className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove all vendor data and cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Pay Vendor</h2>
              <button onClick={() => { setPayTarget(null); setPayAmount(0); setPayDescription(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">{payTarget.name}</p>
              <p className="text-2xl font-black text-orange-600 mt-1">NPR {(vendorStats[payTarget.id]?.dueAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-orange-500 mt-1">Due Amount</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Payment Amount (NPR) *</label>
                <input
                  type="number"
                  min={0}
                  max={vendorStats[payTarget.id]?.dueAmount || 0}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setPayAmount(vendorStats[payTarget.id]?.dueAmount || 0)} className="text-xs font-bold text-blue-600 hover:underline">Full Amount</button>
                  <button onClick={() => setPayAmount(Math.round((vendorStats[payTarget.id]?.dueAmount || 0) / 2))} className="text-xs font-bold text-blue-600 hover:underline">50%</button>
                  <button onClick={() => setPayAmount(Math.round((vendorStats[payTarget.id]?.dueAmount || 0) / 4))} className="text-xs font-bold text-blue-600 hover:underline">25%</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <input
                  placeholder="e.g. Cash payment for July order"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setPayTarget(null); setPayAmount(0); setPayDescription(''); }}
                  className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handlePay} disabled={payAmount <= 0}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all">
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {historyTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Payment History</h2>
                <p className="text-gray-500 text-sm mt-0.5">{historyTarget.name}</p>
              </div>
              <button onClick={() => { setHistoryTarget(null); setPaymentHistory([]); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            {paymentHistory.length > 0 ? (
              <div className="space-y-3">
                {paymentHistory.map(p => (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border ${
                    p.type === 'purchase'
                      ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                      : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        p.type === 'purchase' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                      }`}>
                        {p.type === 'purchase'
                          ? <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          : <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        }
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p.description || (p.type === 'purchase' ? 'Purchase on credit' : 'Payment')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(p.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {p.dueDate && p.type === 'purchase' && (
                            <span className="ml-2 text-orange-500">Due: {new Date(p.dueDate).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${p.type === 'purchase' ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {p.type === 'purchase' ? '+' : '-'}NPR {p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No payment history yet.</p>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} type={toastType} onClose={() => setToast('')} />}
    </div>
  );
};

export default Vendors;
