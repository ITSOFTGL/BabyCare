'use client';

import { useEffect } from 'react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* --------------------------------- Botones -------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      'bg-primary text-white shadow-lift hover:bg-primary-dark active:scale-[0.98]',
    soft: 'bg-secondary/25 text-ink hover:bg-secondary/40 active:scale-[0.98]',
    ghost: 'bg-transparent text-ink/70 hover:bg-ink/5',
    // "Peligro" se resuelve con primary-dark + el peso del texto, no con un
    // acento: los acentos son solo para diferenciar salas/niveles.
    danger: 'bg-primary-dark/10 text-primary-dark hover:bg-primary-dark/20',
  }[variant];

  const sizing = size === 'sm' ? 'px-3.5 py-2 text-sm' : 'px-5 py-3 text-base';

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-pill font-semibold',
        'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        sizing,
        className,
      )}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

/* ---------------------------------- Cards --------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx('rounded-card bg-white p-5 shadow-soft', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  emoji,
  children,
  action,
}: {
  emoji?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-ink sm:text-2xl">
        {emoji && <span className="mr-2">{emoji}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function StatCard({
  emoji,
  label,
  value,
  tone = 'bg-primary',
}: {
  emoji: string;
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-card bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      {/* Eco del emoji de fondo, muy tenue: un guino a las cards del panel de referencia. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-2 select-none text-6xl opacity-[0.06] transition group-hover:opacity-[0.1]"
      >
        {emoji}
      </span>
      <div
        className={cx(
          'relative mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-sm',
          tone,
        )}
      >
        {emoji}
      </div>
      <p className="relative text-2xl font-bold leading-none text-ink">{value}</p>
      <p className="relative mt-1 text-sm font-medium text-ink/55">{label}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = 'bg-secondary/30 text-ink',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold',
        tone,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  emoji = '🧸',
  title,
  hint,
}: {
  emoji?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card bg-white/60 px-6 py-10 text-center">
      <p className="text-4xl">{emoji}</p>
      <p className="mt-3 font-semibold text-ink/70">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink/45">{hint}</p>}
    </div>
  );
}

/* -------------------------------- Formulario ------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink/70">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/40">{hint}</span>}
    </label>
  );
}

const fieldClass =
  'w-full rounded-2xl border-0 bg-background px-4 py-3 text-ink placeholder:text-ink/35 transition focus:ring-4 focus:ring-primary/25';

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldClass, className)} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cx(fieldClass, 'min-h-24', className)} />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldClass, 'appearance-none', className)}>
      {children}
    </select>
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-2xl bg-primary-dark/10 px-4 py-3 text-sm font-semibold text-primary-dark">
      {children}
    </p>
  );
}

/* ---------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  title,
  emoji,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  emoji?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[92dvh] w-full max-w-lg animate-pop overflow-y-auto rounded-t-card bg-white p-6 shadow-soft sm:rounded-card">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-ink">
            {emoji && <span className="mr-2">{emoji}</span>}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-pill px-3 py-1 text-xl leading-none text-ink/40 transition hover:bg-ink/5 hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------- Tabs ---------------------------------- */

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cx(
            'whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition-all duration-200',
            active === tab.id
              ? 'bg-primary text-white shadow-lift'
              : 'bg-white text-ink/60 hover:bg-secondary/25 hover:text-ink',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/50">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}
