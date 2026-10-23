import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}

const STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'border border-accent bg-accent text-paper hover:border-accent-glow hover:bg-accent-glow',
  secondary: 'border border-line bg-transparent text-ink hover:border-accent',
  ghost: 'border border-transparent bg-transparent text-muted hover:text-ink',
};

/** Pulsante dell'identità Sintropia: angoli netti, etichetta mono maiuscola, bersaglio da almeno 44 px. */
export function Button({ variant = 'primary', children, className = '', ...rest }: ButtonProps): JSX.Element {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 px-5 font-mono text-[12px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${STYLES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
