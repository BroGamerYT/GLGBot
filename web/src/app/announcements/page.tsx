"use client";

import { useEffect, useMemo, useState } from "react";
import { AlarmClock, RefreshCw, Plus, Trash2, Send, Pencil, X, AlertTriangle, Repeat } from "lucide-react";

interface Announcement {
  id: string;
  channelId: string;
  content: string;
  embed?: { title?: string; description?: string; color?: string; imageUrl?: string };
  ping: string;
  silent: boolean;
  sendAt: number;
  repeat: "none" | "daily" | "weekly";
  lastSentAt?: number;
  sentCount: number;
  lastError?: string;
  failed?: boolean;
}

interface Data {
  announcements: Announcement[];
  channels: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

const REPEAT_LABEL = { none: "Einmalig", daily: "Täglich", weekly: "Wöchentlich" };

/** Date -> Wert für <input type="datetime-local"> (lokale Zeit) */
function toLocalInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = () => ({
  id: "" as string,
  channelId: "",
  content: "",
  useEmbed: false,
  title: "",
  description: "",
  color: "#5865f2",
  imageUrl: "",
  ping: "none",
  silent: false,
  when: toLocalInput(Date.now() + 60 * 60 * 1000),
  repeat: "none" as Announcement["repeat"],
});

export default function AnnouncementsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/announcements");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const channelName = useMemo(() => {
    const map = new Map((data?.channels || []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) || "gelöschter Kanal";
  }, [data]);
  const roleName = (id: string) => data?.roles.find((r) => r.id === id)?.name || "Rolle";

  function edit(a: Announcement) {
    setForm({
      id: a.id,
      channelId: a.channelId,
      content: a.content,
      useEmbed: !!a.embed,
      title: a.embed?.title || "",
      description: a.embed?.description || "",
      color: a.embed?.color || "#5865f2",
      imageUrl: a.embed?.imageUrl || "",
      ping: a.ping,
      silent: a.silent,
      when: toLocalInput(a.failed ? Date.now() + 10 * 60 * 1000 : a.sendAt),
      repeat: a.repeat,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function call(path: string, body: any, okText: string, key: string) {
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
      setMessage({ text: okText, type: "success" });
      await load();
      return true;
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    const sendAt = new Date(form.when).getTime();
    const ok = await call(
      "announcements",
      {
        id: form.id || undefined,
        channelId: form.channelId,
        content: form.content,
        embed: form.useEmbed ? { title: form.title, description: form.description, color: form.color, imageUrl: form.imageUrl } : undefined,
        ping: form.ping,
        silent: form.silent,
        sendAt,
        repeat: form.repeat,
      },
      form.id ? "✅ Ankündigung aktualisiert." : "✅ Ankündigung geplant.",
      "save"
    );
    if (ok) {
      setForm(emptyForm());
      setShowForm(false);
    }
  }

  const input = "w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple";
  const list = data?.announcements || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <AlarmClock className="w-8 h-8 text-amber-400" />
            Geplante Ankündigungen
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Nachricht vorschreiben, Zeitpunkt wählen - der Bot sendet sie pünktlich. Auch täglich oder wöchentlich wiederholbar.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setForm(emptyForm());
              setShowForm(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Neue Ankündigung
          </button>
        </div>
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

      {showForm && (
        <div className="bg-discord-card border border-discord-blurple/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{form.id ? "Ankündigung bearbeiten" : "Neue Ankündigung"}</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Kanal</label>
              <select value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })} className={input}>
                <option value="">— Kanal wählen —</option>
                {data?.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Zeitpunkt</label>
              <input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} className={input} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Wiederholen</label>
              <select value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value as any })} className={input}>
                <option value="none">Einmalig</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Text</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} maxLength={2000} className={input} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.useEmbed} onChange={(e) => setForm({ ...form, useEmbed: e.target.checked })} className="w-4 h-4 accent-discord-blurple" />
            Zusätzlich als Embed (Box mit Titel, Farbe und Bild)
          </label>
          {form.useEmbed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-discord-dark/40 border border-discord-border">
              <input placeholder="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={256} className={input} />
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 rounded-lg bg-discord-dark border border-discord-border" />
                <input placeholder="Bild-URL (optional, https://…)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={input} />
              </div>
              <textarea
                placeholder="Beschreibung"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                maxLength={4000}
                className={`${input} md:col-span-2`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Erwähnung</label>
              <select value={form.ping} onChange={(e) => setForm({ ...form, ping: e.target.value })} className={input}>
                <option value="none">Niemanden pingen</option>
                <option value="everyone">@everyone</option>
                <option value="here">@here</option>
                {data?.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer md:mt-6">
              <input type="checkbox" checked={form.silent} onChange={(e) => setForm({ ...form, silent: e.target.checked })} className="w-4 h-4 accent-discord-blurple" />
              Lautlos senden (@silent, kein Benachrichtigungston)
            </label>
          </div>

          <button
            onClick={save}
            disabled={busy !== null || !form.channelId || (!form.content.trim() && !form.useEmbed)}
            className="px-5 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "save" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlarmClock className="w-4 h-4" />}
            {form.id ? "Änderungen speichern" : "Planen"}
          </button>
        </div>
      )}

      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Geplant ({list.length})</h2>
        {list.length === 0 && !loading && <p className="text-sm text-gray-500">Noch keine Ankündigungen geplant.</p>}
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className={`p-4 rounded-xl border ${a.failed ? "border-red-500/40 bg-red-500/5" : "border-discord-border bg-discord-dark/40"}`}>
              <div className="flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-discord-blurple/15 text-indigo-300 border border-discord-blurple/30">#{channelName(a.channelId)}</span>
                    {a.failed ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Senden fehlgeschlagen: {a.lastError}
                      </span>
                    ) : (
                      <span className="text-gray-300">
                        {new Date(a.sendAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })} Uhr
                      </span>
                    )}
                    {a.repeat !== "none" && (
                      <span className="text-amber-300 flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> {REPEAT_LABEL[a.repeat]}
                      </span>
                    )}
                    {a.ping !== "none" && <span className="text-gray-400">· pingt {a.ping === "everyone" || a.ping === "here" ? `@${a.ping}` : `@${roleName(a.ping)}`}</span>}
                    {a.silent && <span className="text-gray-500">· lautlos</span>}
                    {a.sentCount > 0 && <span className="text-gray-500">· {a.sentCount}× gesendet</span>}
                  </div>
                  {a.embed?.title && <p className="text-sm font-semibold text-white truncate">{a.embed.title}</p>}
                  <p className="text-sm text-gray-300 line-clamp-2 whitespace-pre-line">{a.content || a.embed?.description}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => edit(a)} title="Bearbeiten" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-discord-card">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirm("Jetzt sofort senden? (Der Zeitplan bleibt bestehen.)") && call("announcements/send-now", { id: a.id }, "✅ Gesendet.", a.id)}
                    disabled={busy !== null}
                    title="Jetzt senden"
                    className="p-2 rounded-lg text-gray-400 hover:text-discord-green hover:bg-discord-green/10 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirm("Ankündigung löschen?") && call("announcements/delete", { id: a.id }, "🗑️ Gelöscht.", a.id)}
                    disabled={busy !== null}
                    title="Löschen"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
