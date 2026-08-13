import React, { useState } from "react";
import Leaderboard from "./Leaderboard";
import Admin from "./Admin";
import { Shield, Trophy } from "lucide-react";

export default function App() {
  const [view, setView] = useState<"leaderboard" | "admin">("leaderboard");

  return (
    <div className="min-h-screen bg-inset text-primary pb-12">
      <nav className="bg-raised border-b border-border mb-6">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Trophy className="size-5 text-accent" />
            <span>SOT Minimester</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("leaderboard")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                view === "leaderboard" ? "bg-accent text-white" : "text-secondary hover:text-primary"
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setView("admin")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                view === "admin" ? "bg-accent text-white" : "text-secondary hover:text-primary"
              }`}
            >
              <Shield className="size-3.5" /> Admin
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4">
        {view === "leaderboard" ? <Leaderboard /> : <Admin />}
      </main>
    </div>
  );
}
