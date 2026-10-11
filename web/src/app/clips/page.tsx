"use client";

import { useEffect, useState } from "react";
import { Clapperboard, RefreshCw, Save, Trophy, ExternalLink, Flame } from "lucide-react";

interface Person {
  name: string;
  avatar: string | null;
}
interface RankEntry {
  messageId: string;
  authorId: string;
  url?: string;
  createdAt: number;
  votes: number;
  laughs: number;
  author?: Person;
  jumpUrl: string | null;
}
interface HistoryEntry {
  date: string;
  authorId: string;
  messageId: string;
  votes: number;
  url?: string;
  author?: Person;
}
interface ClipsData {
  config: { channelId: string | null; weekday: number; hour: number };
  lastAward: string | null;
  ranking: RankEntry[];
  history: HistoryEntry[];
  channels: { id: string; name: string }[];
}

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function ClipsPage() {
  const [data, setData] = useState<ClipsData | null>(null);
  const [form, setForm] = useState({ channelId: "", weekday: 0, hour: 20 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/clips");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setForm({ channelId: json.config.channelId || "", weekday: json.config.weekday, hour: json.config.hour });
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function post(path: string, body: unknown, key: string, ok: string) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(`/api/bot/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({ text: ok, type: "success" });
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
            <Clapperboard className="w-8 h-8 text-orange-300" />
            Clip der Woche
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Clips im Clip-Kanal (Twitch, YouTube, Medal, Streamable, Kick, Videodateien) bekommen automatisch 🔥 und 😂. Einmal pro Woche
            gewinnt der Clip mit den meisten 🔥 - er wird angepinnt und angekündigt.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Aktualisieren
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

      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Einstellungen</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs text-gray-400 space-y-1">
            <span>Clip-Kanal</span>
            <select value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })} className={input}>
              <option value="">- aus -</option>
              {(data?.channels || []).map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-400 space-y-1">
            <span>Kür am</span>
            <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })} className={input}>
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-400 space-y-1">
            <span>Uhrzeit</span>
            <select value={form.hour} onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })} className={input}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00 Uhr
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => post("clips/config", { channelId: form.channelId || null, weekday: form.weekday, hour: form.hour }, "save", "✅ Gespeichert.")}
            disabled={busy !== null}
            className="px-5 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "save" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
          </button>
          <button
            onClick={() => {
              if (confirm("Den Clip der Woche jetzt küren? Der Gewinner wird angepinnt und im Clip-Kanal angekündigt.")) {
                post("clips/award", {}, "award", "🏆 Clip der Woche wurde gekürt.");
              }
            }}
            disabled={busy !== null || !data?.config.channelId}
            className="px-4 py-2.5 rounded-xl bg-discord-card border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "award" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} Jetzt küren
          </button>
        </div>
        {data?.lastAward && <p className="text-[11px] text-gray-500">Letzte Kür: {new Date(data.lastAward).toLocaleDateString("de-DE")}</p>}
      </div>

      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" /> Aktuelles Ranking (letzte 7 Tage)
        </h2>
        {!data?.config.channelId ? (
          <p className="text-sm text-gray-400">Wähle oben einen Clip-Kanal aus.</p>
        ) : (data?.ranking.length || 0) === 0 ? (
          <p className="text-sm text-gray-400">Diese Woche wurden noch keine Clips gepostet.</p>
        ) : (
          <div className="space-y-2">
            {data!.ranking.map((r, i) => (
              <div key={r.messageId} className="flex items-center gap-3 p-3 rounded-xl border border-discord-border bg-discord-dark/40">
                <span className="w-8 text-center text-lg font-bold text-gray-300">{MEDALS[i] || `${i + 1}.`}</span>
                {r.author?.avatar ? <img src={r.author.avatar} alt="" className="w-9 h-9 rounded-full" /> : <span className="w-9 h-9 rounded-full bg-discord-dark" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.author?.name || "Unbekannt"}</p>
                  <p className="text-[11px] text-gray-500 truncate">{r.url || "Videodatei"} · {new Date(r.createdAt).toLocaleDateString("de-DE")}</p>
                </div>
                <span className="text-sm text-orange-300 font-bold shrink-0">{r.votes} 🔥</span>
                <span className="text-sm text-yellow-300 shrink-0">{r.laughs} 😂</span>
                {r.jumpUrl && (
                  <a href={r.jumpUrl} target="_blank" rel="noreferrer" title="In Discord öffnen" className="p-2 rounded-lg text-gray-400 hover:text-white shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(data?.history.length || 0) > 0 && (
        <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Bisherige Gewinner
          </h2>
          <ul className="space-y-2">
            {data!.history.map((h) => (
              <li key={h.date + h.messageId} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-gray-500 w-24 shrink-0">{new Date(h.date).toLocaleDateString("de-DE")}</span>
                <span className="font-semibold text-white truncate">{h.author?.name || "Unbekannt"}</span>
                <span className="text-orange-300 shrink-0">{h.votes} 🔥</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
