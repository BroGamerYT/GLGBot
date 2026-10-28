"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShieldAlert,
  Users,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Gavel,
  UserX,
  Edit3,
  Filter,
  Flame,
  Award,
  FileText,
  Plus,
  Send,
  Eye,
  Settings,
  UserCheck,
  Tag,
  Shield,
  MessageSquare,
  Mic,
  Calendar,
  Save,
  Check,
} from "lucide-react";

interface RoleEntry {
  id: string;
  name: string;
  color: string;
  position?: number;
}

interface MemberEntry {
  userId: string;
  tag: string;
  username: string;
  displayName: string;
  nickname?: string;
  avatar: string;
  roles: RoleEntry[];
  joinedAt?: string;
  createdAt?: string;
  voiceMinutes?: number;
  messagesCount?: number;
  adminNote?: string;
  isBot: boolean;
  isOwner: boolean;
  isModeratable: boolean;
  xp: number;
  level: number;
  casesCount: number;
  isImprisoned: boolean;
  prisonData?: {
    reason: string;
    imprisonedAt: string;
    imprisonedBy: string;
    previousRoleIds: string[];
    durationMinutes?: number | null;
    expiresAt?: string | null;
  } | null;
  isTimedOut: boolean;
  timeoutUntil?: string | null;
  badName: {
    isBad: boolean;
    reason?: string;
  };
}

interface ModCaseEntry {
  id: number;
  targetId: string;
  targetTag: string;
  moderatorTag: string;
  action: string;
  reason: string;
  duration?: string;
  xpLost?: number;
  newLevel?: number;
  createdAt: string;
}

interface BlacklistConfig {
  words: string[];
  autoDelete: boolean;
  autoWarn: boolean;
  xpPenalty: number;
  badNameCheck: boolean;
  badNameXpPenalty: number;
}

