import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Footprints,
  Dumbbell,
  Leaf,
  CheckCircle2,
  Calendar,
  Upload,
  Trash2,
  UserPlus,
  UserX,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Users,
  Lock,
  Key,
  Plus,
  Minus,
} from "lucide-react";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const cleanStr = String(dateStr).split("T")[0];
  const [year, month, day] = cleanStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}

type Group = {
  id: number;
  name: string;
};

type Participant = {
  id: number;
  group_id: number | null;
  name: string;
  location: string;
};

type LogEntry = {
  id: number;
  participant_id: number;
  log_date: string;
  steps: number;
  workout: number;
  yoga: number;
};

const today = new Date().toISOString().split("T")[0];

export default function Admin() {
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Single mode state
  const [date, setDate] = useState(today);
  const [steps, setSteps] = useState("");
  const [workout, setWorkout] = useState(0);
  const [yoga, setYoga] = useState(0);

  // Accordions
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showManageThotties, setShowManageThotties] = useState(false);
  const [showManageSecurity, setShowManageSecurity] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [assignGroupId, setAssignGroupId] = useState<string>("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [updatingPasscode, setUpdatingPasscode] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Passcode Auth State (Default: 2026)
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passError, setPassError] = useState("");

  function showToast(text: string, type: "success" | "error" = "success") {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) {
      setPassError("Please enter a passcode.");
      return;
    }
    try {
      const res = await fetch("/app-api/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, groupId: selectedGroupId }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPassError("");
      } else {
        setPassError("Incorrect passcode. Try again.");
      }
    } catch {
      setPassError("Error verifying passcode.");
    }
  }

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => fetch("/app-api/groups").then((r) => r.json()),
  });

  const { data: participants = [], isLoading } = useQuery<Participant[]>({
    queryKey: ["participants", selectedGroupId],
    queryFn: () =>
      fetch(`/app-api/participants?groupId=${selectedGroupId}`).then((r) => r.json()),
  });

  const { data: logs = [] } = useQuery<LogEntry[]>({
    queryKey: ["logs", selectedId],
    queryFn: () => fetch(`/app-api/logs/${selectedId}`).then((r) => r.json()),
    enabled: !!selectedId,
  });

  async function handleUpdatePasscode(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminPasscode.trim() || newAdminPasscode.trim().length < 4) {
      showToast("Passcode must be at least 4 characters long", "error");
      return;
    }
    setUpdatingPasscode(true);
    try {
      const res = await fetch("/app-api/update-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          newPasscode: newAdminPasscode.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update passcode");
      showToast("Passcode updated successfully!");
      setNewAdminPasscode("");
    } catch {
      showToast("Error updating passcode", "error");
    } finally {
      setUpdatingPasscode(false);
    }
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showToast("Please enter a group name", "error");
      return;
    }
    setAddingGroup(true);
    try {
      const res = await fetch("/app-api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add group");
      showToast(`Group "${newGroupName}" created!`);
      setNewGroupName("");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch {
      showToast("Error creating group", "error");
    } finally {
      setAddingGroup(false);
    }
  }

  async function handleDeleteGroup(g: Group) {
    if (!window.confirm(`Delete group "${g.name}"? Participants will become unassigned.`)) return;
    try {
      const res = await fetch(`/app-api/groups/${g.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      showToast(`Group "${g.name}" deleted`);
      if (selectedGroupId === String(g.id)) setSelectedGroupId("all");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["participants"] });
    } catch {
      showToast("Error deleting group", "error");
    }
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Please enter a name", "error");
      return;
    }
    setAddingParticipant(true);
    try {
      const res = await fetch("/app-api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          location: newLocation.trim(),
          group_id: assignGroupId ? Number(assignGroupId) : null,
          steps_goal: 420000,
          workouts_goal: 18,
        }),
      });
      if (!res.ok) throw new Error("Failed to add participant");
      showToast(`${newName} added!`);
      setNewName("");
      setNewLocation("");
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch {
      showToast("Error adding participant", "error");
    } finally {
      setAddingParticipant(false);
    }
  }

  async function handleDeleteParticipant(p: Participant) {
    if (!window.confirm(`Remove ${p.name}? This also removes their log history!`)) return;
    try {
      const res = await fetch(`/app-api/participants/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast(`${p.name} removed`);
      if (selectedId === p.id) setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch {
      showToast("Error removing participant", "error");
    }
  }

  async function handleSingleSave() {
    if (!selectedId) {
      showToast("Select a participant first", "error");
      return;
    }
    if (!date) {
      showToast("Date is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/app-api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: selectedId,
          log_date: date,
          steps: steps === "" ? 0 : Number(steps),
          workout,
          yoga,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showToast("Entry saved!");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["logs", selectedId] });
      setSteps("");
      setWorkout(0);
      setYoga(0);
    } catch {
      showToast("Something went wrong saving entry", "error");
    } finally {
      setSaving(false);
    }
  }

  function extractMatrixLogs(
    rowTypes: Record<string, string[]>,
    dateColIndices: { idx: number; isoDate: string }[]
  ) {
    const stepsRow = rowTypes["Steps"] || [];
    const workoutRow = rowTypes["Workout"] || [];
    const yogaRow = rowTypes["Yoga"] || [];
    const logs = [];

    for (const { idx, isoDate } of dateColIndices) {
      const sRaw = (stepsRow[idx] || "0").replace(/,/g, "");
      const wRaw = (workoutRow[idx] || "0").trim().toLowerCase();
      const yRaw = (yogaRow[idx] || "0").trim().toLowerCase();

      const stepsNum = parseInt(sRaw, 10) || 0;
      let wNum = 0;
      if (wRaw === "y" || wRaw === "true") wNum = 1;
      else wNum = parseInt(wRaw, 10) || 0;

      let yNum = 0;
      if (yRaw === "y" || yRaw === "true") yNum = 1;
      else yNum = parseInt(yRaw, 10) || 0;

      if (stepsNum > 0 || wNum > 0 || yNum > 0) {
        logs.push({ log_date: isoDate, steps: stepsNum, workout: wNum, yoga: yNum });
      }
    }
    return logs;
  }

  async function handleFileUpload() {
    if (!csvFile) {
      showToast("Please choose a CSV file to upload", "error");
      return;
    }
    setSaving(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("File is empty");

        const rawLines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        if (rawLines.length < 2) throw new Error("CSV file too short");

        const headerCols = parseCsvLine(rawLines[0]);
        const dateColIndices: { idx: number; isoDate: string }[] = [];
        headerCols.forEach((col, idx) => {
          const match = col.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (match) {
            const m = match[1].padStart(2, "0");
            const d = match[2].padStart(2, "0");
            const y = match[3];
            dateColIndices.push({ idx, isoDate: `${y}-${m}-${d}` });
          }
        });

        const isMatrixSheet = dateColIndices.length > 0;

        if (isMatrixSheet) {
          let currentParticipantId: number | null = null;
          let rowTypes: Record<string, string[]> = {};
          const bulkPayloads: { participant_id: number; logs: any[] }[] = [];

          for (let i = 1; i < rawLines.length; i++) {
            const parts = parseCsvLine(rawLines[i]);
            const firstCol = parts[0];
            if (!firstCol) continue;

            if (["Steps", "Workout", "Yoga"].includes(firstCol)) {
              if (currentParticipantId && !rowTypes[firstCol]) {
                rowTypes[firstCol] = parts;
              }
            } else {
              if (currentParticipantId && Object.keys(rowTypes).length > 0) {
                const pLogs = extractMatrixLogs(rowTypes, dateColIndices);
                if (pLogs.length > 0) bulkPayloads.push({ participant_id: currentParticipantId, logs: pLogs });
              }
              const firstName = firstCol.split(" ")[0].toLowerCase();
              const matchP = participants.find((p) => {
                const pFirst = p.name.toLowerCase().split(" ")[0];
                return (
                  pFirst === firstName ||
                  firstName.startsWith(pFirst) ||
                  pFirst.startsWith(firstName)
                );
              });
              currentParticipantId = matchP ? matchP.id : null;
              rowTypes = {};
            }
          }

          if (currentParticipantId && Object.keys(rowTypes).length > 0) {
            const pLogs = extractMatrixLogs(rowTypes, dateColIndices);
            if (pLogs.length > 0) bulkPayloads.push({ participant_id: currentParticipantId, logs: pLogs });
          }

          if (bulkPayloads.length === 0) {
            showToast("No matching participant entries found in spreadsheet.", "error");
            setSaving(false);
            return;
          }

          let totalCount = 0;
          for (const payload of bulkPayloads) {
            const res = await fetch("/app-api/logs/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) totalCount += payload.logs.length;
          }

          showToast(`Uploaded ${totalCount} entries across participants!`);
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          if (selectedId) queryClient.invalidateQueries({ queryKey: ["logs", selectedId] });
          setCsvFile(null);
        } else {
          if (!selectedId) {
            showToast("Select a participant first for single-person CSV", "error");
            setSaving(false);
            return;
          }
          const parsedLogs = [];
          for (let i = 0; i < rawLines.length; i++) {
            const parts = parseCsvLine(rawLines[i]);
            if (i === 0 && isNaN(Number(parts[1]))) continue;
            if (parts.length >= 2) {
              const log_date = parts[0];
              const stepsNum = Number(parts[1]) || 0;
              const wVal = parts[2]?.trim().toLowerCase();
              let wNum = 0;
              if (wVal === "y" || wVal === "true") wNum = 1;
              else wNum = parseInt(wVal, 10) || 0;

              const yVal = parts[3]?.trim().toLowerCase();
              let yNum = 0;
              if (yVal === "y" || yVal === "true") yNum = 1;
              else yNum = parseInt(yVal, 10) || 0;

              parsedLogs.push({ log_date, steps: stepsNum, workout: wNum, yoga: yNum });
            }
          }
          if (parsedLogs.length === 0) {
            showToast("No valid entries found in file.", "error");
            setSaving(false);
            return;
          }
          const res = await fetch("/app-api/logs/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participant_id: selectedId, logs: parsedLogs }),
          });
          if (!res.ok) throw new Error("Bulk upload failed");
          showToast(`Uploaded ${parsedLogs.length} rows!`);
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["logs", selectedId] });
          setCsvFile(null);
        }
      } catch {
        showToast("Error processing CSV file", "error");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsText(csvFile);
  }

  async function handleDeleteEntry(id: number) {
    if (!window.confirm("Delete this log entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/app-api/logs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Entry deleted");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["logs", selectedId] });
    } catch {
      showToast("Error deleting entry", "error");
    } finally {
      setDeletingId(null);
    }
  }

  const selected = participants.find((p) => p.id === selectedId);

  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
            <Lock className="size-4 text-purple-400" /> Admin Access
          </h2>
          <p className="text-xs text-slate-400">Enter passcode to manage entries & groups.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Enter Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full text-center tracking-widest text-lg bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          {passError && <p className="text-xs text-rose-400 text-center font-medium">{passError}</p>}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition shadow"
          >
            Unlock Admin Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 max-w-6xl mx-auto px-4 py-6">
      {statusMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg transition-all ${
            statusMsg.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tight text-white">Log Entries & Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Security */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowManageSecurity(!showManageSecurity)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-white hover:bg-slate-800/50 transition"
            >
              <span className="flex items-center gap-2">
                <Key className="size-4 text-purple-400" /> Change Admin Passcode
              </span>
              {showManageSecurity ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
            </button>
            {showManageSecurity && (
              <div className="p-5 border-t border-slate-800 space-y-3 bg-slate-950/40">
                <form onSubmit={handleUpdatePasscode} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Enter New Passcode (min 4 chars)"
                    value={newAdminPasscode}
                    onChange={(e) => setNewAdminPasscode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={updatingPasscode}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    {updatingPasscode ? "Updating..." : "Update Passcode"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Manage Groups */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowManageGroups(!showManageGroups)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-white hover:bg-slate-800/50 transition"
            >
              <span className="flex items-center gap-2">
                <FolderPlus className="size-4 text-purple-400" /> Manage Groups / Cohorts
              </span>
              {showManageGroups ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
            </button>
            {showManageGroups && (
              <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
                <form onSubmit={handleAddGroup} className="flex gap-2">
                  <input
                    placeholder="Group Name (e.g. casey-1)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={addingGroup}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shrink-0 transition"
                  >
                    Add Group
                  </button>
                </form>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-950 rounded-md border border-slate-800"
                    >
                      <span className="font-medium text-slate-200">{g.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(g)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Manage Participants */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowManageThotties(!showManageThotties)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-white hover:bg-slate-800/50 transition"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="size-4 text-purple-400" /> Manage Participants (Add / Remove)
              </span>
              {showManageThotties ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
            </button>
            {showManageThotties && (
              <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
                <form onSubmit={handleAddParticipant} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      placeholder="State (e.g. CA)"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  {groups.length > 0 && (
                    <select
                      value={assignGroupId}
                      onChange={(e) => setAssignGroupId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Assign to Group (Optional)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="submit"
                    disabled={addingParticipant}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Add Participant (420k steps · 18 workouts)
                  </button>
                </form>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-950 rounded-md border border-slate-800"
                    >
                      <span className="font-medium text-slate-200">
                        {p.name} {p.location && `(${p.location})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteParticipant(p)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition"
                      >
                        <UserX className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Participant Select */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            {groups.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="size-3.5 text-purple-400" /> Filter by Group:
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedId(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Select Participant to Log For:</p>
              {participants.length === 0 && !isLoading ? (
                <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-lg">
                  No participants found. Add one above!
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {participants.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border truncate transition ${
                        selectedId === p.id
                          ? "bg-purple-600 text-white border-purple-500 font-bold"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Option A: Single Day Entry */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Option A: Single Day Entry</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-purple-400" /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs [color-scheme:dark] focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Footprints className="size-3.5 text-purple-400" /> Steps
              </label>
              <input
                type="number"
                placeholder="e.g. 10000"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                min={0}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Dumbbell className="size-3.5 text-sky-400" /> Workouts
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWorkout(Math.max(0, workout - 1))}
                  className="size-8 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white"
                >
                  <Minus className="size-3" />
                </button>
                <div className="flex-1 flex gap-1">
                  {[0, 1, 2].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWorkout(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        workout === num
                          ? "bg-purple-600 text-white border-purple-500"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setWorkout(workout + 1)}
                  className="size-8 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Leaf className="size-3.5 text-emerald-400" /> Yoga Completed?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setYoga(1)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    yoga === 1
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="size-3.5" /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setYoga(0)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                    yoga === 0
                      ? "bg-slate-800 text-white border-slate-600 font-bold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSingleSave}
              disabled={saving || !selectedId}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow"
            >
              {saving ? "Saving..." : "Save Single Entry"}
            </button>
          </div>

          {/* Option B: Upload Spreadsheet */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Upload className="size-4 text-purple-400" /> Option B: Upload Spreadsheet (CSV)
            </h2>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
            />
            <button
              type="button"
              onClick={handleFileUpload}
              disabled={saving || !csvFile}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow"
            >
              {saving ? "Uploading..." : "Upload Spreadsheet"}
            </button>
          </div>
        </div>

        {/* Right Side: Recent Logs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 h-fit shadow-sm">
          <h2 className="text-base font-bold text-white">
            {selected ? `${selected.name}'s Recent Logs` : "Select a Participant"}
          </h2>
          {!selected && (
            <p className="text-xs text-slate-500 py-8 text-center">
              Choose a participant on the left to inspect their recent entries.
            </p>
          )}
          {selected && logs.length === 0 && (
            <p className="text-xs text-slate-500 py-8 text-center">
              No entries logged yet for {selected.name}.
            </p>
          )}
          {logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-right pb-2 font-medium">Steps</th>
                    <th className="text-center pb-2 font-medium">
                      <Dumbbell className="size-3 inline text-sky-400" />
                    </th>
                    <th className="text-center pb-2 font-medium">
                      <Leaf className="size-3 inline text-emerald-400" />
                    </th>
                    <th className="text-right pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 text-slate-300 font-mono">{formatDate(log.log_date)}</td>
                      <td className="py-2 text-right font-medium text-white font-mono">
                        {log.steps > 0 ? log.steps.toLocaleString() : "—"}
                      </td>
                      <td className="py-2 text-center">
                        {log.workout > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            {log.workout > 1 ? `${log.workout}x` : "✓"}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {log.yoga > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            {log.yoga > 1 ? `${log.yoga}x` : "✓"}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(log.id)}
                          disabled={deletingId === log.id}
                          className="text-slate-400 hover:text-rose-400 p-1 transition"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
