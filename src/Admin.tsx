import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Calendar, Footprints, Dumbbell, Upload, Key, ChevronDown, ChevronUp, Check } from "lucide-react";

type Participant = {
  id: number;
  name: string;
  location: string;
  steps_goal: number;
  workouts_goal: number;
};

type LogEntry = {
  id: number;
  participant_id: number;
  log_date: string;
  steps: number;
  workout: number;
  yoga: number;
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [showManageThotties, setShowManageThotties] = useState(false);
  const [selectedThottie, setSelectedThottie] = useState<Participant | null>(null);

  // New Participant Form
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStepsGoal, setNewStepsGoal] = useState(280000);
  const [newWorkoutsGoal, setNewWorkoutsGoal] = useState(12);

  // Single Day Entry Form
  const [logDate, setLogDate] = useState("2026-08-13");
  const [logSteps, setLogSteps] = useState("");
  const [workoutCompleted, setWorkoutCompleted] = useState<boolean | null>(null);
  const [yogaCompleted, setYogaCompleted] = useState<boolean | null>(null);
  const [singleStatus, setSingleStatus] = useState("");

  // CSV File Upload
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvStatus, setCsvStatus] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/app-api/verify-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      setIsAuthenticated(true);
    } else {
      setAuthError("Incorrect passcode");
    }
  };

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["admin-participants"],
    queryFn: () => fetch("/app-api/participants").then((r) => r.json()),
    enabled: isAuthenticated,
  });

  const { data: recentLogs = [], refetch: refetchLogs } = useQuery<LogEntry[]>({
    queryKey: ["recent-logs", selectedThottie?.id],
    queryFn: () =>
      fetch(`/app-api/logs/${selectedThottie?.id}`).then((r) => r.json()),
    enabled: !!selectedThottie,
  });

  const addParticipantMutation = useMutation({
    mutationFn: (newP: any) =>
      fetch("/app-api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newP),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-participants"] });
      setNewName("");
      setNewLocation("");
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/app-api/participants/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-participants"] });
      if (selectedThottie?.id) setSelectedThottie(null);
    },
  });

  const handleSingleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThottie) {
      setSingleStatus("Please choose a Thottie first.");
      return;
    }
    if (!logSteps) {
      setSingleStatus("Please enter step count.");
      return;
    }

    setSingleStatus("Saving...");
    const res = await fetch("/app-api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: selectedThottie.id,
        log_date: logDate,
        steps: Number(logSteps),
        workout: workoutCompleted ? 1 : 0,
        yoga: yogaCompleted ? 1 : 0,
      }),
    });

    if (res.ok) {
      setSingleStatus("Saved successfully!");
      setLogSteps("");
      setWorkoutCompleted(null);
      setYogaCompleted(null);
      refetchLogs();
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } else {
      setSingleStatus("Failed to save entry.");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      setCsvStatus("Please choose a CSV file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setCsvStatus("Processing file...");
        const text = event.target?.result as string;
        const lines = text.trim().split("\n");
        const logs = [];

        for (const line of lines) {
          const parts = line.split(",").map((s) => s.trim());
          if (parts.length >= 2) {
            const dateStr = parts[0];
            const steps = parseInt(parts[1], 10) || 0;
            const workout = parts[2] ? parseInt(parts[2], 10) : 0;
            const yoga = parts[3] ? parseInt(parts[3], 10) : 0;

            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              logs.push({ log_date: dateStr, steps, workout, yoga });
            }
          }
        }

        if (logs.length === 0 || !selectedThottie) {
          setCsvStatus("Please select a Thottie and ensure CSV has format: YYYY-MM-DD, steps, workout, yoga");
          return;
        }

        const res = await fetch("/app-api/logs/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participant_id: selectedThottie.id,
            logs,
          }),
        });

        if (res.ok) {
          setCsvStatus(`Successfully uploaded ${logs.length} logs!`);
          setCsvFile(null);
          refetchLogs();
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        } else {
          setCsvStatus("Error uploading spreadsheet.");
        }
      } catch (err: any) {
        setCsvStatus(`Error: ${err.message}`);
      }
    };
    reader.readAsText(csvFile);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border border-gray-200 p-6 rounded-lg shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <Key className="size-5 text-gray-700" /> Admin Access
        </h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Enter Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 px-3 py-2 rounded-md text-sm text-gray-900 focus:outline-none"
          />
          {authError && <p className="text-xs text-red-600">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 rounded-md text-sm font-semibold transition"
          >
            Unlock Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900">
      <h1 className="text-2xl font-bold tracking-tight">Log Entries</h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (Forms) */}
        <div className="md:col-span-7 space-y-6">
          {/* Manage Thotties Accordion */}
          <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => setShowManageThotties(!showManageThotties)}
              className="w-full px-4 py-3 text-left font-medium text-sm flex items-center justify-between text-gray-800 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="size-4" /> Manage Thotties (Add / Remove)
              </span>
              {showManageThotties ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showManageThotties && (
              <div className="p-4 border-t border-gray-200 space-y-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Location (e.g. CA)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-sm"
                  />
                </div>
                <button
                  onClick={() =>
                    addParticipantMutation.mutate({
                      name: newName,
                      location: newLocation,
                      steps_goal: newStepsGoal,
                      workouts_goal: newWorkoutsGoal,
                    })
                  }
                  className="bg-gray-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                >
                  Add Thottie
                </button>

                <div className="divide-y divide-gray-200 pt-2">
                  {participants.map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                      <span>{p.name} ({p.location || "N/A"})</span>
                      <button
                        onClick={() => deleteParticipantMutation.mutate(p.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 1: Choose Thottie Grid */}
          <div className="border border-gray-200 bg-white p-4 rounded-lg shadow-sm space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Step 1: Choose Thottie (For Single Entry)
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedThottie(p)}
                  className={`px-3 py-2 text-left rounded-md border text-xs font-medium transition ${
                    selectedThottie?.id === p.id
                      ? "border-gray-800 bg-gray-800 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                  }`}
                >
                  {p.name} {p.location ? `(${p.location})` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Option A: Single Day Entry */}
          <form
            onSubmit={handleSingleEntrySubmit}
            className="border border-gray-200 bg-white p-4 rounded-lg shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold text-gray-900">Option A: Single Day Entry</h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Calendar className="size-3.5" /> Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Footprints className="size-3.5" /> Steps
              </label>
              <input
                type="number"
                placeholder="e.g. 8432"
                value={logSteps}
                onChange={(e) => setLogSteps(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Dumbbell className="size-3.5" /> Workout completed?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWorkoutCompleted(true)}
                  className={`py-1.5 rounded-md border text-xs font-semibold flex items-center justify-center gap-1 ${
                    workoutCompleted === true ? "bg-gray-800 text-white" : "border-gray-300 text-gray-700"
                  }`}
                >
                  <Check className="size-3.5" /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWorkoutCompleted(false)}
                  className={`py-1.5 rounded-md border text-xs font-semibold flex items-center justify-center gap-1 ${
                    workoutCompleted === false ? "bg-gray-800 text-white" : "border-gray-300 text-gray-700"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                Yoga completed?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setYogaCompleted(true)}
                  className={`py-1.5 rounded-md border text-xs font-semibold flex items-center justify-center gap-1 ${
                    yogaCompleted === true ? "bg-gray-800 text-white" : "border-gray-300 text-gray-700"
                  }`}
                >
                  <Check className="size-3.5" /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setYogaCompleted(false)}
                  className={`py-1.5 rounded-md border text-xs font-semibold flex items-center justify-center gap-1 ${
                    yogaCompleted === false ? "bg-gray-800 text-white" : "border-gray-300 text-gray-700"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md text-xs font-bold transition"
            >
              Save Single Entry
            </button>
            {singleStatus && <p className="text-xs font-medium text-gray-700 mt-1">{singleStatus}</p>}
          </form>

          {/* Option B: Upload Spreadsheet CSV */}
          <form
            onSubmit={handleFileUpload}
            className="border border-gray-200 bg-white p-4 rounded-lg shadow-sm space-y-3"
          >
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Upload className="size-4" /> Option B: Upload Spreadsheet (CSV)
            </h2>
            <p className="text-xs text-gray-500">
              Upload full Tracking Sheet or single-person CSV.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            <button
              type="submit"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md text-xs font-bold transition"
            >
              Upload Spreadsheet
            </button>
            {csvStatus && <p className="text-xs font-medium text-gray-700 mt-1">{csvStatus}</p>}
          </form>
        </div>

        {/* Right Column: Select a Thottie Details */}
        <div className="md:col-span-5">
          <div className="border border-gray-200 bg-white p-5 rounded-lg shadow-sm min-h-[300px]">
            <h2 className="text-sm font-semibold text-gray-800">
              {selectedThottie ? `${selectedThottie.name}'s Recent Entries` : "Select a Thottie"}
            </h2>

            {!selectedThottie ? (
              <p className="text-xs text-gray-500 mt-8 text-center">
                Choose a Thottie on the left to see their recent entries.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {recentLogs.length === 0 ? (
                  <p className="text-xs text-gray-400">No entries logged yet.</p>
                ) : (
                  recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-gray-50 border border-gray-100 rounded-md text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{log.log_date}</p>
                        <p className="text-gray-500">
                          {log.steps.toLocaleString()} steps · {log.workout ? "Workout" : "No Workout"}
                          {log.yoga ? " · Yoga" : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
