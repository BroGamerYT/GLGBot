"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Newspaper, Plus, Trash2, Send, RefreshCw, Search, Gamepad2, Cpu, MonitorSmartphone, Link2, CheckCircle2, FlaskConical, Pickaxe,
  X, ExternalLink, Sparkles, Hash, AtSign, History, Minus, Play, Pause,
} from "lucide-react";

interface HistoryEntry { at: string; action: "added" | "removed" | "enabled" | "disabled"; name: string; type: SourceType; channelId: string; by?: string }
interface PreviewItem { title: string; url: string; date?: number; text?: string; isPatchnotes?: boolean; isSnapshot?: boolean }
interface Detail { type: SourceType; appId?: string; name: string; image?: string; description?: string; beta?: boolean }

type SourceType = "steam" | "minecraft" | "nvidia" | "amd-gpu" | "amd-chipset" | "intel-gpu";

interface Feed {
  id: string;
  type: SourceType;
  appId?: string;
  name: string;
  channelId: string;
  roleId?: string;
  enabled: boolean;
  onlyPatchnotes?: boolean;
  snapshots?: boolean;
}

interface CatalogEntry {
  key: string;
  type: SourceType;
  appId?: string;
  name: string;
  category: "game" | "gpu" | "cpu";
  description?: string;
  beta?: boolean;
  image?: string;
}

