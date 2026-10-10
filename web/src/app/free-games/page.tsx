"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, RefreshCw, Send, Repeat, ExternalLink, Clock, AlertCircle, Settings2, Info } from "lucide-react";

type Store = "epic" | "steam" | "gog" | "ubisoft" | "itch" | "prime" | "other";

interface FreeGame {
  key: string;
  store: Store;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  originalPrice?: string;
  startDate?: string;
  endDate?: string;
  upcoming?: boolean;
  keyGiveaway?: boolean;
  source: "epic" | "gamerpower";
}

interface Settings {
  epic: boolean;
  steam: boolean;
  gog: boolean;
  other: boolean;
  upcoming: boolean;
  keys: boolean;
  silent?: boolean;
}

const STORES: Record<Store, { name: string; className: string }> = {
  epic: { name: "Epic Games", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  steam: { name: "Steam", className: "bg-slate-400/15 text-slate-200 border-slate-400/30" },
  gog: { name: "GOG", className: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  ubisoft: { name: "Ubisoft", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  itch: { name: "itch.io", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  prime: { name: "Prime Gaming", className: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  other: { name: "PC", className: "bg-discord-blurple/15 text-indigo-300 border-discord-blurple/30" },
};

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "epic", label: "Epic Games Store", hint: "Die wöchentlichen Gratis-Spiele von Epic" },
  { key: "steam", label: "Steam", hint: "Kostenlose Vollversionen auf Steam" },
  { key: "gog", label: "GOG.com", hint: "Gratis-Aktionen auf GOG" },
  { key: "other", label: "Andere Stores", hint: "Ubisoft, itch.io, Prime Gaming & Co." },
  { key: "upcoming", label: "Epic-Vorschau", hint: "Kündigt „Nächste Woche gratis“ vorab an" },
  { key: "keys", label: "Key-Verlosungen", hint: "Alienware Arena, IndieGala & Co. - Konto dort nötig" },
  { key: "silent", label: "Lautloser Modus (@silent)", hint: "Benachrichtigungen ohne Ping-Ton / Sound absenden" },
];

function toDate(value?: string): Date | null {
  if (!value || value === "N/A") return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function relative(d: Date) {
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(diff) < 86_400_000) {
    const h = Math.max(1, Math.round(Math.abs(diff) / 3_600_000));
    return diff > 0 ? `in ${h} Std.` : `vor ${h} Std.`;
  }
  return diff > 0 ? `in ${days} Tagen` : `vor ${-days} Tagen`;
}

export default function FreeGamesPage() {
  const [games, setGames] = useState<FreeGame[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/free-games");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setGames(json.games || []);
      setSettings(json.settings);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Konnte Free-Games nicht laden."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(key: keyof Settings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    const res = await fetch("/api/bot/free-games/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    if (!res.ok) {
      setSettings(settings);
      setMessage({ text: "❌ Einstellung konnte nicht gespeichert werden.", type: "error" });
    }
  }

  async function post(repostAll: boolean) {
    if (repostAll && !confirm("Alle aktuellen Gratis-Spiele noch einmal posten? (Ohne Ping)")) return;
    setBusy(repostAll ? "repost" : "post");
    setMessage(null);
    try {
      const res = await fetch("/api/bot/free-games/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repostAll }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({
        text: json.count > 0 ? `✅ ${json.count} Spiel(e) in Discord gepostet!` : "ℹ️ Keine neuen Gratis-Spiele - alles Aktuelle wurde schon gepostet.",
        type: "success",
      });
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  const visible = settings
    ? games.filter((g) => {
        if (g.upcoming && !settings.upcoming) return false;
        if (g.keyGiveaway && !settings.keys) return false;
        if (g.upcoming) return true;
        if (g.store === "epic") return settings.epic;
        if (g.store === "steam") return settings.steam;
        if (g.store === "gog") return settings.gog;
        return settings.other;
      })
    : games;
  const hidden = games.length - visible.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Gift className="w-8 h-8 text-discord-green" />
            Free-Games
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Kostenlose PC-Spiele von Epic, Steam, GOG & mehr - der Bot prüft alle 30 Minuten und postet neue automatisch.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => post(false)}
            disabled={busy !== null}
            className="px-4 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "post" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Neue jetzt posten
          </button>
          <button
            onClick={() => post(true)}
            disabled={busy !== null}
            title="Alle aktuellen Spiele noch einmal posten (ohne Ping)"
            className="px-3 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "repost" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
            Alle erneut
          </button>
        </div>
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

      {/* Einstellungen */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Settings2 className="w-5 h-5 text-discord-blurple" />
          Welche Stores sollen gemeldet werden?
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Änderungen werden sofort gespeichert. Kanal und Ping-Rolle stellst du unter{" "}
          <Link href="/roles" className="text-discord-blurple hover:underline">Rollen & Rechte</Link> ein.
        </p>
        {settings ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOGGLES.map((t) => (
              <button
                key={t.key}
                onClick={() => toggle(t.key)}
                className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                  settings[t.key] ? "border-discord-green/40 bg-discord-green/5" : "border-discord-border bg-discord-dark hover:border-gray-600"
                }`}
              >
                <span
                  className={`mt-0.5 w-9 h-5 rounded-full relative shrink-0 transition-colors ${settings[t.key] ? "bg-discord-green" : "bg-gray-600"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings[t.key] ? "left-[18px]" : "left-0.5"}`}
                  />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t.label}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{t.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          !loading && <p className="text-sm text-gray-500">Einstellungen nicht verfügbar.</p>
        )}
      </div>

      {/* Aktuelle Spiele */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Gerade kostenlos {!loading && <span className="text-gray-500 font-normal">({visible.length})</span>}
          </h2>
          <button onClick={load} disabled={loading} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Aktualisieren
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-discord-card border border-discord-border rounded-2xl p-10 text-center text-gray-400 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-500" />
            Gerade keine kostenlosen Spiele in den gewählten Stores.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((g) => {
              const store = STORES[g.store] || STORES.other;
              const end = toDate(g.endDate);
              const start = toDate(g.startDate);
              return (
                <a
                  key={g.key}
                  href={g.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group bg-discord-card border border-discord-border rounded-2xl overflow-hidden flex flex-col hover:border-discord-blurple transition-all ${
                    g.upcoming ? "opacity-75" : ""
                  }`}
                >
                  <div className="aspect-video bg-discord-dark overflow-hidden">
                    {g.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${store.className}`}>{store.name}</span>
                      {g.keyGiveaway && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-300">
                          Verlosung
                        </span>
                      )}
                      {g.upcoming && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
                          Bald gratis
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white leading-snug flex items-start gap-1.5">
                      {g.title}
                      <ExternalLink className="w-3.5 h-3.5 mt-1 text-gray-500 shrink-0 opacity-0 group-hover:opacity-100" />
                    </h3>
                    <div className="mt-auto pt-2 flex items-center justify-between text-xs">
                      <span>
                        {g.originalPrice && <span className="line-through text-gray-500 mr-1.5">{g.originalPrice}</span>}
                        <span className="text-discord-green font-bold">Kostenlos</span>
                      </span>
                      {g.upcoming && start ? (
                        <span className="text-gray-400 flex items-center gap-1" title={start.toLocaleString("de-DE")}>
                          <Clock className="w-3 h-3" /> ab {relative(start)}
                        </span>
                      ) : end ? (
                        <span className="text-gray-400 flex items-center gap-1" title={end.toLocaleString("de-DE")}>
                          <Clock className="w-3 h-3" /> endet {relative(end)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
        {hidden > 0 && !loading && (
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> {hidden} weitere Spiele sind ausgeblendet, weil der Store oben ausgeschaltet ist.
          </p>
        )}
        <p className="text-[11px] text-gray-600 mt-4">
          Steam-, GOG- und weitere Angebote: Daten von{" "}
          <a href="https://www.gamerpower.com" target="_blank" rel="noreferrer" className="underline hover:text-gray-400">
            GamerPower
          </a>
          .
        </p>
      </div>
    </div>
  );
}
