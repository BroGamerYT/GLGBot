"use client";

import { useEffect, useState } from "react";
import { Blocks, RefreshCw, Users, Settings2, Gamepad2, ShieldCheck } from "lucide-react";

interface BotModule {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "community" | "management" | "gaming" | "security";
  commands: string[];
  enabled: boolean;
}

const CATEGORIES: { id: BotModule["category"]; label: string; icon: any; color: string }[] = [
  { id: "community", label: "Community", icon: Users, color: "text-discord-green" },
  { id: "gaming", label: "Gaming & Streaming", icon: Gamepad2, color: "text-red-400" },
  { id: "management", label: "Verwaltung", icon: Settings2, color: "text-discord-blurple" },
  { id: "security", label: "Sicherheit & Moderation", icon: ShieldCheck, color: "text-amber-400" },
];

export default function ModulesPage() {
  const [modules, setModules] = useState<BotModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/modules");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setModules(json.modules || []);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Module konnten nicht geladen werden."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(mod: BotModule) {
    setBusy(mod.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/modules/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: mod.id, enabled: !mod.enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setModules(json.modules);
      setMessage({
        text: `${json.enabled ? "✅" : "⏸️"} ${mod.emoji} ${mod.name} ist jetzt ${json.enabled ? "eingeschaltet" : "ausgeschaltet"}.`,
        type: "success",
      });
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  const activeCount = modules.filter((m) => m.enabled).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Blocks className="w-8 h-8 text-indigo-300" />
            Module
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Schalte Funktionen ein oder aus, je nachdem was dein Server braucht. Ausschalten pausiert nur - Einstellungen,
            Level und Daten bleiben erhalten.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            message.type === "success"
              ? "bg-discord-green/10 border-discord-green/30 text-discord-green"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {!loading && modules.length > 0 && (
        <p className="text-xs text-gray-400">
          {activeCount} von {modules.length} Modulen eingeschaltet · Umschalten dürfen nur Owner & Administratoren · im
          Discord: <code className="text-indigo-300">/modules</code>
        </p>
      )}

      {loading && modules.length === 0 ? (
        <div className="text-gray-400 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Lade …
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const list = modules.filter((m) => m.category === cat.id);
          if (list.length === 0) return null;
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${cat.color}`} />
                {cat.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                      m.enabled ? "border-discord-border bg-discord-dark/40" : "border-discord-border/60 bg-discord-dark/20 opacity-70"
                    }`}
                  >
                    <span className="text-2xl leading-none mt-0.5">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{m.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{m.description}</p>
                      {m.commands.length > 0 && (
                        <p className="text-[11px] text-gray-500 mt-2 truncate">
                          {m.commands.map((c) => `/${c}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggle(m)}
                      disabled={busy !== null}
                      role="switch"
                      aria-checked={m.enabled}
                      title={m.enabled ? "Ausschalten" : "Einschalten"}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                        m.enabled ? "bg-discord-green" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          m.enabled ? "translate-x-5" : ""
                        } ${busy === m.id ? "animate-pulse" : ""}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
