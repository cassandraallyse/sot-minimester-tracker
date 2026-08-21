import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "../components/Progress";
import {
  Footprints,
  Dumbbell,
  Clock,
  Leaf,
  Users,
  Sparkles,
  CalendarDays,
  Target,
  CheckCircle2,
} from "lucide-react";

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

function getPaceBadge(p: Participant, expectedPct: number) {
  const avgPct = (p.steps_pct + p.workouts_pct) / 2;
  const weekComplete =
    p.week_steps >= WEEK_STEPS_GOAL && p.week_workouts >= WEEK_WORKOUTS_GOAL;

  if (weekComplete) {
    return {
      label: "Weekly Target Hit ⚡",
      classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    };
  }
  if (avgPct >= expectedPct + 10) {
    return {
      label: "Crushing Pace 🔥",
      classes: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    };
  }
  if (avgPct >= expectedPct - 5) {
    return {
      label: "On Track 🎯",
      classes: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    };
  }
  return {
    label: "Steady Progress 🌱",
    classes: "bg-slate-800 text-slate-300 border-slate-700",
  };
}

function formatSteps(n: number) {
  return Number(n || 0).toLocaleString();
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
      <div className="space-y-4 mt-4">
        <div className="h-8 bg-slate-900 rounded-md animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-400 mt-4">
        Failed to load tracker. Please refresh.
      </div>
    );
  }

  const rawParticipants: Participant[] = Array.isArray(data) ? data : data?.rows || [];
  const lastUpdated: string | null = Array.isArray(data) ? null : data?.lastUpdated || null;

  // Alphabetical sorting to keep focus on personal growth
  const participants = [...rawParticipants].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const currentGroupObj = groups.find((g) => String(g.id) === selectedGroupId);

  // Minimester Timeline: Aug 10, 2026 to Sept 6, 2026 (28 Days)
  const semesterStart = new Date(2026, 7, 10);
  const TOTAL_WEEKS = 4;
  const TOTAL_DAYS = 28;

  const now = new Date();
  const diffInMs = Math.max(0, now.getTime() - semesterStart.getTime());
  const daysElapsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  const weeksElapsed = Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(daysElapsed / 7) + 1));
  const semesterProgressPct = Math.min(100, Math.max(0, Math.round((daysElapsed / TOTAL_DAYS) * 100)));

  return (
    <div className="space-y-6 text-slate-100">
      {/* Daily Mantra Banner */}
      {mantra && (
        <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-purple-950/30 p-4 text-center shadow-lg backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold flex items-center justify-center gap-1.5 mb-1">
            <Sparkles className="size-3" /> Daily Mantra <Sparkles className="size-3" />
          </p>
          <p className="text-sm md:text-base font-medium italic text-slate-200">
            "{mantra}"
          </p>
        </div>
      )}

      {/* Cohort Selector */}
      {!isPrivateGroupView && groups.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 flex items-center justify-between gap-4 backdrop-blur-sm">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-2 shrink-0">
            <Users className="size-4 text-purple-400" /> Cohort:
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 font-medium rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer max-w-xs w-full transition"
          >
            <option value="all">All Participants</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {currentGroupObj ? `${currentGroupObj.name} Dashboard` : "Minimester Dashboard"}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Week {weeksElapsed} of {TOTAL_WEEKS} · August 10 through September 6, 2026
          </p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1.5">
            <Clock className="size-3" />
            Last Updated: <span className="font-medium text-slate-300">{formatLastUpdated(lastUpdated)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 self-start md:self-auto">
          <Target className="size-3.5 text-purple-400" />
          <span>Timeline: <strong className="text-white">{semesterProgressPct}%</strong> Elapsed</span>
        </div>
      </div>

      {/* Modern Participant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {participants.map((p) => {
          const badge = getPaceBadge(p, semesterProgressPct);
          const stepsLeft = Math.max(0, p.steps_goal - p.steps_total);
          const workoutsLeft = Math.max(0, p.workouts_goal - p.workouts_total);
          const overallCompletion = ((p.steps_pct + p.workouts_pct) / 2).toFixed(1);

          return (
            <div
              key={p.id}
              className="group relative rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition duration-200 shadow-md backdrop-blur-sm"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {p.name}
                    </h2>
                    {p.location && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                        {p.location}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badge.classes}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Primary Goals Section */}
              <div className="space-y-3.5">
                {/* Steps */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Footprints className="size-3.5 text-purple-400" /> Steps Goal
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {formatSteps(p.steps_total)}{" "}
                      <span className="text-slate-500 font-normal">
                        / {formatSteps(p.steps_goal)}
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, p.steps_pct)}
                    variant="default"
                    aria-label={`${p.name} steps`}
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>{p.steps_pct.toFixed(1)}% complete</span>
                    <span>{stepsLeft > 0 ? `${formatSteps(stepsLeft)} to go` : "Goal reached! 🎉"}</span>
                  </div>
                </div>

                {/* Workouts */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Dumbbell className="size-3.5 text-sky-400" /> Workouts Goal
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {p.workouts_total}{" "}
                      <span className="text-slate-500 font-normal">
                        / {p.workouts_goal} sessions
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, p.workouts_pct)}
                    variant="default"
                    aria-label={`${p.name} workouts`}
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>{p.workouts_pct.toFixed(1)}% complete</span>
                    <span>{workoutsLeft > 0 ? `${workoutsLeft} remaining` : "Goal reached! ⚡"}</span>
                  </div>
                </div>
              </div>

              {/* Weekly Momentum Sub-Panel */}
              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3 text-purple-400" /> This Week's Pace
                  </span>
                  {(p.week_steps >= WEEK_STEPS_GOAL || p.week_workouts >= WEEK_WORKOUTS_GOAL) && (
                    <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-semibold">
                      <CheckCircle2 className="size-3" /> Target hit
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Steps</span>
                      <span>{formatSteps(p.week_steps)} / 70k</span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.round((p.week_steps / WEEK_STEPS_GOAL) * 100))}
                      variant={p.week_steps >= WEEK_STEPS_GOAL ? "success" : "default"}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Workouts</span>
                      <span>{p.week_workouts} / 3</span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.round((p.week_workouts / WEEK_WORKOUTS_GOAL) * 100))}
                      variant={p.week_workouts >= WEEK_WORKOUTS_GOAL ? "success" : "default"}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer: Yoga & Personal Score */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div>
                  {p.yoga_total > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <Leaf className="size-3" /> {p.yoga_total} Yoga {p.yoga_total === 1 ? "session" : "sessions"}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Self-paced journey</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-purple-400">
                    {overallCompletion}%
                  </span>
                  <span className="text-[11px] text-slate-500 ml-1.5 font-sans">complete</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {participants.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <p className="text-sm">
            No participants found in this view.
          </p>
        </div>
      )}
    </div>
  );
}
