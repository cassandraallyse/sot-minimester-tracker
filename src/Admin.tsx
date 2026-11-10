function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const cleanStr = String(dateStr).split("T")[0];
  const [year, month, day] = cleanStr.split("-").map(Number);
  
  if (!year || !month || !day) return dateStr;
  
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./components/Form";
import { toast } from "./components/Toast";
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

  // Management accordions
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showManageThotties, setShowManageThotties] = useState(false);
  const [showManageSecurity, setShowManageSecurity] = useState(false);

  // Group creation state
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  // Participant creation state
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [assignGroupId, setAssignGroupId] = useState<string>("");
  const [addingParticipant, setAddingParticipant] = useState(false);

  // Security / Passcode reset state
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [updatingPasscode, setUpdatingPasscode] = useState(false);

  // CSV File upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Passcode Auth State
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passError, setPassError] = useState("");

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
      fetch(`/app-api/participants?groupId=${selectedGroupId}`).then((r) =>
        r.json()
      ),
  });

  const { data: logs = [] } = useQuery<LogEntry[]>({
    queryKey: ["logs", selectedId],
    queryFn: () => fetch(`/app-api/logs/${selectedId}`).then((r) => r.json()),
    enabled: !!selectedId,
  });

  async function handleUpdatePasscode(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminPasscode.trim() || newAdminPasscode.trim().length < 4) {
      toast.error("Passcode must be at least 4 characters long");
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

      toast.success("Passcode updated successfully!");
      setNewAdminPasscode("");
    } catch {
      toast.error("Error updating passcode");
    } finally {
      setUpdatingPasscode(false);
    }
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
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

      toast.success(`Group "${newGroupName}" created!`);
      setNewGroupName("");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch {
      toast.error("Error creating group");
    } finally {
      setAddingGroup(false);
    }
  }

  async function handleDeleteGroup(g: Group) {
    if (
      !window.confirm(
        `Are you sure you want to delete group "${g.name}"? Participants in this group will not be deleted, but will become unassigned.`
      )
    ) {
