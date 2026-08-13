import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Key } from "lucide-react";

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

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-raised border border-border p-6 rounded-lg space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Key className="size-5 text-accent" /> Admin Access
        </h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Enter Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full bg-inset border border-border px-3 py-2 rounded-md text-sm"
          />
          {authError && <p className="text-xs text-error">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-accent text-white py-2 rounded-md text-sm font-semibold"
          >
            Unlock Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Add Thottie */}
      <div className="bg-raised border border-border p-5 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Plus className="size-4 text-accent" /> Add Participant (Minimester Defaults)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-inset border border-border px-3 py-1.5 rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Location (e.g. CA)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-inset border border-border px-3 py-1.5 rounded-md text-sm"
          />
          <input
            type="number"
            placeholder="Steps Goal"
            value={stepsGoal}
            onChange={(e) => setStepsGoal(Number(e.target.value))}
            className="bg-inset border border-border px-3 py-1.5 rounded-md text-sm"
          />
          <input
            type="number"
            placeholder="Workouts Goal"
            value={workoutsGoal}
            onChange={(e) => setWorkoutsGoal(Number(e.target.value))}
            className="bg-inset border border-border px-3 py-1.5 rounded-md text-sm"
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

      {/* Roster List */}
      <div className="bg-raised border border-border p-5 rounded-lg space-y-4">
        <h2 className="text-base font-semibold">Active Participants</h2>
        <div className="divide-y divide-border">
          {participants.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{p.name} ({p.location || "N/A"})</p>
                <p className="text-xs text-secondary">
                  Goal: {p.steps_goal.toLocaleString()} steps · {p.workouts_goal} workouts
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(p.id)}
                className="text-error hover:text-error-strong p-1"
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
