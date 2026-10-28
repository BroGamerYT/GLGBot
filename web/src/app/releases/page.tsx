"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Gamepad2,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Save,
  Send,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface GameRelease {
  id: string;
  title: string;
  releaseDate: string; // YYYY-MM-DD
  platforms: ("PC" | "PS5" | "Xbox" | "Switch" | "Game Pass")[];
  genre: string;
  category?: "game" | "major_update" | "dlc";
  isTripleA?: boolean;
  isServerGame?: boolean;
  description?: string;
  coverUrl?: string;
  storeUrl?: string;
  trailerUrl?: string;
  isCurated?: boolean;
  addedBy?: string;
  createdAt: number;
}

interface ReleaseConfig {
  channelId?: string;
  pingRoleId?: string;
  weeklyPostEnabled: boolean;
  weeklyPostDay: number;
  weeklyPostHour: number;
  lastWeeklyPostDate?: string;
  customReleases: GameRelease[];
}

interface ReleasesApiResponse {
  config: ReleaseConfig;
  releases: GameRelease[];
  channels: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

const PLATFORMS = ["PC", "PS5", "Xbox", "Switch", "Game Pass"] as const;

export default function ReleasesPage() {
  const [data, setData] = useState<ReleasesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter-Status
  const [timeframe, setTimeframe] = useState<"upcoming" | "week" | "month" | "next_month" | "all">("upcoming");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("alle");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Admin Config Form
  const [channelId, setChannelId] = useState("");
  const [pingRoleId, setPingRoleId] = useState("");
  const [weeklyPostEnabled, setWeeklyPostEnabled] = useState(true);

  // Neuer Release Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPlatforms, setNewPlatforms] = useState<string[]>(["PC"]);
  const [newCover, setNewCover] = useState("");
  const [newStore, setNewStore] = useState("");
  const [newTrailer, setNewTrailer] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [authRes, releasesRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()).catch(() => ({ user: null })),
        fetch("/api/bot/releases").then((r) => r.json()),
      ]);

      setIsAdmin(Boolean(authRes?.user));

      if (releasesRes && !releasesRes.error) {
        setData(releasesRes);
        setChannelId(releasesRes.config?.channelId || "");
        setPingRoleId(releasesRes.config?.pingRoleId || "");
        setWeeklyPostEnabled(releasesRes.config?.weeklyPostEnabled ?? true);
      }
    } catch (e) {
      console.error("Fehler beim Laden der Releases:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async () => {
    setBusy("save");
    setStatusMsg(null);
    try {
      const res = await fetch("/api/bot/releases/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId || undefined,
          pingRoleId: pingRoleId || undefined,
          weeklyPostEnabled,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Einstellungen erfolgreich gespeichert!" });
      } else {
        setStatusMsg({ type: "error", text: json.error || "Speichern fehlgeschlagen." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Netzwerkfehler beim Speichern." });
    } finally {
      setBusy(null);
    }
  };

  const triggerWeeklyPost = async () => {
    if (!channelId) {
      setStatusMsg({ type: "error", text: "Bitte wähle zuerst einen Zielkanal aus." });
      return;
    }
    setBusy("post");
    setStatusMsg(null);
    try {
      const res = await fetch("/api/bot/releases/post-week", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Wochen-Release-Post erfolgreich in Discord veröffentlicht!" });
      } else {
        setStatusMsg({ type: "error", text: json.error || "Post konnte nicht versendet werden." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Netzwerkfehler beim Senden." });
    } finally {
      setBusy(null);
    }
  };

  const handleAddRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || newPlatforms.length === 0) {
      setStatusMsg({ type: "error", text: "Bitte Titel, Datum und mindestens eine Plattform angeben." });
      return;
    }

    setBusy("add");
    try {
      const res = await fetch("/api/bot/releases/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          releaseDate: newDate,
          platforms: newPlatforms,
          genre: newGenre.trim() || "Action",
          description: newDesc.trim() || undefined,
          coverUrl: newCover.trim() || undefined,
          storeUrl: newStore.trim() || undefined,
          trailerUrl: newTrailer.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNewTitle("");
        setNewDate("");
        setNewGenre("");
        setNewDesc("");
        setNewCover("");
        setNewStore("");
        setNewTrailer("");
        setStatusMsg({ type: "success", text: `Release für "${newTitle}" erfolgreich hinzugefügt!` });
        load();
      } else {
        setStatusMsg({ type: "error", text: json.error || "Fehler beim Hinzufügen." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Netzwerkfehler beim Hinzufügen." });
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteRelease = async (id: string, title: string) => {
    if (!confirm(`Möchtest du "${title}" wirklich aus dem Kalender löschen?`)) return;
    setBusy(`del-${id}`);
    try {
      const res = await fetch("/api/bot/releases/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: `"${title}" gelöscht.` });
        load();
      } else {
        const json = await res.json();
        setStatusMsg({ type: "error", text: json.error || "Löschen fehlgeschlagen." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Netzwerkfehler beim Löschen." });
    } finally {
      setBusy(null);
    }
  };

  // Datums-Berechnungen für die Filter
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
  const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const nextMonth = (currentMonth + 1) % 12;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const allReleases = data?.releases || [];

  const filteredReleases = allReleases.filter((r) => {
    // Plattform-Filter
    if (selectedPlatform !== "alle") {
      const match = r.platforms.some((p) => p.toLowerCase().includes(selectedPlatform.toLowerCase()));
      if (!match) return false;
    }

    // Zeitraum-Filter
    if (timeframe !== "all") {
      if (timeframe === "week") {
        if (r.releaseDate < startOfWeekStr || r.releaseDate > endOfWeekStr) return false;
      } else if (timeframe === "month") {
        const d = new Date(r.releaseDate);
        if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
      } else if (timeframe === "next_month") {
        const d = new Date(r.releaseDate);
        if (d.getFullYear() !== nextMonthYear || d.getMonth() !== nextMonth) return false;
      } else if (timeframe === "upcoming") {
        if (r.releaseDate < todayStr) return false;
      }
    }

    // Kategorie & Typ-Filter
    if (selectedCategory === "major_update" && r.category !== "major_update" && r.category !== "dlc") return false;
    if (selectedCategory === "triple_a" && !r.isTripleA) return false;
    if (selectedCategory === "server_game" && !r.isServerGame) return false;
    if (selectedCategory === "game" && (r.category === "major_update" || r.category === "dlc")) return false;

    return true;
  });

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    const current = new Date(`${todayStr}T00:00:00`).getTime();
    const diffMs = target - current;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  const getPlatformBadgeColor = (p: string) => {
    switch (p) {
      case "PC":
        return "bg-slate-700/60 text-slate-200 border-slate-600";
      case "PS5":
        return "bg-blue-600/20 text-blue-400 border-blue-500/40";
      case "Xbox":
        return "bg-emerald-600/20 text-emerald-400 border-emerald-500/40";
      case "Switch":
        return "bg-red-600/20 text-red-400 border-red-500/40";
      case "Game Pass":
        return "bg-green-600/25 text-green-300 border-green-500/40";
      default:
        return "bg-gray-700 text-gray-300 border-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-discord-card via-discord-dark to-discord-card p-6 md:p-8 rounded-2xl border border-discord-border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-discord-blurple/20 border border-discord-blurple/40 flex items-center justify-center text-discord-blurple shadow-md">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">Game-Release Kalender</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30">
                {allReleases.length} Titel
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Alle anstehenden Spiele-Neuerscheinungen, Release-Termine, Plattformen und Vorbesteller-Links.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-discord-green/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Release eintragen
          </button>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm font-medium ${
            statusMsg.type === "success"
              ? "bg-discord-green/10 border-discord-green/30 text-discord-green"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Admin Settings (nur für eingeloggte Admins sichtbar) */}
      {isAdmin && (
        <div className="bg-discord-card border border-discord-border p-6 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-discord-yellow" />
              Automatischer Wochen-Post (Discord-Scheduler)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerWeeklyPost}
                disabled={busy !== null || !channelId}
                className="px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                {busy === "post" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Wochen-Post jetzt senden
              </button>
              <button
                onClick={saveConfig}
                disabled={busy !== null}
                className="px-3 py-1.5 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                {busy === "save" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Post-Kanal</label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
              >
                <option value="">— Kein Kanal —</option>
                {data?.channels?.map((c) => (
                  <option key={c.id} value={c.id}>
                    # {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Rollen-Ping</label>
              <select
                value={pingRoleId}
                onChange={(e) => setPingRoleId(e.target.value)}
                className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
              >
                <option value="">Kein Ping</option>
                {data?.roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyPostEnabled}
                  onChange={(e) => setWeeklyPostEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-discord-green"></div>
              </label>
              <span className="text-xs text-gray-300">Jeden Montag um 10:00 Uhr posten</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Leiste */}
      <div className="bg-discord-card border border-discord-border p-4 rounded-2xl space-y-4 shadow-md">
        {/* Zeitraum Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-discord-border pb-3">
          {[
            { id: "upcoming", label: "Alle kommenden" },
            { id: "week", label: "Diese Woche" },
            { id: "month", label: "Dieser Monat" },
            { id: "next_month", label: "Nächster Monat" },
            { id: "all", label: "Gesamter Kalender" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeframe === t.id
                  ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
                  : "bg-discord-dark text-gray-400 hover:text-white hover:bg-discord-dark/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Kategorie & Typ Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-discord-border pb-3">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Typ:
          </span>
          {[
            { id: "all", label: "Alle Titel & Updates" },
            { id: "major_update", label: "⚡ Große Updates & DLCs" },
            { id: "triple_a", label: "🌟 Triple-A Blockbuster" },
            { id: "server_game", label: "🎮 Aktive Server-Spiele" },
            { id: "game", label: "🕹️ Neue Vollversionen" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === c.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "bg-discord-dark text-gray-400 hover:text-white hover:bg-discord-dark/80"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Plattform Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" /> Plattform:
          </span>
          {["alle", "PC", "PS5", "Xbox", "Switch", "Game Pass"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                selectedPlatform.toLowerCase() === p.toLowerCase()
                  ? "bg-white/10 text-white border-white/40"
                  : "bg-transparent text-gray-400 border-discord-border hover:border-gray-500 hover:text-gray-300"
              }`}
            >
              {p === "alle" ? "Alle Plattformen" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Release Cards Grid */}
      {filteredReleases.length === 0 ? (
        <div className="bg-discord-card border border-discord-border p-12 rounded-2xl text-center space-y-3">
          <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto opacity-50" />
          <h3 className="text-lg font-bold text-white">Keine Releases im gewählten Zeitraum</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Für diesen Filter stehen derzeit keine Veröffentlichungen an. Probiere einen anderen Zeitraum oder schau dir alle kommenden Titel an.
          </p>
          <button
            onClick={() => {
              setTimeframe("all");
              setSelectedPlatform("alle");
            }}
            className="mt-2 px-4 py-2 rounded-lg bg-discord-dark border border-discord-border text-xs text-gray-300 hover:text-white"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReleases.map((r) => {
            const daysDiff = getDaysDiff(r.releaseDate);
            const dateParts = r.releaseDate.split("-");
            const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;

            let countdownLabel = "";
            let countdownColor = "";

            if (daysDiff < 0) {
              countdownLabel = "Erschienen";
              countdownColor = "bg-gray-600/30 text-gray-400 border-gray-600/50";
            } else if (daysDiff === 0) {
              countdownLabel = "🔥 Heute!";
              countdownColor = "bg-discord-green/20 text-discord-green border-discord-green/40";
            } else if (daysDiff <= 7) {
              countdownLabel = `In ${daysDiff} Tag${daysDiff === 1 ? "" : "en"}`;
              countdownColor = "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
            } else {
              countdownLabel = `In ${daysDiff} Tagen`;
              countdownColor = "bg-discord-blurple/20 text-discord-blurple border-discord-blurple/40";
            }

            return (
              <div
                key={r.id}
                className="bg-discord-card border border-discord-border hover:border-discord-blurple/50 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all group"
              >
                {/* Cover Banner */}
                <div className="relative h-44 bg-discord-dark overflow-hidden">
                  {r.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.coverUrl}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center">
                      <Gamepad2 className="w-16 h-16 text-indigo-400/40" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-discord-card via-transparent to-black/40"></div>

                  {/* Release Countdown Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${countdownColor}`}>
                      {countdownLabel}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-discord-blurple" />
                    {formattedDate}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.category === "major_update" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Großes Update / DLC
                        </span>
                      )}
                      {r.isTripleA && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          🌟 Triple-A
                        </span>
                      )}
                      {r.isServerGame && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          🎮 Server-Spiel
                        </span>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-discord-blurple transition-colors leading-tight">
                        {r.title}
                      </h3>
                      {isAdmin && !r.isCurated && (
                        <button
                          onClick={() => handleDeleteRelease(r.id, r.title)}
                          disabled={busy === `del-${r.id}`}
                          title="Release löschen"
                          className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <span className="text-xs text-gray-400 block font-medium">Genre: {r.genre}</span>

                    {r.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{r.description}</p>
                    )}

                    {/* Platforms */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {r.platforms.map((p) => (
                        <span
                          key={p}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPlatformBadgeColor(p)}`}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-discord-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {r.storeUrl && (
                        <a
                          href={r.storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          Store
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {r.trailerUrl && (
                        <a
                          href={r.trailerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-discord-dark border border-discord-border hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3 text-red-500" />
                          Trailer
                        </a>
                      )}
                    </div>

                    {r.isCurated && (
                      <span className="text-[10px] text-gray-500 italic">GLGBot Verifiziert</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Release Hinzufügen (Nur Admins) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-discord-border flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-discord-green" />
                Spiele-Release eintragen
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRelease} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Spieletitel *</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. The Witcher 4, Half-Life 3 ..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Release-Datum *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Genre</label>
                  <input
                    type="text"
                    placeholder="z. B. Action-RPG, Shooter"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Plattformen *</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const checked = newPlatforms.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          if (checked) {
                            setNewPlatforms(newPlatforms.filter((x) => x !== p));
                          } else {
                            setNewPlatforms([...newPlatforms, p]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          checked
                            ? "bg-discord-blurple text-white border-discord-blurple"
                            : "bg-discord-dark text-gray-400 border-discord-border hover:border-gray-500"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Kurzbeschreibung</label>
                <textarea
                  rows={2}
                  placeholder="Worum geht es im Spiel?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Cover-Bild URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newCover}
                  onChange={(e) => setNewCover(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Store-Link</label>
                  <input
                    type="url"
                    placeholder="https://store.steampowered..."
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value)}
                    className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Trailer-Link</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={newTrailer}
                    onChange={(e) => setNewTrailer(e.target.value)}
                    className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-discord-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-discord-dark border border-discord-border text-xs text-gray-300 hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={busy === "add"}
                  className="px-4 py-2 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  {busy === "add" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
