"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Newspaper, Plus, Trash2, Send, RefreshCw, Search, Gamepad2, Cpu, MonitorSmartphone, Link2, CheckCircle2,
  Pickaxe, X, ExternalLink, Sparkles, Hash, AtSign, History, Minus, Play, Pause, Clock, Wrench, Download,
  Filter, ChevronRight, SlidersHorizontal, BookOpen, Bell
} from "lucide-react";

interface HistoryEntry { at: string; action: "added" | "removed" | "enabled" | "disabled"; name: string; type: SourceType; channelId: string; by?: string }
interface PreviewItem { title: string; url: string; date?: number; text?: string; isPatchnotes?: boolean; isSnapshot?: boolean }
interface Detail { type: SourceType; appId?: string; name: string; image?: string; description?: string; beta?: boolean }

type SourceType = "steam" | "minecraft" | "nvidia" | "amd-gpu" | "amd-chipset" | "intel-gpu";

export interface PublicNewsArticle {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  appId?: string;
  headerImage?: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  imageUrl?: string;
  date: number;
  isPatchnotes?: boolean;
  isSnapshot?: boolean;
  downloadUrl?: string;
}

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

function formatTimeAgo(timestampInSeconds?: number) {
  if (!timestampInSeconds) return "Kürzlich";
  const diffSec = Math.floor(Date.now() / 1000 - timestampInSeconds);
  if (diffSec < 60) return "Gerade eben";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return new Date(timestampInSeconds * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ArticleContentRenderer({ content }: { content: string }) {
  if (!content) return null;
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed font-normal">
      {paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        const imgMatch = trimmed.match(/^!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/);
        if (imgMatch) {
          return (
            <div key={idx} className="my-3 rounded-xl overflow-hidden border border-discord-border bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgMatch[2]} alt={imgMatch[1] || "Bild"} className="w-full max-h-96 object-contain" />
            </div>
          );
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-lg font-bold text-white pt-2 border-b border-discord-border/60 pb-1">
              {trimmed.replace(/^###\s+/, "")}
            </h3>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="text-base font-semibold text-white pt-1">
              {trimmed.replace(/^####\s+/, "")}
            </h4>
          );
        }

        if (trimmed.includes("\n• ") || trimmed.startsWith("• ")) {
          const items = trimmed.split(/\n/).map((l) => l.trim()).filter(Boolean);
          return (
            <ul key={idx} className="space-y-1.5 pl-1">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2.5 text-gray-300">
                  <span className="text-orange-400 font-bold mt-0.5">•</span>
                  <span>{item.replace(/^[•\-\*]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line text-gray-300">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function NewsPage() {
  const [articles, setArticles] = useState<PublicNewsArticle[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filter & Navigation
  const [selectedArticle, setSelectedArticle] = useState<PublicNewsArticle | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "games" | "patchnotes" | "drivers">("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [adminTab, setAdminTab] = useState<"news" | "manage">("news");
  const [showSourcesList, setShowSourcesList] = useState<boolean>(false);

  // Admin Hinzufügen / Verwaltung
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedArticle(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function load() {
    try {
      const nRes = await fetch("/api/bot/news");
      const n = await nRes.json();
      if (!nRes.ok) throw new Error(n.error);
      setArticles(n.articles || []);
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
      if (n.articles) setArticles(n.articles);
    } catch {}
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
      return `✅ „${entry.name}“ wird ab jetzt in #${channelName(addChannel)} gemeldet.`;
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

  const test = (feed: Feed, withPing = false) =>
    run(`test:${feed.id}:${withPing ? "ping" : "noping"}`, async () => {
      await api("news/feeds/test", { id: feed.id, withPing });
      const role = feed.roleId ? roles.find((r) => r.id === feed.roleId) : null;
      if (withPing && role) {
        return `📨 Neuester Beitrag von „${feed.name}“ wurde in #${channelName(feed.channelId)} mit @${role.name}-Rollen-Ping gesendet!`;
      }
      return `📨 Neuester Beitrag von „${feed.name}“ wurde in #${channelName(feed.channelId)} gepostet (ohne Ping).`;
    });

  const lookup = () =>
    run("lookup", async () => {
      setSteamResult(null);
      const result = await api("news/steam-lookup", { input: steamInput });
      setSteamResult(result);
    });

  // Filter-Logik
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (activeFilter === "games" && (a.sourceType === "nvidia" || a.sourceType === "amd-gpu" || a.sourceType === "amd-chipset" || a.sourceType === "intel-gpu")) {
        return false;
      }
      if (activeFilter === "drivers" && !(a.sourceType === "nvidia" || a.sourceType === "amd-gpu" || a.sourceType === "amd-chipset" || a.sourceType === "intel-gpu")) {
        return false;
      }
      if (activeFilter === "patchnotes" && !a.isPatchnotes) {
        return false;
      }
      if (selectedSource !== "all" && a.sourceName !== selectedSource && a.sourceId !== selectedSource) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesSummary = a.summary.toLowerCase().includes(q);
        const matchesSource = a.sourceName.toLowerCase().includes(q);
        const matchesContent = a.content.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesSource && !matchesContent) {
          return false;
        }
      }
      return true;
    });
  }, [articles, activeFilter, selectedSource, searchQuery]);

  const counts = useMemo(() => {
    const total = articles.length;
    const games = articles.filter((a) => a.sourceType === "steam" || a.sourceType === "minecraft").length;
    const patchnotes = articles.filter((a) => a.isPatchnotes).length;
    const drivers = articles.filter((a) => ["nvidia", "amd-gpu", "amd-chipset", "intel-gpu"].includes(a.sourceType)).length;
    return { total, games, patchnotes, drivers };
  }, [articles]);

  const sourceOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of articles) map.set(a.sourceName, a.sourceName);
    for (const f of feeds) map.set(f.name, f.name);
    return Array.from(map.values()).sort();
  }, [articles, feeds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Kopfbereich */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-orange-400" />
            Game-News & Patchnotes
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Offizielle Spiel-Updates, detaillierte Patchnotes und neueste Grafikkarten- & Chipsatz-Treiber im Überblick.
          </p>
        </div>

        {/* Schnell-Statistik */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-discord-card border border-discord-border text-gray-300 font-medium">
            📰 <strong className="text-white">{articles.length}</strong> Artikel
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-discord-card border border-discord-border text-gray-300 font-medium">
            🎮 <strong className="text-white">{feeds.length}</strong> Quellen
          </span>
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            title="Aktualisieren"
            className="p-1.5 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
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

      {/* Admin-Navigation Tabs */}
      {isAdmin && (
        <div className="flex border-b border-discord-border gap-2">
          <button
            onClick={() => setAdminTab("news")}
            className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors ${
              adminTab === "news" ? "border-orange-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Newspaper className="w-4 h-4" />
            News-Magazin ({articles.length})
          </button>
          <button
            onClick={() => setAdminTab("manage")}
            className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors ${
              adminTab === "manage" ? "border-orange-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Quellen & Setup verwalten ({feeds.length})
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. NEWS-MAGAZIN VIEW (FÜR ALLE BESUCHER & ADMINS)                        */}
      {/* ========================================================================= */}
      {(!isAdmin || adminTab === "news") && (
        <div className="space-y-6">
          {/* Filterleiste & Suche */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Suchfeld */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nach Spiel, Patch oder Stichwort suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-xl pl-10 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quellen-Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="bg-discord-dark border border-discord-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 min-w-[180px]"
                >
                  <option value="all">Alle Spiele & Quellen ({sourceOptions.length})</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schnell-Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-discord-border/50">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "all" ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "bg-discord-dark text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                Alle ({counts.total})
              </button>
              <button
                onClick={() => setActiveFilter("games")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFilter === "games" ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "bg-discord-dark text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                Spiele ({counts.games})
              </button>
              <button
                onClick={() => setActiveFilter("patchnotes")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFilter === "patchnotes" ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "bg-discord-dark text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Nur Patchnotes ({counts.patchnotes})
              </button>
              <button
                onClick={() => setActiveFilter("drivers")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFilter === "drivers" ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "bg-discord-dark text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                Treiber & Hardware ({counts.drivers})
              </button>

              <button
                onClick={() => setShowSourcesList(!showSourcesList)}
                className="ml-auto text-xs text-gray-400 hover:text-orange-400 flex items-center gap-1.5 transition-colors"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                {showSourcesList ? "Quellen verbergen" : `Abonnierte Spiele (${feeds.length})`}
              </button>
            </div>
          </div>

          {/* Abonnierte Spiele / Quellen Leiste für Gäste */}
          {showSourcesList && (
            <div className="bg-discord-card border border-discord-border rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-orange-400" />
                  Aktuell überwachte Spiele & Treiber-Quellen
                </h3>
                <span className="text-xs text-gray-500">{feeds.length} Quellen aktiv</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {feeds.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedSource(selectedSource === f.name ? "all" : f.name)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      selectedSource === f.name ? "border-orange-500 bg-orange-500/10 text-white" : "border-discord-border bg-discord-dark hover:border-discord-blurple text-gray-300"
                    }`}
                  >
                    <SourceIcon type={f.type} className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kachel-Raster (News-Cards) */}
          {filteredArticles.length === 0 ? (
            <div className="bg-discord-card border border-discord-border rounded-2xl p-12 text-center space-y-3">
              <Newspaper className="w-12 h-12 text-gray-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">Keine Artikel gefunden</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                {searchQuery || selectedSource !== "all" || activeFilter !== "all"
                  ? "Zu deinen Filterkriterien gibt es aktuell keine passenden Beiträge. Setze die Filter zurück."
                  : "Es sind aktuell noch keine Artikel hinterlegt oder die Quellen werden gerade abgerufen."}
              </p>
              {(searchQuery || selectedSource !== "all" || activeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSource("all");
                    setActiveFilter("all");
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-black font-semibold text-xs"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-discord-card border border-discord-border rounded-2xl overflow-hidden hover:border-orange-500/60 hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-200 group flex flex-col cursor-pointer"
                >
                  {/* Kachel-Bild mit Tags */}
                  <div className="relative h-44 bg-discord-dark overflow-hidden shrink-0">
                    {article.imageUrl || article.headerImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.imageUrl || article.headerImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-discord-card to-discord-dark text-gray-500 p-4">
                        <SourceIcon type={article.sourceType} className="w-12 h-12 mb-2" />
                        <span className="text-xs font-semibold text-gray-400">{article.sourceName}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-discord-card via-transparent to-black/30" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border backdrop-blur-md bg-black/60 shadow-sm ${TYPE_BADGE[article.sourceType].className}`}>
                        {article.sourceName}
                      </span>
                      {article.isPatchnotes ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/90 text-white shadow-sm">
                          Patchnotes
                        </span>
                      ) : article.sourceType.includes("gpu") || article.sourceType.includes("chipset") ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/90 text-white shadow-sm">
                          Treiber
                        </span>
                      ) : article.isSnapshot ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/90 text-black shadow-sm">
                          Snapshot
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Kachel-Inhalt */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>{formatTimeAgo(article.date)}</span>
                      </div>
                      <h3 className="text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed mt-2">
                        {article.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-discord-border flex items-center justify-between text-xs">
                      <span className="text-orange-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Artikel lesen <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-gray-500 group-hover:text-gray-300 transition-colors">
                        {article.sourceType === "steam" ? "Steam" : "Offiziell"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADMIN-VERWALTUNG TAB (NUR FÜR EINGELOGGTE ADMINS)                      */}
      {/* ========================================================================= */}
      {isAdmin && adminTab === "manage" && (
        <div className="space-y-8">
          {/* Rollen & Kanäle: bn.gamenews und bn.treiber */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">Rollen & Kanäle</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Spiele und Treiber sind getrennt: Wer nur <strong className="text-gray-200">bn.treiber</strong> hat, sieht nur Treiber - wer nur{" "}
                    <strong className="text-gray-200">bn.gamenews</strong> hat, nur Spiele-News.
                  </p>
                </div>
              </div>
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
                        onClick={() => test(f, false)}
                        disabled={busy !== null}
                        title="Neuesten Beitrag sofort posten (ohne Ping / Test)"
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-discord-card disabled:opacity-40 transition-colors"
                      >
                        {busy === `test:${f.id}:noping` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                      {f.roleId && (
                        <button
                          onClick={() => test(f, true)}
                          disabled={busy !== null}
                          title={`Neuesten Beitrag MIT @${roles.find((r) => r.id === f.roleId)?.name || "Rolle"}-Ping senden`}
                          className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 disabled:opacity-40 transition-colors"
                        >
                          {busy === `test:${f.id}:ping` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={() => remove(f)} disabled={busy !== null} title="Entfernen" className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-discord-card disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
              Was wurde wann hinzugefügt oder entfernt.
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
                    <div className="p-4 rounded-xl border border-discord-border bg-discord-dark flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={steamResult.image} alt="" className="w-32 h-16 rounded object-cover bg-discord-card shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-base truncate">{steamResult.name}</p>
                        <p className="text-xs text-gray-400">App-ID: {steamResult.appId}</p>
                      </div>
                      <button
                        onClick={() => openDetail({ type: "steam", appId: steamResult.appId, name: steamResult.name, image: steamResult.image })}
                        className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-sm font-semibold"
                      >
                        Vorschau & Hinzufügen
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catalog
                    .filter((c) => c.category === tab)
                    .map((item) => {
                      const isAdded = activeKeys.has(item.type === "steam" ? `steam:${item.appId}` : item.type);
                      return (
                        <div
                          key={item.key}
                          onClick={() => openDetail(item)}
                          className="p-4 rounded-xl border border-discord-border bg-discord-dark hover:border-discord-blurple hover:bg-discord-dark/70 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                        >
                          <div className="flex items-start gap-3">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt="" className="w-20 h-10 rounded object-cover bg-discord-card shrink-0" />
                            ) : (
                              <div className="w-20 h-10 rounded bg-discord-card flex items-center justify-center shrink-0">
                                <SourceIcon type={item.type} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-bold text-sm truncate group-hover:text-discord-blurple transition-colors">{item.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_BADGE[item.type].className}`}>{TYPE_BADGE[item.type].label}</span>
                            </div>
                          </div>
                          {item.description && <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>}
                          <div className="pt-2 border-t border-discord-border flex items-center justify-between text-xs">
                            {isAdded ? (
                              <span className="text-discord-green flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aktiv
                              </span>
                            ) : (
                              <span className="text-gray-400 group-hover:text-white">Klicken für Vorschau →</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ARTIKEL-MODAL ("WENN MAN DRAUFKLICKT SIEHT MAN DEN GANZEN ARTIKEL")     */}
      {/* ========================================================================= */}
      {selectedArticle && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="max-w-4xl w-full bg-discord-card border border-discord-border rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header-Banner */}
            {selectedArticle.imageUrl && (
              <div className="relative h-48 sm:h-64 bg-discord-dark overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedArticle.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-discord-card via-black/30 to-black/60" />
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md bg-black/60 ${TYPE_BADGE[selectedArticle.sourceType].className}`}>
                      {selectedArticle.sourceName}
                    </span>
                    {selectedArticle.isPatchnotes && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500 text-white">
                        Patchnotes
                      </span>
                    )}
                    {selectedArticle.isSnapshot && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-400 text-black">
                        Snapshot
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight drop-shadow-md">
                    {selectedArticle.title}
                  </h2>
                </div>
              </div>
            )}

            {/* Titelbereich ohne Banner */}
            {!selectedArticle.imageUrl && (
              <div className="p-6 border-b border-discord-border flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${TYPE_BADGE[selectedArticle.sourceType].className}`}>
                      {selectedArticle.sourceName}
                    </span>
                    {selectedArticle.isPatchnotes && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500 text-white">
                        Patchnotes
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-discord-dark transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Metadaten & Aktionsleiste */}
            <div className="px-6 py-3 bg-discord-dark/70 border-b border-discord-border flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>
                  Veröffentlicht am{" "}
                  <strong className="text-white">
                    {new Date(selectedArticle.date * 1000).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedArticle.downloadUrl && (
                  <a
                    href={selectedArticle.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Treiber-Download
                  </a>
                )}
                {selectedArticle.appId && (
                  <a
                    href={`steam://appnews/${selectedArticle.appId}`}
                    className="px-3 py-1.5 rounded-lg bg-discord-card border border-discord-border hover:border-discord-blurple text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
                    In Steam öffnen
                  </a>
                )}
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-discord-card border border-discord-border hover:border-discord-blurple text-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  Original-Webseite
                </a>
              </div>
            </div>

            {/* Artikel-Text (Scrollbar & formatiert) */}
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
              <ArticleContentRenderer content={selectedArticle.content} />
            </div>

            {/* Modal-Fußzeile */}
            <div className="px-6 py-4 border-t border-discord-border bg-discord-dark flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Quelle: {selectedArticle.sourceName} · Bereitgestellt von GLGBot News Suite
              </p>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 rounded-xl bg-discord-card border border-discord-border hover:border-discord-blurple text-gray-200 text-sm font-semibold transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DETAIL-MODAL FÜR QUELLEN-VORSCHAU BEIM HINZUFÜGEN                     */}
      {/* ========================================================================= */}
      {detail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {detail.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.image} alt="" className="w-16 h-8 rounded object-cover bg-discord-dark" />
                ) : (
                  <div className="w-16 h-8 rounded bg-discord-dark flex items-center justify-center">
                    <SourceIcon type={detail.type} />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{detail.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_BADGE[detail.type].className}`}>{TYPE_BADGE[detail.type].label}</span>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detail.description && <p className="text-xs text-gray-300">{detail.description}</p>}

            {(detail.type === "steam" || detail.type === "minecraft") && (
              <div className="p-3 rounded-xl bg-discord-dark border border-discord-border flex flex-wrap gap-4">
                {detail.type === "steam" && (
                  <Toggle on={optPatchnotes} onClick={() => setOptPatchnotes(!optPatchnotes)} label="Nur Beiträge mit Patchnotes-Tag" />
                )}
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
      )}
    </div>
  );
}
