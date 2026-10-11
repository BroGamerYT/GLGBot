"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Terminal,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Download,
  RotateCcw,
  Power,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  Activity,
  ArrowDown,
  Layers,
  Globe,
  Bot,
  Zap,
} from "lucide-react";

interface ProcessStatus {
  name: string;
  pm_id: number;
  status: string;
  uptimeSeconds: number;
  restarts: number;
  memoryBytes: number;
  cpuPercent: number;
  nodeVersion: string;
  version: string;
}

interface SystemLogEntry {
  id: string;
  timestamp: string;
  service: "bot" | "web";
  level: "info" | "warn" | "error";
  message: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [processes, setProcesses] = useState<ProcessStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter & Einstellungen
  const [selectedService, setSelectedService] = useState<"all" | "bot" | "web">("all");
  const [selectedLevel, setSelectedLevel] = useState<"all" | "info" | "warn" | "error">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lineLimit, setLineLimit] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Restart Modal
  const [restartModal, setRestartModal] = useState<{
    open: boolean;
    target: "bot" | "web" | "all";
    busy: boolean;
    countdown: number | null;
  }>({
    open: false,
    target: "bot",
    busy: false,
    countdown: null,
  });

  const consoleRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const q = new URLSearchParams({
        service: selectedService,
        limit: String(lineLimit),
      });
      if (searchQuery.trim()) q.set("q", searchQuery.trim());
      if (selectedLevel !== "all") q.set("level", selectedLevel);

      const res = await fetch(`/api/bot/system/logs?${q.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setProcesses(data.processes || []);
      setError(null);
    } catch (e: any) {
      if (!isBackground) {
        setError(e.message || "Fehler beim Laden der System-Logs");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial & Filterwechsel
  useEffect(() => {
    fetchLogs();
  }, [selectedService, selectedLevel, lineLimit]);

  // Auto-Refresh Intervall (alle 3 Sekunden)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedService, selectedLevel, lineLimit, searchQuery]);

  // Auto-Scroll nach unten
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleRestart = async (target: "bot" | "web" | "all") => {
    setRestartModal({ open: true, target, busy: true, countdown: null });
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bot/system/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Neustart fehlgeschlagen");

      setSuccess(`🔄 ${data.message || "Neustart erfolgreich eingeleitet!"}`);

      // Countdown vor Neuverbindung
      let countdown = 4;
      setRestartModal((m) => ({ ...m, busy: false, countdown }));
      const timer = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
          clearInterval(timer);
          setRestartModal({ open: false, target: "bot", busy: false, countdown: null });
          fetchLogs();
        } else {
          setRestartModal((m) => ({ ...m, countdown }));
        }
      }, 1000);
    } catch (e: any) {
      setError(e.message || "Konnte Neustart nicht ausführen.");
      setRestartModal({ open: false, target: "bot", busy: false, countdown: null });
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Möchtest du wirklich alle PM2-Logdateien leeren?")) return;
    try {
      const res = await fetch("/api/bot/system/logs/clear", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Leeren");
      setSuccess("🗑️ Logs wurden erfolgreich geleert.");
      fetchLogs();
    } catch (e: any) {
      setError(e.message || "Fehler beim Leeren der Logs");
    }
  };

  const downloadLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.service.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const botProcess = processes.find((p) => p.name === "discord-bot");
  const webProcess = processes.find((p) => p.name === "discord-web");

  return (
    <div className="space-y-6">
      {/* Kopfzeile mit Breadcrumbs & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white">System</span>
            <span>/</span>
            <span className="text-emerald-400">Live-Logs</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>System- & Live-Logs</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </h1>
              <p className="text-xs text-gray-400">
                Echtzeit-Konsolenausgaben, Fehlermeldungen und Prozess-Steuerung für Bot & Webinterface
              </p>
            </div>
          </div>
        </div>

        {/* Tab-Wechsel zu Discord Audit-Logs */}
        <div className="flex items-center gap-2">
          <Link
            href="/logs"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-discord-card hover:bg-discord-card/80 border border-discord-border text-xs font-medium text-gray-300 hover:text-white transition-all"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Zu den Discord Audit-Logs</span>
          </Link>
        </div>
      </div>

      {/* Benachrichtigungen */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white text-xs">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-discord-green/10 border border-discord-green/30 text-discord-green text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-discord-green hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Prozess-Status & Direkte Neustart-Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Karte: Discord Bot */}
        <div className="p-5 rounded-2xl bg-discord-card border border-discord-border relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-discord-blurple/20 border border-discord-blurple/30 flex items-center justify-center text-discord-blurple">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Discord Bot</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-discord-dark text-gray-400 border border-discord-border">
                    discord-bot
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-discord-green">
                    <span className="w-2 h-2 rounded-full bg-discord-green animate-pulse"></span>
                    {botProcess?.status || "online"}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Uptime: <strong className="text-gray-200">{formatUptime(botProcess?.uptimeSeconds || 0)}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRestart("bot")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-discord-blurple/20"
              title="Startet nur den Discord-Bot Prozess neu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bot neu starten</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-discord-border/50 text-xs">
            <div className="p-2 rounded-lg bg-discord-dark/50 border border-discord-border/40">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mb-0.5">
                <HardDrive className="w-3 h-3 text-cyan-400" /> RAM
              </span>
              <span className="font-mono font-bold text-white">{formatBytes(botProcess?.memoryBytes || 0)}</span>
            </div>
            <div className="p-2 rounded-lg bg-discord-dark/50 border border-discord-border/40">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mb-0.5">
                <Cpu className="w-3 h-3 text-amber-400" /> CPU
              </span>
              <span className="font-mono font-bold text-white">{botProcess?.cpuPercent || 0}%</span>
            </div>
            <div className="p-2 rounded-lg bg-discord-dark/50 border border-discord-border/40">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mb-0.5">
                <Activity className="w-3 h-3 text-emerald-400" /> Restarts
              </span>
              <span className="font-mono font-bold text-white">{botProcess?.restarts ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Karte: Webinterface */}
        <div className="p-5 rounded-2xl bg-discord-card border border-discord-border relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Webinterface</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-discord-dark text-gray-400 border border-discord-border">
                    discord-web
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-discord-green">
                    <span className="w-2 h-2 rounded-full bg-discord-green animate-pulse"></span>
                    {webProcess?.status || "online"}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Uptime: <strong className="text-gray-200">{formatUptime(webProcess?.uptimeSeconds || 0)}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRestart("web")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/20"
                title="Startet nur den Webserver neu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Web neu starten</span>
              </button>
              <button
                onClick={() => handleRestart("all")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/20"
                title="Startet Bot und Webinterface gemeinsam neu"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Beide</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-discord-border/50 text-xs">
            <div className="p-2 rounded-lg bg-discord-dark/50 border border-discord-border/40">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mb-0.5">
                <HardDrive className="w-3 h-3 text-cyan-400" /> RAM
              </span>
              <span className="font-mono font-bold text-white">{formatBytes(webProcess?.memoryBytes || 0)}</span>
            </div>
            <div className="p-2 rounded-lg bg-discord-dark/50 border border-discord-border/40">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mb-0.5">
                <Cpu className="w-3 h-3 text-amber-400" /> CPU
              </span>
              <span className="font-mono font-bold text-white">{webProcess?.cpuPercent || 0}%</span>
            </div>
            <div className="p-2 rounded-lg bg-discord-dark/50 border border-discord-border/40">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mb-0.5">
                <Activity className="w-3 h-3 text-emerald-400" /> Restarts
              </span>
              <span className="font-mono font-bold text-white">{webProcess?.restarts ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter- & Werkzeugleiste */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Service Auswahl */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedService("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedService === "all"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-gray-400 hover:text-white hover:bg-discord-dark"
            }`}
          >
            Alle Dienste
          </button>
          <button
            onClick={() => setSelectedService("bot")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedService === "bot"
                ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
                : "text-gray-400 hover:text-white hover:bg-discord-dark"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Nur Bot</span>
          </button>
          <button
            onClick={() => setSelectedService("web")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedService === "web"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-gray-400 hover:text-white hover:bg-discord-dark"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Nur Webinterface</span>
          </button>

          {/* Level Filter */}
          <div className="h-5 w-px bg-discord-border mx-1"></div>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-discord-dark border border-discord-border text-xs text-gray-300 focus:outline-none"
          >
            <option value="all">Alle Log-Level</option>
            <option value="info">ℹ️ Nur Info</option>
            <option value="warn">⚠️ Warnungen</option>
            <option value="error">🔴 Nur Fehler (stderr)</option>
          </select>
        </div>

        {/* Suchfeld & Werkzeuge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="In Logs filtern..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-discord-dark border border-discord-border text-xs text-white placeholder-gray-500 w-44 sm:w-56 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <select
            value={lineLimit}
            onChange={(e) => setLineLimit(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-discord-dark border border-discord-border text-xs text-gray-300 focus:outline-none"
          >
            <option value={100}>100 Zeilen</option>
            <option value={200}>200 Zeilen</option>
            <option value={500}>500 Zeilen</option>
          </select>

          {/* Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              autoRefresh
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-discord-dark text-gray-400 border border-discord-border hover:text-white"
            }`}
            title={autoRefresh ? "Auto-Refresh aktiv (alle 3s)" : "Auto-Refresh pausiert"}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`}></span>
            <span>{autoRefresh ? "Live 3s" : "Pausiert"}</span>
          </button>

          {/* Manuell aktualisieren */}
          <button
            onClick={() => fetchLogs()}
            disabled={refreshing}
            className="p-2 rounded-xl bg-discord-dark border border-discord-border text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50"
            title="Jetzt aktualisieren"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 rounded-xl border transition-all ${
              autoScroll
                ? "bg-discord-blurple/20 text-discord-blurple border-discord-blurple/40"
                : "bg-discord-dark text-gray-400 border border-discord-border hover:text-white"
            }`}
            title={autoScroll ? "Auto-Scroll nach unten aktiv" : "Auto-Scroll deaktiviert"}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Download Logs */}
          <button
            onClick={downloadLogs}
            className="p-2 rounded-xl bg-discord-dark border border-discord-border text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            title="Logs als Textdatei herunterladen"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Logs leeren */}
          <button
            onClick={handleClearLogs}
            className="p-2 rounded-xl bg-discord-dark border border-discord-border text-gray-400 hover:text-rose-400 hover:border-rose-500/50 transition-all"
            title="PM2 Logdateien leeren"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Log-Ansicht */}
      <div className="bg-[#0b0d13] border border-discord-border rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
        {/* Terminal Header */}
        <div className="bg-[#12151e] px-4 py-2.5 border-b border-discord-border flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-mono text-[11px] ml-2 text-gray-400">console@server:~/{selectedService}</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>{logs.length} Zeilen geladen</span>
            {refreshing && <span className="text-emerald-400 animate-pulse">● aktualisiere...</span>}
          </div>
        </div>

        {/* Konsoleninhalt */}
        <div
          ref={consoleRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-1 select-text scrollbar-thin scrollbar-thumb-gray-800"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-500 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Lade Logdaten vom Server...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
              <Terminal className="w-10 h-10 mb-2 opacity-40 text-gray-400" />
              <p className="text-sm font-medium">Keine Log-Einträge gefunden</p>
              <p className="text-xs text-gray-600 mt-1">
                {searchQuery ? "Passe deinen Suchfilter an oder ändere den Zeitbereich." : "Aktuell liegen keine Ausgaben für diesen Filter vor."}
              </p>
            </div>
          ) : (
            logs.map((entry) => {
              const isError = entry.level === "error";
              const isWarn = entry.level === "warn";
              const isWeb = entry.service === "web";

              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2 py-0.5 px-1.5 rounded transition-colors ${
                    isError
                      ? "bg-rose-500/10 text-rose-300"
                      : isWarn
                      ? "bg-amber-500/10 text-amber-300"
                      : "hover:bg-white/[0.03] text-gray-300"
                  }`}
                >
                  {/* Zeitstempel */}
                  <span className="text-gray-500 shrink-0 select-none text-[11px]">
                    {new Date(entry.timestamp).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>

                  {/* Service Badge */}
                  <span
                    className={`shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase select-none ${
                      isWeb
                        ? "bg-purple-900/60 text-purple-300 border border-purple-700/40"
                        : "bg-indigo-900/60 text-indigo-300 border border-indigo-700/40"
                    }`}
                  >
                    {entry.service}
                  </span>

                  {/* Level Badge (nur bei Warn/Error) */}
                  {isError && (
                    <span className="shrink-0 text-[10px] font-bold px-1 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700/50 uppercase select-none">
                      ERR
                    </span>
                  )}
                  {isWarn && (
                    <span className="shrink-0 text-[10px] font-bold px-1 py-0.2 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50 uppercase select-none">
                      WARN
                    </span>
                  )}

                  {/* Nachricht */}
                  <span className="flex-1 whitespace-pre-wrap break-all font-mono text-[11.5px]">
                    {entry.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Neustart-Modal */}
      {restartModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 w-full max-w-md shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <RotateCcw className={`w-7 h-7 ${restartModal.busy ? "animate-spin" : ""}`} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {restartModal.target === "bot"
                  ? "Discord Bot neu starten"
                  : restartModal.target === "web"
                  ? "Webinterface neu starten"
                  : "Bot & Webinterface neu starten"}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Der PM2-Dienst wird im laufenden Betrieb neu geladen. Der Neustart dauert nur wenige Sekunden.
              </p>
            </div>

            {restartModal.countdown !== null && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold">
                Neustart ausgeführt! Verbindung wird in {restartModal.countdown}s geprüft...
              </div>
            )}

            {restartModal.busy && (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Befehl wird an den Server gesendet...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
