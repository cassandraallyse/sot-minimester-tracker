import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Footprints,
  Dumbbell,
  Award,
  TrendingUp,
  CalendarDays,
  Clock,
  Leaf,
  Users,
  Sparkles,
  Quote,
} from "lucide-react";

// Self-contained progress bar to avoid import path issues
function ProgressBar({
  value,
  variant = "default",
  "aria-label": ariaLabel,
}: {
  value: number;
  variant?: "success" | "warning" | "error" | "default";
  "aria-label"?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const variantColors = {
    default: "bg-purple-500",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    error: "bg-rose-500",
  };

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800"
    >
      <div
        className={`h-full transition-all duration-300 rounded-full ${variantColors[variant]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

type Group = {
  id: number;
  name: string;
};

type Participant = {
  id: number;
  group_id: number;
  name: string;
  location: string;
  steps_goal: number;
  workouts_goal: number;
  workouts_achievable: number;
  steps_total: number;
  workouts_total: number;
  yoga_total: number;
  steps_pct: number;
  workouts_pct: number;
  week_steps: number;
  week_workouts: number;
};

type LeaderboardResponse = {
  rows: Participant[];
  lastUpdated: string | null;
  minLogDate: string | null;
};

const WEEK_STEPS_GOAL = 70000;
const WEEK_WORKOUTS_GOAL = 3;

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_LABELS = [
  { min: 85, label: "Master Thottie 👑", color: "text-emerald-400" },
  { min: 70, label: "Crushing It 💪", color: "text-purple-400" },
  { min: 25, label: "Building Momentum ⚡", color: "text-amber-400" },
  { min: 0, label: "Just Getting Started 🌱", color: "text-slate-400" },
];

const MANTRAS = [
  "Miracles are happening!",
  "Things are happening *for* me, not to me.",
  "I'm getting stronger as I age.",
  "I'm getting hotter as I age.",
  "My body knows exactly what to do.",
  "I am willing to do what it takes to have what I want.",
  "The universe supports me.",
  "Things are always working out for my highest good.",
];

function getRankLabel(compositePct: number, stepsPct: number, workoutsPct: number) {
  if (compositePct >= 85) {
    if (stepsPct >= 75 && workoutsPct >= 75) {
      return { label: "Master Thottie 👑", color: "text-emerald-400" };
    }
    if (workoutsPct > stepsPct) {
      return { label: "Lifting Heavy 🏋️‍♀️", color: "text-sky-400" };
    }
    return { label: "Step Queen 👟", color: "text-purple-400" };
  }
  return RANK_LABELS.find((r) => compositePct >= r.min) ?? RANK_LABELS[3];
}

function getProgressVariant(
  pct: number,
): "success" | "warning" | "error" | "default" {
  if (pct >= 85) return "success";
  if (pct >= 50) return "default";
  if (pct >= 25) return "warning";
  return "error";
}

function formatSteps(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatLastUpdated(ts: string | null): string {
  if (!ts) return "No updates logged yet";
  const date = new Date(ts);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Leaderboard() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [isPrivateGroupView, setIsPrivateGroupView] = useState<boolean>(false);
  const [mantra, setMantra] = useState<string>("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MANTRAS.length);
    setMantra(MANTRAS[randomIndex]);
  }, []);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => fetch("/app-api/groups").then((r) => r.json()),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGroupParam = params.get("groupId") || params.get("group");
    if (urlGroupParam && groups.length > 0) {
      const matchedGroup = groups.find(
        (g) =>
          String(g.id) === urlGroupParam ||
          g.name.toLowerCase() === urlGroupParam.toLowerCase()
      );
      if (matchedGroup) {
        setSelectedGroupId(String(matchedGroup.id));
        setIsPrivateGroupView(true);
      }
    }
  }, [groups]);

  const { data, isLoading, error } = useQuery<LeaderboardResponse | Participant[]>({
    queryKey: ["leaderboard", selectedGroupId],
    queryFn: () =>
      fetch(`/app-api/leaderboard?groupId=${selectedGroupId}`).then((r) => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4 max-w-6xl mx-auto px-4">
        <div className="h-8 bg-slate-800 rounded-md animate-pulse w-48" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-sm text-rose-300 mt-4 max-w-6xl mx-auto">
        Failed to load leaderboard. Please refresh.
      </div>
    );
  }

  const rawParticipants: Participant[] = Array.isArray(data) ? data : data?.rows || [];
  const lastUpdated: string | null = Array.isArray(data) ? null : data?.lastUpdated || null;

  // Sort by composite score (50% steps, 50% workouts)
  const participants = [...rawParticipants].sort((a, b) => {
    const scoreA = (a.steps_pct + a.workouts_pct) / 2;
    const scoreB = (b.steps_pct + b.workouts_pct) / 2;
    return scoreB - scoreA;
  });

  const currentGroupObj = groups.find((g) => String(g.id) === selectedGroupId);

  // 6-Week Minimester: Nov 16 to Dec 27, 2026 (Month 10 = Nov in 0-indexed JS)
  const semesterStart = new Date(2026, 10, 16);
  const TOTAL_WEEKS = 6;
  const TOTAL_DAYS = 42;
  const dateRangeLabel = "November 16 – December 27, 2026";

  const now = new Date();
  const diffInMs = Math.max(0, now.getTime() - semesterStart.getTime());
  const daysElapsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  let weeksElapsed = Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(daysElapsed / 7) + 1));
  let semesterProgressPct = Math.min(100, Math.max(0, Math.round((daysElapsed / TOTAL_DAYS) * 100)));

  if (daysElapsed >= TOTAL_DAYS) {
    weeksElapsed = 6;
    semesterProgressPct = 100;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6 text-slate-100">
      {/* Daily Mantra */}
      {mantra && (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-purple-950/40 p-5 text-center shadow-xl shadow-purple-950/20 backdrop-blur-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] font-bold uppercase tracking-widest text-purple-300 mb-2">
            <Sparkles className="size-3 text-purple-400 animate-pulse" />
            <span>Daily Mantra</span>
            <Sparkles className="size-3 text-purple-400 animate-pulse" />
          </div>
          <div className="relative flex items-center justify-center gap-2">
            <Quote className="size-5 text-purple-500/40 rotate-180 shrink-0 hidden sm:inline" />
            <p className="text-base sm:text-lg font-medium italic text-white tracking-wide">
              {mantra}
            </p>
            <Quote className="size-5 text-purple-500/40 shrink-0 hidden sm:inline" />
          </div>
        </div>
      )}

      {/* Cohort Selector */}
      {!isPrivateGroupView && groups.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 shrink-0">
            <Users className="size-4 text-purple-400" /> Select Group / Cohort:
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white font-medium rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer max-w-xs w-full"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {currentGroupObj ? `${currentGroupObj.name} Progress` : "Minimester Progress"}
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5">
            <Clock className="size-3.5 text-slate-500" />
            Last Updated: <span className="font-medium text-slate-300">{formatLastUpdated(lastUpdated)}</span>
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 shadow-sm">
            <CalendarDays className="size-3.5 text-purple-400" />
            <span>Week <strong className="text-white">{weeksElapsed}</strong> of {TOTAL_WEEKS}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{dateRangeLabel}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-sm">
            <TrendingUp className="size-3.5 text-purple-400" />
            <span>Minimester: <strong className="text-white font-bold">{semesterProgressPct}%</strong> complete</span>
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <ProgressBar value={semesterProgressPct} aria-label="Minimester progress" />
      </div>

      {/* Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {participants.map((p, idx) => {
          const compositePct = (p.steps_pct + p.workouts_pct) / 2;
          const rank = getRankLabel(compositePct, p.steps_pct, p.workouts_pct);
          const medal = MEDALS[idx] ?? null;
          const stepsLeft = Math.max(0, p.steps_goal - p.steps_total);
          const workoutsLeft = Math.max(0, p.workouts_goal - p.workouts_total);

          return (
            <div
              key={p.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {medal && <span className="text-2xl">{medal}</span>}
                  {!medal && idx < 6 && (
                    <span className="text-lg font-bold text-slate-500">#{idx + 1}</span>
                  )}
                  <div>
                    <h2 className="text-base font-semibold text-white">{p.name}</h2>
                    {p.location && <p className="text-xs text-slate-400">{p.location}</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium ${rank.color}`}>
                  {rank.label}
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Footprints className="size-3.5 text-purple-400" /> Steps
                  </span>
                  <span className="font-semibold text-white">
                    {formatSteps(p.steps_total)}
                    <span className="text-slate-400 font-normal text-xs">
                      /{formatSteps(p.steps_goal)}
                    </span>
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, p.steps_pct)}
                  variant={getProgressVariant(p.steps_pct)}
                  aria-label={`${p.name} steps progress`}
                />
                <p className="text-xs text-slate-400">
                  {p.steps_pct.toFixed(1)}% complete
                  {stepsLeft > 0 && ` · ${formatSteps(stepsLeft)} to go`}
                </p>
              </div>

              {/* Workouts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Dumbbell className="size-3.5 text-sky-400" /> Workouts
                  </span>
                  <span className="font-semibold text-white">
                    {p.workouts_total}
                    <span className="text-slate-400 font-normal text-xs">
                      /{p.workouts_goal} required
                    </span>
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, p.workouts_pct)}
                  variant={getProgressVariant(p.workouts_pct)}
                  aria-label={`${p.name} workouts progress`}
                />
                <p className="text-xs text-slate-400">
                  {p.workouts_pct.toFixed(1)}% complete
                  {workoutsLeft > 0 && ` · ${workoutsLeft} sessions to go`}
                </p>
              </div>

              {/* Weekly Tracker */}
              <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3 space-y-2">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-purple-400" /> This week
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Steps</span>
                      <span className={`font-semibold ${p.week_steps >= WEEK_STEPS_GOAL ? "text-emerald-400" : "text-white"}`}>
                        {formatSteps(p.week_steps)}
                        <span className="text-slate-500 font-normal">/{formatSteps(WEEK_STEPS_GOAL)}</span>
                      </span>
                    </div>
                    <ProgressBar
                      value={Math.min(100, Math.round((p.week_steps / WEEK_STEPS_GOAL) * 100))}
                      variant={p.week_steps >= WEEK_STEPS_GOAL ? "success" : "default"}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Workouts</span>
                      <span className={`font-semibold ${p.week_workouts >= WEEK_WORKOUTS_GOAL ? "text-emerald-400" : "text-white"}`}>
                        {p.week_workouts}
                        <span className="text-slate-500 font-normal">/{WEEK_WORKOUTS_GOAL}</span>
                      </span>
                    </div>
                    <ProgressBar
                      value={Math.min(100, Math.round((p.week_workouts / WEEK_WORKOUTS_GOAL) * 100))}
                      variant={p.week_workouts >= WEEK_WORKOUTS_GOAL ? "success" : "default"}
                    />
                  </div>
                </div>
              </div>

              {/* Score Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Award className="size-3.5 text-amber-400" /> Minimester Total
                </span>
                <div className="flex items-center gap-3">
                  {p.yoga_total > 0 && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      <Leaf className="size-3" /> {p.yoga_total} Yoga
                    </span>
                  )}
                  <div>
                    <span className="text-sm font-bold text-purple-400">
                      {compositePct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 ml-1">overall</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {participants.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-sm">
            No participants found in this group yet — add some in Admin!
          </p>
        </div>
      )}
    </div>
  );
}
