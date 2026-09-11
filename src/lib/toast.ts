import { useSyncExternalStore } from "react";

export type ToastVariant = "error" | "info" | "success";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Toast[] {
  return toasts;
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function toast(message: string, variant: ToastVariant = "error"): void {
  if (toasts.some((t) => t.message === message && t.variant === variant)) return;
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  setTimeout(() => dismiss(id), 5000);
}

export function dismiss(id: number): void {
  const remaining = toasts.filter((t) => t.id !== id);
  if (remaining.length === toasts.length) return;
  toasts = remaining;
  emit();
}
