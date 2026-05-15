import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import type { Task } from "../types";
import { useApp } from "../context/AppContext";
import { useQuestDetail } from "../context/QuestDetailContext";

interface Props {
  taskId: string;
  taskIndex: number;
  onBack: () => void;
}

const C = {
  bg: "#0D0D14",
  bg2: "#13131f",
  border: "#1e1e32",
  purple: "#7B6EF6",
  purpleL: "#9d90f8",
  muted: "#44445a",
  sec: "#888",
  green: "#4ade80",
  red: "#f87171",
};

export function TaskPage({ taskId, taskIndex: initialIndex, onBack }: Props) {
  const { showToast } = useApp();
  const {
    questId,
    detailState,
    setDetailState,
    updateTaskInCache,
    updateQuestInCache,
  } = useQuestDetail();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [textAns, setTextAns] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [optimisticSubmittedIds, setOptimisticSubmittedIds] = useState<
    Set<string>
  >(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const tasks = detailState?.questData.tasks || [];
  const quest = detailState?.questData.quest;
  const task = tasks[currentIndex];

  useEffect(() => {
    setSelectedIndex(null);
    setTextAns("");
  }, [currentIndex]);

  if (!task || !quest) return null;

  const opts = Array.isArray(task.options) ? task.options : [];
  const isMulti = opts.length > 0;
  const submitted =
    task.myAnswer != null || optimisticSubmittedIds.has(task.id);
  const total = tasks.length;
  const completedCount = Math.min(
    total,
    tasks.filter((t) => t.myAnswer != null || optimisticSubmittedIds.has(t.id))
      .length,
  );
  const progress = total > 0 ? (completedCount / total) * 100 : 0;
  const allCompleted = total > 0 && completedCount === total;

  const refreshQuestState = async () => {
    if (!questId) return;
    const [qd, lb] = await Promise.all([
      api.getQuest(questId),
      api.getLeaderboard(questId),
    ]);
    setDetailState({ questData: qd, lbData: lb });
  };

  const submit = async () => {
    if (!questId || submitted || submitting) return;

    const answer = isMulti
      ? selectedIndex !== null
        ? opts[selectedIndex]
        : null
      : textAns.trim();
    if (!answer) {
      showToast(isMulti ? "Select an answer" : "Enter your answer", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitTask(questId, task.id, answer);

      setOptimisticSubmittedIds((prev) => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
      });

      updateTaskInCache(task.id, {
        myAnswer: answer,
        myAnswerCorrect: res.isCorrect,
        myPoints: res.pointsAwarded,
      });

      updateQuestInCache({
        myScore: res.currentScore,
        myRank: res.currentRank,
        myCompletedTasks: Math.max((quest.myCompletedTasks || 0) + 1, 1),
      });

      showToast(
        res.isCorrect ? `Correct! +${res.pointsAwarded} pts` : "Wrong answer",
        res.isCorrect ? "success" : "error",
      );

      await refreshQuestState();
    } catch (e: any) {
      const msg = String(e?.message || "");

      if (/already|submitted|completed|пройден|отправлен/i.test(msg)) {
        try {
          setOptimisticSubmittedIds((prev) => {
            const next = new Set(prev);
            next.add(task.id);
            return next;
          });
          await refreshQuestState();
          showToast("Task status updated");
        } catch {
          showToast(msg, "error");
        }
      } else {
        showToast(msg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Hero with gradient */}
      <div
        style={{
          background: `linear-gradient(155deg, #1a1560 0%, ${C.bg} 80%)`,
          borderRadius: 16, padding: "12px 14px 14px",
          border: `0.5px solid ${C.border}`,
        }}
      >
        {/* top row */}
        <div
          style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 10,
          }}
        >
          <button onClick={onBack} style={backBtnSt}>
            ← Tasks
          </button>
          <span
            style={{
              fontSize: 11,
              color: allCompleted ? C.green : C.purpleL,
              fontFamily: "IBM Plex Mono, monospace",
              fontWeight: 700,
            }}
          >
            {allCompleted
              ? "All tasks completed"
              : `${completedCount} / ${total} completed`}
          </span>
        </div>

        {/* progress bar */}
        <div
          style={{
            height: 2, background: "#2a2a3a", 
            borderRadius: 2, marginBottom: 10,
          }}
        >
          <div
            style={{
              height: "100%", borderRadius: 2,
              background: C.purple, width: `${progress}%`,
              transition: "width 0.3s",
            }}
          />
        </div>

        <div
          style={{
            display: "inline-flex",
            background: "rgba(123,110,246,0.15)",
            border: "0.5px solid rgba(123,110,246,0.35)",
            borderRadius: 5, padding: "2px 8px",
            fontSize: 10, color: C.purpleL,
            fontWeight: 700, marginBottom: 8,
          }}
        >
          +{task.points} pts
        </div>
        <h2
          style={{
            fontWeight: 700, fontSize: 15,
            color: "#fff", lineHeight: 1.5, marginBottom: 3,
          }}
        >
          {task.title}
        </h2>
        {task.description && (
          <p style={{ fontSize: 11, color: "#6a609a", lineHeight: 1.5 }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Answer area */}
      {submitted ? (
        <SubmittedView task={task} opts={opts} />
      ) : quest.status !== "active" ? (
        <p
          style={{
            color: C.sec,
            textAlign: "center",
            fontSize: 13,
            padding: "1rem 0",
          }}
        >
          Quest is not active
        </p>
      ) : isMulti ? (
        <div className="flex flex-col gap-2">
          {opts.map((o, i) => {
            const isSel = selectedIndex === i;
            return (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                style={{
                  display: "flex", alignItems: "center",
                  gap: 10, padding: "10px 13px",
                  background: isSel ? "rgba(123,110,246,0.06)" : C.bg2,
                  border: `0.5px solid ${isSel ? C.purple : C.border}`,
                  borderRadius: 10, cursor: "pointer",
                  textAlign: "left", width: "100%",
                }}
              >
                <span
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `1px solid ${isSel ? C.purple : "#2a2a3a"}`,
                    background: isSel ? C.purple : "transparent",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {isSel && (
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#fff", display: "block",
                      }}
                    />
                  )}
                </span>
                <span
                  style={{ fontSize: 12, color: isSel ? "#d0c8ff" : "#bbb" }}
                >
                  {o}
                </span>
              </button>
            );
          })}
          <button
            onClick={submit}
            disabled={selectedIndex === null || submitting}
            style={primaryBtnSt(selectedIndex !== null && !submitting)}
          >
            {submitting ? "Checking..." : "Check Answer"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            placeholder="Type your answer..."
            value={textAns}
            onChange={(e) => setTextAns(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{
              background: C.bg2, border: `0.5px solid rgba(123,110,246,0.5)`,
              borderRadius: 9, padding: "11px 13px",
              fontSize: 13, color: "#ddd",
              fontFamily: "IBM Plex Sans, sans-serif", outline: "none", width: "100%",
            }}
          />
          <button
            onClick={submit}
            disabled={!textAns.trim() || submitting}
            style={primaryBtnSt(!!textAns.trim() && !submitting)}
          >
            {submitting ? "Checking..." : "Check Answer"}
          </button>
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
        {tasks.map((t, i) => {
          let bg = "#2a2a3a";
          if (t.myAnswer != null) bg = t.myAnswerCorrect ? C.green : C.red;
          else if (i === currentIndex) bg = C.purple;
          return (
            <div
              key={i}
              style={{ width: 18, height: 3, borderRadius: 2, background: bg }}
            />
          );
        })}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 8 }}>
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            style={ghostBtnSt}
          >
            ← Prev
          </button>
        )}
        {currentIndex < total - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            style={{ ...ghostBtnSt, flex: 1 }}
          >
            Next →
          </button>
        ) : (
          <button onClick={onBack} style={{ ...primaryBtnSt(true), flex: 1 }}>
            View Results
          </button>
        )}
      </div>
    </div>
  );
}

