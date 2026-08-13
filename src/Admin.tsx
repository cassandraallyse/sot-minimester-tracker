import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Upload, Key } from "lucide-react";

type Participant = {
  id: number;
  name: string;
  location: string;
  group_id: number;
  steps_goal: number;
  workouts_goal: number;
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [stepsGoal, setStepsGoal] = useState(280000);
  const [workoutsGoal, setWorkoutsGoal] = useState(12);

  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("");
  const [csvText, setCsvText] = useState("");
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

  const addMutation = useMutation({
    mutationFn: (newP: any) =>
      fetch("/app-api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newP),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-participants"] });
      setName("");
      setLocation("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/app-api/participants/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-participants"] });
    },
  });

  const handleCsvSubmit = async () => {
    if (!selectedParticipantId) {
      setCsvStatus("Please select a participant first.");
      return;
    }
    if (!csvText.trim()) {
      setCsvStatus("Please paste CSV data or log rows.");
      return;
    }

    try {
      setCsvStatus("Uploading logs...");
      const lines = csvText.trim().split("\n");
      const logs = [];

      for (const line of lines) {
        const parts = line.split(",").map((s) => s.trim());
        if (parts.length >= 2) {
          const log_date = parts[0];
          const steps = parseInt(parts[1], 10) || 0;
          const workout = parts[2] ? parseInt(parts[2], 10) : 0;
          const yoga = parts[3] ? parseInt(parts[3], 10) : 0;

          if (log_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            logs.push({ log_date, steps, workout, yoga });
          }
        }
      }

      if (logs.length === 0) {
        setCsvStatus("No valid rows found. Format: YYYY-MM-DD, steps, workout, yoga");
        return;
      }

      const res = await fetch("/app-api/logs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: Number(selectedParticipantId),
          logs,
        }),
      });

      if (res.ok) {
        setCsvStatus(`Successfully uploaded ${logs.length} daily log entries!`);
        setCsvText("");
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      } else {
        const err = await res.json();
        setCsvStatus(`Error: ${err.error || "Upload failed"}`);
      }
    } catch (e: any) {
      setCsvStatus(`Failed: ${e.message}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-raised border border-border p-6 rounded-lg space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
          <Key className="size-5 text-accent" /> Admin Access
        </h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Enter Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full bg-inset border border-border text-primary px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          />
          {authError && <p className="text-xs text-error">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-accent hover:opacity-90 text-white py-2 rounded-md text-sm font-semibold transition"
          >
            Unlock Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* CSV / Log Upload */}
      <div className="bg-raised border border-border p-5 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2 text-primary">
          <Upload className="size-4 text-accent" /> Bulk Log CSV Upload
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Select Participant:
            </label>
            <select
              value={selectedParticipantId}
              onChange={(e) => setSelectedParticipantId(e.target.value)}
              className="w-full md:w-1/2 bg-inset border border-border text-primary rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">-- Choose Participant --</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Paste CSV / Logs (Format: YYYY-MM-DD, steps, workout, yoga):
            </label>
            <textarea
              rows={4}
              placeholder="2026-08-01, 10000, 1, 0"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full bg-inset border border-border text-primary p-3 rounded-md text-sm font-mono"
            />
          </div>

          <button
            onClick={handleCsvSubmit}
            className="bg-accent hover:opacity-90 text-white px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="size-3.5" /> Upload Logs
          </button>

          {csvStatus && <p className="text-xs text-accent font-medium">{csvStatus}</p>}
        </div>
      </div>

      {/* Add Participant */}
      <div className="bg-raised border border-border p-5 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2 text-primary">
          <Plus className="size-4 text-accent" /> Add Participant (Minimester Defaults)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-inset border border-border text-primary px-3 py-1.5 rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Location (e.g. CA)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-inset border border-border text-primary px-3 py-1.5 rounded-md text-sm"
          />
          <input
            type="number"
            placeholder="Steps Goal"
            value={stepsGoal}
            onChange={(e) => setStepsGoal(Number(e.target.value))}
            className="bg-inset border border-border text-primary px-3 py-1.5 rounded-md text-sm"
          />
          <input
            type="number"
            placeholder="Workouts Goal"
            value={workoutsGoal}
            onChange={(e) => setWorkoutsGoal(Number(e.target.value))}
            className="bg-inset border border-border text-primary px-3 py-1.5 rounded-md text-sm"
          />
        </div>
        <button
          onClick={() =>
            addMutation.mutate({
              name,
              location,
              steps_goal: stepsGoal,
              workouts_goal: workoutsGoal,
            })
          }
          className="bg-accent text-white px-4 py-2 rounded-md text-xs font-semibold"
        >
          Add Participant
        </button>
      </div>

      {/* Active Roster */}
      <div className="bg-raised border border-border p-5 rounded-lg space-y-4">
        <h2 className="text-base font-semibold text-primary">Active Participants</h2>
        <div className="divide-y divide-border">
          {participants.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-primary">{p.name} ({p.location || "N/A"})</p>
                <p className="text-xs text-secondary">
                  Goal: {p.steps_goal.toLocaleString()} steps · {p.workouts_goal} workouts
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(p.id)}
                className="text-error hover:opacity-80 p-1"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
