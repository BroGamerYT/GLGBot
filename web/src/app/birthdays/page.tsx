"use client";

import { useEffect, useState } from "react";
import { Cake, RefreshCw, Save, Send } from "lucide-react";

interface BirthdayData {
  config: { channelId: string | null; roleId: string | null; message: string; defaultMessage: string };
  total: number;
  upcoming: { userId: string; day: number; month: number; date: string; daysUntil: number; name: string; avatar: string | null }[];
  channels: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

export default function BirthdaysPage() {
  const [data, setData] = useState<BirthdayData | null>(null);
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/birthdays");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setChannelId(json.config.channelId || "");
      setRoleId(json.config.roleId || "");
      setMsg(json.config.message || "");
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function post(path: string, body: any, okText: string, key: string) {
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
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  const input = "w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Cake className="w-8 h-8 text-pink-400" />
          Geburtstage
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Mitglieder tragen ihren Geburtstag mit <code className="text-indigo-300">/birthday set</code> ein (nur Tag & Monat). Am
          Geburtstag gratuliert der Bot ab 00:01 Uhr und vergibt auf Wunsch für 24 Stunden eine Geburtstags-Rolle.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Einstellungen</h2>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Kanal für Glückwünsche</label>
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className={input}>
              <option value="">— kein Kanal (keine Glückwünsche) —</option>
              {data?.channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Geburtstags-Rolle (24 Std.)</label>
            <div className="flex gap-2">
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={input}>
                <option value="">— keine Rolle —</option>
                {data?.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => post("birthdays/config", { createRole: true }, "✅ Geburtstags-Rolle angelegt.", "role")}
                disabled={busy !== null}
                className="px-3 py-2 rounded-lg bg-discord-dark border border-discord-border hover:border-discord-blurple text-xs text-gray-200 whitespace-nowrap disabled:opacity-50"
              >
                Neu anlegen
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Glückwunsch-Text</label>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} maxLength={1000} className={input} />
            <p className="text-[11px] text-gray-500">
              Platzhalter: <code className="text-indigo-300">{"{user}"}</code> Erwähnung, <code className="text-indigo-300">{"{name}"}</code> Name,{" "}
              <code className="text-indigo-300">{"{server}"}</code> Servername.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => post("birthdays/config", { channelId, roleId, message: msg }, "✅ Einstellungen gespeichert.", "save")}
              disabled={busy !== null || loading}
              className="px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {busy === "save" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
            <button
              onClick={() => post("birthdays/test", {}, "✅ Test-Glückwunsch gesendet.", "test")}
              disabled={busy !== null || !data?.config.channelId}
              title={data?.config.channelId ? "Test-Nachricht in den Kanal senden" : "Zuerst Kanal speichern"}
              className="px-4 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Test senden
            </button>
          </div>
        </div>

        <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-1">Nächste Geburtstage</h2>
          <p className="text-xs text-gray-400 mb-4">{data ? `${data.total} Mitglied(er) haben ihren Geburtstag eingetragen.` : "Lade …"}</p>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {data?.upcoming.length === 0 && <p className="text-sm text-gray-500">Noch keine Einträge.</p>}
            {data?.upcoming.map((u) => (
              <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-discord-dark/40 border border-discord-border">
                <img src={u.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="w-8 h-8 rounded-full" />
                <span className="flex-1 text-sm text-white truncate">{u.name}</span>
                <span className="text-xs text-gray-300">{u.date}</span>
                <span className={`text-[11px] w-20 text-right ${u.daysUntil === 0 ? "text-pink-400 font-bold" : "text-gray-500"}`}>
                  {u.daysUntil === 0 ? "🎉 heute" : `in ${u.daysUntil} T.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
