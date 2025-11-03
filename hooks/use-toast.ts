import { useState, useCallback } from 'react';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Toast) => {
    // Simple console log for now, can be enhanced with actual toast UI later
    console.log(`[${variant.toUpperCase()}] ${title}: ${description}`);
    
    // Could implement actual toast UI here
    setToasts((prev) => [...prev, { title, description, variant }]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
  }, []);

  return { toast, toasts };
}
