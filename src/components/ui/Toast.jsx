import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const bgMap = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
};

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

const Toast = ({ toast, onClose }) => {
  const { id, type = 'info', title, message } = toast;
  const Icon = iconMap[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgMap[type]} animate-slide-in-right min-w-[320px] max-w-[420px]`}
      role="alert"
    >
      <Icon size={20} className={`${iconColorMap[type]} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-gray-800">{title}</p>}
        {message && <p className="text-sm text-gray-600 mt-0.5">{message}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
      >
        <X size={16} className="text-gray-400" />
      </button>
    </div>
  );
};

export default Toast;
