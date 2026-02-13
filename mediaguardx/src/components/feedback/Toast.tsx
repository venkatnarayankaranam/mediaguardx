import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Toast as ToastType } from '@/store/uiStore';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-indigo-500/30 bg-indigo-500/10',
};

const iconColors = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-indigo-400',
};

export default function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.type];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles[toast.type]} backdrop-blur-sm shadow-lg animate-in slide-in-from-right`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-slate-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
