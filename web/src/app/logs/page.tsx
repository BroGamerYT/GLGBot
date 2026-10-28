"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  RefreshCw,
  Search,
  Shield,
  MessageSquare,
  Users,
  FolderTree,
  Sliders,
  Mic,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  Sparkles,
  Terminal,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  guildId: string;
  timestamp: string;
  category: "message" | "member" | "channel" | "role" | "voice" | "server";
  action: string;
  executor?: { id: string; tag: string; avatar?: string };
  target?: { id: string; tag?: string; name?: string };
  details: Record<string, any>;
}

interface LogStats {
  total: number;
  categories: {
    message: number;
    member: number;
    channel: number;
    role: number;
    voice: number;
    server: number;
  };
  lastLog: string | null;
}

interface LogConfig {
  logChannelId?: string;
  enabled: {
    messages: boolean;
    members: boolean;
    channels: boolean;
    roles: boolean;
    voice: boolean;
    server: boolean;
  };
}

const CATEGORIES = [
  { key: "all", label: "Alle Ereignisse", icon: FileText },
  { key: "server", label: "Server-Einstellungen", icon: Settings2 },
  { key: "message", label: "Nachrichten", icon: MessageSquare },
  { key: "member", label: "Mitglieder", icon: Users },
  { key: "channel", label: "Kanäle", icon: FolderTree },
  { key: "role", label: "Rollen", icon: Sliders },
  { key: "voice", label: "Voice", icon: Mic },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [config, setConfig] = useState<LogConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activeCategory !== "all") q.set("category", activeCategory);
      if (searchQuery.trim()) q.set("q", searchQuery.trim());
      q.set("limit", "100");

      const res = await fetch(`/api/bot/logs?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setStats(data.stats || null);
        setConfig(data.config || null);
      }
    } catch (e) {
      console.error("Fehler beim Laden der Logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const autoSetupLogChannel = async () => {
    try {
      setSetupMessage("Richte Kanal ein...");
      const res = await fetch("/api/bot/logs/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSetupMessage(`✅ Kanal #${data.channelName} eingerichtet!`);
        fetchLogs();
      } else {
        setSetupMessage(`❌ Fehler: ${data.error || "Unbekannt"}`);
      }
    } catch (e: any) {
      setSetupMessage(`❌ Fehler: ${e.message}`);
    }
    setTimeout(() => setSetupMessage(null), 4000);
  };

  const toggleCategoryEnabled = async (catKey: keyof LogConfig["enabled"]) => {
    if (!config) return;
    setSavingConfig(true);
    const newEnabled = { ...config.enabled, [catKey]: !config.enabled[catKey] };
    try {
      const res = await fetch("/api/bot/logs/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingConfig(false);
    }
  };

  const getActionBadge = (action: string, category: string, details?: Record<string, any>) => {
    if (action === "GUILD_UPDATE") {
      return {
        bg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        icon: Settings2,
        label: "SERVER EINSTELLUNGEN",
      };
    }
    if (action.includes("EMOJI") || action.includes("STICKER")) {
      return {
        bg: "bg-teal-500/15 text-teal-300 border-teal-500/30",
        icon: Sparkles,
        label: action.replace("_", " "),
      };
    }
    if (action === "MEMBER_KICK" || action === "MEMBER_BAN") {
      return {
        bg: "bg-red-600/20 text-red-300 border-red-500/40",
        icon: Trash2,
        label: action.replace("_", " "),
      };
    }
    if (action === "VOICE_MOVE" && details?.movedByModerator) {
      return {
        bg: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
        icon: Sliders,
        label: "MOD VOICE MOVE",
      };
    }
    if (action.includes("DELETE") || action.includes("LEAVE")) {
      return {
        bg: "bg-red-500/15 text-red-400 border-red-500/30",
        icon: Trash2,
        label: action.replace("_", " "),
      };
    }
    if (action.includes("UPDATE") || action.includes("STATE") || action.includes("MOVE")) {
      return {
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: Edit3,
        label: action.replace("_", " "),
      };
    }
    if (action.includes("CREATE") || action.includes("JOIN")) {
      return {
        bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        icon: UserPlus,
        label: action.replace("_", " "),
      };
    }
    return {
      bg: "bg-discord-blurple/15 text-indigo-300 border-discord-blurple/30",
      icon: Shield,
      label: action.replace("_", " "),
    };
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyan-400" />
            Audit-Logs & Server-Sicherheit
          </h1>
          <p className="text-sm text-gray-400">
            Lückenlose Nachverfolgung aller Nachrichten, Mitglieder, Kanäle, Rollen und Sprachkanal-Aktivitäten.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/system-logs"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-sm transition-colors border border-emerald-500/30 font-medium"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Live-System-Logs</span>
          </Link>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-3 py-2 bg-discord-card hover:bg-discord-border text-gray-200 rounded-lg text-sm transition-colors border border-discord-border"
          >
            <Settings2 className="w-4 h-4 text-cyan-400" />
            Konfiguration
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-discord-card hover:bg-discord-border text-gray-200 rounded-lg text-sm transition-colors border border-discord-border disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {setupMessage && (
        <div className="p-3 bg-discord-card border border-discord-blurple/40 rounded-xl text-sm text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-discord-blurple animate-pulse" />
          {setupMessage}
        </div>
      )}

      {/* Config Drawer / Section */}
      {showConfig && config && (
        <div className="bg-discord-card border border-discord-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-cyan-400" />
              Logging-Module & Discord-Kanal
            </h2>
            <button
              onClick={autoSetupLogChannel}
              className="text-xs px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors"
            >
              📁 Log-Kanal automatisch anlegen
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            {[
              { key: "server" as const, label: "Server-Einstellungen (Name, Icon, Filter)" },
              { key: "channels" as const, label: "Kanäle (Erstellen/Löschen/Diff)" },
              { key: "roles" as const, label: "Rollen (Erstellen/Rechte/Farbe)" },
              { key: "members" as const, label: "Mitglieder (Join/Leave/Kick/Nick)" },
              { key: "voice" as const, label: "Voice (Beitritt/Move/Mute/Kick)" },
              { key: "messages" as const, label: "Nachrichten (Delete/Edit)" },
            ].map((item) => (
              <button
                key={item.key}
                disabled={savingConfig}
                onClick={() => toggleCategoryEnabled(item.key)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  config.enabled[item.key]
                    ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                    : "bg-discord-dark/50 border-discord-border text-gray-400 hover:text-gray-200"
                }`}
              >
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-xs mt-1 flex items-center gap-1 font-mono">
                  {config.enabled[item.key] ? (
                    <span className="text-emerald-400">Aktiviert ✅</span>
                  ) : (
                    <span className="text-gray-500">Pausiert ⏸️</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 pt-1">
            Status: {config.logChannelId ? `Verbunden mit Discord-Kanal ID: ${config.logChannelId}` : "Kein Discord-Logkanal zugewiesen (Logs werden nur im Web archiviert)."}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Gesamt-Logs</div>
            <div className="text-xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Server</div>
            <div className="text-xl font-bold text-teal-400 mt-1">{stats.categories.server || 0}</div>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Kanäle</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">{stats.categories.channel}</div>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Rollen</div>
            <div className="text-xl font-bold text-purple-400 mt-1">{stats.categories.role}</div>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Mitglieder</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats.categories.member}</div>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Voice</div>
            <div className="text-xl font-bold text-sky-400 mt-1">{stats.categories.voice}</div>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3.5">
            <div className="text-xs text-gray-400 font-medium">Nachrichten</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{stats.categories.message}</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "bg-discord-card text-gray-400 hover:text-white border border-discord-border hover:bg-discord-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Nutzer, Inhalt, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-discord-card border border-discord-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
        </form>
      </div>

      {/* Log Feed */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="bg-discord-card border border-discord-border rounded-xl p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-base font-semibold text-gray-300">Keine Audit-Logs gefunden</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? "Probiere einen anderen Suchbegriff." : "Sobald Aktionen auf dem Server stattfinden, erscheinen sie hier in Echtzeit."}
            </p>
          </div>
        ) : (
          logs.map((entry) => {
            const badge = getActionBadge(entry.action, entry.category, entry.details);
            const BadgeIcon = badge.icon;
            const date = new Date(entry.timestamp);

            return (
              <div
                key={entry.id}
                className="bg-discord-card border border-discord-border rounded-xl p-4 hover:border-discord-border/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>

                    {/* Ausführender / Moderator */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-discord-dark/80 border border-discord-border text-xs text-white">
                      <span className="text-gray-400 font-normal">Von:</span>
                      {entry.executor ? (
                        <span className="flex items-center gap-1.5 font-medium">
                          {entry.executor.avatar && (
                            <img src={entry.executor.avatar} alt="" className="w-4 h-4 rounded-full" />
                          )}
                          <span>{entry.executor.tag}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">🤖 System / Automatisch</span>
                      )}
                    </div>

                    {/* Betroffenes Ziel / Objekt */}
                    {entry.target && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/30 border border-cyan-800/30 text-xs text-cyan-300">
                        <span className="text-gray-400 font-normal">Ziel:</span>
                        <span className="font-mono font-medium">
                          {entry.category === "channel" ? "#" : entry.category === "role" ? "@" : ""}
                          {entry.target.name || entry.target.tag || entry.target.id}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{date.toLocaleDateString("de-DE")}</span>
                    <span>um</span>
                    <span className="font-mono">{date.toLocaleTimeString("de-DE")}</span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="mt-3 pt-3 border-t border-discord-border/50 text-xs text-gray-300 space-y-2">
                  {/* Message Delete / Update */}
                  {entry.action === "MESSAGE_DELETE" && (
                    <div className="space-y-1">
                      <div className="text-gray-400">
                        Kanal: <span className="text-white font-mono">#{entry.details?.channelName || entry.details?.channelId}</span>
                      </div>
                      {entry.details?.content && (
                        <div className="bg-discord-dark/70 rounded-lg p-2.5 border border-discord-border font-mono text-gray-200 break-words">
                          {entry.details.content}
                        </div>
                      )}
                      {entry.details?.attachments?.length > 0 && (
                        <div className="text-xs text-sky-400">
                          📎 {entry.details.attachments.length} Anhang/Anhänge
                        </div>
                      )}
                    </div>
                  )}

                  {entry.action === "MESSAGE_UPDATE" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                        <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Vorher</div>
                        <div className="font-mono text-gray-300 break-words">{entry.details?.oldContent || "*Leer*"}</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                        <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Nachher</div>
                        <div className="font-mono text-gray-300 break-words">{entry.details?.newContent || "*Leer*"}</div>
                      </div>
                    </div>
                  )}

                  {/* Member Kick / Ban */}
                  {(entry.action === "MEMBER_KICK" || entry.action === "MEMBER_BAN") && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                      <div className="text-red-400 font-semibold flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        {entry.action === "MEMBER_BAN" ? "Mitglied gebannt" : "Mitglied gekickt"}
                      </div>
                      <div className="text-gray-300">
                        Nutzer: <span className="text-white font-semibold">{entry.target?.tag || entry.target?.name}</span>
                        {" • "}
                        Durchgeführt von: <span className="text-cyan-400 font-semibold">{entry.executor?.tag || "System"}</span>
                      </div>
                      {entry.details?.reason && (
                        <div className="text-gray-400 italic">
                          Begründung: &quot;{entry.details.reason}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Member Events */}
                  {entry.action === "MEMBER_JOIN" && (
                    <div className="text-gray-400">
                      Account erstellt: <span className="text-white">{entry.details?.createdAt}</span> • Neue Gesamtanzahl: <span className="text-white font-semibold">{entry.details?.memberCount}</span>
                    </div>
                  )}

                  {entry.action === "MEMBER_LEAVE" && (
                    <div className="text-gray-400">
                      Zuletzt gehaltene Rollen: <span className="text-white">{entry.details?.roles?.join(", ") || "*Keine*"}</span>
                    </div>
                  )}

                  {entry.action === "MEMBER_ROLES_UPDATE" && (
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-2">
                        {entry.details?.added?.length > 0 && (
                          <div className="text-emerald-400">
                            ➕ Hinzugefügt: {entry.details.added.map((r: string) => `"${r}"`).join(", ")}
                          </div>
                        )}
                        {entry.details?.removed?.length > 0 && (
                          <div className="text-red-400">
                            ➖ Entfernt: {entry.details.removed.map((r: string) => `"${r}"`).join(", ")}
                          </div>
                        )}
                      </div>
                      {entry.details?.reason && (
                        <div className="text-gray-400 italic text-[11px]">Audit-Grund: {entry.details.reason}</div>
                      )}
                    </div>
                  )}

                  {entry.action === "MEMBER_NICK_UPDATE" && (
                    <div className="text-gray-400">
                      Alter Nickname: <span className="line-through text-red-400">{entry.details?.oldNick || "*Keiner*"}</span> ➔ Neuer Nickname: <span className="text-emerald-400 font-semibold">{entry.details?.newNick || "*Keiner*"}</span>
                    </div>
                  )}

                  {/* Channel Events */}
                  {entry.category === "channel" && (
                    <div className="space-y-1">
                      <div className="text-gray-400">
                        Kanal: <span className="text-white font-mono">#{entry.target?.name}</span> ({entry.details?.type})
                        {entry.details?.parent && <span> • Kategorie: <span className="text-white">{entry.details.parent}</span></span>}
                      </div>
                      {entry.details?.nameChanged && (
                        <div className="text-amber-300">
                          Name geändert: <span className="line-through text-gray-400">#{entry.details.nameChanged.old}</span> ➔ <span className="text-emerald-400 font-semibold">#{entry.details.nameChanged.new}</span>
                        </div>
                      )}
                      {entry.details?.topicChanged && (
                        <div className="text-gray-400">
                          Thema geändert: <span className="text-white">{entry.details.topicChanged.new || "*Kein Thema*"}</span>
                        </div>
                      )}
                      {entry.details?.reason && (
                        <div className="text-gray-400 italic text-[11px]">Audit-Grund: {entry.details.reason}</div>
                      )}
                    </div>
                  )}

                  {/* Role Events */}
                  {entry.category === "role" && (
                    <div className="space-y-1">
                      <div className="text-gray-400 flex items-center gap-2">
                        <span>Rolle: <span className="text-white font-mono">@{entry.target?.name}</span></span>
                        {entry.details?.color && (
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: `#${entry.details.color}` }} />
                            <span className="font-mono text-[11px]">#{entry.details.color}</span>
                          </span>
                        )}
                      </div>
                      {entry.details?.nameChanged && (
                        <div className="text-amber-300">
                          Name geändert: <span className="line-through text-gray-400">@{entry.details.nameChanged.old}</span> ➔ <span className="text-emerald-400 font-semibold">@{entry.details.nameChanged.new}</span>
                        </div>
                      )}
                      {entry.details?.colorChanged && (
                        <div className="text-purple-300">
                          Farbe geändert: <span className="font-mono">#{entry.details.colorChanged.old}</span> ➔ <span className="font-mono font-bold text-white">#{entry.details.colorChanged.new}</span>
                        </div>
                      )}
                      {entry.details?.reason && (
                        <div className="text-gray-400 italic text-[11px]">Audit-Grund: {entry.details.reason}</div>
                      )}
                    </div>
                  )}

                  {/* Voice Events */}
                  {entry.category === "voice" && (
                    <div>
                      {entry.action === "VOICE_MOVE" ? (
                        <div className="space-y-1">
                          {entry.details?.movedByModerator ? (
                            <div className="p-2 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 flex items-center gap-2">
                              <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>
                                Moderator-Verschiebung: <strong className="text-white">{entry.executor?.tag}</strong> hat den Nutzer von <span className="font-mono text-gray-200">#{entry.details?.oldChannelName}</span> nach <span className="font-mono text-cyan-400 font-semibold">#{entry.details?.newChannelName}</span> verschoben.
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-300">
                              Von <span className="text-white font-mono">#{entry.details?.oldChannelName}</span> zu <span className="text-cyan-400 font-mono font-semibold">#{entry.details?.newChannelName}</span> gewechselt (Selbst).
                            </div>
                          )}
                        </div>
                      ) : entry.action === "VOICE_LEAVE" ? (
                        <div>
                          {entry.details?.disconnectedByModerator ? (
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-2">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>
                                Aus Voice gekickt: <strong className="text-white">{entry.executor?.tag}</strong> hat das Mitglied aus <span className="font-mono text-white">#{entry.details?.channelName}</span> getrennt.
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              Voice-Kanal <span className="text-white font-mono">#{entry.details?.channelName}</span> freiwillig verlassen.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          Kanal: <span className="text-white font-mono">#{entry.details?.channelName}</span>
                          {entry.details?.change && <span className="ml-2 text-purple-300">• {entry.details.change}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Server Settings / Emojis / Stickers */}
                  {entry.category === "server" && (
                    <div className="space-y-2">
                      {entry.action === "GUILD_UPDATE" ? (
                        <div className="space-y-2">
                          <div className="text-gray-400">
                            Server: <span className="text-white font-semibold">{entry.target?.name}</span>
                          </div>
                          {entry.details?.changes && Array.isArray(entry.details.changes) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {entry.details.changes.map((ch: any, idx: number) => (
                                <div key={idx} className="bg-discord-dark/70 rounded-lg p-2.5 border border-discord-border space-y-1">
                                  <div className="text-[11px] font-semibold text-cyan-400">{ch.label || ch.setting}</div>
                                  <div className="text-xs flex items-center gap-1.5 font-mono">
                                    <span className="line-through text-red-400/80">{ch.oldValue || "*Leer*"}</span>
                                    <span className="text-gray-500">➔</span>
                                    <span className="text-emerald-400 font-bold">{ch.newValue || "*Leer*"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {entry.details?.reason && (
                            <div className="text-gray-400 italic text-[11px]">Audit-Grund: {entry.details.reason}</div>
                          )}
                        </div>
                      ) : entry.action.includes("EMOJI") ? (
                        <div className="flex items-center gap-3">
                          {entry.details?.url && (
                            <img src={entry.details.url} alt="" className="w-8 h-8 rounded object-contain bg-discord-dark p-1 border border-discord-border" />
                          )}
                          <div className="space-y-0.5">
                            <div className="text-white font-mono font-medium">:{entry.target?.name}:</div>
                            <div className="text-gray-400 text-[11px]">
                              {entry.action === "EMOJI_CREATE" ? "Neues Emoji hochgeladen" : entry.action === "EMOJI_DELETE" ? "Emoji entfernt" : `Umbenannt von :${entry.details?.oldName}: zu :${entry.details?.newName}:`}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-300">
                          Sticker: <span className="text-white font-mono font-semibold">{entry.target?.name}</span> ({entry.action === "STICKER_CREATE" ? "Neu erstellt" : "Gelöscht"})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
