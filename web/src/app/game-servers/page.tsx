"use client";

import { useEffect, useState } from "react";
import { MonitorPlay, RefreshCw, Plus, Trash2, Pencil, X, Save, Copy, Check } from "lucide-react";

type ServerType = "minecraft" | "source" | "tcp";

interface Status {
  online: boolean;
  players?: number;
  maxPlayers?: number;
  version?: string;
  motd?: string;
  map?: string;
  latency?: number;
  checkedAt: number;
  error?: string;
}

interface GameServer {
  id: string;
  name: string;
  type: ServerType;
  host: string;
  port: number;
  displayAddress?: string;
  hideAddress?: boolean;
  status: Status | null;
}

const TYPES: Record<ServerType, { label: string; hint: string }> = {
  minecraft: { label: "Minecraft (Java)", hint: "Spieler, Version und MOTD" },
  source: { label: "Source / Steam", hint: "CS2, CS:GO, Rust, ARK, Garry's Mod, TF2, Valheim … (Query-Port)" },
  tcp: { label: "Port-Check", hint: "Nur online/offline - z. B. TeamSpeak (10011 oder 30033) oder eine Webseite" },
};

const emptyForm = (port = 25565) => ({
  id: "",
  name: "",
  type: "minecraft" as ServerType,
  host: "",
  port: String(port),
  displayAddress: "",
  hideAddress: false,
});

export default function GameServersPage() {
  const [servers, setServers] = useState<GameServer[]>([]);
  const [max, setMax] = useState(10);
  const [ports, setPorts] = useState<Record<ServerType, number>>({ minecraft: 25565, source: 27015, tcp: 10011 });
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load(refresh = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/bot/game-servers${refresh ? "?refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setServers(json.servers || []);
      setMax(json.max || 10);
      if (json.defaultPorts) setPorts(json.defaultPorts);
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Laden fehlgeschlagen."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
  }, []);

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/bot/game-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: form.id || undefined, port: Number(form.port) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({
        text: json.status?.online ? `✅ ${json.item.name} gespeichert - der Server ist online.` : `⚠️ ${json.item.name} gespeichert, aber gerade nicht erreichbar (${json.status?.error || "offline"}).`,
        type: json.status?.online ? "success" : "error",
      });
      setShowForm(false);
      setForm(emptyForm(ports.minecraft));
      await load();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: GameServer) {
    if (!confirm(`${s.name} entfernen?`)) return;
    setBusy(s.id);
    await fetch("/api/bot/game-servers/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) }).catch(() => null);
    setBusy(null);
    await load();
  }

  function copy(text: string, id: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const input = "w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple";
  const online = servers.filter((s) => s.status?.online).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-emerald-400" />
            Game-Server
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Live-Status eurer Server - Prüfung alle 2 Minuten. Im Discord mit <code className="text-indigo-300">/serverstatus</code>, als
            Zähler unter „Statistik-Kanäle“.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="px-3 py-2.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Jetzt prüfen
          </button>
          <button
            onClick={() => {
              setForm(emptyForm(ports.minecraft));
              setShowForm(true);
            }}
            disabled={servers.length >= max}
            className="px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Server
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            message.type === "success" ? "bg-discord-green/10 border-discord-green/30 text-discord-green" : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-discord-card border border-discord-blurple/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{form.id ? "Server bearbeiten" : "Server hinzufügen"}</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(TYPES) as ServerType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t, port: form.port && form.port !== String(ports[form.type]) ? form.port : String(ports[t]) })}
                className={`p-3 rounded-xl border text-left transition-all ${form.type === t ? "border-discord-blurple bg-discord-blurple/10" : "border-discord-border bg-discord-dark/40 hover:border-gray-500"}`}
              >
                <p className="text-sm font-semibold text-white">{TYPES[t].label}</p>
                <p className="text-[11px] text-gray-400">{TYPES[t].hint}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Name (z. B. Survival)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} className={`${input} md:col-span-1`} />
            <input placeholder="Adresse (IP oder Domain)" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value.trim() })} className={`${input} md:col-span-2`} />
            <input placeholder="Port" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value.replace(/\D/g, "").slice(0, 5) })} className={input} />
            <input
              placeholder="Adresse für Spieler (optional, z. B. mc.meinserver.de)"
              value={form.displayAddress}
              onChange={(e) => setForm({ ...form, displayAddress: e.target.value })}
              className={`${input} md:col-span-4`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.hideAddress}
                onChange={(e) => setForm({ ...form, hideAddress: e.target.checked })}
                className="rounded border-discord-border text-discord-blurple focus:ring-0"
              />
              <span>🔒 <strong>Adresse verbergen</strong> (IP & Port in Discord <code>/serverstatus</code> und im Dashboard nicht öffentlich anzeigen)</span>
            </label>
          </div>
          <button
            onClick={save}
            disabled={busy !== null || !form.name || !form.host}
            className="px-5 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "save" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern & prüfen
          </button>
        </div>
      )}

      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">
          {servers.length > 0 ? `${online} von ${servers.length} online` : "Noch keine Server eingetragen"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {servers.map((s) => {
            const st = s.status;
            const address = s.hideAddress ? "🔒 Adresse verborgen" : (s.displayAddress || `${s.host}:${s.port}`);
            return (
              <div key={s.id} className={`p-4 rounded-xl border ${st?.online ? "border-discord-green/30 bg-discord-green/5" : "border-discord-border bg-discord-dark/40"}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${st?.online ? "bg-discord-green animate-pulse" : st ? "bg-red-500" : "bg-gray-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{s.name}</p>
                      {s.hideAddress && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">IP verborgen</span>}
                    </div>
                    <p className="text-[11px] text-gray-500">{TYPES[s.type]?.label ?? s.type}</p>
                    {st?.online ? (
                      <div className="text-xs text-gray-300 mt-1 space-y-0.5">
                        {st.maxPlayers ? <p>👥 {st.players}/{st.maxPlayers} Spieler</p> : null}
                        {st.map && <p>🗺️ {st.map}</p>}
                        {st.version && <p className="truncate">🏷️ {st.version}</p>}
                        {st.motd && <p className="truncate text-gray-400">{st.motd}</p>}
                        {st.latency != null && <p className="text-gray-500">{st.latency} ms</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-red-300 mt-1">{st ? `Offline${st.error ? ` – ${st.error}` : ""}` : "Noch nicht geprüft"}</p>
                    )}
                    {!s.hideAddress ? (
                      <button
                        onClick={() => copy(address, s.id)}
                        className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-discord-dark border border-discord-border text-[11px] font-mono text-gray-300 hover:text-white"
                      >
                        {copied === s.id ? <Check className="w-3 h-3 text-discord-green" /> : <Copy className="w-3 h-3" />}
                        {address}
                      </button>
                    ) : (
                      <span className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-discord-dark/50 border border-discord-border/50 text-[11px] text-gray-500">
                        🔒 IP/Port wird nicht angezeigt
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setForm({
                          id: s.id,
                          name: s.name,
                          type: s.type,
                          host: s.host,
                          port: String(s.port),
                          displayAddress: s.displayAddress || "",
                          hideAddress: Boolean(s.hideAddress),
                        });
                        setShowForm(true);
                      }}
                      title="Bearbeiten"
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-discord-card"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(s)} disabled={busy !== null} title="Entfernen" className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
