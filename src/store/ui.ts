import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'dark' | 'light';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface UiState {
  theme: ThemePref;
  setTheme: (theme: ThemePref) => void;
  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
}

let toastSeq = 0;

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toasts: [],
      toast: (text, kind = 'info') => {
        const id = ++toastSeq;
        set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
      },
    }),
    { name: 'grimorio-ui', partialize: (s) => ({ theme: s.theme }) },
  ),
);
