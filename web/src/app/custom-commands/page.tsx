"use client";

import { useEffect, useState } from "react";
import { Zap, RefreshCw, Plus, Trash2, Pencil, X, Save } from "lucide-react";

interface CustomCommand {
  id: string;
  name: string;
  description: string;
  content: string;
  embed?: { title?: string; description?: string; color?: string; imageUrl?: string };
  ephemeral: boolean;
  textTrigger: boolean;
  uses: number;
}

const emptyForm = () => ({
  id: "",
  name: "",
  description: "",
  content: "",
  useEmbed: false,
  title: "",
  embedDescription: "",
  color: "#5865f2",
  imageUrl: "",
  ephemeral: false,
  textTrigger: true,
});

export default function CustomCommandsPage() {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [max, setMax] = useState(25);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/custom-commands");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCommands(json.commands || []);
      setMax(json.max || 25);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(c: CustomCommand) {
    setForm({
      id: c.id,
      name: c.name,
      description: c.description,
      content: c.content,
      useEmbed: !!c.embed,
      title: c.embed?.title || "",
      embedDescription: c.embed?.description || "",
      color: c.embed?.color || "#5865f2",
      imageUrl: c.embed?.imageUrl || "",
      ephemeral: c.ephemeral,
      textTrigger: c.textTrigger,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/bot/custom-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          name: form.name,
          description: form.description,
          content: form.content,
          embed: form.useEmbed ? { title: form.title, description: form.embedDescription, color: form.color, imageUrl: form.imageUrl } : undefined,
          ephemeral: form.ephemeral,
          textTrigger: form.textTrigger,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({ text: json.warning ? `⚠️ ${json.warning}` : `✅ /${json.item.name} gespeichert - im Discord sofort nutzbar.`, type: json.warning ? "error" : "success" });
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: CustomCommand) {
    if (!confirm(`/${c.name} löschen?`)) return;
    setBusy(c.id);
    try {
      const res = await fetch("/api/bot/custom-commands/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ text: `🗑️ /${c.name} gelöscht.`, type: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  const input = "w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-300" />
            Eigene Befehle
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Eigene Slash-Befehle wie <code className="text-indigo-300">/ts</code> oder <code className="text-indigo-300">/lan</code> mit Text- oder
            Embed-Antwort. Sie erscheinen sofort im Discord und funktionieren optional auch als <code className="text-indigo-300">!befehl</code>.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm());
            setShowForm(true);
          }}
          disabled={commands.length >= max}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Neuer Befehl
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

      {showForm && (
        <div className="bg-discord-card border border-discord-blurple/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{form.id ? `/${form.name} bearbeiten` : "Neuer Befehl"}</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Name</label>
              <div className="flex items-center">
                <span className="px-3 py-2 rounded-l-lg bg-discord-dark border border-r-0 border-discord-border text-gray-400 text-sm">/</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) })}
                  placeholder="ts"
                  className={`${input} rounded-l-none`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Beschreibung (im Discord sichtbar)</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={100} placeholder="Zeigt die TeamSpeak-Adresse" className={input} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Antwort-Text</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} maxLength={2000} className={input} />
            <p className="text-[11px] text-gray-500">
              Platzhalter: <code className="text-indigo-300">{"{user}"}</code> Erwähnung, <code className="text-indigo-300">{"{name}"}</code> Name,{" "}
              <code className="text-indigo-300">{"{server}"}</code> Servername.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.useEmbed} onChange={(e) => setForm({ ...form, useEmbed: e.target.checked })} className="w-4 h-4 accent-discord-blurple" />
            Zusätzlich als Embed antworten
          </label>
          {form.useEmbed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-discord-dark/40 border border-discord-border">
              <input placeholder="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={256} className={input} />
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 rounded-lg bg-discord-dark border border-discord-border" />
                <input placeholder="Bild-URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={input} />
              </div>
              <textarea
                placeholder="Beschreibung"
                value={form.embedDescription}
                onChange={(e) => setForm({ ...form, embedDescription: e.target.value })}
                rows={4}
                maxLength={4000}
                className={`${input} md:col-span-2`}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.textTrigger} onChange={(e) => setForm({ ...form, textTrigger: e.target.checked })} className="w-4 h-4 accent-discord-blurple" />
              Auch als <code className="text-indigo-300">!{form.name || "befehl"}</code> im Chat
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.ephemeral} onChange={(e) => setForm({ ...form, ephemeral: e.target.checked })} className="w-4 h-4 accent-discord-blurple" />
              Antwort nur für den Nutzer sichtbar (bei /befehl)
            </label>
          </div>
          <button
            onClick={save}
            disabled={busy !== null || !form.name || (!form.content.trim() && !form.useEmbed)}
            className="px-5 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "save" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      )}

      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">
          Befehle ({commands.length} / {max})
        </h2>
        {loading && commands.length === 0 && (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Lade …
          </div>
        )}
        {!loading && commands.length === 0 && <p className="text-sm text-gray-500">Noch keine eigenen Befehle.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commands.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-discord-border bg-discord-dark/40 flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-white">
                  /{c.name}
                  {c.textTrigger && <span className="text-gray-500"> · !{c.name}</span>}
                </p>
                <p className="text-xs text-gray-400 truncate">{c.description}</p>
                <p className="text-xs text-gray-300 mt-1 line-clamp-2">{c.content || c.embed?.title || c.embed?.description}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {c.uses}× benutzt{c.ephemeral ? " · nur für den Nutzer sichtbar" : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => edit(c)} title="Bearbeiten" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-discord-card">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={busy !== null}
                  title="Löschen"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
