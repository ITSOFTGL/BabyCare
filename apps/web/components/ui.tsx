'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from './icons';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* --------------------------------- Botones -------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'sage';
  size?: 'sm' | 'md' | 'icon';
  loading?: boolean;
  icon?: IconName;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      'bg-primary text-white shadow-lift hover:bg-primary-dark active:scale-[0.98]',
    sage: 'bg-sage text-white shadow-soft hover:bg-sage/90 active:scale-[0.98]',
    soft: 'bg-gold-light text-ink hover:bg-gold/25 active:scale-[0.98]',
    ghost: 'bg-transparent text-ink-soft hover:bg-ink/[0.05] hover:text-ink',
    danger: 'bg-primary/10 text-primary-dark hover:bg-primary/18',
  }[variant];

  const sizing =
    size === 'icon'
      ? 'h-9 w-9 p-0'
      : size === 'sm'
        ? 'px-3.5 py-2 text-sm'
        : 'px-5 py-2.5 text-[15px]';

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-pill font-semibold tracking-tight',
        'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        sizing,
        className,
      )}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' || size === 'icon' ? 16 : 18} />
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
    <div
      className={cx(
        'rounded-card bg-surface p-4 shadow-soft ring-1 ring-ink/[0.05] sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  icon,
  children,
  action,
  hint,
}: {
  icon?: IconName;
  children: React.ReactNode;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">
          {icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon name={icon} size={18} />
            </span>
          )}
          {children}
        </h2>
        {hint && <p className="mt-1 text-sm text-ink-mute">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'terracotta',
}: {
  icon: IconName;
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'terracotta' | 'sage' | 'gold' | 'ink';
}) {
  const tones = {
    terracotta: 'bg-primary/12 text-primary',
    sage: 'bg-sage-light text-sage',
    gold: 'bg-gold-light text-ink-soft',
    ink: 'bg-ink/[0.07] text-ink',
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-card bg-surface p-4 shadow-soft ring-1 ring-ink/[0.05] transition duration-300 hover:-translate-y-0.5 hover:shadow-pop sm:p-5">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/[0.04] transition group-hover:scale-125" />
      <div className={cx('relative mb-3 flex h-10 w-10 items-center justify-center rounded-2xl', tones)}>
        <Icon name={icon} size={18} />
      </div>
      <p className="relative font-display text-3xl font-semibold leading-none tracking-tightest text-ink">
        {value}
      </p>
      <p className="relative mt-2 text-sm font-medium text-ink-soft">{label}</p>
      {hint && <p className="relative mt-0.5 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'gold',
}: {
  children: React.ReactNode;
  tone?: 'gold' | 'sage' | 'terracotta' | 'ink' | 'alert' | string;
}) {
  const presets: Record<string, string> = {
    gold: 'bg-gold-light text-ink-soft',
    sage: 'bg-sage-light text-sage',
    terracotta: 'bg-primary/12 text-primary-dark',
    ink: 'bg-ink/[0.07] text-ink-soft',
    alert: 'bg-primary/12 text-primary-dark',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        presets[tone] ?? tone,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon = 'child',
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-ink/10 bg-surface/60 px-6 py-14 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gold-light text-ink-soft">
        <Icon name={icon} size={26} />
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mute">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
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
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
}

const fieldClass =
  'w-full rounded-2xl border-0 bg-canvas px-4 py-3 text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink-mute/70 transition focus:bg-surface focus:ring-2 focus:ring-primary/35';

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(fieldClass, className)}
      suppressHydrationWarning
    />
  );
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

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(fieldClass, 'pl-10')}
      />
    </div>
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-dark">
      <Icon name="alert" size={16} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

/* ---------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  title,
  icon,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={cx(
          'relative z-10 flex max-h-[92dvh] w-full animate-pop flex-col rounded-t-card bg-surface shadow-pop sm:rounded-card',
          wide ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-3 pt-6">
          <h3 className="flex items-center gap-2.5 font-display text-xl font-semibold text-ink">
            {icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon name={icon} size={18} />
              </span>
            )}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute transition hover:bg-ink/5 hover:text-ink"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} icon={danger ? 'alert' : 'check'} onClose={onClose}>
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          loading={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
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
              : 'bg-surface text-ink-soft hover:bg-gold-light hover:text-ink',
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
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-ink-mute">
      <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

export function Avatar({
  name,
  size = 'md',
  tone,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: string;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const box = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-2xl font-bold',
        box,
        tone ?? 'bg-gold-light text-ink',
      )}
    >
      {initials}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = 'primary',
}: {
  value: number;
  max: number;
  tone?: 'primary' | 'sage' | 'gold';
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const bar = { primary: 'bg-primary', sage: 'bg-sage', gold: 'bg-gold' }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
      <div
        className={cx('h-full rounded-full transition-all duration-500', bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
