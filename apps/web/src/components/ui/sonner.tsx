import { Toaster as Sonner } from 'sonner';

export const Toaster = () => (
  <Sonner
    position="top-right"
    richColors
    closeButton
    toastOptions={{
      classNames: { toast: 'rounded-md border shadow-md' },
    }}
  />
);
