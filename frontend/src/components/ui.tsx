import React from 'react';
import { useApp } from '../context/AppContext';

/* ─── Design tokens ──────────────────────────────── */
const T = {
  bg:      '#0D0D14',
  bg2:     '#13131f',
  bg3:     '#1a1a2a',
  border:  '#1e1e32',
  border2: '#2a2a3a',
  purple:  '#7B6EF6',
  purpleL: '#9d90f8',
  purpleD: 'rgba(123,110,246,0.15)',
  purpleB: 'rgba(123,110,246,0.35)',
  muted:   '#44445a',
  sec:     '#888',
  text:    '#e8e0ff',
  green:   '#4ade80',
  amber:   '#fbbf24',
  red:     '#f87171',
  mono:    'IBM Plex Mono, monospace',
  sans:    'IBM Plex Sans, sans-serif',
};

/* ─── Badge ──────────────────────────────────────── */
const BADGE_MAP: Record<string, { color: string; bg: string; border: string }> = {
  active:      { color: '#9d90f8', bg: 'rgba(123,110,246,0.15)', border: 'rgba(123,110,246,0.35)' },
  draft:       { color: '#555',    bg: 'rgba(100,100,120,0.2)',   border: '#2a2a3a' },
  completed:   { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',    border: 'rgba(74,222,128,0.25)' },
  winner:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',   border: 'rgba(251,191,36,0.3)' },
  distributed: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',    border: 'rgba(74,222,128,0.25)' },
  pending:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',    border: 'rgba(251,191,36,0.2)' },
};

export function Badge({ status }: { status: string }) {
  const s = BADGE_MAP[status] ?? BADGE_MAP.draft;
  return (
    <span style={{
      fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 700,
      fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.5,
      color: s.color, background: s.bg, border: `0.5px solid ${s.border}`,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center',
    }}>
      {status}
    </span>
  );
}

/* ─── Spinner ────────────────────────────────────── */
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 16, md: 28, lg: 40 }[size];
  return (
    <div style={{
      width: px, height: px, borderRadius: '50%',
      border: `2px solid ${T.border2}`,
      borderTopColor: T.green,
      animation: 'spin 0.6s linear infinite',
    }} />
  );
}

export function SpinnerPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
      <Spinner size="lg" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────── */
export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  const isErr = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, pointerEvents: 'none', whiteSpace: 'nowrap',
      padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
      fontFamily: T.sans,
      background: isErr ? 'rgba(248,113,113,0.95)' : 'rgba(74,222,128,0.95)',
      color: isErr ? '#fff' : '#000',
    }}>
      {toast.message}
    </div>
  );
}

/* ─── EmptyState ─────────────────────────────────── */
export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: T.bg2, border: `0.5px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: T.muted,
      }}>—</div>
      <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{text}</p>
      {action}
    </div>
  );
}

/* ─── Button ─────────────────────────────────────── */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'green';
  size?: 'sm' | 'md';
}

const BTN_VARIANTS: Record<string, React.CSSProperties> = {
  primary: { background: T.purple,                   color: '#fff',    border: 'none' },
  ghost:   { background: T.purpleD,                  color: T.purpleL, border: `0.5px solid ${T.purpleB}` },
  danger:  { background: 'rgba(248,113,113,0.08)',   color: T.red,     border: '0.5px solid rgba(248,113,113,0.25)' },
  green:   { background: 'rgba(74,222,128,0.08)',    color: T.green,   border: '0.5px solid rgba(74,222,128,0.25)' },
};

export function Button({ variant = 'primary', size = 'md', style, children, disabled, ...props }: BtnProps) {
  const pad = size === 'sm' ? '6px 12px' : '10px 16px';
  const fs  = size === 'sm' ? 11 : 13;
  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: pad, borderRadius: 9, fontSize: fs, fontWeight: 700,
        fontFamily: T.sans, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, transition: 'opacity 0.15s',
        ...BTN_VARIANTS[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Input ──────────────────────────────────────── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ style, ...props }, ref) => (
    <input
      ref={ref}
      style={{
        width: '100%', background: '#060610',
        border: `0.5px solid ${T.border2}`, borderRadius: 8,
        padding: '9px 12px', fontSize: 12, color: '#ddd', outline: 'none',
        fontFamily: T.sans, transition: 'border-color 0.15s',
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = T.purpleB; }}
      onBlur={e  => { e.currentTarget.style.borderColor = T.border2; }}
      {...props}
    />
  )
);
Input.displayName = 'Input';

/* ─── Textarea ───────────────────────────────────── */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ style, ...props }, ref) => (
    <textarea
      ref={ref}
      style={{
        width: '100%', background: '#060610',
        border: `0.5px solid ${T.border2}`, borderRadius: 8,
        padding: '9px 12px', fontSize: 12, color: '#ddd', outline: 'none',
        fontFamily: T.sans, resize: 'vertical', transition: 'border-color 0.15s',
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = T.purpleB; }}
      onBlur={e  => { e.currentTarget.style.borderColor = T.border2; }}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

/* ─── Select ─────────────────────────────────────── */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ style, ...props }, ref) => (
    <select
      ref={ref}
      style={{
        width: '100%', background: '#060610',
        border: `0.5px solid ${T.border2}`, borderRadius: 8,
        padding: '9px 12px', fontSize: 12, color: '#ddd', outline: 'none',
        fontFamily: T.sans, appearance: 'none', cursor: 'pointer',
        ...style,
      }}
      {...props}
    />
  )
);
Select.displayName = 'Select';

/* ─── Card ───────────────────────────────────────── */
export function Card({
  children, className = '', style, onClick,
}: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.bg2, border: `0.5px solid ${T.border}`,
        borderRadius: 14, padding: 14, cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color 0.15s',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/* ─── ProgressBar ────────────────────────────────── */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ width: '100%', height: 2, background: T.border2, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 2,
        background: T.purple, width: `${pct}%`,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

/* ─── Tabs ───────────────────────────────────────── */
interface TabsProps {
  tabs: { id: string; label: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div style={{
      display: 'flex', background: T.bg2,
      border: `0.5px solid ${T.border}`,
      borderRadius: 10, padding: 2,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1, padding: '6px 4px', textAlign: 'center',
              fontSize: 10, fontWeight: 600, borderRadius: 8,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: T.sans,
              background: isActive ? T.purple : 'transparent',
              color: isActive ? '#fff' : T.sec,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── BackButton ─────────────────────────────────── */
export function BackButton({ label = 'Back', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: T.purple, background: 'none', border: 'none',
        cursor: 'pointer', padding: '2px 0', fontFamily: T.sans,
      }}
    >
      ← {label}
    </button>
  );
}

/* ─── SectionLabel ───────────────────────────────── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 700, fontFamily: T.mono,
      textTransform: 'uppercase', letterSpacing: 1.5,
      color: T.muted, marginBottom: 10, marginTop: 0,
    }}>
      {children}
    </p>
  );
}

/* ─── StatCard ───────────────────────────────────── */
export function StatCard({
  value, label, color = T.purpleL,
}: {
  value: React.ReactNode; label: string; color?: string;
}) {
  return (
    <div style={{
      background: T.bg2, border: `0.5px solid ${T.border}`,
      borderRadius: 10, padding: 12, textAlign: 'center',
    }}>
      <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.5, color: T.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}