import React, { useEffect, useRef } from 'react';
import { STATUS_STYLES } from '../utils';
import { useApp } from '../context/AppContext';

// ── Badge ─────────────────────────────────────
export function Badge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-zinc-700 text-zinc-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

// ── Spinner ───────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-[3px]' }[size];
  return (
    <div className={`${sz} border-zinc-600 border-t-emerald-400 rounded-full animate-spin`} />
  );
}

export function SpinnerPage() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

// ── Toast ─────────────────────────────────────
export function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const base = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all duration-300 pointer-events-none whitespace-nowrap';
  const variant = toast.type === 'error'
    ? 'bg-red-500/95 text-white'
    : 'bg-emerald-500/95 text-white';

  return (
    <div className={`${base} ${variant}`}>
      {toast.message}
    </div>
  );
}

// ── EmptyState ────────────────────────────────
export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-zinc-500">
      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
        <span className="text-lg text-zinc-600">—</span>
      </div>
      <p className="text-sm">{text}</p>
      {action}
    </div>
  );
}

// ── Button ────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'green';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: BtnProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    ghost:   'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
    danger:  'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    green:   'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30',
  };
  return (
    <button className={`${base} ${sz} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ── Textarea ──────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors resize-none ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

// ── Select ────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...props }, ref) => (
    <select
      ref={ref}
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/60 transition-colors appearance-none ${className}`}
      {...props}
    />
  )
);
Select.displayName = 'Select';

// ── Card ──────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:border-zinc-700 active:scale-[0.99] transition-all duration-150' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── ProgressBar ───────────────────────────────
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────
interface TabsProps {
  tabs: { id: string; label: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
            active === tab.id
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── BackButton ────────────────────────────────
export function BackButton({ label = 'Back', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-1"
    >
      <span className="text-xs">←</span>
      {label}
    </button>
  );
}

// ── SectionLabel ──────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500 mb-3">
      {children}
    </p>
  );
}

// ── StatCard ──────────────────────────────────
export function StatCard({ value, label, color = 'text-zinc-100' }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
      <div className={`font-mono text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
