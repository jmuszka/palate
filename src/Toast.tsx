import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useToasts, dismiss, type Toast } from "./toast";

const VARIANT_STYLES: Record<Toast["variant"], string> = {
  error: "bg-red-600 text-white",
  info: "bg-zinc-800 text-white",
  success: "bg-emerald-600 text-white",
};

function ToastItem({ toast }: { toast: Toast }) {
  return (
    <div
      role="alert"
      className={`${VARIANT_STYLES[toast.variant]} pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg`}
    >
      <span className="leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useToasts();

  return (
    <>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </>
  );
}
