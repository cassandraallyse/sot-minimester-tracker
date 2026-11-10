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
          <label className="text-xs font-semibold text
