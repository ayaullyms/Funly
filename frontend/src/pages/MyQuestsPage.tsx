import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Quest } from "../types";
import { timeAgo } from "../utils";
import { SpinnerPage, EmptyState } from "../components/ui";
import { useApp } from "../context/AppContext";
import { useQuestDetail } from "../context/QuestDetailContext";

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

const C = {
  bg2: "#13131f",
  border: "#1e1e32",
  purple: "#7B6EF6",
  purpleL: "#9d90f8",
  muted: "#44445a",
  sec: "#888",
  green: "#4ade80",
  amber: "#fbbf24",
};

export function MyQuestsPage() {
  const { navigate } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    api
      .getMyQuests()
      .then((d) => {
        setQuests(d.quests || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = quests.filter((q) => q.status === filter);

  const openQuest = (id: string) => {
    sessionStorage.setItem("questReturnPage", "myquests");
    setQuestId(id);
    setDetailState(null);
    navigate("detail");
  };

  const earned = quests.reduce(
    (s, q) => s + Number((q as any).rewardAmount || 0),
    0,
  );

  if (loading) return <SpinnerPage />;
  if (error)
    return (
      <p
        style={{
          color: "#f87171",
          textAlign: "center",
          padding: "2rem 0",
          fontSize: 13,
        }}
      >
        {error}
      </p>
    );

  return (
    <div className="flex flex-col gap-4 pb-2">
      {earned > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(74,222,128,0.06)",
            border: "0.5px solid rgba(74,222,128,0.2)",
            borderRadius: 9, padding: "9px 13px",
          }}
        >
          <span style={{ fontSize: 10, color: C.sec }}>Total earned</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 13, height: 13,
                background: "#0098EA",
                borderRadius: "50%",  display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 15, fontWeight: 800,
                color: C.green, fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              {earned.toFixed(2)}
            </span>
            <span style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>
              TON
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex", background: C.bg2,
          border: `0.5px solid ${C.border}`,
          borderRadius: 10, padding: 2,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              flex: 1, padding: "6px 0",
              textAlign: "center", fontSize: 10,
              fontWeight: 600, borderRadius: 8,
              border: "none", cursor: "pointer",
              transition: "all 0.15s",
              background: filter === f.id ? C.purple : "transparent",
              color: filter === f.id ? "#fff" : C.sec,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text={filter === "active" ? "No active quests" : "No completed quests"}
          action={
            <button
              onClick={() => navigate("home")}
              style={{
                marginTop: 8, background: C.purple,
                color: "#fff", fontSize: 12,
                fontWeight: 700, padding: "9px 18px",
                borderRadius: 9, border: "none",
                cursor: "pointer", fontFamily: "IBM Plex Sans, sans-serif",
              }}
            >
              Browse Quests
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((q) => (
            <MyQuestCard key={q.id} quest={q} onOpen={openQuest} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyQuestCard({
  quest: q,
  onOpen,
}: {
  quest: Quest;
  onOpen: (id: string) => void;
}) {
  const score = (q as any).score ?? q.myScore ?? 0;
  const rank = (q as any).rank ?? q.myRank;
  const totalTasks = Number(q.totalTasks || 0);
  const completedTasks = getCompletedTasks(q, score, totalTasks);
  const progressPercent =
    totalTasks > 0
      ? Math.min(100, Math.max(0, Math.round((completedTasks / totalTasks) * 100)))
      : 0;
  const isWinner = (q as any).iWon ?? (q as any).isWinner;
  const isActive = q.status === "active";

  return (
    <div
      onClick={() => q.status !== "draft" && onOpen(q.id)}
      style={{
        background: C.bg2,
        border: `0.5px solid ${isActive ? "rgba(123,110,246,0.4)" : C.border}`,
        borderRadius: 11, padding: 12, cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 9,
        }}
      >
        <h3
          style={{
            fontSize: 13, fontWeight: 700,
            color: "#ddd", flex: 1, paddingRight: 6,
          }}
        >
          {q.title}
        </h3>
        <div
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "flex-end", gap: 4,
          }}
        >
          <StatusBadge status={q.status} />
          {isWinner && (
            <span style={{
              fontSize: 8, padding: "2px 7px", borderRadius: 4,
              fontWeight: 700, color: C.amber,
              background: "rgba(251,191,36,0.12)",
              border: `0.5px solid rgba(251,191,36,0.3)`,
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
              Winner
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex", gap: 0,
          marginBottom: q.isJoined && isActive ? 9 : 0,
        }}
      >
        {[
          { v: rank ? "#" + rank : "—", l: "Rank" },
          { v: score, l: "Pts" },
        ].map((s, i, arr) => (
          <div
            key={i}
            style={{
              flex: 1, textAlign: "center",
              borderRight:
                i < arr.length - 1 ? `0.5px solid ${C.border}` : "none",
            }}
          >
            <div
              style={{
                fontSize: 14, fontWeight: 700,
                color: isWinner && s.l === "Earned" ? C.green : C.purpleL,
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              {s.v}
            </div>
            <div
              style={{
                fontSize: 8, color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.3, marginTop: 1,
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {isActive && totalTasks > 0 && (
        <div>
          <div
            style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 9, color: C.muted, marginBottom: 3,
            }}
          >
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div style={{ height: 2, background: "#2a2a3a", borderRadius: 2 }}>
            <div
              style={{
                height: "100%", borderRadius: 2,
                background: C.purple, width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getCompletedTasks(q: Quest, score: number, totalTasks: number) {
  const rawCompleted =
    (q as any).myCompletedTasks ??
    (q as any).completedTasks ??
    (q as any).tasksCompleted ??
    (q as any).completedCount ??
    (q as any).correctAnswersCount;

  const completed = Number(rawCompleted);
  if (Number.isFinite(completed) && completed > 0) {
    return Math.min(completed, totalTasks);
  }

  if (score > 0 && totalTasks > 0) {
    return Math.min(Math.max(1, Math.floor(score / 10)), totalTasks);
  }

  return 0;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    active: {
      color: "#9d90f8",
      bg: "rgba(123,110,246,0.15)",
      border: "rgba(123,110,246,0.35)",
    },
    draft: { color: "#555", bg: "rgba(100,100,120,0.2)", border: "#2a2a3a" },
    completed: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.1)",
      border: "rgba(74,222,128,0.25)",
    },
  };
  const s = map[status] || map.draft;
  return (
    <span
      style={{
        fontSize: 9, padding: "2px 8px",
        borderRadius: 5, fontWeight: 700,
        color: s.color, background: s.bg,
        border: `0.5px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