export default function ModerationPage() {
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [cases, setCases] = useState<ModCaseEntry[]>([]);
  const [allServerRoles, setAllServerRoles] = useState<RoleEntry[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistConfig>({
    words: [],
    autoDelete: true,
    autoWarn: true,
    xpPenalty: 300,
    badNameCheck: true,
    badNameXpPenalty: 400,
  });
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tabs: 'members' | 'prison' | 'blacklist' | 'cases'
  const [activeTab, setActiveTab] = useState<"members" | "prison" | "blacklist" | "cases">("members");

  // Filter & Search
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "prison" | "badName" | "warned" | "timedOut">("all");

  // User Detail / Management Modal
  const [managingMember, setManagingMember] = useState<MemberEntry | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "roles" | "xp" | "notes" | "cases">("overview");
  const [editedNickname, setEditedNickname] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // XP adjustment
  const [xpAdjustAmount, setXpAdjustAmount] = useState<number>(100);
  const [xpAdjustMode, setXpAdjustMode] = useState<"add" | "deduct" | "set">("add");
  const [adjustingXp, setAdjustingXp] = useState(false);

  // Action Modals State
  const [activeModal, setActiveModal] = useState<
    "warn" | "timeout" | "prison" | "kick" | "ban" | null
  >(null);
  const [targetMember, setTargetMember] = useState<MemberEntry | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [timeoutDuration, setTimeoutDuration] = useState(300); // 5 min
  const [prisonDuration, setPrisonDuration] = useState<number>(0); // 0 = unbegrenzt
  const [deleteDays, setDeleteDays] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Blacklist Management
  const [newWordInput, setNewWordInput] = useState("");
  const [testTextInput, setTestTextInput] = useState("");
  const [testResult, setTestResult] = useState<{ matched: boolean; word?: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [membersRes, casesRes, blacklistRes, rolesRes] = await Promise.all([
        fetch("/api/bot/moderation/members"),
        fetch("/api/bot/moderation/cases"),
        fetch("/api/bot/moderation/blacklist"),
        fetch("/api/bot/moderation/roles"),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.members || []);
      }
      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(cData.cases || []);
      }
      if (blacklistRes.ok) {
        const bData = await blacklistRes.json();
        setBlacklist(bData.config || { words: [] });
      }
      if (rolesRes.ok) {
        const rData = await rolesRes.json();
        setAllServerRoles(rData.roles || []);
      }
    } catch {
      setErrorMessage("Fehler beim Laden der Benutzerverwaltungs-Daten.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    let result = members;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.tag.toLowerCase().includes(q) ||
          m.displayName.toLowerCase().includes(q) ||
          m.userId.includes(q) ||
          (m.nickname && m.nickname.toLowerCase().includes(q))
      );
    }

    if (filterType === "prison") {
      result = result.filter((m) => m.isImprisoned);
    } else if (filterType === "badName") {
      result = result.filter((m) => m.badName.isBad);
    } else if (filterType === "warned") {
      result = result.filter((m) => m.casesCount > 0);
    } else if (filterType === "timedOut") {
      result = result.filter((m) => m.isTimedOut);
    }

    return result;
  }, [members, search, filterType]);

  // Quick stats
  const prisonCount = useMemo(() => members.filter((m) => m.isImprisoned).length, [members]);
  const badNamesCount = useMemo(() => members.filter((m) => m.badName.isBad).length, [members]);
  const warnedCount = useMemo(() => members.filter((m) => m.casesCount > 0).length, [members]);

  // Open User Detail
  const openMemberManagement = (member: MemberEntry) => {
    setManagingMember(member);
    setEditedNickname(member.nickname || "");
    setAdminNoteInput(member.adminNote || "");
    setDetailTab("overview");
  };

  // Save Nickname
  const handleSaveNickname = async () => {
    if (!managingMember) return;
    try {
      const res = await fetch("/api/bot/moderation/member-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: managingMember.userId, nickname: editedNickname }),
      });
      if (res.ok) {
        setStatusMessage(`✅ Nickname für ${managingMember.displayName} aktualisiert!`);
        await fetchData();
        // update local managingMember
        setManagingMember((prev) => (prev ? { ...prev, nickname: editedNickname || undefined } : null));
      }
    } catch {
      setErrorMessage("Fehler beim Ändern des Nicknames.");
    }
  };

  // Toggle Role Assignment
  const handleToggleRole = async (roleId: string, currentlyHas: boolean) => {
    if (!managingMember) return;
    const action = currentlyHas ? "remove" : "add";
    try {
      const res = await fetch("/api/bot/moderation/member-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: managingMember.userId, roleId, action }),
      });
      if (res.ok) {
        await fetchData();
        // Update local state
        setManagingMember((prev) => {
          if (!prev) return null;
          let newRoles = [...prev.roles];
          if (currentlyHas) {
            newRoles = newRoles.filter((r) => r.id !== roleId);
          } else {
            const roleToAdd = allServerRoles.find((r) => r.id === roleId);
            if (roleToAdd) newRoles.push(roleToAdd);
          }
          return { ...prev, roles: newRoles };
        });
      }
    } catch {
      setErrorMessage("Fehler beim Zuweisen/Entfernen der Rolle.");
    }
  };

  // Adjust XP
  const handleAdjustXp = async () => {
    if (!managingMember) return;
    setAdjustingXp(true);
    try {
      const res = await fetch("/api/bot/moderation/adjust-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: managingMember.userId,
          amount: Number(xpAdjustAmount),
          mode: xpAdjustMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`✨ XP aktualisiert: ${data.xp} XP (Level ${data.level})`);
        await fetchData();
        setManagingMember((prev) => (prev ? { ...prev, xp: data.xp, level: data.level } : null));
      }
    } catch {
      setErrorMessage("Fehler beim Anpassen der XP.");
    } finally {
      setAdjustingXp(false);
    }
  };

  // Save Admin Note
  const handleSaveNote = async () => {
    if (!managingMember) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/bot/moderation/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: managingMember.userId, note: adminNoteInput }),
      });
      if (res.ok) {
        setStatusMessage("📝 Interne Admin-Notiz gespeichert!");
        await fetchData();
        setManagingMember((prev) => (prev ? { ...prev, adminNote: adminNoteInput } : null));
      }
    } catch {
      setErrorMessage("Fehler beim Speichern der Notiz.");
    } finally {
      setSavingNote(false);
    }
  };

  // Execute Action
  const handleExecuteAction = async (action: string, extra: any = {}) => {
    if (!targetMember) return;
    setActionLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/bot/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          targetId: targetMember.userId,
          reason: reasonInput || "Keine Begründung angegeben",
          ...extra,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Aktion fehlgeschlagen.");
      }

      setStatusMessage(`✅ Aktion „${action.toUpperCase()}“ für ${targetMember.displayName} erfolgreich ausgeführt!`);
      setActiveModal(null);
      setTargetMember(null);
      setReasonInput("");
      await fetchData();
    } catch (e: any) {
      setErrorMessage(e.message || "Fehler beim Ausführen der Aktion.");
    } finally {
      setActionLoading(false);
    }
  };

  // Direct One-Click Actions
  const handleUnprison = async (member: MemberEntry) => {
    if (!confirm(`Möchtest du ${member.displayName} aus dem Gefängnis entlassen? Vorherige Rollen werden wiederhergestellt.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/bot/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unprison", targetId: member.userId }),
      });
      if (res.ok) {
        setStatusMessage(`🔓 ${member.displayName} wurde erfolgreich entlassen!`);
        await fetchData();
      }
    } catch {
      setErrorMessage("Fehler beim Entlassen.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleModerateName = async (member: MemberEntry) => {
    if (!confirm(`Möchtest du den Namen von ${member.displayName} moderieren? (-400 XP Abzug)`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/bot/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bad_name", targetId: member.userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`✏️ Name erfolgreich geändert in „${data.newNick}“ (-400 XP abgezogen)!`);
        await fetchData();
      } else {
        setErrorMessage(data.error || "Fehler beim Ändern des Namens.");
      }
    } catch {
      setErrorMessage("Fehler beim Ändern des Namens.");
    } finally {
      setActionLoading(false);
    }
  };

  // Blacklist Add/Remove
  const handleAddBlacklistWord = async () => {
    const word = newWordInput.trim().toLowerCase();
    if (!word) return;
    if (blacklist.words.includes(word)) {
      setErrorMessage("Begriff ist bereits auf der Blacklist.");
      return;
    }

    const updatedWords = [...blacklist.words, word];
    await saveBlacklist({ ...blacklist, words: updatedWords });
    setNewWordInput("");
  };

  const handleRemoveBlacklistWord = async (word: string) => {
    const updatedWords = blacklist.words.filter((w) => w !== word);
    await saveBlacklist({ ...blacklist, words: updatedWords });
  };

  const saveBlacklist = async (newConfig: BlacklistConfig) => {
    try {
      const res = await fetch("/api/bot/moderation/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        setBlacklist(newConfig);
        setStatusMessage("✅ Blacklist-Einstellungen gespeichert!");
      }
    } catch {
      setErrorMessage("Fehler beim Speichern der Blacklist.");
    }
  };

  // Test Blacklist Filter
  const runFilterTest = () => {
    const lower = testTextInput.toLowerCase();
    for (const w of blacklist.words) {
      if (lower.includes(w.toLowerCase())) {
        setTestResult({ matched: true, word: w });
        return;
      }
    }
    setTestResult({ matched: false });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-discord-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-discord-blurple" />
            Benutzerverwaltung & Moderation
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Zentrales Server-Mitgliedermanagement, Rollen-Zuweisung, Knast-System, Minus-Level Strafen und Wortfilter.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-discord-card hover:bg-discord-dark border border-discord-border text-sm font-medium text-gray-200 hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-discord-blurple" : ""}`} />
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-discord-green/10 border border-discord-green/30 text-discord-green text-sm flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-discord-card border border-discord-border space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Mitglieder gesamt</span>
            <Users className="w-4 h-4 text-discord-blurple" />
          </div>
          <p className="text-2xl font-bold text-white">{members.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-discord-card border border-discord-border space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>🔒 Im Gefängnis</span>
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{prisonCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-discord-card border border-discord-border space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>🚩 Schlechte Namen</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{badNamesCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-discord-card border border-discord-border space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>⚠️ Mit Verwarnungen</span>
            <Gavel className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{warnedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-discord-border pb-3">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "members"
              ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
              : "bg-discord-card text-gray-300 hover:text-white hover:bg-discord-dark border border-discord-border"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Benutzer-Liste ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("prison")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "prison"
              ? "bg-red-500 text-white shadow-md shadow-red-500/20"
              : "bg-discord-card text-gray-300 hover:text-white hover:bg-discord-dark border border-discord-border"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Gefängnis & Knast ({prisonCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("blacklist")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "blacklist"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-discord-card text-gray-300 hover:text-white hover:bg-discord-dark border border-discord-border"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Wortfilter & Blacklist ({blacklist.words.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("cases")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "cases"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-discord-card text-gray-300 hover:text-white hover:bg-discord-dark border border-discord-border"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Mod-Fälle ({cases.length})</span>
        </button>
      </div>

      {/* TAB 1: MITGLIEDER */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Name, Nickname oder Discord-ID suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-discord-card border border-discord-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === "all" ? "bg-discord-blurple text-white" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                Alle ({members.length})
              </button>
              <button
                onClick={() => setFilterType("prison")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === "prison" ? "bg-red-500 text-white" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                🔒 Knast ({prisonCount})
              </button>
              <button
                onClick={() => setFilterType("badName")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === "badName" ? "bg-amber-500 text-white" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                🚩 Schlechte Namen ({badNamesCount})
              </button>
              <button
                onClick={() => setFilterType("warned")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === "warned" ? "bg-yellow-500 text-white" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                ⚠️ Verwarnt ({warnedCount})
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto rounded-2xl border border-discord-border bg-discord-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-discord-dark/60 text-gray-400 text-xs border-b border-discord-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Mitglied</th>
                  <th className="px-4 py-3 font-medium">Level & XP</th>
                  <th className="px-4 py-3 font-medium">Rollen</th>
                  <th className="px-4 py-3 font-medium">Status / Notiz</th>
                  <th className="px-4 py-3 font-medium text-right">Verwaltung & Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-border">
                {filteredMembers.map((m) => (
                  <tr key={m.userId} className="hover:bg-discord-dark/40 transition-colors">
                    {/* User Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={m.avatar} alt="" className="w-9 h-9 rounded-full shrink-0 border border-discord-border" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{m.displayName}</span>
                            {m.isOwner && <span title="Server Owner">👑</span>}
                            {m.isBot && <span className="px-1.5 py-0.2 rounded bg-discord-blurple/20 text-indigo-300 text-[10px] font-bold">BOT</span>}
                          </div>
                          <p className="text-xs text-gray-400 font-mono">@{m.tag}</p>
                        </div>
                      </div>
                    </td>

                    {/* Level & XP */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                          Lvl {m.level}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {m.xp.toLocaleString("de-DE")} XP
                        </span>
                      </div>
                    </td>

                    {/* Roles */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="flex flex-wrap gap-1">
                        {m.roles.slice(0, 2).map((r) => (
                          <span
                            key={r.id}
                            className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-discord-border/50 truncate max-w-[90px]"
                            style={{ backgroundColor: `${r.color}15`, color: r.color || "#94a3b8" }}
                          >
                            {r.name}
                          </span>
                        ))}
                        {m.roles.length > 2 && (
                          <span className="text-[10px] text-gray-500 self-center">+{m.roles.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Status & Notiz */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {m.isImprisoned && (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Knast
                          </span>
                        )}
                        {m.badName.isBad && (
                          <span
                            title={m.badName.reason}
                            className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-help"
                          >
                            <AlertTriangle className="w-3 h-3" /> Schlechter Name
                          </span>
                        )}
                        {m.isTimedOut && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Timeout
                          </span>
                        )}
                        {m.adminNote && (
                          <span
                            title={`Admin-Notiz: ${m.adminNote}`}
                            className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-medium cursor-help"
                          >
                            📝 Notiz
                          </span>
                        )}
                        {!m.isImprisoned && !m.badName.isBad && !m.isTimedOut && !m.adminNote && m.casesCount === 0 && (
                          <span className="text-xs text-gray-500">Normal</span>
                        )}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Detail / Verwalten Button */}
                        <button
                          onClick={() => openMemberManagement(m)}
                          className="px-2.5 py-1 rounded-lg bg-discord-blurple/20 hover:bg-discord-blurple/30 text-indigo-300 border border-discord-blurple/40 text-xs font-medium flex items-center gap-1 transition-all"
                        >
                          <Settings className="w-3 h-3" /> Verwalten
                        </button>

                        {/* Prison / Unprison */}
                        {m.isImprisoned ? (
                          <button
                            onClick={() => handleUnprison(m)}
                            title="Aus Gefängnis entlassen"
                            className="p-1.5 rounded-lg bg-discord-green/20 hover:bg-discord-green/30 text-discord-green border border-discord-green/40 transition-all"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetMember(m);
                              setActiveModal("prison");
                            }}
                            title="Ins Gefängnis stecken (-1.000 XP)"
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Warn */}
                        <button
                          onClick={() => {
                            setTargetMember(m);
                            setActiveModal("warn");
                          }}
                          title="Verwarnen (-250 XP)"
                          className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>

                        {/* Timeout */}
                        <button
                          onClick={() => {
                            setTargetMember(m);
                            setActiveModal("timeout");
                          }}
                          title="Timeout verhängen (-500 XP)"
                          className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-all"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER DETAIL & MANAGEMENT DRAWER/MODAL */}
      {managingMember && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-discord-border shrink-0">
              <div className="flex items-center gap-3.5">
                <img src={managingMember.avatar} alt="" className="w-12 h-12 rounded-full border border-discord-border" />
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {managingMember.displayName}
                    <span className="text-xs px-2 py-0.5 rounded bg-discord-blurple/20 text-indigo-300 font-mono">
                      Lvl {managingMember.level}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">ID: {managingMember.userId} • @{managingMember.tag}</p>
                </div>
              </div>

              <button
                onClick={() => setManagingMember(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-discord-dark transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex gap-2 border-b border-discord-border pb-2 shrink-0">
              <button
                onClick={() => setDetailTab("overview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  detailTab === "overview" ? "bg-discord-blurple text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Übersicht & Nickname
              </button>
              <button
                onClick={() => setDetailTab("roles")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  detailTab === "roles" ? "bg-discord-blurple text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Rollen zuweisen ({managingMember.roles.length})
              </button>
              <button
                onClick={() => setDetailTab("xp")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  detailTab === "xp" ? "bg-discord-blurple text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                XP & Level ({managingMember.xp} XP)
              </button>
              <button
                onClick={() => setDetailTab("notes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  detailTab === "notes" ? "bg-discord-blurple text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Admin-Notiz
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* TAB: OVERVIEW */}
              {detailTab === "overview" && (
                <div className="space-y-4">
                  {/* Nickname Editor */}
                  <div className="p-4 rounded-xl bg-discord-dark border border-discord-border space-y-2">
                    <label className="text-xs font-semibold text-gray-300 block">Server-Nickname bearbeiten</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedNickname}
                        onChange={(e) => setEditedNickname(e.target.value)}
                        placeholder="Kein Nickname (Standard-Benutzername)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-discord-card border border-discord-border text-sm text-white focus:outline-none focus:border-discord-blurple"
                      />
                      <button
                        onClick={handleSaveNickname}
                        className="px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-indigo-600 text-xs font-semibold text-white transition-all"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>

                  {/* Account Stats */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-discord-dark border border-discord-border space-y-1">
                      <span className="text-gray-400">Server-Beitritt:</span>
                      <p className="font-semibold text-white">
                        {managingMember.joinedAt ? new Date(managingMember.joinedAt).toLocaleDateString("de-DE") : "Unbekannt"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-discord-dark border border-discord-border space-y-1">
                      <span className="text-gray-400">Discord-Account erstellt:</span>
                      <p className="font-semibold text-white">
                        {managingMember.createdAt ? new Date(managingMember.createdAt).toLocaleDateString("de-DE") : "Unbekannt"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-discord-dark border border-discord-border space-y-1">
                      <span className="text-gray-400">Chat-Nachrichten:</span>
                      <p className="font-semibold text-white">{managingMember.messagesCount?.toLocaleString("de-DE") || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-discord-dark border border-discord-border space-y-1">
                      <span className="text-gray-400">Voice-Zeit:</span>
                      <p className="font-semibold text-white">{Math.floor((managingMember.voiceMinutes || 0) / 60)}h {(managingMember.voiceMinutes || 0) % 60}m</p>
                    </div>
                  </div>

                  {/* Quick Moderation Action Buttons */}
                  <div className="pt-2 border-t border-discord-border flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setTargetMember(managingMember);
                        setActiveModal("warn");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs font-medium"
                    >
                      ⚠️ Verwarnen (-250 XP)
                    </button>
                    <button
                      onClick={() => {
                        setTargetMember(managingMember);
                        setActiveModal("timeout");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-xs font-medium"
                    >
                      ⏱️ Timeout (-500 XP)
                    </button>
                    {managingMember.isImprisoned ? (
                      <button
                        onClick={() => handleUnprison(managingMember)}
                        className="px-3 py-1.5 rounded-lg bg-discord-green/20 text-discord-green hover:bg-discord-green/30 text-xs font-medium"
                      >
                        🔓 Aus Knast entlassen
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setTargetMember(managingMember);
                          setActiveModal("prison");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium"
                      >
                        🔒 In Knast stecken (-1.000 XP)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: ROLES */}
              {detailTab === "roles" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Klicke auf eine Rolle, um sie dem Mitglied direkt zuzuweisen oder zu entziehen:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto p-1">
                    {allServerRoles.map((r) => {
                      const hasRole = managingMember.roles.some((mr) => mr.id === r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleToggleRole(r.id, hasRole)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            hasRole
                              ? "bg-discord-blurple/30 border-discord-blurple text-white shadow-sm"
                              : "bg-discord-dark border-discord-border text-gray-400 hover:text-white hover:border-gray-500"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || "#888" }} />
                          <span>{r.name}</span>
                          {hasRole && <Check className="w-3 h-3 text-discord-green" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: XP ADJUSTMENT */}
              {detailTab === "xp" && (
                <div className="space-y-4 p-4 rounded-xl bg-discord-dark border border-discord-border">
                  <h4 className="text-xs font-semibold text-gray-200">Level- & XP-Konto manuell anpassen</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setXpAdjustMode("add")}
                      className={`py-1.5 rounded-lg text-xs font-medium ${
                        xpAdjustMode === "add" ? "bg-discord-green text-white" : "bg-discord-card text-gray-400"
                      }`}
                    >
                      + XP hinzufügen
                    </button>
                    <button
                      onClick={() => setXpAdjustMode("deduct")}
                      className={`py-1.5 rounded-lg text-xs font-medium ${
                        xpAdjustMode === "deduct" ? "bg-red-500 text-white" : "bg-discord-card text-gray-400"
                      }`}
                    >
                      - XP abziehen (Minus-Level)
                    </button>
                    <button
                      onClick={() => setXpAdjustMode("set")}
                      className={`py-1.5 rounded-lg text-xs font-medium ${
                        xpAdjustMode === "set" ? "bg-amber-500 text-white" : "bg-discord-card text-gray-400"
                      }`}
                    >
                      = XP festlegen
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={xpAdjustAmount}
                      onChange={(e) => setXpAdjustAmount(Number(e.target.value))}
                      className="flex-1 px-3 py-2 rounded-lg bg-discord-card border border-discord-border text-sm text-white focus:outline-none"
                    />
                    <button
                      onClick={handleAdjustXp}
                      disabled={adjustingXp}
                      className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-indigo-600 text-xs font-semibold text-white transition-all"
                    >
                      {adjustingXp ? "Speichere..." : "Ausführen"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: ADMIN NOTES */}
              {detailTab === "notes" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Interne Team-Notizen sind vertraulich und nur im Admin-Webinterface sichtbar:
                  </p>
                  <textarea
                    rows={4}
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="z. B. VIP-Status durch Discord-Event, auffällig im VoiceMaster..."
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none focus:border-discord-blurple"
                  />
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="px-4 py-2 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-md shadow-discord-blurple/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingNote ? "Speichere..." : "Notiz sichern"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GEFÄNGNIS (KNAST) */}
      {activeTab === "prison" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-200">
            <strong>🔒 Gefängnis-Reglement:</strong> Inhaftierte Mitglieder verlieren temporär ihre normalen Rollen
            (wie @Gast) und erhalten ausschließlich Zugriff auf den isolierten Kanal <code>#🔒・gefängnis</code>. Jede
            Inhaftierung zieht automatisch <strong>-1.000 XP (Minus-Level)</strong> ab. Beim Entlassen werden alle
            vorherigen Rollen automatisch wiederhergestellt!
          </div>

          {prisonCount === 0 ? (
            <div className="text-center py-16 bg-discord-card rounded-2xl border border-discord-border space-y-2">
              <p className="text-4xl">🕊️</p>
              <h3 className="text-lg font-bold text-white">Das Gefängnis ist leer!</h3>
              <p className="text-sm text-gray-400">Aktuell verbüßt kein Mitglied eine Strafe im Knast.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {members
                .filter((m) => m.isImprisoned)
                .map((m) => (
                  <div
                    key={m.userId}
                    className="p-6 rounded-2xl bg-discord-card border border-red-500/40 space-y-4 shadow-lg shadow-black/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={m.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-red-500/60" />
                        <div>
                          <h3 className="font-bold text-white text-base">{m.displayName}</h3>
                          <p className="text-xs text-gray-400 font-mono">@{m.tag}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                        Inhaftiert
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-discord-dark text-xs space-y-1.5 border border-discord-border">
                      <p className="text-gray-400">
                        <strong className="text-gray-200">Grund:</strong> {m.prisonData?.reason || "Kein Grund angegeben"}
                      </p>
                      <p className="text-gray-400">
                        <strong className="text-gray-200">Eingesperrt von:</strong> {m.prisonData?.imprisonedBy || "Moderator"}
                      </p>
                      <p className="text-gray-400">
                        <strong className="text-gray-200">Datum:</strong>{" "}
                        {m.prisonData?.imprisonedAt ? new Date(m.prisonData.imprisonedAt).toLocaleString("de-DE") : "Unbekannt"}
                      </p>
                      {m.prisonData?.expiresAt ? (
                        <p className="text-amber-400 font-medium">
                          <strong>⏳ Haftdauer:</strong> {m.prisonData.durationMinutes ? `${m.prisonData.durationMinutes} Min.` : ""} (Ablauf: {new Date(m.prisonData.expiresAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })})
                        </p>
                      ) : (
                        <p className="text-gray-400">
                          <strong className="text-gray-200">⏳ Haftdauer:</strong> Dauerhaft (bis zur manuellen Entlassung)
                        </p>
                      )}
                      <p className="text-gray-400">
                        <strong className="text-gray-200">Gesicherte Rollen:</strong> {m.prisonData?.previousRoleIds?.length || 0} Rollen
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnprison(m)}
                      className="w-full py-2.5 rounded-xl bg-discord-green hover:bg-emerald-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-discord-green/20"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Sofort entlassen (Rollen wiederherstellen)</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORTFILTER & BLACKLIST */}
      {activeTab === "blacklist" && (
        <div className="space-y-6">
          {/* Settings Grid */}
          <div className="grid md:grid-cols-2 gap-6 bg-discord-card border border-discord-border rounded-2xl p-6">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-discord-blurple" />
                Automatisierungs-Einstellungen
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blacklist.autoDelete}
                    onChange={(e) => saveBlacklist({ ...blacklist, autoDelete: e.target.checked })}
                    className="w-4 h-4 rounded text-discord-blurple accent-discord-blurple"
                  />
                  <span className="text-sm text-gray-200">Nachrichten mit verbotenen Begriffen sofort löschen</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blacklist.autoWarn}
                    onChange={(e) => saveBlacklist({ ...blacklist, autoWarn: e.target.checked })}
                    className="w-4 h-4 rounded text-discord-blurple accent-discord-blurple"
                  />
                  <span className="text-sm text-gray-200">Automatische Warnmeldung & DM bei Verstoß senden</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blacklist.badNameCheck}
                    onChange={(e) => saveBlacklist({ ...blacklist, badNameCheck: e.target.checked })}
                    className="w-4 h-4 rounded text-discord-blurple accent-discord-blurple"
                  />
                  <span className="text-sm text-gray-200">Auffällige / unpassende Benutzernamen automatisch markieren</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Strafmaß & Minus-Level
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-discord-dark border border-discord-border space-y-1">
                  <p className="text-xs text-gray-400">XP-Abzug pro Blacklist-Verstoß</p>
                  <p className="text-lg font-bold text-amber-400">-{blacklist.xpPenalty} XP</p>
                </div>

                <div className="p-3 rounded-xl bg-discord-dark border border-discord-border space-y-1">
                  <p className="text-xs text-gray-400">XP-Abzug bei Namens-Moderation</p>
                  <p className="text-lg font-bold text-amber-400">-{blacklist.badNameXpPenalty} XP</p>
                </div>
              </div>
            </div>
          </div>

          {/* Word List Management */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>Gesperrte Wörter & Phrasen ({blacklist.words.length})</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Neues verbotenes Wort oder Phrase hinzufügen (z. B. discord.gg/, beleidigung)..."
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBlacklistWord()}
                className="flex-1 px-4 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
              />
              <button
                onClick={handleAddBlacklistWord}
                className="px-4 py-2 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-medium text-sm flex items-center gap-1.5 transition-all shadow-md shadow-discord-blurple/20"
              >
                <Plus className="w-4 h-4" />
                <span>Hinzufügen</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {blacklist.words.map((w) => (
                <span
                  key={w}
                  className="px-3 py-1 rounded-lg bg-discord-dark border border-discord-border text-xs text-gray-200 flex items-center gap-2 group hover:border-red-500/50"
                >
                  <span className="font-mono">{w}</span>
                  <button
                    onClick={() => handleRemoveBlacklistWord(w)}
                    title="Entfernen"
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Live Filter Tester */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              Live Wortfilter-Tester
            </h3>
            <p className="text-xs text-gray-400">
              Gib einen beliebigen Text ein, um in Echtzeit zu prüfen, ob die Blacklist anschlägt.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Testnachricht hier eintippen..."
                value={testTextInput}
                onChange={(e) => {
                  setTestTextInput(e.target.value);
                  setTestResult(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none focus:border-discord-blurple"
              />
              <button
                onClick={runFilterTest}
                className="px-4 py-2 rounded-xl bg-discord-card hover:bg-discord-dark border border-discord-border text-sm text-gray-200"
              >
                Prüfen
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  testResult.matched
                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                    : "bg-discord-green/10 border-discord-green/30 text-discord-green"
                }`}
              >
                {testResult.matched ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Treffer! Blockiert durch verbotenen Begriff: „{testResult.word}“ (-{blacklist.xpPenalty} XP)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kein Verstoß gefunden. Nachricht ist zulässig!</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MOD-CASES */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-discord-border bg-discord-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-discord-dark/60 text-gray-400 text-xs border-b border-discord-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Fall-ID</th>
                  <th className="px-4 py-3 font-medium">Aktion</th>
                  <th className="px-4 py-3 font-medium">Betroffener Nutzer</th>
                  <th className="px-4 py-3 font-medium">Moderator</th>
                  <th className="px-4 py-3 font-medium">Begründung</th>
                  <th className="px-4 py-3 font-medium">Strafe / XP-Abzug</th>
                  <th className="px-4 py-3 font-medium text-right">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-border">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-discord-dark/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-discord-blurple">#{c.id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          c.action === "WARN" || c.action === "BLACKLIST"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : c.action === "TIMEOUT"
                            ? "bg-orange-500/20 text-orange-400"
                            : c.action === "PRISON"
                            ? "bg-red-500/20 text-red-400"
                            : c.action === "UNPRISON" || c.action === "UNBAN"
                            ? "bg-discord-green/20 text-discord-green"
                            : "bg-purple-500/20 text-purple-300"
                        }`}
                      >
                        {c.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{c.targetTag}</td>
                    <td className="px-4 py-3 text-gray-300">{c.moderatorTag}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{c.reason}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.xpLost ? (
                        <span className="text-xs font-bold text-amber-400">-{c.xpLost} XP</span>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: VERWARNEN */}
      {activeModal === "warn" && targetMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Mitglied verwarnen: {targetMember.displayName}
            </h3>
            <p className="text-xs text-gray-400">
              Verwarnt das Mitglied, schickt eine DM und zieht automatisch <strong>-250 XP (Minus-Level)</strong> ab.
            </p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Begründung</label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Grund für die Verwarnung..."
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-discord-dark hover:bg-gray-700 text-sm text-gray-300"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleExecuteAction("warn")}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm"
              >
                {actionLoading ? "Ausführen..." : "Verwarnung erteilen (-250 XP)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TIMEOUT */}
      {activeModal === "timeout" && targetMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Timeout verhängen: {targetMember.displayName}
            </h3>
            <p className="text-xs text-gray-400">
              Schaltet das Mitglied stumm und zieht automatisch <strong>-500 XP (Minus-Level)</strong> ab.
            </p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Dauer</label>
              <select
                value={timeoutDuration}
                onChange={(e) => setTimeoutDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none"
              >
                <option value={60}>1 Minute</option>
                <option value={300}>5 Minuten</option>
                <option value={600}>10 Minuten</option>
                <option value={3600}>1 Stunde</option>
                <option value={86400}>1 Tag (24 Stunden)</option>
                <option value={604800}>1 Woche (7 Tage)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Begründung</label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Grund für den Timeout..."
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-discord-dark hover:bg-gray-700 text-sm text-gray-300"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleExecuteAction("timeout", { duration: timeoutDuration })}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm"
              >
                {actionLoading ? "Ausführen..." : "Timeout setzen (-500 XP)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GEFÄNGNIS (PRISON) */}
      {activeModal === "prison" && targetMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              Ins Gefängnis stecken: {targetMember.displayName}
            </h3>
            <p className="text-xs text-red-300">
              Sperrt alle regulären Kanäle, weist die Gefängnis-Rolle zu, verschiebt in den Gefängnis-Voice (<code>#🔒・gefängnis-voice</code>),
              sichert alte Rollen und zieht <strong>-1.000 XP (Minus-Level)</strong> ab!
            </p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Haftdauer (Timer)</label>
              <select
                value={prisonDuration}
                onChange={(e) => setPrisonDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value={0}>Dauerhaft (bis zur manuellen Entlassung)</option>
                <option value={15}>15 Minuten</option>
                <option value={30}>30 Minuten</option>
                <option value={60}>60 Minuten (1 Stunde)</option>
                <option value={120}>2 Stunden</option>
                <option value={360}>6 Stunden</option>
                <option value={720}>12 Stunden</option>
                <option value={1440}>24 Stunden (1 Tag)</option>
                <option value={4320}>3 Tage</option>
                <option value={10080}>7 Tage (1 Woche)</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Nach Ablauf wird das Mitglied automatisch entlassen und erhält alle alten Rollen zurück.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Begründung für die Haft</label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="z. B. Wiederholtes Trollen, schwerer Regelverstoß..."
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-discord-dark hover:bg-gray-700 text-sm text-gray-300"
              >
                Abbrechen
              </button>
              <button
                onClick={() =>
                  handleExecuteAction("prison", {
                    durationMinutes: prisonDuration > 0 ? prisonDuration : null,
                  })
                }
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-600/20"
              >
                {actionLoading ? "Inhaftiere..." : "In den Knast stecken (-1.000 XP)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KICK */}
      {activeModal === "kick" && targetMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserX className="w-5 h-5 text-gray-300" />
              Mitglied kicken: {targetMember.displayName}
            </h3>
            <p className="text-xs text-gray-400">
              Kickt das Mitglied vom Discord-Server (-1.500 XP Strafe).
            </p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Begründung</label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Grund für den Kick..."
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded-xl bg-discord-dark text-sm text-gray-300">
                Abbrechen
              </button>
              <button
                onClick={() => handleExecuteAction("kick")}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-500 text-white font-semibold text-sm"
              >
                {actionLoading ? "Kicke..." : "Vom Server kicken"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BAN */}
      {activeModal === "ban" && targetMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-red-600/40 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Gavel className="w-5 h-5 text-red-500" />
              Mitglied bannen: {targetMember.displayName}
            </h3>
            <p className="text-xs text-red-300">
              Bannt das Mitglied dauerhaft vom Server (-5.000 XP Strafe).
            </p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nachrichtenverlauf löschen</label>
              <select
                value={deleteDays}
                onChange={(e) => setDeleteDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none"
              >
                <option value={0}>Keine Nachrichten löschen</option>
                <option value={1}>Letzte 24 Stunden</option>
                <option value={7}>Letzte 7 Tage</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Begründung</label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Grund für den Bann..."
                className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded-xl bg-discord-dark text-sm text-gray-300">
                Abbrechen
              </button>
              <button
                onClick={() => handleExecuteAction("ban", { deleteDays })}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-600/20"
              >
                {actionLoading ? "Banne..." : "Dauerhaft bannen (-5.000 XP)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
