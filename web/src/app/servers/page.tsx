"use client";

import { useEffect, useState } from "react";
import { Server, RefreshCw, Plus, Trash2, ExternalLink, Crown, Lock, CheckCircle2, Clock, Copy, Check, Link as LinkIcon } from "lucide-react";
import { slugify } from "@/lib/serverSlugs";

interface Entry {
  id: string;
  name: string | null;
  icon: string | null;
  main: boolean;
  fromEnv: boolean;
  joined: boolean;
  memberCount: number | null;
  inviteUrl: string | null;
  addedBy?: string;
  addedAt?: number;
}

interface AccessData {
  isOwner: boolean;
  max?: number;
  entries?: Entry[];
  removed?: { id: string; name?: string; removedAt: number; purgeNow?: boolean }[];
  purged?: { id: string; name?: string; purgedAt: number; entries: number }[];
  purgeAfterDays?: number;
}

export default function ServersPage() {
  const [data, setData] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyLink(num: number) {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const url = `${origin}/bot${num}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedIndex(num);
        setTimeout(() => setCopiedIndex(null), 2000);
      })
      .catch(() => null);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/guild-access");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Konnte die Server-Liste nicht laden."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    const id = newId.trim();
    if (!/^\d{15,25}$/.test(id)) {
      setMessage({ text: "❌ Bitte eine gültige Server-ID eingeben (nur Ziffern, Rechtsklick auf den Server → „Server-ID kopieren“).", type: "error" });
      return;
    }
    setBusy("add");
    setMessage(null);
    try {
      const res = await fetch("/api/bot/guild-access/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId: id, name: newName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNewId("");
      setNewName("");
      setMessage({ text: "✅ Server freigegeben. Lade den Bot jetzt über „Bot einladen“ ein.", type: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(entry: Entry) {
    const label = entry.name || entry.id;
    if (!confirm(`Freigabe für „${label}“ entfernen?\n\nDer Bot verlässt den Server sofort. Die Daten des Servers bleiben gespeichert.`)) return;
    setBusy(entry.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/guild-access/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId: entry.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({ text: `✅ Freigabe entfernt${json.left ? " - der Bot hat den Server verlassen." : "."}`, type: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  const entries = data?.entries || [];
  const max = data?.max || 5;
  const full = entries.length >= max;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-indigo-300" />
            Server-Freigabe
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Der Bot bleibt nur auf freigegebenen Servern - maximal {max}. Wird er woanders eingeladen, schreibt er dem
            Owner eine kurze Nachricht und verlässt den Server sofort.
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

      {!loading && data && !data.isOwner && (
        <div className="p-6 rounded-2xl border border-discord-border bg-discord-card text-gray-300 text-sm flex gap-3">
          <Lock className="w-5 h-5 text-gray-400 shrink-0" />
          Die Server-Freigabe kann nur der Bot-Besitzer verwalten.
        </div>
      )}

      {data?.isOwner && (
        <>
          {/* Info-Box zu automatischen Direkt-URLs */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-discord-blurple/10 via-discord-card to-discord-card border border-discord-blurple/20 text-xs flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-discord-blurple shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">
                🌐 Automatische Direkt-URLs für alle Server
              </p>
              <p className="text-gray-400 mt-0.5 leading-relaxed">
                Jeder freigegebene Server hat automatisch eigene Kurz-URLs: z. B. <code className="text-indigo-300 font-mono">/bot1</code>, <code className="text-indigo-300 font-mono">/bot2</code> oder über den Servernamen wie <code className="text-emerald-300 font-mono">/s/mein-server</code>. Wenn Nutzer oder Gäste diesen Link öffnen, wird der Server sofort ausgewählt und sie landen direkt auf der gewünschten Seite!
              </p>
            </div>
          </div>

          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Freigegebene Server</h2>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  full ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-discord-green/10 text-discord-green border-discord-green/30"
                }`}
              >
                {entries.length} / {max} belegt
              </span>
            </div>
            <div className="space-y-2">
              {entries.map((e, index) => (
                <div key={e.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-discord-border bg-discord-dark/40">
                  {e.icon ? (
                    <img src={e.icon} alt="" className="w-10 h-10 rounded-xl shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-xl bg-discord-dark flex items-center justify-center shrink-0">
                      <Server className="w-5 h-5 text-gray-500" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate flex items-center gap-2">
                      {e.name || "Unbekannter Server"}
                      {e.main && (
                        <span className="text-[10px] text-amber-300 flex items-center gap-0.5">
                          <Crown className="w-3 h-3" /> Haupt-Server
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono truncate">
                      {e.id}
                      {e.memberCount != null && <span className="font-sans"> · {e.memberCount} Mitglieder</span>}
                      {e.fromEnv && !e.main && <span className="font-sans"> · aus .env</span>}
                    </p>

                    {/* Automatische Direkt-URLs */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-discord-blurple/20 text-indigo-300 border border-discord-blurple/30">
                        /bot{index + 1}
                      </span>
                      {e.name && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 truncate max-w-[200px]">
                          /s/{slugify(e.name)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyLink(index + 1)}
                        className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-discord-card border border-transparent hover:border-discord-border transition-all"
                        title="Direkt-URL /bot1 kopieren"
                      >
                        {copiedIndex === index + 1 ? (
                          <>
                            <Check className="w-3 h-3 text-discord-green" />
                            <span className="text-discord-green text-[10px] font-semibold">Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Link kopieren</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {e.joined ? (
                    <span className="text-xs text-discord-green flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Bot aktiv
                    </span>
                  ) : (
                    e.inviteUrl && (
                      <a
                        href={e.inviteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Bot einladen
                      </a>
                    )
                  )}
                  {!e.main && !e.fromEnv && (
                    <button
                      onClick={() => remove(e)}
                      disabled={busy !== null}
                      title="Freigabe entfernen"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 shrink-0"
                    >
                      {busy === e.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Server freigeben</h2>
            <p className="text-xs text-gray-400 mb-4">
              Server-ID im Discord kopieren (Entwicklermodus an → Rechtsklick auf den Server → „Server-ID kopieren“). Danach
              erscheint hier der Link „Bot einladen“.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newId}
                onChange={(e) => setNewId(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Server-ID"
                disabled={full}
                className="flex-1 px-3 py-2.5 rounded-xl bg-discord-dark border border-discord-border text-white text-sm font-mono focus:border-discord-blurple outline-none disabled:opacity-50"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (optional)"
                disabled={full}
                className="flex-1 px-3 py-2.5 rounded-xl bg-discord-dark border border-discord-border text-white text-sm focus:border-discord-blurple outline-none disabled:opacity-50"
              />
              <button
                onClick={add}
                disabled={busy !== null || full || !newId}
                className="px-4 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === "add" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Freigeben
              </button>
            </div>
            {full && <p className="text-xs text-amber-300 mt-2">Das Maximum von {max} Servern ist erreicht.</p>}
          </div>

          {(data.removed?.length || 0) > 0 && (
            <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Entfernte Server (Daten noch gespeichert)
              </h2>
              <p className="text-[11px] text-gray-500 mb-3">
                Die Daten (Level, Einstellungen, Fälle …) werden {data.purgeAfterDays || 30} Tage nach dem Entfernen beim nächsten Bot-Neustart
                automatisch gelöscht. Wird der Server vorher wieder freigegeben, bleibt alles erhalten.
              </p>
              <ul className="space-y-2">
                {data.removed!.map((r) => (
                  <li key={r.id} className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>
                      {r.name || r.id} <span className="font-mono text-gray-600">({r.id})</span> · entfernt am{" "}
                      {new Date(r.removedAt).toLocaleDateString("de-DE")}
                    </span>
                    {r.purgeNow ? (
                      <span className="text-amber-300">wird beim nächsten Neustart gelöscht</span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm(`Alle Daten von „${r.name || r.id}“ endgültig löschen?\n\nDas passiert beim nächsten Neustart des Bots und kann nicht rückgängig gemacht werden.`)) return;
                          setBusy(r.id);
                          const res = await fetch("/api/bot/guild-access/purge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ guildId: r.id }),
                          }).catch(() => null);
                          setBusy(null);
                          setMessage(res?.ok ? { text: "🗑️ Wird beim nächsten Neustart des Bots gelöscht.", type: "success" } : { text: "❌ Fehlgeschlagen.", type: "error" });
                          load();
                        }}
                        disabled={busy !== null}
                        className="px-2 py-1 rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Daten jetzt löschen
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
