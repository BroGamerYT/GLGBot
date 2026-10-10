"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Radio, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Tv, 
  Sparkles, 
  Bell, 
  FolderTree, 
  Plus, 
  Trash2, 
  ExternalLink,
  Search,
  UserCheck,
  Youtube,
  Check,
  Pencil,
  MessageSquare
} from "lucide-react";

interface StreamNotification {
  id: string;
  guildId: string;
  platform: "twitch" | "youtube" | "kick";
  channelName: string;
  displayName?: string;
  profileImageUrl?: string;
  youtubeChannelId?: string;
  discordChannelId: string;
  pingRoleId?: string;
  linkedDiscordUserId?: string;
  customMessage?: string;
  lastNotified?: string;
  isLive?: boolean;
}

interface StreamerSearchResult {
  platform: "twitch" | "youtube";
  channelName: string;
  displayName: string;
  channelId?: string;
  avatar: string;
  url: string;
}

export default function LiveStreamerPage() {
  const [data, setData] = useState<any>(null);
  const [liveRoleId, setLiveRoleId] = useState("");
  const [announcementChannelId, setAnnouncementChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [channelType, setChannelType] = useState<"voice" | "text">("voice");
  const [autoRole, setAutoRole] = useState(true);

  // Stream-Benachrichtigungen
  const [streamers, setStreamers] = useState<StreamNotification[]>([]);
  const [loadingStreamers, setLoadingStreamers] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Live-Autovervollständigung / Suche
  const [channelInput, setChannelInput] = useState("");
  const [platformTab, setPlatformTab] = useState<"all" | "twitch" | "youtube">("all");
  const [searchResults, setSearchResults] = useState<StreamerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStreamer, setSelectedStreamer] = useState<StreamerSearchResult | null>(null);

  // Formular-Zusatzfelder
  const [editingStreamer, setEditingStreamer] = useState<StreamNotification | null>(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newChannelId, setNewChannelId] = useState("");
  const [newPingRoleId, setNewPingRoleId] = useState("");
  const [newLinkedUserId, setNewLinkedUserId] = useState("");
  const [newCustomMessage, setNewCustomMessage] = useState("");
  const [addingStreamer, setAddingStreamer] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, liveRes, streamerRes] = await Promise.all([
          fetch("/api/discord/guild").then((r) => r.json()),
          fetch("/api/config/live").then((r) => r.json()),
          fetch("/api/config/streamers").then((r) => r.json()),
        ]);
        setData(guildRes);
        if (liveRes?.liveRoleId) setLiveRoleId(liveRes.liveRoleId);
        if (liveRes?.announcementChannelId) {
          setAnnouncementChannelId(liveRes.announcementChannelId);
          setNewChannelId(liveRes.announcementChannelId);
        } else if (guildRes?.textChannels?.length) {
          const streamCh = guildRes.textChannels.find((c: any) => c.name.toLowerCase().includes("stream"));
          if (streamCh) setNewChannelId(streamCh.id);
        }
        if (liveRes?.categoryId) setCategoryId(liveRes.categoryId);
        if (liveRes?.channelType) setChannelType(liveRes.channelType);
        if (typeof liveRes?.autoRole === "boolean") setAutoRole(liveRes.autoRole);

        if (Array.isArray(streamerRes)) {
          setStreamers(streamerRes);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingStreamers(false);
      }
    }
    load();
  }, []);

  // Automatische Live-Suche mit Debounce bei Tastatureingabe
  useEffect(() => {
    if (selectedStreamer) return;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = channelInput.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/streamers?q=${encodeURIComponent(trimmed)}&platform=${platformTab}`);
        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results)) {
            setSearchResults(results);
          }
        }
      } catch (err) {
        console.error("Suchfehler:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [channelInput, platformTab, selectedStreamer]);

  const handleSelectSearchResult = (result: StreamerSearchResult) => {
    setSelectedStreamer(result);
    setChannelInput(result.channelName);
    setShowDropdown(false);
  };

  const handleResetSelected = () => {
    setSelectedStreamer(null);
    setChannelInput("");
    setSearchResults([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveRoleId) {
      setMessage({ text: "❌ Bitte wähle eine Live-Rolle aus.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/config/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveRoleId,
          announcementChannelId: announcementChannelId || undefined,
          categoryId: categoryId || undefined,
          channelType,
          autoRole,
        }),
      });

      if (res.ok) {
        setMessage({ text: "✅ Live-Streamer Einstellungen erfolgreich gespeichert!", type: "success" });
      } else {
        setMessage({ text: "❌ Fehler beim Speichern der Konfiguration.", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStreamer(null);
    handleResetSelected();
    setChannelInput("");
    setNewDisplayName("");
    setNewChannelId(textChannels[0]?.id || "");
    setNewPingRoleId("");
    setNewLinkedUserId("");
    setNewCustomMessage("");
    setShowAddModal(true);
  };

  const handleOpenEditModal = (s: StreamNotification) => {
    setEditingStreamer(s);
    setPlatformTab(s.platform === "youtube" ? "youtube" : "twitch");
    setSelectedStreamer({
      platform: s.platform as "twitch" | "youtube",
      channelName: s.channelName,
      displayName: s.displayName || s.channelName,
      channelId: s.youtubeChannelId,
      avatar: s.profileImageUrl || "",
      url: s.platform === "youtube" ? `https://youtube.com/${s.channelName}` : `https://twitch.tv/${s.channelName}`,
    });
    setChannelInput(s.channelName);
    setNewDisplayName(s.displayName || s.channelName);
    setNewChannelId(s.discordChannelId);
    setNewPingRoleId(s.pingRoleId || "");
    setNewLinkedUserId(s.linkedDiscordUserId || "");
    setNewCustomMessage(s.customMessage || "");
    setShowAddModal(true);
  };

  const insertVariable = (tag: string) => {
    setNewCustomMessage((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const handleAddStreamer = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalChannelName = selectedStreamer ? selectedStreamer.channelName : channelInput.trim();
    if (!finalChannelName || !newChannelId) {
      alert("Bitte wähle einen Streamer und einen Discord-Zielkanal aus.");
      return;
    }

    setAddingStreamer(true);
    try {
      const payload = {
        id: editingStreamer ? editingStreamer.id : undefined,
        platform: selectedStreamer ? selectedStreamer.platform : (platformTab === "youtube" ? "youtube" : "twitch"),
        channelName: finalChannelName,
        displayName: newDisplayName.trim() || selectedStreamer?.displayName,
        profileImageUrl: selectedStreamer?.avatar,
        channelId: selectedStreamer?.channelId,
        discordChannelId: newChannelId,
        pingRoleId: newPingRoleId || undefined,
        linkedDiscordUserId: newLinkedUserId || undefined,
        customMessage: newCustomMessage.trim() || undefined,
      };

      const res = await fetch("/api/config/streamers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.notification) {
        setStreamers((prev) => {
          const idx = prev.findIndex((s) => s.id === json.notification.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = json.notification;
            return copy;
          }
          return [...prev, json.notification];
        });
        handleResetSelected();
        setShowAddModal(false);
        setEditingStreamer(null);
        setMessage({ 
          text: `✅ ${json.notification.platform === "youtube" ? "YouTube" : "Twitch"}-Streamer "${json.notification.displayName}" erfolgreich ${editingStreamer ? "aktualisiert" : "hinzugefügt"}!`, 
          type: "success" 
        });
      } else {
        alert(json.error || "Fehler beim Speichern des Streamers.");
      }
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setAddingStreamer(false);
    }
  };

  const handleDeleteStreamer = async (id: string, name: string) => {
    if (!confirm(`Möchtest du die Benachrichtigung für "${name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/config/streamers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStreamers((prev) => prev.filter((s) => s.id !== id));
        setMessage({ text: `✅ Streamer "${name}" wurde entfernt.`, type: "success" });
      }
    } catch (e: any) {
      alert(`Fehler: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const roles = data?.roles || [];
  const textChannels = data?.textChannels || [];
  const categories = data?.categories || [];
  const members = data?.members || [];
  const isConfigured = Boolean(liveRoleId);

  const filteredStreamers = streamers.filter((s) =>
    s.channelName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (s.displayName && s.displayName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-red-500" />
              Live-Streamer & Streamcord Suite
            </h1>
            {isConfigured ? (
              <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium border border-discord-green/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full font-medium border border-yellow-400/20">
                <AlertCircle className="w-3.5 h-3.5" /> Nicht eingerichtet
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Verwalte Stream-Benachrichtigungen für Twitch & YouTube (wie bei Streamcord) mit Live-Vorschau, Pings und automatischen Sprachräumen.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-discord-green/10 border-discord-green/30 text-discord-green"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* STREAMCORD-STYLE STREAM NOTIFICATIONS TABLE */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-discord-border pb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              Stream-Benachrichtigungen (Twitch & YouTube)
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Erhalte automatisch eine stylische Ankündigung im Discord-Kanal, sobald einer deiner eingetragenen Streamer live geht.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Streamer hinzufügen
          </button>
        </div>

        {/* Modal / Add Box with Live Search */}
        {showAddModal && (
          <div className="bg-discord-dark/95 border border-purple-500/40 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-discord-border pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {editingStreamer ? (
                  <>
                    <Pencil className="w-4 h-4 text-purple-400" />
                    Streamer bearbeiten: <span className="text-purple-300 font-bold">{editingStreamer.displayName || editingStreamer.channelName}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-purple-400" />
                    Neue Stream-Benachrichtigung erstellen
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStreamer(null);
                }}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-discord-card border border-discord-border"
              >
                Schließen ✕
              </button>
            </div>

            {/* Plattform Filter Tabs */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-semibold mr-1">Plattform:</span>
              <button
                type="button"
                onClick={() => setPlatformTab("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  platformTab === "all" ? "bg-purple-600 text-white shadow" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                Alle (Auto-Erkennung)
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab("twitch")}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  platformTab === "twitch" ? "bg-purple-600 text-white shadow" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-purple-400" /> Twitch
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab("youtube")}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  platformTab === "youtube" ? "bg-red-600 text-white shadow" : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube
              </button>
            </div>

            <form onSubmit={handleAddStreamer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Live Search Input with Suggestions Dropdown */}
              <div className="relative sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Kanal suchen oder Name eingeben <span className="text-red-500">*</span>
                </label>

                {selectedStreamer ? (
                  /* Ausgewählter Streamer Badge */
                  <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/40 border border-purple-500/50">
                    <div className="flex items-center gap-3">
                      {selectedStreamer.avatar ? (
                        <img
                          src={selectedStreamer.avatar}
                          alt={selectedStreamer.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-purple-500/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold">
                          {selectedStreamer.displayName.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {selectedStreamer.displayName}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                              selectedStreamer.platform === "youtube"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {selectedStreamer.platform}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {selectedStreamer.platform === "youtube" ? selectedStreamer.channelName : `/${selectedStreamer.channelName}`}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetSelected}
                      className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-discord-card border border-discord-border"
                    >
                      Anderen wählen ✕
                    </button>
                  </div>
                ) : (
                  /* Suchfeld */
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tippe z. B. Floslist, BroGamerYT, MontanaBlack..."
                      value={channelInput}
                      onChange={(e) => setChannelInput(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowDropdown(true);
                      }}
                      required
                      className="w-full bg-discord-card border border-discord-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    {isSearching && (
                      <RefreshCw className="w-4 h-4 text-purple-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}

                    {/* Dropdown Suggestions */}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-discord-card border border-discord-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto divide-y divide-discord-border/50">
                        <div className="p-2 text-[11px] font-semibold text-gray-400 bg-discord-dark flex items-center justify-between">
                          <span>Gefundene Kanäle (zum Auswählen anklicken):</span>
                          <span>{searchResults.length} Treffer</span>
                        </div>
                        {searchResults.map((r, idx) => (
                          <div
                            key={`${r.platform}_${r.channelName}_${idx}`}
                            onClick={() => handleSelectSearchResult(r)}
                            className="p-3 hover:bg-discord-dark/80 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {r.avatar ? (
                                <img
                                  src={r.avatar}
                                  alt={r.displayName}
                                  className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                                  {r.displayName.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-semibold text-white flex items-center gap-2">
                                  {r.displayName}
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                      r.platform === "youtube"
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    }`}
                                  >
                                    {r.platform}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {r.platform === "youtube" ? r.channelName : `twitch.tv/${r.channelName}`}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
                              Auswählen <Check className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  Die Live-Suche erkennt Twitch-Streamer und YouTube-Kanäle automatisch während des Tippens!
                </p>
              </div>

              {/* Ziel Discord Kanal */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Ziel-Discord-Kanal <span className="text-red-500">*</span>
                </label>
                <select
                  value={newChannelId}
                  onChange={(e) => setNewChannelId(e.target.value)}
                  required
                  className="w-full bg-discord-card border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="">— Bitte Kanal wählen —</option>
                  {textChannels.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      # {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  In diesen Textchat wird der Stream-Alert gepostet.
                </p>
              </div>

              {/* Ping Rolle */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Ping-Rolle bei Alert (Optional)
                </label>
                <select
                  value={newPingRoleId}
                  onChange={(e) => setNewPingRoleId(e.target.value)}
                  className="w-full bg-discord-card border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="">— Kein Rollen-Ping —</option>
                  <option value="@everyone">@everyone</option>
                  <option value="@here">@here</option>
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Wähle z. B. deine Live-Alert-Rolle <code>@Live-Alerts</code> oder <code>@bn.live</code>.
                </p>
              </div>

              {/* Discord Mitglied verknüpfen */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-discord-blurple" />
                  Discord-Mitglied verknüpfen (Optional)
                </label>
                <select
                  value={newLinkedUserId}
                  onChange={(e) => setNewLinkedUserId(e.target.value)}
                  className="w-full bg-discord-card border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="">— Niemand verknüpft —</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} (@{m.username})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Vergibt dem Mitglied beim Streamen automatisch die <code>@Live</code>-Rolle & erstellt einen Live-Voice-Raum!
                </p>
              </div>

              {/* Benutzerdefinierter Anzeigename */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Benutzerdefinierter Anzeigename (Optional)
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder={selectedStreamer ? selectedStreamer.displayName : "z. B. Floslist Gaming oder BroGamer"}
                  className="w-full bg-discord-card border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Hier kannst du den Namen anpassen oder überschreiben, wie er im Discord-Alert genannt werden soll.
                </p>
              </div>

              {/* Benutzerdefinierter Benachrichtigungstext (Custom Text) */}
              <div className="sm:col-span-2 space-y-2 border-t border-discord-border pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                    Eigener Benachrichtigungstext / Custom Text (Optional)
                  </label>
                  {newCustomMessage && (
                    <button
                      type="button"
                      onClick={() => setNewCustomMessage("")}
                      className="text-[10px] text-gray-400 hover:text-red-400 underline"
                    >
                      Auf Standard zurücksetzen
                    </button>
                  )}
                </div>

                {/* Variable Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 mr-1">Variablen:</span>
                  {[
                    { tag: "{streamer}", desc: "Name des Streamers" },
                    { tag: "{game}", desc: "Spiel / Kategorie" },
                    { tag: "{title}", desc: "Stream-Titel" },
                    { tag: "{url}", desc: "Direktlink zum Stream" },
                    { tag: "{ping}", desc: "Ping-Rolle / @everyone" },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      title={v.desc}
                      className="px-2 py-0.5 rounded bg-discord-card border border-discord-border text-[11px] font-mono text-purple-300 hover:text-white hover:border-purple-500 hover:bg-purple-950/40 transition-colors"
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={newCustomMessage}
                  onChange={(e) => setNewCustomMessage(e.target.value)}
                  rows={2}
                  placeholder={`z. B. 🚨 Hey Leute! {streamer} zockt gerade live {game}! Kommt alle vorbei: {url}`}
                  className="w-full bg-discord-card border border-discord-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />

                {/* Live-Vorschau Box */}
                <div className="bg-discord-card/70 border border-discord-border/60 rounded-lg p-2.5 text-xs text-gray-300">
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                    Live-Vorschau des Discord-Nachrichtentexts:
                  </div>
                  <div className="font-sans text-white text-xs bg-discord-dark/80 px-2.5 py-1.5 rounded border border-discord-border break-words">
                    {newCustomMessage.trim() ? (
                      newCustomMessage
                        .replace(/{streamer}/gi, newDisplayName.trim() || selectedStreamer?.displayName || "FlosList")
                        .replace(/{game}/gi, "Minecraft")
                        .replace(/{title}/gi, "Community Stream & Fun!")
                        .replace(/{url}/gi, (selectedStreamer?.platform === "youtube" || platformTab === "youtube") ? "https://youtube.com/watch?v=..." : "https://twitch.tv/floslist")
                        .replace(/{ping}|{role}/gi, newPingRoleId === "@everyone" ? "@everyone" : (newPingRoleId === "@here" ? "@here" : (roles.find((r: any) => r.id === newPingRoleId)?.name ? `@${roles.find((r: any) => r.id === newPingRoleId)?.name}` : "@Live-Alerts")))
                    ) : (
                      <span className="text-gray-400 italic">
                        {newPingRoleId ? `${newPingRoleId === "@everyone" ? "@everyone" : (newPingRoleId === "@here" ? "@here" : `@${roles.find((r: any) => r.id === newPingRoleId)?.name || "Rolle"}`)} ` : ""}
                        📢 **{newDisplayName.trim() || selectedStreamer?.displayName || "FlosList"}** ist jetzt live auf {(selectedStreamer?.platform === "youtube" || platformTab === "youtube") ? "YouTube" : "Twitch"}!
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Leer lassen für die Standard-Nachricht. Das farbige Embed mit Thumbnail und Button wird immer automatisch mitgesendet.
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStreamer(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-discord-border text-gray-300 text-xs font-semibold hover:bg-discord-border/80"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={addingStreamer}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {addingStreamer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {editingStreamer ? "Wird gespeichert..." : "Wird hinzugefügt..."}
                    </>
                  ) : (
                    <>
                      {editingStreamer ? (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Änderungen speichern
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Streamer anlegen
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Eingerichtete Streamer filtern..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 self-end sm:self-auto">
            <span>
              Eingerichtet: <strong className="text-white">{streamers.length}</strong> (Unbegrenzt)
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Prüfung: alle 60 Sek.</span>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="overflow-x-auto border border-discord-border rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-discord-dark/80 text-gray-400 text-xs uppercase tracking-wider border-b border-discord-border">
              <tr>
                <th className="px-4 py-3">Streamer / Plattform</th>
                <th className="px-4 py-3">Discord-Kanal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Letzter Alert</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-discord-border">
              {filteredStreamers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {streamers.length === 0 ? (
                      <div className="space-y-2">
                        <p>Noch keine Streamer-Benachrichtigungen eingerichtet.</p>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="text-xs text-purple-400 hover:underline font-semibold"
                        >
                          + Jetzt den ersten Streamer hinzufügen (z. B. Floslist oder BroGamerYT)
                        </button>
                      </div>
                    ) : (
                      "Keine Streamer gefunden, die deiner Suche entsprechen."
                    )}
                  </td>
                </tr>
              ) : (
                filteredStreamers.map((s) => {
                  const channel = textChannels.find((c: any) => c.id === s.discordChannelId);
                  const channelName = channel ? channel.name : s.discordChannelId;
                  const pingRole = roles.find((r: any) => r.id === s.pingRoleId);
                  const linkedMember = members.find((m: any) => m.id === s.linkedDiscordUserId);
                  const isYoutube = s.platform === "youtube";
                  const streamUrl = isYoutube 
                    ? `https://youtube.com/${s.channelName.startsWith("@") ? s.channelName : "@" + s.channelName}` 
                    : `https://twitch.tv/${s.channelName}`;

                  return (
                    <tr key={s.id} className="hover:bg-discord-dark/50 transition-colors">
                      {/* Name / Avatar / Platform */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {s.profileImageUrl ? (
                            <img
                              src={s.profileImageUrl}
                              alt={s.displayName || s.channelName}
                              className={`w-9 h-9 rounded-full object-cover border ${isYoutube ? "border-red-500/40" : "border-purple-500/40"}`}
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full ${isYoutube ? "bg-red-600/30 text-red-300" : "bg-purple-600/30 text-purple-300"} flex items-center justify-center font-bold text-xs`}>
                              {s.channelName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {s.displayName || s.channelName}
                              <a
                                href={streamUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-400 hover:text-white"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                  isYoutube
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {s.platform}
                              </span>
                              <span>{isYoutube ? s.channelName : `/${s.channelName}`}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Discord Channel */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs bg-discord-dark px-2.5 py-1 rounded-md border border-discord-border text-discord-blurple font-mono">
                            # {channelName}
                          </span>
                          {(s.pingRoleId || s.linkedDiscordUserId) && (
                            <div className="text-[11px] text-gray-400 flex items-center gap-2">
                              {s.pingRoleId && (
                                <span className="text-purple-300">
                                  🔔 {s.pingRoleId === "@everyone" ? "@everyone" : `@${pingRole?.name || "Rolle"}`}
                                </span>
                              )}
                              {s.linkedDiscordUserId && (
                                <span className="text-blue-300">
                                  👤 {linkedMember?.displayName || "Mitglied"}
                                </span>
                              )}
                            </div>
                          )}
                          {s.customMessage && (
                            <div className="text-[11px] text-yellow-300/90 flex items-center gap-1.5 mt-1 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 max-w-xs truncate" title={s.customMessage}>
                              <MessageSquare className="w-3 h-3 flex-shrink-0 text-yellow-400" />
                              <span className="truncate font-mono">"{s.customMessage}"</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Live Status */}
                      <td className="px-4 py-3.5">
                        {s.isLive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full font-bold border border-red-500/30 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-500/10 px-2.5 py-1 rounded-full font-medium border border-gray-500/20">
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Letzter Alert */}
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {s.lastNotified ? (
                          <span>{new Date(s.lastNotified).toLocaleString("de-DE")}</span>
                        ) : (
                          <span className="text-gray-500">Noch nie</span>
                        )}
                      </td>

                      {/* Aktionen */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Streamer bearbeiten"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStreamer(s.id, s.displayName || s.channelName)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Benachrichtigung löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GLOBALE LIVE-SYSTEM EINSTELLUNGEN */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="border-b border-discord-border pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            Globale Server-Einstellungen (Live-Rolle & Temporäre Kanäle)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Lege die Server-Live-Rolle fest und bestimme, wie temporäre Streamer-Kanäle auf deinem Server gehandhabt werden.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Live-Rolle */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Streamer-Rolle (Live-Rolle) <span className="text-red-500">*</span>
            </label>
            <select
              value={liveRoleId}
              onChange={(e) => setLiveRoleId(e.target.value)}
              required
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-all font-medium"
            >
              <option value="">— Bitte eine Rolle auswählen —</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  @{r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              Wird dem Creator beim Stream-Start automatisch oder per Befehl verliehen.
            </p>
          </div>

          {/* Standard-Ankündigungskanal */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-discord-blurple" />
              Standard-Ankündigungskanal für Stream-Alerts (Optional)
            </label>
            <select
              value={announcementChannelId}
              onChange={(e) => setAnnouncementChannelId(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-all font-medium"
            >
              <option value="">— Kein Standardkanal (wird pro Streamer festgelegt) —</option>
              {textChannels.map((c: any) => (
                <option key={c.id} value={c.id}>
                  # {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              Fallback-Kanal für allgemeine Live-Alerts.
            </p>
          </div>

          {/* Ziel-Kategorie */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-yellow-400" />
              Ziel-Kategorie für Live-Kanäle
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-all font-medium"
            >
              <option value="">📁 Automatisch (Erstellt Kategorie '🔴 Live Streams' bei Bedarf)</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  📁 {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              Falls keine Kategorie gewählt ist, erstellt der Bot automatisch die Kategorie <code>🔴 Live Streams</code>.
            </p>
          </div>

          {/* Kanal-Art */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Art des generierten Kanals
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  channelType === "voice"
                    ? "bg-red-500/10 border-red-500/50 text-white"
                    : "bg-discord-dark border-discord-border text-gray-300 hover:border-discord-border/80"
                }`}
              >
                <input
                  type="radio"
                  name="channelType"
                  value="voice"
                  checked={channelType === "voice"}
                  onChange={() => setChannelType("voice")}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-sm">🔊 Sprachkanal mit Status (Empfohlen - Kein Automove)</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Erstellt <code>🔴・[Name] ist live</code> mit Link-Status und Embed. Niemand wird ungefragt verschoben.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  channelType === "text"
                    ? "bg-red-500/10 border-red-500/50 text-white"
                    : "bg-discord-dark border-discord-border text-gray-300 hover:border-discord-border/80"
                }`}
              >
                <input
                  type="radio"
                  name="channelType"
                  value="text"
                  checked={channelType === "text"}
                  onChange={() => setChannelType("text")}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-sm">💬 Temporärer Textkanal</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Erstellt einen temporären Textkanal <code>🔴・[Name]-ist-live</code> nur für die Dauer des Streams.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Auto-Rolle Toggle */}
          <div className="bg-discord-dark p-4 rounded-xl border border-discord-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-white">Automatische Discord-Status-Erkennung</span>
              <p className="text-xs text-gray-400">
                Vergibt die Live-Rolle auch dann, wenn Discord die Streaming-Aktivität direkt im Profil anzeigt.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRole}
                onChange={(e) => setAutoRole(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-discord-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Einstellungen speichern
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Streamcord-Ersatz & Chat-Befehle
        </h3>
        <ul className="text-sm text-gray-300 space-y-2.5 list-disc list-inside">
          <li>
            <strong className="text-white">Live-Suche & Autocomplete:</strong> Tippe einfach die ersten Buchstaben eines Twitch- oder YouTube-Streamers ein, und der Bot findet ihn automatisch mit Profilbild!
          </li>
          <li>
            <strong className="text-white">YouTube & Twitch Support:</strong> Unterstützt sowohl Twitch-Livestreams als auch YouTube-Kanäle und Streams.
          </li>
          <li>
            <strong className="text-white">Streamer im Chat verwalten:</strong> Du kannst Streamer auch direkt im Discord mit <code className="text-purple-400 font-mono">/streamer add [name] [kanal] [ping_rolle]</code> hinzufügen oder mit <code className="text-purple-400 font-mono">/streamer list</code> ansehen!
          </li>
          <li>
            <strong className="text-white">Echtzeit-Prüfung:</strong> Mit <code className="text-purple-400 font-mono">/streamer check</code> prüft der Bot alle eingetragenen Streamer sofort auf ihren Live-Status.
          </li>
        </ul>
      </div>
    </div>
  );
}
