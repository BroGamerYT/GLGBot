"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wand2,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Shield,
  ScrollText,
  Mic,
  Radio,
  Ticket,
  FileText,
  Gavel,
  Lock,
  PlusCircle,
  Link2,
  XCircle,
} from "lucide-react";

type ModuleId = "roles" | "rules" | "voice" | "live" | "tickets" | "logs" | "prison" | "lock";

interface ModuleInfo {
  id: ModuleId;
  label: string;
  description: string;
}

interface SetupItem {
  name: string;
  status: "created" | "linked" | "error";
}

interface ModuleResult {
  module: ModuleId;
  label: string;
  ok: boolean;
  items: SetupItem[];
  error?: string;
}

interface SetupData {
  modules: ModuleInfo[];
  status: Record<ModuleId, boolean>;
  moduleEnabled?: Record<ModuleId, boolean>;
  running: boolean;
  botPermissions: { administrator: boolean; manageRoles: boolean; manageChannels: boolean };
}

const ICONS: Record<ModuleId, { icon: any; color: string; link?: string }> = {
  roles: { icon: Shield, color: "text-discord-yellow", link: "/roles" },
  rules: { icon: ScrollText, color: "text-amber-400", link: "/rules" },
  voice: { icon: Mic, color: "text-discord-green", link: "/voice" },
  live: { icon: Radio, color: "text-red-500", link: "/live" },
  tickets: { icon: Ticket, color: "text-sky-400", link: "/tickets" },
  logs: { icon: FileText, color: "text-gray-300", link: "/logs" },
  prison: { icon: Gavel, color: "text-red-400", link: "/moderation" },
  lock: { icon: Lock, color: "text-orange-400", link: "/rules" },
};

/** Bereiche, die nicht automatisch vorausgewählt werden (verändern den Server stärker). */
const OPT_IN: ModuleId[] = ["lock"];

export default function SetupPage() {
  const [data, setData] = useState<SetupData | null>(null);
  const [selected, setSelected] = useState<Set<ModuleId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ModuleResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(preselect = true) {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/setup");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      if (preselect) {
        setSelected(new Set(json.modules.map((m: ModuleInfo) => m.id).filter((id: ModuleId) => !json.status[id] && !OPT_IN.includes(id) && json.moduleEnabled?.[id] !== false)));
      }
    } catch (e: any) {
      setError(e.message || "Konnte den Status nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: ModuleId) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function run() {
    if (selected.size === 0) return;
    const names = data!.modules.filter((m) => selected.has(m.id)).map((m) => `• ${m.label}`).join("\n");
    if (!confirm(`Folgende Bereiche jetzt in Discord einrichten?\n\n${names}\n\nVorhandene Rollen & Kanäle werden erkannt und nicht doppelt angelegt.`)) return;
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/bot/setup/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResults(json.results);
      setData((d) => (d ? { ...d, status: json.status } : d));
      setSelected(new Set());
    } catch (e: any) {
      setError(e.message || "Einrichtung fehlgeschlagen.");
    } finally {
      setRunning(false);
    }
  }

  const perms = data?.botPermissions;
  const missingPerms = perms && !perms.administrator && (!perms.manageRoles || !perms.manageChannels);
  const doneCount = data ? data.modules.filter((m) => data.status[m.id]).length : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-discord-blurple" />
            Server einrichten
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Wähle aus, was der Bot auf deinem Server anlegen soll - ein Klick erstellt alle fehlenden Rollen & Kanäle.
            Bereits Vorhandenes wird erkannt und nur verknüpft.
          </p>
        </div>
        <button
          onClick={() => load(false)}
          disabled={loading || running}
          className="self-start sm:self-auto px-3 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Status prüfen
        </button>
      </div>

      {missingPerms && (
        <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-300 text-sm flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            Dem Bot fehlen die Rechte <b>Rollen verwalten</b> und/oder <b>Kanäle verwalten</b>. Gib der Bot-Rolle in den
            Server-Einstellungen am besten <b>Administrator</b> und schiebe sie weit nach oben.
          </span>
        </div>
      )}

      {error && <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-sm font-medium">❌ {error}</div>}

      {/* Ergebnis */}
      {results && (
        <div className="bg-discord-card border border-discord-green/40 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-discord-green" />
            Einrichtung abgeschlossen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r) => (
              <div key={r.module} className={`rounded-xl border p-4 ${r.ok ? "border-discord-border bg-discord-dark/50" : "border-red-500/40 bg-red-500/5"}`}>
                <p className="font-semibold text-white text-sm flex items-center gap-2 mb-2">
                  {r.ok ? <CheckCircle2 className="w-4 h-4 text-discord-green" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  {r.label}
                </p>
                {r.error && <p className="text-xs text-red-400 mb-2">{r.error}</p>}
                <ul className="space-y-1">
                  {r.items.map((it, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-center gap-2">
                      {it.status === "created" ? (
                        <PlusCircle className="w-3.5 h-3.5 text-discord-green shrink-0" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      )}
                      <span className="truncate">{it.name}</span>
                      <span className={`ml-auto text-[10px] ${it.status === "created" ? "text-discord-green" : "text-gray-500"}`}>
                        {it.status === "created" ? "neu" : "vorhanden"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bereiche */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5 gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Bereiche</h2>
            <p className="text-xs text-gray-400">
              {data ? `${doneCount} von ${data.modules.length} eingerichtet` : "Lade Status …"} · Noch nicht eingerichtete Bereiche sind vorausgewählt.
            </p>
          </div>
        </div>

        {loading && !data ? (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Lade …
          </div>
        ) : (
          <div className="space-y-3">
            {data?.modules.map((m) => {
              const { icon: Icon, color, link } = ICONS[m.id];
              const done = data.status[m.id];
              const moduleOff = data.moduleEnabled?.[m.id] === false;
              const checked = selected.has(m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    checked ? "border-discord-blurple bg-discord-blurple/10" : "border-discord-border bg-discord-dark/40 hover:border-gray-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.id)}
                    disabled={running || moduleOff}
                    className="mt-1 w-4 h-4 accent-discord-blurple"
                  />
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{m.label}</span>
                      {done ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-discord-green/15 text-discord-green border border-discord-green/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {m.id === "lock" ? "aktiv" : "eingerichtet"}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30 flex items-center gap-1">
                          <Circle className="w-3 h-3" /> {m.id === "lock" ? "aus" : "fehlt"}
                        </span>
                      )}
                      {OPT_IN.includes(m.id) && <span className="text-[10px] text-orange-400">optional</span>}
                      {moduleOff && (
                        <Link href="/modules" onClick={(e) => e.stopPropagation()} className="text-[10px] text-gray-400 underline">
                          Modul ausgeschaltet
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{m.description}</p>
                  </div>
                  {link && (
                    <Link href={link} onClick={(e) => e.stopPropagation()} className="text-xs text-discord-blurple hover:underline shrink-0 mt-0.5">
                      Einstellungen
                    </Link>
                  )}
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={run}
            disabled={running || selected.size === 0 || !data}
            className="px-5 py-3 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {running ? "Richte ein … (kann bis zu einer Minute dauern)" : `${selected.size} Bereich(e) jetzt einrichten`}
          </button>
          <p className="text-xs text-gray-500">
            Nur für Owner & Administratoren. Im Discord geht dasselbe mit <code className="text-indigo-300">/setup-all</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
