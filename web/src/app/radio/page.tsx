"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Radio,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Music,
  ListMusic,
  Volume2,
  Search,
  Folder,
  Upload,
  Settings,
  Disc,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
} from "lucide-react";

interface Station {
  id: string;
  name: string;
  url: string;
  source?: string;
  channelId?: string;
  userLimit?: number;
  active?: boolean;
}

interface RadioStatus {
  guildId: string;
  channelId: string;
  url: string;
  name: string;
  paused: boolean;
  startedAt: number;
  nowPlaying: string | null;
  lastError: string | null;
  volume: number;
}

const DEFAULT_FALLBACK_STATIONS: Station[] = [
  { id: "soma-groove", name: "SomaFM Groove Salad (werbefrei)", url: "https://ice1.somafm.com/groovesalad-128-mp3", source: "somafm", active: true },
  { id: "soma-deep", name: "SomaFM Deep Space One (werbefrei)", url: "https://ice1.somafm.com/deepspaceone-128-mp3", source: "somafm", active: true },
  { id: "soma-defcon", name: "SomaFM DEF CON Radio (werbefrei)", url: "https://ice1.somafm.com/defcon-128-mp3", source: "somafm", active: true },
  { id: "ssl-edm", name: "SUNSHINE LIVE - EDM", url: "https://stream.sunshine-live.de/edm/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-festival", name: "SUNSHINE LIVE - Festival", url: "https://stream.sunshine-live.de/festival/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-house", name: "SUNSHINE LIVE - House", url: "https://stream.sunshine-live.de/house/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-classics", name: "SUNSHINE LIVE - Classics", url: "https://stream.sunshine-live.de/classics/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-trance", name: "SUNSHINE LIVE - Trance", url: "https://stream.sunshine-live.de/trance/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-lounge", name: "SUNSHINE LIVE - Lounge", url: "https://stream.sunshine-live.de/lounge/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "ssl-techno", name: "SUNSHINE LIVE - Techno", url: "https://stream.sunshine-live.de/techno/mp3-192/stream.sunshine-live.de/", source: "sunshine-live", active: true },
  { id: "lautfm-hardtekk", name: "Hardtekk Radio", url: "https://stream.laut.fm/hardtekk-radio", source: "laut.fm", active: true },
  { id: "lautfm-chillout", name: "Chillout Radio", url: "https://stream.laut.fm/chillout", source: "laut.fm", active: true },
  { id: "lautfm-house", name: "House Radio", url: "https://stream.laut.fm/house", source: "laut.fm", active: true },
  { id: "lautfm-trap", name: "Trap Radio", url: "https://stream.laut.fm/trap", source: "laut.fm", active: true },
  { id: "lautfm-hiphop", name: "Hip-Hop Radio", url: "https://stream.laut.fm/hiphop", source: "laut.fm", active: true },
  { id: "flux-live", name: "FluxFM - Live", url: "https://channels.fluxfm.de/FluxFM/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-alternative", name: "FluxFM - Alternative", url: "https://channels.fluxfm.de/alternative/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-indiedisco", name: "FluxFM - Indie Disco", url: "https://channels.fluxfm.de/indiedisco/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-chillhop", name: "FluxFM - Chillhop", url: "https://channels.fluxfm.de/chillhop/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-chillout", name: "FluxFM - Chillout", url: "https://channels.fluxfm.de/chillout-radio/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-elektro", name: "FluxFM - Elektro-Flux", url: "https://channels.fluxfm.de/elektro-flux/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-clubsandwich", name: "FluxFM - Clubsandwich", url: "https://channels.fluxfm.de/clubsandwich/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-soundofberlin", name: "FluxFM - Sound of Berlin", url: "https://channels.fluxfm.de/sound-of-berlin/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-beachhouse", name: "FluxFM - Berlin Beach House", url: "https://channels.fluxfm.de/berlin-beach-house/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-metalfm", name: "FluxFM - Metal FM", url: "https://channels.fluxfm.de/metal-fm/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-xjazz", name: "FluxFM - X-Jazz", url: "https://channels.fluxfm.de/x-jazz/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-80er", name: "FluxFM - 80er", url: "https://channels.fluxfm.de/80s/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-90er", name: "FluxFM - 90er", url: "https://channels.fluxfm.de/90s/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
  { id: "flux-2000er", name: "FluxFM - 2000er", url: "https://channels.fluxfm.de/2000er/externalembedflxhp/stream.mp3", source: "fluxfm", active: true },
];

export default function RadioPage() {
  const [activeTab, setActiveTab] = useState<"radio" | "sounds" | "playlists" | "settings">("radio");
  const [config, setConfig] = useState<{ botName: string; stations: Station[]; customStations: Station[] } | null>(null);
  const [botName, setBotName] = useState("");
  const [customStations, setCustomStations] = useState<Station[]>([]);
  const [newStation, setNewStation] = useState({ name: "", url: "" });
  const [showAddStation, setShowAddStation] = useState(false);
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [stationSearch, setStationSearch] = useState("");
  const [soundSearch, setSoundSearch] = useState("");
  const [soundFolderFilter, setSoundFolderFilter] = useState("all");

  const [testing, setTesting] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState<string | null>(null);
  const [voiceChannels, setVoiceChannels] = useState<any[]>([]);
  const [targetVoiceId, setTargetVoiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [liveStatus, setLiveStatus] = useState<RadioStatus | null>(null);
  const [musicQueue, setMusicQueue] = useState<{ current: any | null; queue: any[]; loop: string; paused: boolean; lastError?: string | null } | null>(null);
  const [sounds, setSounds] = useState<{ file: string; name: string; sizeKb: number; folder?: string }[]>([]);
  const [uploadCode, setUploadCode] = useState<string | null>(null);
  const [showUploadBox, setShowUploadBox] = useState(false);

  const [mbCfg, setMbCfg] = useState<{ tokenSet: boolean; tokenHint: string | null; clientId: string; guildId: string; autostart: boolean } | null>(null);
  const [mbToken, setMbToken] = useState("");
  const [mbClientId, setMbClientId] = useState("");
  const [mbGuildId, setMbGuildId] = useState("");
  const [mbAutostart, setMbAutostart] = useState(true);
  const [worker, setWorker] = useState<{ configured: boolean; running: boolean; pid: number | null; uptimeSec: number; restarts: number; lastExit: string | null } | null>(null);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; files: string[]; ownerId?: string }[]>([]);
  const [newPlaylist, setNewPlaylist] = useState("");
  const [myUid, setMyUid] = useState<string | null>(null);

  const myPlaylistCount = playlists.filter((p) => p.ownerId && p.ownerId === myUid).length;

  const controlWorker = async (action: "start" | "stop" | "restart") => {
    setMessage(null);
    try {
      const res = await fetch(`/api/bot/musicbot/${action}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `🤖 ${data.message || "OK."}`, type: "success" });
        await refreshStatus();
      } else {
        setMessage({ text: `❌ ${data.error || "Aktion fehlgeschlagen."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    }
  };

  const createPlaylist = async (name: string) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;
    if (myPlaylistCount >= 2) {
      setMessage({ text: "❌ Maximal 2 eigene Playlisten pro Nutzer.", type: "error" });
      return;
    }
    setNewPlaylist("");
    await persistPlaylists([...playlists, { id: `pl-${Date.now()}`, name: clean, files: [] }]);
  };

  const persistPlaylists = async (next: { id: string; name: string; files: string[]; ownerId?: string }[]) => {
    setPlaylists(next);
    try {
      const res = await fetch("/api/config/radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botName, customStations, playlists: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: `❌ ${data.error || "Speichern fehlgeschlagen."}`, type: "error" });
      }
    } catch {}
  };

  interface DropFile {
    file: File;
    path: string;
  }

  const readDirEntries = (reader: any): Promise<any[]> =>
    new Promise((resolve) => {
      const out: any[] = [];
      const read = () =>
        reader.readEntries(
          (batch: any[]) => {
            if (!batch || batch.length === 0) return resolve(out);
            out.push(...batch);
            read();
          },
          () => resolve(out),
        );
      read();
    });

  const collectDropped = async (dt: DataTransfer): Promise<DropFile[]> => {
    const out: DropFile[] = [];
    try {
      const items = Array.from(dt.items || []);
      const withEntry = items.filter(
        (it: any) => typeof it?.webkitGetAsEntry === "function" && it.webkitGetAsEntry(),
      );
      if (withEntry.length === 0) {
        for (const f of Array.from(dt.files || [])) out.push({ file: f, path: f.name });
        return out;
      }
      const walk = async (entry: any, prefix: string): Promise<void> => {
        if (entry.isFile) {
          const file: File = await new Promise((res, rej) => entry.file(res, rej));
          out.push({ file, path: prefix ? `${prefix}/${file.name}` : file.name });
        } else if (entry.isDirectory) {
          const children = await readDirEntries(entry.createReader());
          for (const child of children) await walk(child, prefix ? `${prefix}/${entry.name}` : entry.name);
        }
      };
      for (const it of withEntry) {
        const entry = (it as any).webkitGetAsEntry();
        if (entry) await walk(entry, "");
      }
    } catch (e) {
      console.error(e);
    }
    return out;
  };

  const uploadCollected = async (items: DropFile[]) => {
    if (items.length === 0) {
      setMessage({ text: "❌ Keine Dateien erkannt. Dateien/Ordner direkt auf die Zone ziehen oder über Auswahl wählen.", type: "error" });
      return;
    }
    setUploading(true);
    setMessage(null);
    const done: string[] = [];
    const failed: string[] = [];
    const byFolder = new Map<string, string[]>();
    for (const { file: f, path: rel } of items) {
      try {
        const form = new FormData();
        form.append("file", f);
        form.append("path", rel);
        const res = await fetch("/api/radio/upload", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok) {
          done.push(data.file);
          if (data.folder) {
            if (!byFolder.has(data.folder)) byFolder.set(data.folder, []);
            byFolder.get(data.folder)!.push(data.file);
          }
        } else failed.push(`${f.name}: ${data.error || "Fehler"}`);
      } catch (e: any) {
        failed.push(`${f.name}: ${e.message}`);
      }
    }
    if (byFolder.size > 0) {
      const next = [...playlists];
      byFolder.forEach((files, folder) => {
        const existing = next.find((p) => p.name.toLowerCase() === folder.toLowerCase());
        if (existing) {
          existing.files = [...existing.files, ...files.filter((x: string) => !existing.files.includes(x))].slice(0, 100);
        } else {
          next.push({ id: `pl-${Date.now()}-${folder}`, name: folder.slice(0, 60), files: files.slice(0, 100) });
        }
      });
      await persistPlaylists(next.slice(0, 20));
    }
    if (done.length > 0) {
      setMessage({ text: `✅ Hochgeladen (${done.length}): ${done.slice(0, 5).join(", ")}${done.length > 5 ? " …" : ""}${failed.length > 0 ? ` | Fehler: ${failed.join("; ")}` : ""}`, type: failed.length > 0 ? "error" : "success" });
      await refreshStatus();
    } else if (failed.length > 0) {
      setMessage({ text: `❌ ${failed.join("; ")}`, type: "error" });
    }
    setUploading(false);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setMessage({ text: "❌ Keine Dateien erkannt. Dateien/Ordner direkt auf die Zone ziehen oder über Auswahl wählen.", type: "error" });
      return;
    }
    await uploadCollected(
      Array.from(files).map((f) => ({
        file: f,
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      })),
    );
  };

  useEffect(() => {
    async function load() {
      try {
        const [radioRes, guildRes] = await Promise.all([
          fetch("/api/config/radio").then((r) => r.json()).catch(() => null),
          fetch("/api/discord/guild").then((r) => r.json()).catch(() => null),
        ]);
        if (radioRes && !radioRes.error) {
          setConfig(radioRes);
          setBotName(radioRes.botName || "Radio Bot");
          setCustomStations(radioRes.customStations || []);
          setPlaylists(radioRes.playlists || []);
        } else {
          setConfig({ botName: "Radio Bot", stations: DEFAULT_FALLBACK_STATIONS, customStations: [] });
        }
        try {
          const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
          if (me?.id) setMyUid(me.id);
        } catch {}
        try {
          const mb = await fetch("/api/config/musicbot").then((r) => r.json());
          if (!mb.error) {
            setMbCfg(mb);
            setMbClientId(mb.clientId || "");
            setMbGuildId(mb.guildId || "");
            setMbAutostart(mb.autostart !== false);
          }
        } catch {}
        if (guildRes?.voiceChannels) setVoiceChannels(guildRes.voiceChannels);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function refreshStatus() {
    try {
      const res = await fetch("/api/bot/radio/status").then((r) => r.json());
      setLiveStatus(res.status || null);
    } catch {}
    try {
      const w = await fetch("/api/bot/musicbot/status").then((r) => r.json());
      if (!w.error) setWorker(w);
    } catch {}
    try {
      const mq = await fetch("/api/bot/music/queue").then((r) => r.json());
      if (!mq.error) setMusicQueue(mq);
    } catch {}
    try {
      const sw = await fetch("/api/bot/sounds").then((r) => r.json());
      if (Array.isArray(sw.sounds)) setSounds(sw.sounds);
    } catch {}
  }

  useEffect(() => {
    refreshStatus();
    const poll = setInterval(refreshStatus, 8000);
    return () => clearInterval(poll);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config/radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botName, customStations }),
      });
      if (res.ok) {
        setMessage({ text: "✅ Einstellungen gespeichert!", type: "success" });
      } else {
        setMessage({ text: "❌ Fehler beim Speichern.", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addStation = () => {
    if (!newStation.name || !newStation.url) return;
    setCustomStations([...customStations, { ...newStation, id: `custom-${Date.now()}`, source: "custom", active: true, userLimit: 0 }]);
    setNewStation({ name: "", url: "" });
    setShowAddStation(false);
  };

  const updateCustom = (id: string, patch: Partial<Station>) => {
    setCustomStations(customStations.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const testUrl = async (station: Station) => {
    setTesting(station.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/radio/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: station.url }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessage({ text: `✅ „${station.name}“ liefert Audio: ${data.detail}`, type: "success" });
      } else {
        setMessage({ text: `❌ „${station.name}“: ${data.detail || data.error || "kein Audio."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setTesting(null);
    }
  };

  const setupAndStart = async (station: Station) => {
    if (station.active === false) {
      setMessage({ text: `❌ „${station.name}“ ist deaktiviert.`, type: "error" });
      return;
    }
    setSettingUp(station.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/radio/setup-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: station.url,
          name: station.name,
          channelId: station.channelId || targetVoiceId || undefined,
          userLimit: station.userLimit || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `▶️ „${station.name}“ läuft${data.created ? " (neuer Temp-Kanal erstellt)" : ""}.`, type: "success" });
        await refreshStatus();
      } else {
        setMessage({ text: `❌ ${data.error || "Konnte Stream nicht starten."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setSettingUp(null);
    }
  };

  const removeStation = (id: string) => {
    setCustomStations(customStations.filter((s) => s.id !== id));
  };

  const playStation = async (station: Station) => {
    setMessage(null);
    try {
      const res = await fetch("/api/bot/radio/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: station.url, name: station.name, channelId: targetVoiceId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `▶️ „${station.name}“ wird abgespielt.`, type: "success" });
        await refreshStatus();
      } else {
        setMessage({ text: `❌ ${data.error || "Konnte Stream nicht starten."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    }
  };

  const control = async (action: "pause" | "resume" | "stop") => {
    setMessage(null);
    try {
      const res = await fetch(`/api/bot/radio/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await refreshStatus();
      } else {
        setMessage({ text: `❌ ${data.error || "Aktion fehlgeschlagen."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    }
  };

  const changeVolume = async (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    try {
      const res = await fetch("/api/bot/radio/volume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: clamped, channelId: targetVoiceId || liveStatus?.channelId || undefined }),
      });
      if (res.ok) await refreshStatus();
    } catch {}
  };

  const defaultList = Array.isArray(config?.stations) && config.stations.length > 0
    ? config.stations
    : DEFAULT_FALLBACK_STATIONS;
  const allStations = useMemo(() => [...defaultList, ...customStations], [defaultList, customStations]);

  // Station Filterung
  const filteredStations = useMemo(() => {
    return allStations.filter((s) => {
      const matchesSearch = !stationSearch.trim() ||
        s.name.toLowerCase().includes(stationSearch.toLowerCase()) ||
        s.url.toLowerCase().includes(stationSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (stationFilter === "all") return true;
      if (stationFilter === "sunshine-live") return s.source === "sunshine-live";
      if (stationFilter === "somafm") return s.source === "somafm";
      if (stationFilter === "laut.fm") return s.source === "laut.fm";
      if (stationFilter === "custom") return s.source === "custom" || s.id.startsWith("custom-");
      return true;
    });
  }, [allStations, stationSearch, stationFilter]);

  // Sound Folders
  const soundFolders = useMemo(() => {
    const folders = new Set<string>();
    sounds.forEach((s) => {
      if (s.folder) folders.add(s.folder);
    });
    return Array.from(folders).sort();
  }, [sounds]);

  // Filtered Sounds
  const filteredSounds = useMemo(() => {
    return sounds.filter((s) => {
      const matchesSearch = !soundSearch.trim() ||
        s.name.toLowerCase().includes(soundSearch.toLowerCase()) ||
        (s.folder && s.folder.toLowerCase().includes(soundSearch.toLowerCase()));

      if (!matchesSearch) return false;
      if (soundFolderFilter === "all") return true;
      return s.folder === soundFolderFilter;
    });
  }, [sounds, soundSearch, soundFolderFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isRadioPlaying = liveStatus && !liveStatus.paused;
  const isAnyPlaying = isRadioPlaying || (musicQueue?.current && !musicQueue.paused);
  const currentTitle = liveStatus?.nowPlaying || liveStatus?.name || (musicQueue?.current ? musicQueue.current.title : null);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-discord-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Radio & Musik</h1>
            <p className="text-xs text-gray-400">Stream-Sender, Soundboard-Bibliothek, Playlisten & Musikbot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshStatus()}
            className="px-3 py-2 rounded-xl bg-discord-dark border border-discord-border hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Status aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Aktualisieren
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all shadow-md ${message.type === "success" ? "bg-discord-green/10 border-discord-green/30 text-discord-green" : "bg-discord-red/10 border-discord-red/30 text-discord-red"}`}>
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-medium text-xs md:text-sm">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs opacity-60 hover:opacity-100 font-bold px-2 py-0.5">✕</button>
        </div>
      )}

      {/* PERSISTENT TOP MINI-PLAYER */}
      <div className="bg-gradient-to-r from-discord-card via-discord-card/95 to-discord-dark border border-discord-border rounded-2xl p-4 md:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status & Now Playing Display */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isRadioPlaying
                ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                : liveStatus?.paused
                ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                : "bg-discord-dark border-discord-border text-gray-500"
            }`}>
              {isRadioPlaying ? <Music className="w-6 h-6 animate-bounce" /> : <Disc className="w-6 h-6" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isRadioPlaying
                    ? "bg-discord-green/20 text-discord-green border border-discord-green/30"
                    : liveStatus?.paused
                    ? "bg-discord-yellow/20 text-discord-yellow border border-discord-yellow/30"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRadioPlaying ? "bg-discord-green animate-ping" : liveStatus?.paused ? "bg-discord-yellow" : "bg-gray-500"}`}></span>
                  {isRadioPlaying ? "Live Stream" : liveStatus?.paused ? "Pausiert" : "Bereit"}
                </span>

                {liveStatus?.channelId && (
                  <span className="text-[11px] font-medium text-gray-400 bg-discord-dark px-2 py-0.5 rounded-md border border-discord-border truncate max-w-[150px]">
                    🔊 {voiceChannels.find(c => c.id === liveStatus.channelId)?.name || "Kanal"}
                  </span>
                )}
              </div>

              <p className="text-base font-bold text-white truncate mt-0.5">
                {currentTitle || "Keine aktive Wiedergabe"}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {liveStatus?.nowPlaying
                  ? `${liveStatus.name} · ${liveStatus.url}`
                  : liveStatus?.url
                  ? liveStatus.url
                  : "Wähle unten einen Radio-Sender oder Soundboard-Titel aus."}
              </p>
            </div>
          </div>

          {/* Quick Voice Channel & Player Controls */}
          <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-discord-border/50">
            {/* Voice Channel Picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 hidden sm:inline">Kanal:</label>
              <select
                value={targetVoiceId}
                onChange={(e) => setTargetVoiceId(e.target.value)}
                className="bg-discord-dark border border-discord-border rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-discord-blurple max-w-[160px] truncate"
              >
                <option value="">Auto / Temp-Kanal</option>
                {voiceChannels.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    🔊 {ch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Play/Pause & Stop */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => liveStatus?.paused ? control("resume") : control("pause")}
                disabled={!liveStatus}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 ${
                  liveStatus?.paused
                    ? "bg-discord-green hover:bg-discord-green/90 text-black shadow-md shadow-discord-green/20"
                    : "bg-discord-yellow hover:bg-discord-yellow/90 text-black"
                }`}
              >
                {liveStatus?.paused ? <><Play className="w-3.5 h-3.5 fill-current" /> Weiter</> : <><Pause className="w-3.5 h-3.5 fill-current" /> Pause</>}
              </button>

              <button
                onClick={() => control("stop")}
                disabled={!liveStatus && !musicQueue?.current}
                className="px-3 py-2 rounded-xl bg-discord-red/90 hover:bg-discord-red text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 bg-discord-dark px-2.5 py-1.5 rounded-xl border border-discord-border">
              <Volume2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <button
                onClick={() => changeVolume((liveStatus?.volume ?? 100) - 10)}
                className="w-6 h-6 rounded-lg bg-discord-card hover:bg-gray-700 text-gray-200 text-xs font-black flex items-center justify-center transition-colors"
                title="Leiser (−10%)"
              >
                −
              </button>
              <span className="text-xs font-semibold text-white min-w-[32px] text-center">
                {liveStatus?.volume ?? 100}%
              </span>
              <button
                onClick={() => changeVolume((liveStatus?.volume ?? 100) + 10)}
                className="w-6 h-6 rounded-lg bg-discord-card hover:bg-gray-700 text-gray-200 text-xs font-black flex items-center justify-center transition-colors"
                title="Lauter (+10%)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {liveStatus?.lastError && (
          <div className="mt-3 pt-3 border-t border-discord-border/40 text-xs text-discord-red flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Fehler im Stream: {liveStatus.lastError}</span>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-discord-border gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("radio")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === "radio"
              ? "border-discord-blurple text-white bg-discord-blurple/10 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-discord-card/50 rounded-t-xl"
          }`}
        >
          <Radio className="w-4 h-4" />
          Radio-Sender
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-discord-dark border border-discord-border text-gray-400 font-semibold">
            {allStations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sounds")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === "sounds"
              ? "border-discord-blurple text-white bg-discord-blurple/10 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-discord-card/50 rounded-t-xl"
          }`}
        >
          <Volume2 className="w-4 h-4" />
          Soundboard & Musik
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-discord-dark border border-discord-border text-gray-400 font-semibold">
            {sounds.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("playlists")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === "playlists"
              ? "border-discord-blurple text-white bg-discord-blurple/10 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-discord-card/50 rounded-t-xl"
          }`}
        >
          <ListMusic className="w-4 h-4" />
          Playlisten & Queue
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-discord-dark border border-discord-border text-gray-400 font-semibold">
            {playlists.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === "settings"
              ? "border-discord-blurple text-white bg-discord-blurple/10 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-discord-card/50 rounded-t-xl"
          }`}
        >
          <Settings className="w-4 h-4" />
          Bot-Einstellungen
          {worker?.running && (
            <span className="w-2 h-2 rounded-full bg-discord-green" title="Worker aktiv"></span>
          )}
        </button>
      </div>

      {/* TAB 1: RADIO-SENDER */}
      {activeTab === "radio" && (
        <div className="space-y-6">
          {/* Controls Bar: Search, Category Filter, and Add Button */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-lg">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Sender suchen …"
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                className="w-full bg-discord-dark border border-discord-border rounded-xl pl-9 pr-4 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple transition-all"
              />
              {stationSearch && (
                <button
                  onClick={() => setStationSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: "all", label: "Alle" },
                { id: "sunshine-live", label: "SUNSHINE LIVE" },
                { id: "somafm", label: "SomaFM" },
                { id: "laut.fm", label: "laut.fm" },
                { id: "custom", label: "Eigene" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStationFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    stationFilter === f.id
                      ? "bg-discord-blurple text-white shadow"
                      : "bg-discord-dark border border-discord-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Toggle Add Station */}
            <button
              onClick={() => setShowAddStation(!showAddStation)}
              className="px-4 py-2 rounded-xl bg-discord-dark border border-discord-border hover:border-discord-blurple text-gray-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              {showAddStation ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddStation ? "Schließen" : "+ Eigener Stream"}
            </button>
          </div>

          {/* Collapsible: Add Custom Station Form */}
          {showAddStation && (
            <div className="bg-discord-card border border-discord-blurple/40 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-discord-border/50 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-discord-blurple" /> Neuen Radiosender hinzufügen
                </h3>
                <span className="text-xs text-gray-400">Stream-URL (Icecast, Shoutcast, MP3-Stream)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Sendername (z. B. Sunshine Live Trance)"
                  value={newStation.name}
                  onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                  className="bg-discord-dark border border-discord-border rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
                />
                <input
                  type="text"
                  placeholder="Stream-URL (https://stream.example.com/audio.mp3)"
                  value={newStation.url}
                  onChange={(e) => setNewStation({ ...newStation, url: e.target.value })}
                  className="bg-discord-dark border border-discord-border rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddStation(false)}
                  className="px-4 py-2 rounded-xl bg-discord-dark border border-discord-border hover:border-gray-500 text-gray-300 text-xs font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  onClick={addStation}
                  disabled={!newStation.name.trim() || !newStation.url.trim()}
                  className="px-5 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-discord-blurple/20 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Sender speichern
                </button>
              </div>
            </div>
          )}

          {/* Stations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredStations.map((station) => {
              const isCurrent = liveStatus?.url === station.url;
              return (
                <div
                  key={station.id}
                  className={`group relative p-4 rounded-2xl bg-discord-card border transition-all duration-200 flex flex-col justify-between gap-3 shadow-md hover:shadow-lg ${
                    isCurrent
                      ? "border-discord-green/60 bg-discord-green/[0.04]"
                      : "border-discord-border hover:border-gray-500"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-white truncate group-hover:text-discord-blurple transition-colors">
                            {station.name}
                          </p>
                          {station.active === false && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-red/20 text-discord-red font-semibold">
                              Deaktiviert
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-discord-green/20 text-discord-green font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-discord-green animate-pulse"></span>
                              Läuft
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5 font-mono opacity-80" title={station.url}>
                          {station.url}
                        </p>
                      </div>

                      {station.source === "custom" || station.id.startsWith("custom-") ? (
                        <button
                          onClick={() => removeStation(station.id)}
                          className="text-gray-500 hover:text-discord-red p-1 transition-colors"
                          title="Sender löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {station.source && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-discord-dark px-2 py-0.5 rounded-md border border-discord-border">
                          {station.source}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-discord-border/50">
                    <button
                      onClick={() => testUrl(station)}
                      disabled={testing === station.id}
                      className="px-2.5 py-1.5 rounded-lg bg-discord-dark border border-discord-border hover:border-gray-400 text-gray-300 hover:text-white text-[11px] font-semibold disabled:opacity-50 transition-all"
                      title="Prüft ob der Stream Audio liefert"
                    >
                      {testing === station.id ? "…" : "Probe"}
                    </button>

                    <button
                      onClick={() => playStation(station)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" /> Abspielen
                    </button>

                    <button
                      onClick={() => setupAndStart(station)}
                      disabled={settingUp === station.id}
                      className="px-3 py-1.5 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all"
                      title="Erstellt einen temporären Discord-Sprachkanal für diesen Sender und spielt dort"
                    >
                      {settingUp === station.id ? "…" : <><Plus className="w-3 h-3" /> Temp-Kanal</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStations.length === 0 && (
            <div className="text-center py-12 bg-discord-card border border-discord-border rounded-2xl p-8">
              <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-300">Keine Sender gefunden</p>
              <p className="text-xs text-gray-500 mt-1">Versuche eine andere Suchanfrage oder Kategorie.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOUNDBOARD & MUSIK */}
      {activeTab === "sounds" && (
        <div className="space-y-6">
          {/* Top Bar with Search & Upload Toggle */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-lg">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Sounds & Dateien suchen …"
                value={soundSearch}
                onChange={(e) => setSoundSearch(e.target.value)}
                className="w-full bg-discord-dark border border-discord-border rounded-xl pl-9 pr-4 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
              />
              {soundSearch && (
                <button
                  onClick={() => setSoundSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Folder Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSoundFolderFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  soundFolderFilter === "all"
                    ? "bg-discord-blurple text-white shadow"
                    : "bg-discord-dark border border-discord-border text-gray-400 hover:text-gray-200"
                }`}
              >
                Alle ({sounds.length})
              </button>
              {soundFolders.map((f) => {
                const count = sounds.filter((s) => s.folder === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setSoundFolderFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      soundFolderFilter === f
                        ? "bg-discord-blurple text-white shadow"
                        : "bg-discord-dark border border-discord-border text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <Folder className="w-3 h-3" /> {f} ({count})
                  </button>
                );
              })}
            </div>

            {/* Upload Toggle */}
            <button
              onClick={() => setShowUploadBox(!showUploadBox)}
              className="px-4 py-2 rounded-xl bg-discord-dark border border-discord-border hover:border-discord-blurple text-gray-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-discord-blurple" />
              {showUploadBox ? "Upload schließen" : "📤 Musik hochladen"}
            </button>
          </div>

          {/* Integrated Upload Box (Drag & Drop + DM Code) */}
          {showUploadBox && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Drag & Drop Upload */}
              <div className="lg:col-span-2 bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-discord-blurple" /> Audio-Dateien / Ordner hochladen
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Unterstützt MP3, WAV, OGG, M4A (max. 25 MB). Dateien landen direkt in der Bibliothek und sind per Bot abspielbar.
                  </p>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    void (async () => {
                      const items = await collectDropped(e.dataTransfer);
                      await uploadCollected(items);
                    })();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    dragging ? "border-discord-blurple bg-discord-blurple/10" : "border-discord-border bg-discord-dark"
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-300">Dateien oder Ordner hierher ziehen & ablegen</p>
                  <p className="text-[11px] text-gray-500 mt-1">Ordner werden automatisch als Playlist angelegt!</p>

                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    <label className="px-4 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs cursor-pointer shadow-md">
                      Dateien wählen
                      <input
                        type="file" multiple accept=".mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/mp4"
                        className="hidden"
                        onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }}
                      />
                    </label>
                    <label className="px-4 py-2 rounded-xl bg-discord-card border border-discord-border hover:border-gray-500 text-gray-200 font-bold text-xs cursor-pointer">
                      📁 Ordner wählen
                      <input
                        type="file" multiple accept=".mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/mp4"
                        className="hidden"
                        ref={(el) => { if (el) el.setAttribute("webkitdirectory", ""); }}
                        onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }}
                      />
                    </label>
                  </div>
                  {uploading && <p className="text-xs text-discord-blurple font-bold mt-3 animate-pulse">⏳ Lade Dateien hoch …</p>}
                </div>
              </div>

              {/* DM-Upload Code */}
              <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    💬 Discord DM-Upload
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Erzeuge einen Einmal-Code (10 Min. gültig), um dem Bot via Direktnachricht Audio-Dateien zu senden.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      setMessage(null);
                      try {
                        const res = await fetch("/api/bot/music/upload-code", { method: "POST" });
                        const data = await res.json();
                        if (res.ok) setUploadCode(data.code);
                        else setMessage({ text: `❌ ${data.error || "Konnte Code nicht erzeugen."}`, type: "error" });
                      } catch (e: any) {
                        setMessage({ text: `❌ ${e.message}`, type: "error" });
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs transition-all shadow"
                  >
                    Neuen Code erzeugen
                  </button>

                  {uploadCode && (
                    <div className="p-3 rounded-xl bg-discord-dark border border-discord-green/40 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Dein Upload-Code:</p>
                      <code className="text-lg font-mono font-black text-discord-green tracking-wider">{uploadCode}</code>
                      <p className="text-[10px] text-gray-500 mt-1">Sende eine MP3 im DM-Chat mit diesem Code als Text.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Soundboard List */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 md:p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-discord-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Audio-Dateien ({filteredSounds.length})</h3>
              </div>
              <p className="text-xs text-gray-400 hidden sm:inline">💡 Sounds per Drag & Drop in Playlisten ziehen</p>
            </div>

            {filteredSounds.length === 0 ? (
              <div className="text-center py-10">
                <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Keine Sounds gefunden.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredSounds.map((s) => (
                  <div
                    key={s.file}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-sound", s.file);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-discord-dark border border-discord-border hover:border-gray-500 gap-2.5 cursor-grab active:cursor-grabbing transition-colors"
                    title="In Playlist ziehen zum Hinzufügen"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="text-gray-500 font-mono text-xs select-none">⠿</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.folder && (
                            <span className="text-[10px] text-gray-400 bg-discord-card px-1.5 py-0.2 rounded border border-discord-border/50">
                              📁 {s.folder}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">{s.sizeKb} KB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/api/radio/download?file=${encodeURIComponent(s.file)}`}
                        className="p-1.5 rounded-lg bg-discord-card border border-discord-border hover:border-gray-400 text-gray-300 hover:text-white transition-colors"
                        title="Datei herunterladen"
                      >
                        ⬇
                      </a>
                      <button
                        onClick={async () => {
                          setMessage(null);
                          try {
                            const res = await fetch("/api/bot/music/play-local", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ file: s.file, channelId: targetVoiceId || undefined }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setMessage({ text: `▶️ „${data.result?.title || s.name}“ wird abgespielt.`, type: "success" });
                              await refreshStatus();
                            } else {
                              setMessage({ text: `❌ ${data.error || "Konnte Datei nicht abspielen."}`, type: "error" });
                            }
                          } catch (e: any) {
                            setMessage({ text: `❌ ${e.message}`, type: "error" });
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Play className="w-3 h-3 fill-current" /> Abspielen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PLAYLISTEN & QUEUE */}
      {activeTab === "playlists" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Playlists Manager */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-discord-border/50 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-discord-blurple" /> Eigene Playlisten
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Sounds per Drag & Drop hineinziehen ({myPlaylistCount}/2 eigene Playlisten)
                </p>
              </div>
            </div>

            {/* Create Playlist Form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Neue Playlist (z. B. Party Mix) …"
                value={newPlaylist}
                onChange={(e) => setNewPlaylist(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void createPlaylist(newPlaylist); }}
                className="flex-1 bg-discord-dark border border-discord-border rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
              />
              <button
                onClick={() => void createPlaylist(newPlaylist)}
                disabled={!newPlaylist.trim()}
                className="px-4 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Erstellen
              </button>
            </div>

            {/* Playlist Cards */}
            <div className="space-y-3 pt-2">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.getData("application/x-sound");
                    const move = e.dataTransfer.getData("application/x-plmove");
                    let next = playlists.map((p) => ({ ...p, files: [...p.files] }));
                    if (file && !next.find((p) => p.id === pl.id)!.files.includes(file)) {
                      next.find((p) => p.id === pl.id)!.files.push(file);
                    }
                    if (move) {
                      try {
                        const { from, mfile } = JSON.parse(move);
                        next = next.map((p) => p.id === from ? { ...p, files: p.files.filter((f) => f !== mfile) } : p);
                        if (!next.find((p) => p.id === pl.id)!.files.includes(mfile)) {
                          next.find((p) => p.id === pl.id)!.files.push(mfile);
                        }
                      } catch {}
                    }
                    void persistPlaylists(next);
                  }}
                  className="p-4 rounded-xl bg-discord-dark border border-discord-border space-y-3 transition-colors hover:border-gray-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">
                        {pl.name}
                        <span className="text-xs text-gray-400 font-normal ml-1.5">({pl.files.length} Titel)</span>
                      </p>
                      {pl.ownerId && pl.ownerId === myUid && (
                        <span className="text-[10px] text-discord-green bg-discord-green/10 border border-discord-green/30 px-1.5 py-0.2 rounded font-semibold">
                          Meine
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          setMessage(null);
                          try {
                            const res = await fetch("/api/bot/music/play-playlist", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ files: pl.files, channelId: targetVoiceId || undefined }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setMessage({ text: `▶️ Playlist „${pl.name}“: ${data.added} in Queue.`, type: "success" });
                              await refreshStatus();
                            } else {
                              setMessage({ text: `❌ ${data.error || "Konnte Playlist nicht starten."}`, type: "error" });
                            }
                          } catch (e: any) {
                            setMessage({ text: `❌ ${e.message}`, type: "error" });
                          }
                        }}
                        disabled={pl.files.length === 0}
                        className="px-3 py-1.5 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-xs font-bold disabled:opacity-40 flex items-center gap-1 transition-all"
                      >
                        <Play className="w-3 h-3 fill-current" /> Alle abspielen
                      </button>
                      <button
                        onClick={() => void persistPlaylists(playlists.filter((p) => p.id !== pl.id))}
                        className="text-gray-500 hover:text-discord-red p-1 transition-colors"
                        title="Playlist löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {pl.files.length === 0 ? (
                    <div className="p-3 border border-dashed border-discord-border rounded-lg text-center text-xs text-gray-500">
                      Ziehe Sounds aus dem Tab „Soundboard“ hierher
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {pl.files.map((f, idx) => (
                        <div
                          key={`${f}-${idx}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/x-plmove", JSON.stringify({ from: pl.id, mfile: f, index: idx }));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const move = e.dataTransfer.getData("application/x-plmove");
                            if (!move) return;
                            try {
                              const { from, mfile } = JSON.parse(move);
                              let next = playlists.map((p) => ({ ...p, files: [...p.files] }));
                              next = next.map((p) => p.id === from ? { ...p, files: p.files.filter((x) => x !== mfile) } : p);
                              const target = next.find((p) => p.id === pl.id)!;
                              const insertAt = from === pl.id && target.files.indexOf(mfile) >= 0 ? idx : Math.min(idx, target.files.length);
                              if (!(from === pl.id && target.files.includes(mfile))) {
                                target.files.splice(insertAt, 0, mfile);
                              } else {
                                const cur = target.files.indexOf(mfile);
                                target.files.splice(cur, 1);
                                target.files.splice(Math.min(idx, target.files.length), 0, mfile);
                              }
                              void persistPlaylists(next);
                            } catch {}
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-discord-card border border-discord-border cursor-grab active:cursor-grabbing text-xs hover:border-gray-500 transition-colors"
                        >
                          <p className="text-white truncate">⠿ {f}</p>
                          <button
                            onClick={() => void persistPlaylists(playlists.map((p) => p.id === pl.id ? { ...p, files: p.files.filter((x) => x !== f) } : p))}
                            className="text-gray-500 hover:text-discord-red font-bold ml-2 px-1"
                            title="Entfernen"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {playlists.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">Noch keine Playlist angelegt.</p>
              )}
            </div>
          </div>

          {/* YouTube Music Queue */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-discord-border/50 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-discord-blurple" /> Discord Warteschlange
              </h3>
              <span className="text-xs text-gray-400 font-mono">/music play</span>
            </div>

            {!musicQueue?.current && (!musicQueue?.queue || musicQueue.queue.length === 0) ? (
              <div className="text-center py-8">
                <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Keine Songs in der Discord-Warteschlange.</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Verwende <code className="text-indigo-300">/music play &lt;Titel&gt;</code> auf Discord.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {musicQueue.lastError && (
                  <p className="text-xs text-discord-red bg-discord-red/10 p-2.5 rounded-lg border border-discord-red/30">
                    ⚠️ {musicQueue.lastError}
                  </p>
                )}

                {/* Currently playing YouTube track */}
                {musicQueue.current && (
                  <div className="p-3.5 rounded-xl bg-discord-green/10 border border-discord-green/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-discord-green tracking-wider">
                        ▶️ Läuft gerade {musicQueue.paused ? "(pausiert)" : ""}
                      </span>
                      {musicQueue.loop !== "off" && (
                        <span className="text-[10px] text-discord-yellow font-semibold">Loop: {musicQueue.loop}</span>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm truncate">{musicQueue.current.title}</p>
                    <p className="text-xs text-gray-400">
                      Dauer: {musicQueue.current.duration} · Von: {musicQueue.current.requestedBy?.tag || musicQueue.current.requestedBy}
                    </p>
                  </div>
                )}

                {/* Upcoming Queue */}
                {musicQueue.queue && musicQueue.queue.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-gray-400">Nächste Titel ({musicQueue.queue.length}):</p>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {musicQueue.queue.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-discord-dark border border-discord-border text-xs">
                          <p className="text-white truncate">
                            <span className="text-gray-500 font-bold mr-1.5">#{i + 1}</span> {item.title}
                          </p>
                          <span className="text-gray-400 shrink-0 ml-2 font-mono text-[11px]">{item.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BOT-EINSTELLUNGEN */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Radio Bot Name */}
          <form onSubmit={handleSave} className="bg-discord-card border border-discord-border rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="border-b border-discord-border/50 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-400" /> Radio-Bot Konfiguration
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Anzeigename des Radio-Bots im Discord-Server</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-discord-blurple/20 disabled:opacity-50 transition-all"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </button>
            </div>
            <div className="max-w-md space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Bot-Anzeigename</label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
              />
            </div>
          </form>

          {/* Musik-Bot Worker Process */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="border-b border-discord-border/50 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  🤖 Separater Musik-Bot Prozess (Worker)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Läuft unabhängig vom Hauptbot, damit Radio und Musik sich nicht gegenseitig blockieren.
                </p>
              </div>
              {worker && (
                <div className="flex gap-2">
                  <button onClick={() => controlWorker("start")} className="px-3 py-1.5 rounded-lg bg-discord-green hover:bg-discord-green/90 text-black text-xs font-bold transition-all">Start</button>
                  <button onClick={() => controlWorker("restart")} className="px-3 py-1.5 rounded-lg bg-discord-yellow hover:bg-discord-yellow/90 text-black text-xs font-bold transition-all">Restart</button>
                  <button onClick={() => controlWorker("stop")} className="px-3 py-1.5 rounded-lg bg-discord-red hover:bg-discord-red/90 text-white text-xs font-bold transition-all">Stop</button>
                </div>
              )}
            </div>

            {!worker ? (
              <p className="text-xs text-gray-400">Status lädt …</p>
            ) : !worker.configured ? (
              <p className="text-xs text-gray-400">
                Nicht konfiguriert: Trage unten den Token ein oder setze <code className="text-indigo-300">MUSICBOT_TOKEN</code> in der .env.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-discord-dark border border-discord-border">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Status</p>
                  <p className={`text-sm font-bold mt-1 ${worker.running ? "text-discord-green" : "text-discord-red"}`}>
                    {worker.running ? "● Läuft" : "○ Gestoppt"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-discord-dark border border-discord-border">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Prozess-ID (PID)</p>
                  <p className="text-sm font-bold text-white mt-1 font-mono">{worker.pid ?? "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-discord-dark border border-discord-border">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Laufzeit</p>
                  <p className="text-sm font-bold text-white mt-1">{Math.floor(worker.uptimeSec / 60)} Min.</p>
                </div>
                <div className="p-3 rounded-xl bg-discord-dark border border-discord-border">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Restarts</p>
                  <p className="text-sm font-bold text-white mt-1">{worker.restarts}</p>
                </div>
              </div>
            )}
          </div>

          {/* Musik-Bot Credentials & Invite */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="border-b border-discord-border/50 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  🔑 Zweiter Bot-Token & Einladung
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Für simultane Sprachkanäle (z. B. ein Bot für Radio, einer für YouTube)
                </p>
              </div>
            </div>

            <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside bg-discord-dark p-3.5 rounded-xl border border-discord-border">
              <li>
                <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-discord-blurple hover:underline font-bold inline-flex items-center gap-1">
                  Discord Developer Portal öffnen <ExternalLink className="w-3 h-3" />
                </a> → „New Application" → Name eingeben.
              </li>
              <li>Reiter „Bot" → „Reset Token" → Token kopieren und unten einfügen.</li>
              <li>Reiter „General Information" → Application-ID kopieren und unten eintragen.</li>
            </ol>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Bot-Token {mbCfg?.tokenSet ? <span className="text-discord-green font-semibold">(gesetzt: {mbCfg.tokenHint})</span> : <span className="text-discord-red font-semibold">(fehlt)</span>}
                </label>
                <input
                  type="password"
                  placeholder="Bot-Token einfügen …"
                  value={mbToken}
                  onChange={(e) => setMbToken(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Application-ID (Client-ID)</label>
                <input
                  type="text"
                  placeholder="Application-ID"
                  value={mbClientId}
                  onChange={(e) => setMbClientId(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Server-ID (leer = Standard-Server)</label>
                <input
                  type="text"
                  placeholder="Guild-ID"
                  value={mbGuildId}
                  onChange={(e) => setMbGuildId(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mbAutostart}
                    onChange={(e) => setMbAutostart(e.target.checked)}
                    className="w-4 h-4 accent-discord-green rounded"
                  />
                  Beim Bot-Start automatisch starten
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end items-center pt-2">
              <a
                href={mbClientId.trim() ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(mbClientId.trim())}&permissions=3990740&scope=bot%20applications.commands` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { if (!mbClientId.trim()) e.preventDefault(); }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  mbClientId.trim()
                    ? "bg-discord-green hover:bg-discord-green/90 text-black shadow-md shadow-discord-green/20"
                    : "bg-discord-dark border border-discord-border text-gray-500 cursor-not-allowed"
                }`}
                title={mbClientId.trim() ? "Musik-Bot auf den Server einladen" : "Erst Application-ID eintragen"}
              >
                ➕ Bot einladen
              </a>

              <button
                onClick={async () => {
                  setMessage(null);
                  try {
                    const res = await fetch("/api/config/musicbot", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token: mbToken || undefined, clientId: mbClientId, guildId: mbGuildId, autostart: mbAutostart }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setMessage({ text: "✅ Gespeichert. Hauptbot neu starten, damit der Token aktiv wird.", type: "success" });
                      setMbToken("");
                      const cfg = await fetch("/api/config/musicbot").then((r) => r.json());
                      setMbCfg(cfg);
                      await refreshStatus();
                    } else {
                      setMessage({ text: `❌ ${data.error || "Speichern fehlgeschlagen."}`, type: "error" });
                    }
                  } catch (e: any) {
                    setMessage({ text: `❌ ${e.message}`, type: "error" });
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-discord-blurple/20"
              >
                <Save className="w-3.5 h-3.5" /> Zugang speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