const TYPE_BADGE: Record<SourceType, { label: string; className: string }> = {
  steam: { label: "Steam", className: "bg-slate-400/15 text-slate-200 border-slate-400/30" },
  minecraft: { label: "Minecraft", className: "bg-green-500/15 text-green-300 border-green-500/30" },
  nvidia: { label: "NVIDIA", className: "bg-lime-500/15 text-lime-300 border-lime-500/30" },
  "amd-gpu": { label: "AMD", className: "bg-red-500/15 text-red-300 border-red-500/30" },
  "amd-chipset": { label: "AMD", className: "bg-red-500/15 text-red-300 border-red-500/30" },
  "intel-gpu": { label: "Intel", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
};

const select =
  "bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all";

function steamImg(appId?: string) {
  return appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` : undefined;
}

function SourceIcon({ type, className = "w-6 h-6" }: { type: SourceType; className?: string }) {
  if (type === "minecraft") return <Pickaxe className={`${className} text-green-400`} />;
  if (type === "amd-chipset") return <Cpu className={`${className} text-red-400`} />;
  if (type === "steam") return <Gamepad2 className={`${className} text-slate-300`} />;
  return <MonitorSmartphone className={`${className} ${type === "nvidia" ? "text-lime-400" : type === "intel-gpu" ? "text-sky-400" : "text-red-400"}`} />;
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white">
      <span className={`w-8 h-[18px] rounded-full relative transition-colors ${on ? "bg-discord-green" : "bg-gray-600"}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${on ? "left-[16px]" : "left-[2px]"}`} />
      </span>
      {label}
    </button>
  );
}

export default function NewsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Hinzufügen
  const [tab, setTab] = useState<"game" | "gpu" | "cpu" | "custom">("game");
  const [addChannel, setAddChannel] = useState("");
  const [addRole, setAddRole] = useState("");
  const [steamInput, setSteamInput] = useState("");
  const [steamResult, setSteamResult] = useState<{ appId: string; name: string; image: string } | null>(null);
  const [includes, setIncludes] = useState<Record<string, string[]>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [setup, setSetup] = useState<{ roleId: string | null; channelId: string | null; driverRoleId: string | null; driverChannelId: string | null }>({
    roleId: null,
    channelId: null,
    driverRoleId: null,
    driverChannelId: null,
  });

  // Detailansicht
  const [detail, setDetail] = useState<Detail | null>(null);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [optPatchnotes, setOptPatchnotes] = useState(false);
  const [optSnapshots, setOptSnapshots] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u && !u.error && u.id) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  async function load() {
    try {
      const nRes = await fetch("/api/bot/news");
      const n = await nRes.json();
      if (!nRes.ok) throw new Error(n.error);
      setFeeds(n.feeds || []);
      setCatalog(n.catalog || []);
      setIncludes(n.includes || {});
      setHistory(n.history || []);
      if (n.setup) {
        setSetup(n.setup);
        if (n.setup.channelId) setAddChannel((c) => c || n.setup.channelId);
        if (n.setup.roleId) setAddRole((r) => r || n.setup.roleId);
      }
      try {
        const gRes = await fetch("/api/discord/guild");
        if (gRes.ok) {
          setGuild(await gRes.json());
        }
      } catch {}
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Konnte Game-News nicht laden."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const textChannels: any[] = guild?.textChannels || [];
  const roles: any[] = guild?.roles || [];
  const channelName = (id: string) => textChannels.find((c) => c.id === id)?.name;

  const activeKeys = useMemo(() => {
    const set = new Set<string>();
    for (const f of feeds) if (f.channelId === addChannel) set.add(f.type === "steam" ? `steam:${f.appId}` : f.type);
    return set;
  }, [feeds, addChannel]);

  async function api(path: string, body: unknown) {
    const res = await fetch(`/api/bot/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unbekannter Fehler");
    return json;
  }

  async function refreshHistory() {
    try {
      const n = await fetch("/api/bot/news").then((r) => r.json());
      if (n.history) setHistory(n.history);
    } catch {
      /* egal */
    }
  }

  async function run(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setMessage(null);
    try {
      const text = await fn();
      if (text) setMessage({ text, type: "success" });
      if (key.startsWith("add:") || key.startsWith("del:") || key.startsWith("upd:")) refreshHistory();
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function openDetail(d: Detail) {
    setDetail(d);
    setPreview(null);
    setPreviewError(null);
    setOptPatchnotes(false);
    setOptSnapshots(false);
    loadPreview(d, false);
  }

  async function loadPreview(d: Detail, snapshots: boolean) {
    setPreview(null);
    setPreviewError(null);
    try {
      const { items } = await api("news/preview", { type: d.type, appId: d.appId, snapshots });
      setPreview(items);
    } catch (e: any) {
      setPreviewError(e.message);
    }
  }

  const setupNews = () =>
    run("setup", async () => {
      const r = await api("news/setup", {});
      const next = { roleId: r.game.role.id, channelId: r.game.channel.id, driverRoleId: r.driver.role.id, driverChannelId: r.driver.channel.id };
      setSetup(next);
      const isDriverTab = tab === "gpu" || tab === "cpu";
      setAddChannel(isDriverTab ? next.driverChannelId : next.channelId);
      setAddRole(isDriverTab ? next.driverRoleId : next.roleId);
      const [g, n] = await Promise.all([fetch("/api/discord/guild").then((x) => x.json()), fetch("/api/bot/news").then((x) => x.json())]);
      setGuild(g);
      if (n.feeds) setFeeds(n.feeds);
      if (n.history) setHistory(n.history);
      return (
        `✅ Eingerichtet: #${r.game.channel.name} mit @${r.game.role.name} für Spiele und #${r.driver.channel.name} mit @${r.driver.role.name} für Treiber.` +
        (r.moved ? ` ${r.moved} Treiber-Quelle(n) wurden in den Treiber-Kanal verschoben.` : "")
      );
    });

  // Tab wechseln -> passenden Kanal & Ping vorauswählen (Spiele -> game-news, Treiber -> treiber-news)
  function switchTab(next: "game" | "gpu" | "cpu" | "custom") {
    setTab(next);
    const driver = next === "gpu" || next === "cpu";
    const ch = driver ? setup.driverChannelId : setup.channelId;
    const role = driver ? setup.driverRoleId : setup.roleId;
    if (ch) setAddChannel(ch);
    if (role) setAddRole(role);
  }

  const add = (entry: { type: SourceType; appId?: string; name: string; onlyPatchnotes?: boolean; snapshots?: boolean }) =>
    run(`add:${entry.type}:${entry.appId || ""}`, async () => {
      if (!addChannel) throw new Error("Bitte oben zuerst einen Kanal auswählen.");
      const { feed } = await api("news/feeds", { ...entry, channelId: addChannel, roleId: addRole || undefined });
      setFeeds((f) => [...f, feed]);
      return `✅ „${entry.name}“ wird ab jetzt in #${channelName(addChannel)} gemeldet. Gepostet wird nur, was ab jetzt neu erscheint.`;
    });

  const update = (feed: Feed, patch: Partial<Feed>) =>
    run(`upd:${feed.id}`, async () => {
      const { feed: updated } = await api("news/feeds/update", { id: feed.id, patch });
      setFeeds((list) => list.map((f) => (f.id === feed.id ? updated : f)));
    });

  const remove = (feed: Feed) => {
    if (!confirm(`„${feed.name}“ nicht mehr melden?`)) return;
    run(`del:${feed.id}`, async () => {
      await api("news/feeds/delete", { id: feed.id });
      setFeeds((list) => list.filter((f) => f.id !== feed.id));
      return `🗑️ „${feed.name}“ entfernt.`;
    });
  };

  const test = (feed: Feed) =>
    run(`test:${feed.id}`, async () => {
      await api("news/feeds/test", { id: feed.id });
      return `📨 Neuester Beitrag von „${feed.name}“ wurde in #${channelName(feed.channelId)} gepostet (ohne Ping).`;
    });

  const lookup = () =>
    run("lookup", async () => {
      setSteamResult(null);
      const result = await api("news/steam-lookup", { input: steamInput });
      setSteamResult(result);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const shown = catalog.filter((c) => c.category === tab);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-orange-400" />
          Game-News
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Spiel-Updates, Patchnotes und neue Treiber automatisch in Discord - wie bei PatchBot. Der Bot prüft alle 15 Minuten.
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

      {/* Rollen & Kanäle: bn.gamenews und bn.treiber */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-white font-semibold">Rollen & Kanäle</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Spiele und Treiber sind getrennt: Wer nur <strong className="text-gray-200">bn.treiber</strong> hat, sieht nur Treiber - wer nur{" "}
                <strong className="text-gray-200">bn.gamenews</strong> hat, nur Spiele-News. Die Rollen schaltet jeder selbst in #berechtigungen an.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={setupNews}
              disabled={busy !== null}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shrink-0 disabled:opacity-50 ${
                setup.roleId && setup.channelId && setup.driverRoleId && setup.driverChannelId
                  ? "bg-discord-dark border border-discord-border text-gray-300 hover:border-discord-blurple"
                  : "bg-amber-500 hover:bg-amber-400 text-black"
              }`}
            >
              {busy === "setup" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {setup.roleId && setup.channelId && setup.driverRoleId && setup.driverChannelId ? "Erneut prüfen" : "Rollen & Kanäle anlegen"}
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Spiele-News", icon: Gamepad2, ch: setup.channelId, role: setup.roleId, fallbackCh: "📰・game-news", fallbackRole: "bn.gamenews" },
            { label: "Treiber-News", icon: MonitorSmartphone, ch: setup.driverChannelId, role: setup.driverRoleId, fallbackCh: "🖥️・treiber-news", fallbackRole: "bn.treiber" },
          ].map((x) => (
            <div key={x.label} className="p-3 rounded-xl bg-discord-dark border border-discord-border flex items-center gap-3">
              <x.icon className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="text-white font-medium">{x.label}</p>
                {x.ch && x.role ? (
                  <p className="text-gray-400 flex flex-wrap gap-x-3">
                    <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{channelName(x.ch) || x.fallbackCh}</span>
                    <span className="flex items-center gap-1"><AtSign className="w-3.5 h-3.5" />{roles.find((r) => r.id === x.role)?.name || x.fallbackRole}</span>
                  </p>
                ) : (
                  <p className="text-gray-500">Noch nicht angelegt ({`#${x.fallbackCh}`}, @{x.fallbackRole})</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aktive Quellen */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">
          Aktive News-Quellen <span className="text-gray-500 font-normal">({feeds.length})</span>
        </h2>
        {feeds.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Quellen. Füge unten Spiele oder Treiber hinzu.</p>
        ) : (
          <div className="space-y-3">
            {feeds.map((f) => (
              <div
                key={f.id}
                className={`flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-xl border bg-discord-dark ${f.enabled ? "border-discord-border" : "border-discord-border opacity-60"}`}
              >
                <div className="flex items-center gap-3 min-w-0 lg:w-72 shrink-0">
                  {f.type === "steam" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={steamImg(f.appId)} alt="" className="w-20 h-[38px] rounded object-cover bg-discord-card shrink-0" />
                  ) : (
                    <div className="w-20 h-[38px] rounded bg-discord-card flex items-center justify-center shrink-0">
                      <SourceIcon type={f.type} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{f.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_BADGE[f.type].className}`}>{TYPE_BADGE[f.type].label}</span>
                  </div>
                </div>

                {isAdmin ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <select className={select} value={f.channelId} onChange={(e) => update(f, { channelId: e.target.value })} title="Kanal">
                        {!channelName(f.channelId) && <option value={f.channelId}># gelöschter Kanal</option>}
                        {textChannels.map((c) => (
                          <option key={c.id} value={c.id}>
                            # {c.name}
                          </option>
                        ))}
                      </select>
                      <select className={select} value={f.roleId || ""} onChange={(e) => update(f, { roleId: e.target.value })} title="Ping-Rolle">
                        <option value="">Kein Ping</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            @{r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {f.type === "steam" && (
                        <Toggle on={Boolean(f.onlyPatchnotes)} onClick={() => update(f, { onlyPatchnotes: !f.onlyPatchnotes })} label="Nur Patchnotes" />
                      )}
                      {f.type === "minecraft" && <Toggle on={Boolean(f.snapshots)} onClick={() => update(f, { snapshots: !f.snapshots })} label="Snapshots" />}
                      <Toggle on={f.enabled} onClick={() => update(f, { enabled: !f.enabled })} label="Aktiv" />
                      <button
                        onClick={() => test(f)}
                        disabled={busy !== null}
                        title="Neuesten Beitrag jetzt posten (ohne Ping)"
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-discord-card disabled:opacity-40"
                      >
                        {busy === `test:${f.id}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                      <button onClick={() => remove(f)} disabled={busy !== null} title="Entfernen" className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-discord-card disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-xs text-gray-400 ml-auto">
                    <span className="px-2.5 py-1 rounded-lg bg-discord-dark border border-discord-border">
                      #{channelName(f.channelId) || "game-news"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${f.enabled ? "bg-discord-green/10 text-discord-green" : "bg-gray-600/20 text-gray-400"}`}>
                      {f.enabled ? "Aktiv" : "Pausiert"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verlauf */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-sky-400" />
          Verlauf
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Was wurde wann hinzugefügt oder entfernt. Die aktuelle Liste steht außerdem immer in der angepinnten Nachricht im Game-News-Kanal.
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Änderungen.</p>
        ) : (
          <div className="divide-y divide-discord-border max-h-80 overflow-y-auto pr-1">
            {history.map((h, i) => {
              const style = {
                added: { icon: Plus, cls: "text-discord-green bg-discord-green/10", label: "hinzugefügt" },
                removed: { icon: Minus, cls: "text-red-400 bg-red-500/10", label: "entfernt" },
                enabled: { icon: Play, cls: "text-sky-300 bg-sky-500/10", label: "aktiviert" },
                disabled: { icon: Pause, cls: "text-yellow-300 bg-yellow-400/10", label: "pausiert" },
              }[h.action];
              const Icon = style.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="text-white font-medium">{h.name}</span> <span className="text-gray-400">{style.label}</span>
                    <span className="text-gray-500"> · #{channelName(h.channelId) || "gelöschter Kanal"}</span>
                    {h.by && <span className="text-gray-500"> · von {h.by}</span>}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap" title={new Date(h.at).toLocaleString("de-DE")}>
                    {new Date(h.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hinzufügen (Nur Admins) */}
      {isAdmin && (
        <div className="bg-discord-card border border-discord-border rounded-2xl shadow-xl">
          <div className="p-6 border-b border-discord-border space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-discord-green" />
              News hinzufügen
            </h2>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm text-gray-300">In Kanal</label>
              <select className={select} value={addChannel} onChange={(e) => setAddChannel(e.target.value)}>
                <option value="">— Kanal wählen —</option>
                {textChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    # {c.name}
                  </option>
                ))}
              </select>
              <label className="text-sm text-gray-300 ml-2">Ping</label>
              <select className={select} value={addRole} onChange={(e) => setAddRole(e.target.value)}>
                <option value="">Kein Ping</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex border-b border-discord-border px-4 overflow-x-auto">
            {(
              [
                ["game", "Spiele", Gamepad2],
                ["gpu", "Grafikkarten-Treiber", MonitorSmartphone],
                ["cpu", "CPU / Chipsatz", Cpu],
                ["custom", "Eigenes Steam-Spiel", Link2],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`px-4 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
                  tab === key ? "border-discord-blurple text-white" : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "custom" ? (
              <div className="space-y-4 max-w-2xl">
                <p className="text-sm text-gray-400">
                  Füge jedes Steam-Spiel hinzu: Steam-Store-Link einfügen (z. B. <code className="text-gray-300">store.steampowered.com/app/892970/Valheim</code>) oder
                  nur die App-ID (<code className="text-gray-300">892970</code>).
                </p>
                <div className="flex gap-2">
                  <input
                    className={`${select} flex-1`}
                    placeholder="Steam-Link oder App-ID"
                    value={steamInput}
                    onChange={(e) => setSteamInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && steamInput.trim() && lookup()}
                  />
                  <button
                    onClick={lookup}
                    disabled={busy !== null || !steamInput.trim()}
                    className="px-4 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                  >
                    {busy === "lookup" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Suchen
                  </button>
                </div>
                {steamResult && (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-discord-dark border border-discord-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={steamResult.image} alt="" className="w-32 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{steamResult.name}</p>
                      <p className="text-xs text-gray-500">App-ID {steamResult.appId}</p>
                      <button
                        onClick={() => openDetail({ type: "steam", appId: steamResult.appId, name: steamResult.name, image: steamResult.image })}
                        className="text-xs text-discord-blurple hover:underline mt-1"
                      >
                        Details & letzte Beiträge ansehen
                      </button>
                    </div>
                    {activeKeys.has(`steam:${steamResult.appId}`) ? (
                      <span className="text-xs text-discord-green flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Aktiv
                      </span>
                    ) : (
                      <button
                        onClick={() => add({ type: "steam", appId: steamResult.appId, name: steamResult.name })}
                        disabled={busy !== null || !addChannel}
                        title={!addChannel ? "Oben zuerst einen Kanal wählen" : ""}
                        className="px-3 py-2 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" /> Hinzufügen
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {shown.map((c) => {
                  const active = activeKeys.has(c.type === "steam" ? `steam:${c.appId}` : c.type);
                  return (
                    <div
                      key={c.key}
                      onClick={() => openDetail(c)}
                      className="bg-discord-dark border border-discord-border rounded-xl overflow-hidden flex flex-col cursor-pointer hover:border-discord-blurple transition-all"
                      title="Klicken für Details"
                    >
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="w-full aspect-[460/215] object-cover" />
                      ) : (
                        <div className="w-full aspect-[460/215] flex items-center justify-center bg-discord-card">
                          <SourceIcon type={c.type} className="w-10 h-10" />
                        </div>
                      )}
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <div>
                          <p className="text-white text-sm font-semibold leading-snug">{c.name}</p>
                          {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2">
                          {c.beta ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300 flex items-center gap-1" title="Wird von der Hersteller-Webseite gelesen und kann bei Änderungen ausfallen">
                              <FlaskConical className="w-3 h-3" /> Beta
                            </span>
                          ) : (
                            <span />
                          )}
                          {active ? (
                            <span className="text-xs text-discord-green flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Aktiv
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                add({ type: c.type, appId: c.appId, name: c.name });
                              }}
                              disabled={busy !== null || !addChannel}
                              title={!addChannel ? "Oben zuerst einen Kanal wählen" : ""}
                              className="px-3 py-1.5 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                            >
                              <Plus className="w-3.5 h-3.5" /> Hinzufügen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!addChannel && tab !== "custom" && <p className="text-xs text-gray-500 mt-4">Wähle oben einen Kanal, um Quellen hinzuzufügen.</p>}
          </div>
        </div>
      )}
          {/* Detailansicht */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {detail.image || (detail.type === "steam" && detail.appId) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.image || steamImg(detail.appId)} alt="" className="w-full aspect-[460/215] object-cover rounded-t-2xl" />
              ) : (
                <div className="w-full h-32 rounded-t-2xl bg-discord-dark flex items-center justify-center">
                  <SourceIcon type={detail.type} className="w-12 h-12" />
                </div>
              )}
              <button onClick={() => setDetail(null)} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80" title="Schließen">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_BADGE[detail.type].className}`}>{TYPE_BADGE[detail.type].label}</span>
                  {detail.beta && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">Beta</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">{detail.name}</h3>
              </div>

              <div>
                <p className="text-sm font-semibold text-white mb-2">Was ist enthalten?</p>
                <ul className="space-y-1.5">
                  {(includes[detail.type] || []).map((line) => (
                    <li key={line} className="text-sm text-gray-300 flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-discord-green shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                </ul>
                {detail.beta && (
                  <p className="text-xs text-yellow-200/80 mt-3">
                    Beta: Diese Quelle wird direkt von der Hersteller-Webseite gelesen und kann ausfallen, wenn die Seite geändert wird.
                  </p>
                )}
              </div>

              {(detail.type === "steam" || detail.type === "minecraft") && (
                <div className="flex gap-6">
                  {detail.type === "steam" && <Toggle on={optPatchnotes} onClick={() => setOptPatchnotes((v) => !v)} label="Nur Patchnotes" />}
                  {detail.type === "minecraft" && (
                    <Toggle
                      on={optSnapshots}
                      onClick={() => {
                        const v = !optSnapshots;
                        setOptSnapshots(v);
                        loadPreview(detail, v);
                      }}
                      label="Auch Snapshots"
                    />
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-white mb-2">Letzte Beiträge</p>
                {previewError ? (
                  <p className="text-sm text-red-400">{previewError}</p>
                ) : !preview ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Lade …
                  </div>
                ) : preview.length === 0 ? (
                  <p className="text-sm text-gray-400">Noch keine Beiträge vorhanden.</p>
                ) : (
                  <div className="space-y-2">
                    {preview
                      .filter((p) => !(detail.type === "steam" && optPatchnotes && !p.isPatchnotes))
                      .map((p) => (
                        <a
                          key={p.url + p.title}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-3 rounded-xl bg-discord-dark border border-discord-border hover:border-discord-blurple transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-white font-medium">{p.title}</p>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {p.date && <span className="text-xs text-gray-500">{new Date(p.date * 1000).toLocaleDateString("de-DE")}</span>}
                            {p.isPatchnotes && <span className="text-[10px] px-1.5 rounded bg-discord-blurple/20 text-indigo-300">Patchnotes</span>}
                            {p.isSnapshot && <span className="text-[10px] px-1.5 rounded bg-yellow-400/10 text-yellow-300">Snapshot</span>}
                          </div>
                          {p.text && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.text}</p>}
                        </a>
                      ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-discord-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                  {addChannel ? (
                    <>
                      Wird gepostet in <span className="text-gray-200">#{channelName(addChannel)}</span>
                      {addRole && (
                        <>
                          {" "}mit Ping <span className="text-gray-200">@{roles.find((r) => r.id === addRole)?.name}</span>
                        </>
                      )}
                    </>
                  ) : (
                    "Wähle zuerst oben unter „News hinzufügen“ einen Kanal."
                  )}
                </p>
                {activeKeys.has(detail.type === "steam" ? `steam:${detail.appId}` : detail.type) ? (
                  <span className="text-sm text-discord-green flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Bereits aktiv in diesem Kanal
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      await add({ type: detail.type, appId: detail.appId, name: detail.name, onlyPatchnotes: optPatchnotes, snapshots: optSnapshots });
                      setDetail(null);
                    }}
                    disabled={busy !== null || !addChannel}
                    className="px-4 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" /> Hinzufügen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
