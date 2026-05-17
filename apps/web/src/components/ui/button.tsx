import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-brand-600 text-white shadow-soft hover:bg-brand-700 hover:shadow-lifted active:scale-[0.98]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:shadow-lifted active:scale-[0.98]',
        outline:
          'border border-border bg-white text-foreground hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-800',
        secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 active:scale-[0.98]',
        ghost: 'text-foreground hover:bg-muted hover:text-foreground',
        link: 'text-brand-700 underline-offset-4 hover:underline',
        // Bold gradient CTA — used on Landing and key call-to-actions
        gradient: [
          'bg-gradient-to-tr from-brand-700 via-brand-600 to-lime2-500 bg-[length:200%_200%]',
          'text-white shadow-lifted hover:shadow-glow',
          'hover:bg-[position:100%_50%] active:scale-[0.98]',
        ],
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-3.5',
        lg: 'h-12 px-7 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
