import { useEffect } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error';
}

const Toast = ({ message, onClose, duration = 2500, type = 'success' }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isError = type === 'error';

  return (
    <div className="fixed top-6 right-6 z-[70] animate-[slideIn_0.3s_ease-out] no-print">
      <div className={`flex items-center gap-3 px-6 py-4 text-white rounded-2xl shadow-lg dark:shadow-none ${
        isError
          ? 'bg-red-600 shadow-red-200 dark:shadow-none'
          : 'bg-emerald-600 shadow-emerald-200 dark:shadow-none'
      }`}>
        {isError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
        <span className="font-semibold">{message}</span>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
