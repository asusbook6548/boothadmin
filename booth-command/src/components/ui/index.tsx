import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

// ============================================================
// BUTTON
// ============================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
  }[variant];

  const sizeClass = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' }[size];

  return (
    <button
      className={clsx('btn', variantClass, sizeClass, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
      )}
      {children}
    </button>
  );
}

// ============================================================
// CARD
// ============================================================
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card', className)} {...props}>
      {children}
    </div>
  );
}

// ============================================================
// INPUT
// ============================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
  return (
    <div>
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={clsx('form-input', icon && 'pl-9', error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className)}
          {...props}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  return (
    <div>
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <select
        id={id}
        className={clsx('form-select', error && 'border-red-500', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return <Loader2 className={clsx(sz, 'animate-spin text-indigo-600', className)} />;
}

// ============================================================
// SKELETON LOADER
// ============================================================
export function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-8 w-1/2" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="text-base font-medium text-gray-600">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-red-600 text-xl">!</span>
      </div>
      <p className="text-base font-medium text-gray-700">{message ?? 'Something went wrong. Please try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 btn-primary btn text-sm">
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================
// PAGINATION
// ============================================================
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Showing {start}–{end} of {total.toLocaleString()} records</span>
        {onLimitChange && (
          <>
            <span>·</span>
            <select
              className="form-select py-1 text-xs"
              value={limit}
              onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1); }}
            >
              {[10, 20, 50, 100].map((v) => <option key={v} value={v}>{v} / page</option>)}
            </select>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          className="btn-secondary btn btn-sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >«</button>
        <button
          className="btn-secondary btn btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >‹</button>
        <span className="px-3 py-1 text-sm font-medium text-gray-700">
          Page {page} of {totalPages}
        </span>
        <button
          className="btn-secondary btn btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >›</button>
        <button
          className="btn-secondary btn btn-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >»</button>
      </div>
    </div>
  );
}

export { ErrorBoundary } from './ErrorBoundary';
