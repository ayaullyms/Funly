//utils/index.ts
export function esc(str?: string | null): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(d?: string | null): string {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export type QuestStatus = 'draft' | 'active' | 'completed' | 'pending' | 'distributed' | string;

export const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-zinc-700 text-zinc-300',
  active:      'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  completed:   'bg-zinc-600/50 text-zinc-400',
  pending:     'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  distributed: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  winner:      'bg-amber-500/20 text-amber-400 border border-amber-500/30',
};

export function fmtReward(amount?: number | string | null, winners?: number | null): string {
  if (!amount) return '';
  const a = Number(amount);
  const w = winners ?? 1;
  return `${a} TON × ${w} winner${w !== 1 ? 's' : ''}`;
}
