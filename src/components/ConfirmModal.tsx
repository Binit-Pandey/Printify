import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

const ConfirmModal = ({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel, variant = 'danger' }: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 no-print">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-2xl ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
            <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-600' : 'text-orange-600'}`} />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 text-white rounded-2xl font-bold transition-all ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
