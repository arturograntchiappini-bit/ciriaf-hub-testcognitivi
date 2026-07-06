import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}

const STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent text-white hover:brightness-95 border border-accent',
  secondary: 'bg-white text-ink border border-line hover:border-accent',
  ghost: 'bg-transparent text-muted hover:text-ink border border-transparent',
};

/** Pulsante coerente con l'identità visiva istituzionale. */
export function Button({ variant = 'primary', children, className = '', ...rest }: ButtonProps): JSX.Element {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
