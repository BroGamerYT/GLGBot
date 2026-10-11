"use client";

import { useEffect, useState } from "react";
import { HandHeart, RefreshCw, Save, Send, Eye, AlertTriangle } from "lucide-react";

interface WelcomeConfig {
  channelId?: string;
  title: string;
  message: string;
  subtitle: string;
  accent: string;
  card: boolean;
  autoRoleId?: string;
}

interface Data {
  config: WelcomeConfig;
  defaults: WelcomeConfig;
  ruleLockActive: boolean;
  channels: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

export default function WelcomePage() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<WelcomeConfig | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/bot/welcome");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setForm(json.config);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function call(path: string, body: any, okText: string | null, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(`/api/bot/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (okText) setMessage({ text: okText, type: "success" });
      return json;
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function showPreview() {
    if (!form) return;
    const json = await call("welcome/preview", { title: form.title, subtitle: form.subtitle, accent: form.accent }, null, "preview");
    if (json?.image) setPreview(json.image);
  }

  const input = "w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <HandHeart className="w-8 h-8 text-pink-300" />
          Willkommens-Karte
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Neue Mitglieder werden im gewählten Kanal mit einer grafischen Karte begrüßt (Avatar, Name, Mitgliedsnummer). Optional
          bekommen sie automatisch eine Rolle.
        </p>
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

      {!form ? (
        <div className="text-gray-400 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Lade …
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Kanal</label>
              <select value={form.channelId || ""} onChange={(e) => setForm({ ...form, channelId: e.target.value })} className={input}>
                <option value="">— keine Willkommens-Nachricht —</option>
                {data?.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Nachricht</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} maxLength={1500} className={input} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.card} onChange={(e) => setForm({ ...form, card: e.target.checked })} className="w-4 h-4 accent-discord-blurple" />
              Grafische Karte anhängen
            </label>
            {form.card && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={40} placeholder="Überschrift" className={input} />
                <input type="color" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} className="h-10 w-14 rounded-lg bg-discord-dark border border-discord-border" />
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  maxLength={120}
                  placeholder="Untertitel"
                  className={`${input} sm:col-span-2`}
                />
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              Platzhalter: <code className="text-indigo-300">{"{user}"}</code> Erwähnung, <code className="text-indigo-300">{"{name}"}</code> Name,{" "}
              <code className="text-indigo-300">{"{server}"}</code> Servername, <code className="text-indigo-300">{"{count}"}</code> Mitgliedsnummer.
            </p>

            <div className="space-y-1.5 pt-2 border-t border-discord-border">
              <label className="text-xs text-gray-400 font-medium">Automatische Rolle beim Beitritt</label>
              <select value={form.autoRoleId || ""} onChange={(e) => setForm({ ...form, autoRoleId: e.target.value })} className={input}>
                <option value="">— keine —</option>
                {data?.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
              {data?.ruleLockActive && form.autoRoleId && (
                <p className="text-[11px] text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Die Regel-Sperre ist aktiv - solange wird keine automatische Rolle vergeben. Neue Mitglieder bekommen ihre Rolle über
                  „Regeln akzeptieren“.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={async () => {
                  if (await call("welcome", form, "✅ Gespeichert.", "save")) load();
                }}
                disabled={busy !== null}
                className="px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {busy === "save" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Speichern
              </button>
              <button
                onClick={showPreview}
                disabled={busy !== null || !form.card}
                className="px-4 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {busy === "preview" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Vorschau
              </button>
              <button
                onClick={() => call("welcome/test", {}, "✅ Test-Nachricht gesendet (mit dir als neuem Mitglied).", "test")}
                disabled={busy !== null || !data?.config.channelId}
                title={data?.config.channelId ? "Test im Kanal senden" : "Zuerst Kanal speichern"}
                className="px-4 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Test senden
              </button>
            </div>
          </div>

          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-3">Vorschau</h2>
            {preview ? (
              <img src={preview} alt="Vorschau der Willkommens-Karte" className="w-full rounded-xl border border-discord-border" />
            ) : (
              <p className="text-sm text-gray-500">Klicke auf „Vorschau“, um die Karte mit deinem Profilbild zu sehen.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
