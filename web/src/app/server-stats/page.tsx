"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, Save } from "lucide-react";

interface Counter {
  id: string;
  label: string;
  description: string;
  template: string;
  enabled: boolean;
  channelId: string | null;
  value: string;
}

export default function ServerStatsPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/stats-channels");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCounters(json.counters || []);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(id: string, patch: Partial<Counter>) {
    setCounters((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/stats-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counters: Object.fromEntries(counters.map((c) => [c.id, { enabled: c.enabled, template: c.template }])),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({ text: "✅ Gespeichert - die Kanäle sind angelegt. Die Zahlen werden alle 10 Minuten aktualisiert.", type: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
            Statistik-Kanäle
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gesperrte Sprachkanäle ganz oben in der Kanalliste, deren Name einen Live-Zähler zeigt. Discord erlaubt nur
            2 Umbenennungen pro 10 Minuten - deshalb wird alle 10 Minuten aktualisiert.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern & anlegen
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            message.type === "success" ? "bg-discord-green/10 border-discord-green/30 text-discord-green" : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl space-y-3">
        {loading && counters.length === 0 ? (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Lade …
          </div>
        ) : (
          counters.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border transition-all ${c.enabled ? "border-discord-blurple/50 bg-discord-blurple/5" : "border-discord-border bg-discord-dark/40"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={(e) => update(c.id, { enabled: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-discord-blurple"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{c.label}</p>
                      <p className="text-xs text-gray-400">{c.description}</p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">aktuell: {c.value}</span>
                  </div>
                  {c.enabled && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        value={c.template}
                        onChange={(e) => update(c.id, { template: e.target.value })}
                        maxLength={90}
                        className="flex-1 bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-xs text-gray-400 shrink-0">
                        Vorschau: <span className="text-white">🔊 {c.template.replace(/{count}/g, c.value)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <p className="text-[11px] text-gray-500 pt-2">
          <code className="text-indigo-300">{"{count}"}</code> wird durch die Zahl ersetzt. Abgewählte Zähler-Kanäle werden gelöscht. Im
          Discord geht dasselbe mit <code className="text-indigo-300">/server-stats</code>.
        </p>
      </div>
    </div>
  );
}