function SubmittedView({ task, opts }: { task: Task; opts: string[] }) {
  const isCorrect = task.myAnswerCorrect === true;
  const isWrong = task.myAnswerCorrect === false;
  return (
    <div className="flex flex-col gap-3">
      {opts.length > 0 ? (
        opts.map((o, i) => {
          const isSel =
            i < opts.length &&
            opts[i] === task.myAnswer &&
            task.myAnswer != null;
          let bg = "#13131f",
            border = "#1e1e32";
          if (isSel && isCorrect) {
            bg = "rgba(74,222,128,0.06)";
            border = "rgba(74,222,128,0.4)";
          }
          if (isSel && isWrong) {
            bg = "rgba(248,113,113,0.06)";
            border = "rgba(248,113,113,0.35)";
          }
          const circleColor = isSel
            ? isCorrect
              ? "#4ade80"
              : isWrong
                ? "#f87171"
                : "#2a2a3a"
            : "#2a2a3a";
          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center",
                gap: 10, padding: "10px 13px", background: bg,
                border: `0.5px solid ${border}`, borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `1px solid ${circleColor}`,
                  background: isSel ? `${circleColor}40` : "transparent",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                  fontSize: 10, color: circleColor,
                }}
              >
                {isSel && (isCorrect ? "✓" : isWrong ? "✗" : null)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: isSel
                    ? isCorrect
                      ? "#4ade80"
                      : isWrong
                        ? "#f87171"
                        : "#bbb"
                    : "#bbb",
                }}
              >
                {o}
              </span>
            </div>
          );
        })
      ) : (
        <div
          style={{
            background: "#13131f", border: "0.5px solid #2a2a3a",
            borderRadius: 10, padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 9, color: "#555",
              textTransform: "uppercase", letterSpacing: 0.8,
              marginBottom: 4, fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            Your answer
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>
            {task.myAnswer || "—"}
          </div>
        </div>
      )}
      {/* Result banner */}
      <div
        style={{
          borderRadius: 10, padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isCorrect
            ? "rgba(74,222,128,0.08)"
            : "rgba(248,113,113,0.08)",
          border: `0.5px solid ${isCorrect ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
        }}
      >
        <span
          style={{
            fontSize: 13, fontWeight: 700, color: isCorrect ? "#4ade80" : "#f87171",
          }}
        >
          {isCorrect ? "Correct!" : "Wrong answer"}
        </span>
        {isCorrect && (
          <span
            style={{
              fontSize: 18, fontWeight: 800,
              color: "#4ade80", fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            +{task.myPoints}
          </span>
        )}
      </div>
    </div>
  );
}

const backBtnSt: React.CSSProperties = {
  fontSize: 11, color: "#7B6EF6",
  background: "none", border: "none",
  cursor: "pointer", padding: 0,
  fontFamily: "IBM Plex Sans, sans-serif",
};

const primaryBtnSt = (active: boolean): React.CSSProperties => ({
  width: "100%", background: active ? "#7B6EF6" : "#2a2a3a",
  color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 14px",
  borderRadius: 9, border: "none", cursor: active ? "pointer" : "not-allowed",
  fontFamily: "IBM Plex Sans, sans-serif", opacity: active ? 1 : 0.5,
});

const ghostBtnSt: React.CSSProperties = {
  flex: 1, background: "rgba(123,110,246,0.1)",
  color: "#9d90f8", fontSize: 12, fontWeight: 600,
  padding: "9px 14px", borderRadius: 9,
  border: "0.5px solid rgba(123,110,246,0.35)",
  cursor: "pointer", fontFamily: "IBM Plex Sans, sans-serif",
};
