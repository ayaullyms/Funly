import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest, AdminStats, Participant } from '../types';
import { SpinnerPage, EmptyState } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useDistributeRewards } from '../hooks/useDistributeRewards';
import { useTonWallet } from '@tonconnect/ui-react';

const C = {
  bg:     '#0D0D14',
  bg2:    '#13131f',
  bg3:    '#1a1a2a',
  border: '#1e1e32',
  purple: '#7B6EF6',
  purpleL:'#9d90f8',
  purpleB:'rgba(123,110,246,0.35)',
  muted:  '#44445a',
  sec:    '#888',
  green:  '#4ade80',
  amber:  '#fbbf24',
  red:    '#f87171',
  ton:    '#0098EA',
};

type AdminTab = 'active' | 'draft' | 'completed';
interface Props { onOpenEditor: (id: string | null) => void; }

export function AdminPage({ onOpenEditor }: Props) {
  const { showToast } = useApp();
  const [stats,  setStats]  = useState<AdminStats | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab, setTab]         = useState<AdminTab>('active');
  const [distributingQuestId, setDistributingQuestId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, q] = await Promise.all([api.getAdminStats(), api.listQuests()]);
      setStats(s);
      setQuests(q.quests || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeQuests    = quests.filter(q => q.status === 'active');
  const draftQuests     = quests.filter(q => q.status === 'draft');
  const completedQuests = quests.filter(q => q.status === 'completed');

  const visibleQuests =
    tab === 'active' ? activeQuests :
    tab === 'draft'  ? draftQuests  : completedQuests;

  const activateQuest = async (id: string) => {
    if (!confirm('Activate this quest?')) return;
    try {
      await api.updateQuest(id, { status: 'active' });
      showToast('Quest activated');
      setTab('active');
      load();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const finishQuest = async (id: string) => {
    if (!confirm('Complete quest and prepare blockchain reward distribution?')) return;
    try {
      const result = await api.completeQuest(id, {});
      showToast(`Quest completed! ${result.winners ?? 0} winners selected`);
      if (result.warnings) showToast(result.warnings, 'error');
      setTab('completed');
      await load();
      setDistributingQuestId(id);
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const removeQuest = async (id: string) => {
    if (!confirm('Delete this quest?')) return;
    try {
      await api.deleteQuest(id);
      showToast('Quest deleted');
      load();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <SpinnerPage />;
  if (error)   return <p style={{ color: C.red, textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>{error}</p>;

  return (
    <div className="flex flex-col gap-5 pb-2">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div />
        <button onClick={() => onOpenEditor(null)} style={newQuestBtnSt}>+ New Quest</button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { v: stats.totalUsers,              l: 'Users' },
            { v: stats.submissions?.total || 0, l: 'Submissions' },
          ].map((s, i) => (
            <div key={i} style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.purpleL, fontFamily: 'IBM Plex Mono, monospace' }}>{s.v}</div>
              <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 3 }}>
        <TabButton label="Active"    count={activeQuests.length}    active={tab === 'active'}    onClick={() => setTab('active')} />
        <TabButton label="Drafts"    count={draftQuests.length}     active={tab === 'draft'}     onClick={() => setTab('draft')} />
        <TabButton label="Done"      count={completedQuests.length} active={tab === 'completed'} onClick={() => setTab('completed')} />
      </div>

      {/* Quest list */}
      {visibleQuests.length === 0 ? (
        <EmptyState text={
          tab === 'active' ? 'No active quests' :
          tab === 'draft'  ? 'No draft quests'  : 'No completed quests'
        } />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleQuests.map(q => (
            <AdminQuestRow
              key={q.id}
              quest={q}
              onEdit={() => onOpenEditor(q.id)}
              onActivate={() => activateQuest(q.id)}
              onFinish={() => finishQuest(q.id)}
              onRemove={() => removeQuest(q.id)}
              onDistribute={() => setDistributingQuestId(q.id)}
            />
          ))}
        </div>
      )}

      {/* Блокчейн-панель */}
      {distributingQuestId && (
        <DistributeModal
          questId={distributingQuestId}
          onClose={() => setDistributingQuestId(null)}
          onSuccess={() => { setDistributingQuestId(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Модальная панель ──────────────────────────────────────────────────────────

function DistributeModal({
  questId, onClose, onSuccess,
}: { questId: string; onClose: () => void; onSuccess: () => void }) {
  const wallet = useTonWallet();
  const { state, loadRewards, confirmAndSign } = useDistributeRewards(questId);

  useEffect(() => { loadRewards(); }, []);

  const { step, rewards, totalTon, missingWallets, contractAddress, txHash, error, waitingSeconds } = state;
  const readyRewards = rewards.filter(r => !!r.walletAddress);

  const isTestnet = import.meta.env.VITE_TON_TESTNET === 'true';
  const tonscanBase = isTestnet ? 'https://testnet.tonscan.org' : 'https://tonscan.org';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: C.bg2, border: `0.5px solid ${C.border}`,
          borderRadius: '18px 18px 0 0',
          padding: '20px 18px 36px',
          display: 'flex', flexDirection: 'column', gap: 14,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 3, borderRadius: 2, background: C.border, margin: '0 auto -4px' }} />

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Distribute Rewards</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>via TON Smart Contract</div>
          </div>
          <TonBadge />
        </div>

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: C.muted, fontSize: 13 }}>
            Loading rewards...
          </div>
        )}

        {(step === 'confirm' || step === 'no_wallets') && (
          <>
            {missingWallets.length > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.07)', border: '0.5px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '10px 13px' }}>
                <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 4 }}>⚠️ No wallet connected</div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  Won't receive TON: {missingWallets.join(', ')}
                </div>
              </div>
            )}

            {readyRewards.length > 0 ? (
              <div style={{ background: C.bg3, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={monoLabel}>Recipients ({readyRewards.length})</span>
                  <span style={monoLabel}>Amount</span>
                </div>
                {readyRewards.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 12px',
                    borderBottom: i < readyRewards.length - 1 ? `0.5px solid ${C.border}` : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{r.recipientName}</div>
                      <div style={{ fontSize: 9, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>
                        {r.walletAddressFriendly
                          ? `${r.walletAddressFriendly.slice(0, 6)}...${r.walletAddressFriendly.slice(-4)}`
                          : `${r.walletAddress!.slice(0, 6)}...${r.walletAddress!.slice(-4)}`
                        }
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <TonIcon />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green, fontFamily: 'IBM Plex Mono, monospace' }}>
                        {Number(r.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '1rem 0' }}>
                No winners with connected wallets
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(0,152,234,0.07)', border: '0.5px solid rgba(0,152,234,0.2)',
              borderRadius: 10, padding: '10px 13px',
            }}>
              <span style={{ fontSize: 11, color: '#aaa' }}>Total to send</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TonIcon size={16} />
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>{totalTon}</span>
                <span style={{ fontSize: 12, color: '#aaa' }}>TON</span>
              </div>
            </div>

            {wallet ? (
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace' }}>
                Sending from: {wallet.account.address.slice(0, 8)}...{wallet.account.address.slice(-6)}
              </div>
            ) : (
              <div style={{ background: 'rgba(248,113,113,0.07)', border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: 9, padding: '10px 13px', fontSize: 11, color: C.red }}>
                Connect your admin wallet first (Profile page)
              </div>
            )}

            <button
              onClick={confirmAndSign}
              disabled={!wallet || readyRewards.length === 0}
              style={{
                ...primaryBtnSt,
                opacity: (!wallet || readyRewards.length === 0) ? 0.4 : 1,
                cursor:  (!wallet || readyRewards.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              🚀 Sign & Send via TON Connect
            </button>
          </>
        )}

        {step === 'signing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Spinner color={C.ton} />
            <div style={{ fontSize: 13, color: '#aaa' }}>Waiting for wallet signature...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === 'waiting_tx' && (
          <div style={{ textAlign: 'center', padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Spinner color={C.green} />
            <div style={{ fontSize: 13, color: '#aaa' }}>Waiting for blockchain confirmation...</div>
            <div style={{ fontSize: 11, color: C.muted }}>{waitingSeconds}s elapsed</div>
            <div style={{ fontSize: 10, color: C.muted }}>Transaction sent — confirming on TON network</div>
          </div>
        )}

        {step === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 4 }}>🎉</div>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: C.green }}>
              Rewards Distributed!
            </div>

            {/* Contract */}
            <div style={{ background: 'rgba(74,222,128,0.05)', border: '0.5px solid rgba(74,222,128,0.18)', borderRadius: 10, padding: '10px 13px' }}>
              <div style={{ ...monoLabel, marginBottom: 5 }}>Smart Contract</div>
              <a
                href={`${tonscanBase}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 10, color: C.ton, fontFamily: 'IBM Plex Mono, monospace', wordBreak: 'break-all', textDecoration: 'none' }}
              >
                {contractAddress}
              </a>
            </div>

            {/* TX Hash */}
            {txHash && txHash.length < 100 && (
              <div style={{ background: C.bg3, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '10px 13px' }}>
                <div style={{ ...monoLabel, marginBottom: 5 }}>Transaction</div>
                <a
                  href={`${tonscanBase}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 10, color: C.purpleL, fontFamily: 'IBM Plex Mono, monospace', wordBreak: 'break-all', textDecoration: 'none' }}
                >
                  {txHash}
                </a>
              </div>
            )}

            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>
              TON sent to {readyRewards.length} winner{readyRewards.length !== 1 ? 's' : ''}
            </div>

            <button onClick={onSuccess} style={primaryBtnSt}>Done</button>
          </div>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              background: 'rgba(248,113,113,0.07)', border: '0.5px solid rgba(248,113,113,0.2)',
              borderRadius: 10, padding: '10px 13px',
              fontSize: 12, color: C.red, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {error}
            </div>
            <button onClick={loadRewards} style={ghostBtnSt}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Quest Row

interface RowProps {
  quest: Quest;
  onEdit: () => void;
  onActivate: () => void;
  onFinish: () => void;
  onRemove: () => void;
  onDistribute: () => void;
}

function AdminQuestRow({ quest: q, onEdit, onActivate, onFinish, onRemove, onDistribute }: RowProps) {
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [showP, setShowP]       = useState(false);

  const toggleP = async () => {
    if (showP) { setShowP(false); return; }
    setShowP(true);
    if (participants !== null) return;
    setLoadingP(true);
    try {
      const d = await api.getParticipants(q.id);
      setParticipants(d.participants || []);
    } catch { setParticipants([]); }
    finally { setLoadingP(false); }
  };

  return (
    <div style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 14px 5px' }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ddd' }}>{q.title}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            {q.participantsCount || 0} participants · {q.status}
          </div>
        </div>
        <StatusBadge status={q.status} />
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderTop: `0.5px solid ${C.border}`, flexWrap: 'wrap' }}>
        <button onClick={onEdit} style={ghostBtnSt}>✎ Edit</button>

        {q.status === 'active' && (
          <button
            onClick={onFinish}
            style={{ ...ghostBtnSt, color: C.green, background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.25)' }}
          >
            Complete
          </button>
        )}

        {q.status === 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(q.pendingRewards ?? 0) > 0 && (
              <button
                onClick={onDistribute}
                style={{ ...ghostBtnSt, color: C.ton, background: 'rgba(0,152,234,0.08)', border: '0.5px solid rgba(0,152,234,0.25)' }}
              >
                <TonIcon /> <span style={{ marginLeft: 4 }}>
                  Distribute TON {q.pendingRewards && q.pendingRewards > 0 ? `(${q.pendingRewards})` : ''}
                </span>
              </button>
            )}

            {(q.pendingRewards ?? 0) === 0 && (q.distributedRewards ?? 0) > 0 && (
              <span style={{
                fontSize: 10, color: C.green,
                background: 'rgba(74,222,128,0.08)',
                border: '0.5px solid rgba(74,222,128,0.25)',
                borderRadius: 7, padding: '6px 10px',
                fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600,
              }}>
                ✓ TON Sent ({q.distributedRewards})
              </span>
            )}

          </div>
        )}

        {q.status === 'draft' && (
          <button onClick={onActivate} style={primaryBtnSmSt}>▶ Activate</button>
        )}

        <button onClick={toggleP} style={ghostBtnSt}>{showP ? 'Hide' : 'Participants'}</button>
        <button onClick={onRemove} style={dangerBtnSt}>✕</button>
      </div>

      {showP && (
        <div style={{ borderTop: `0.5px solid ${C.border}`, padding: '10px 14px' }}>
          {loadingP ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
              <Spinner size={16} color={C.green} />
            </div>
          ) : !participants?.length ? (
            <p style={{ fontSize: 12, color: C.muted }}>No participants</p>
          ) : (
            <div>
              {participants.map(p => (
                <div key={p.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `0.5px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ color: '#ccc' }}>
                    {p.firstName || p.username || 'Anonymous'}
                    {p.username && <span style={{ color: C.muted, marginLeft: 5 }}>@{p.username}</span>}
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: C.green, fontWeight: 700 }}>{p.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(123,110,246,0.18)' : 'transparent',
      color: active ? C.purpleL : C.sec,
      border: 'none', borderRadius: 7, padding: '7px 4px',
      fontSize: 10, fontWeight: 700, cursor: 'pointer',
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>
      {label} <span style={{ color: active ? '#fff' : C.muted }}>{count}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    active:    { color: '#9d90f8', bg: 'rgba(123,110,246,0.15)', border: 'rgba(123,110,246,0.35)' },
    draft:     { color: '#777',    bg: 'rgba(100,100,120,0.2)',   border: '#2a2a3a' },
    completed: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',    border: 'rgba(74,222,128,0.25)' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 700, color: s.color, background: s.bg, border: `0.5px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function TonIcon({ size = 12 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, background: C.ton, borderRadius: '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>T</span>
  );
}

function TonBadge() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,152,234,0.1)', border: '0.5px solid rgba(0,152,234,0.3)', borderRadius: 20, padding: '4px 10px' }}>
      <TonIcon size={14} />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.ton }}>TON</span>
    </div>
  );
}

function Spinner({ size = 28, color = C.green }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${C.border}`, borderTopColor: color,
      animation: 'spin 0.6s linear infinite', flexShrink: 0,
    }} />
  );
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const monoLabel: React.CSSProperties = {
  fontSize: 9, color: C.muted, textTransform: 'uppercase',
  letterSpacing: 1, fontFamily: 'IBM Plex Mono, monospace',
};

const newQuestBtnSt: React.CSSProperties = {
  background: '#05050c', color: '#fff', fontSize: 11, fontWeight: 800,
  padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${C.border}`,
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', whiteSpace: 'nowrap',
};

const primaryBtnSt: React.CSSProperties = {
  background: C.purple, color: '#fff', fontSize: 13, fontWeight: 700,
  padding: '11px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif', width: '100%',
};

const primaryBtnSmSt: React.CSSProperties = {
  background: C.purple, color: '#fff', fontSize: 10, fontWeight: 700,
  padding: '6px 11px', borderRadius: 7, border: 'none', cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const ghostBtnSt: React.CSSProperties = {
  background: 'rgba(123,110,246,0.1)', color: '#9d90f8', fontSize: 10, fontWeight: 600,
  padding: '6px 11px', borderRadius: 7, border: '0.5px solid rgba(123,110,246,0.35)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
  display: 'inline-flex', alignItems: 'center',
};

const dangerBtnSt: React.CSSProperties = {
  background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: 10, fontWeight: 600,
  padding: '6px 10px', borderRadius: 7, border: '0.5px solid rgba(248,113,113,0.25)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
};

const ghostBtnMdSt: React.CSSProperties = {
  background: 'rgba(123,110,246,0.1)', color: '#9d90f8', fontSize: 12, fontWeight: 600,
  padding: '9px 14px', borderRadius: 8, border: '0.5px solid rgba(123,110,246,0.35)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', width: '100%',
};