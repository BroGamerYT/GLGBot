"use client";

import { useEffect, useState } from "react";
import {
  Palette,
  Send,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Hash,
  ExternalLink,
  Clock,
  Layers,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";

interface Channel {
  id: string;
  name: string;
  parentId?: string;
  type?: number;
}

interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedData {
  title: string;
  description: string;
  url: string;
  color: string;
  authorName: string;
  authorIcon: string;
  authorUrl: string;
  thumbnail: string;
  image: string;
  footerText: string;
  footerIcon: string;
  timestamp: boolean;
  fields: EmbedField[];
}

const PRESET_COLORS = [
  { name: "Blurple", hex: "#5865F2" },
  { name: "Grün", hex: "#57F287" },
  { name: "Gelb", hex: "#FEE75C" },
  { name: "Rot", hex: "#ED4245" },
  { name: "Fuchsia", hex: "#EB459E" },
  { name: "Cyan", hex: "#00B0F4" },
  { name: "Dunkel", hex: "#2B2D31" },
];

export default function EmbedBuilderPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [customChannelId, setCustomChannelId] = useState<string>("");
  const [messageContent, setMessageContent] = useState<string>("");

  const [embed, setEmbed] = useState<EmbedData>({
    title: "Willkommen auf GermanyLanGame!",
    description: "Hier findest du alle wichtigen Neuigkeiten, Events und Informationen rund um unsere Community.",
    url: "",
    color: "#5865F2",
    authorName: "GLG Server-Team",
    authorIcon: "",
    authorUrl: "",
    thumbnail: "",
    image: "",
    footerText: "GermanyLanGame • Automatische Benachrichtigung",
    footerIcon: "",
    timestamp: true,
    fields: [
      {
        id: "f1",
        name: "🎮 Spiele-News",
        value: "Immer aktuell informiert über Rabatte und Updates.",
        inline: true,
      },
      {
        id: "f2",
        name: "🎙️ Temp-Voice",
        value: "Erstelle deinen eigenen Sprachkanal im Voice-Bereich.",
        inline: true,
      },
    ],
  });

  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/bot/embeds/channels")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const chList = data.channels || [];
        setChannels(chList);
        if (chList.length > 0 && !selectedChannel) {
          setSelectedChannel(chList[0].id);
        }
      })
      .catch((err) => {
        console.warn("Konnte Kanäle nicht über Bot-API laden, versuche Fallback:", err);
        fetch("/api/discord/guild")
          .then((r) => r.json())
          .then((d) => {
            const list = d.textChannels || [];
            setChannels(list);
            if (list.length > 0 && !selectedChannel) {
              setSelectedChannel(list[0].id);
            }
          })
          .catch((e) => console.error("Kanal-Laden fehlgeschlagen:", e));
      });
  }, []);

  const addField = () => {
    setEmbed((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: "Neues Feld",
          value: "Feldinhalt hier eingeben...",
          inline: true,
        },
      ],
    }));
  };

  const updateField = (id: string, patch: Partial<EmbedField>) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const removeField = (id: string) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
  };

  const loadPreset = (type: "announcement" | "rules" | "event" | "empty") => {
    if (type === "announcement") {
      setEmbed({
        title: "📢 Wichtige Server-Ankündigung",
        description: "Wir haben soeben ein neues Update für unseren Discord-Server und die Community ausgerollt!",
        url: "",
        color: "#EB459E",
        authorName: "Server-Leitung",
        authorIcon: "",
        authorUrl: "",
        thumbnail: "",
        image: "",
        footerText: "GermanyLanGame • Ankündigungen",
        footerIcon: "",
        timestamp: true,
        fields: [
          { id: "p1", name: "✨ Neuigkeiten", value: "Ticket-System & Vorschlagswesen aktiv.", inline: false },
          { id: "p2", name: "🛡️ Moderation", value: "Verbesserter Spam- und Raid-Schutz.", inline: false },
        ],
      });
    } else if (type === "rules") {
      setEmbed({
        title: "📜 Freundlicher Hinweis zu unseren Regeln",
        description: "Bitte achtet auf einen respektvollen Umgang im Sprach- und Textkanal.",
        url: "",
        color: "#FEE75C",
        authorName: "Moderation",
        authorIcon: "",
        authorUrl: "",
        thumbnail: "",
        image: "",
        footerText: "GLG Moderations-Team",
        footerIcon: "",
        timestamp: true,
        fields: [
          { id: "p3", name: "📌 Regelwerk", value: "Lies dir unsere Regeln im Regel-Kanal durch.", inline: false },
        ],
      });
    } else if (type === "event") {
      setEmbed({
        title: "🎉 Community-Event am Wochenende!",
        description: "Macht euch bereit für unseren gemeinsamen Spiele-Abend!",
        url: "",
        color: "#57F287",
        authorName: "Event-Team",
        authorIcon: "",
        authorUrl: "",
        thumbnail: "",
        image: "",
        footerText: "GermanyLanGame Events",
        footerIcon: "",
        timestamp: true,
        fields: [
          { id: "e1", name: "🕒 Wann?", value: "Samstag ab 20:00 Uhr", inline: true },
          { id: "e2", name: "🎮 Spiel?", value: "Community-Wahl im Chat", inline: true },
        ],
      });
    } else {
      setEmbed({
        title: "Neuer Titel",
        description: "Deine Nachricht hier...",
        url: "",
        color: "#5865F2",
        authorName: "",
        authorIcon: "",
        authorUrl: "",
        thumbnail: "",
        image: "",
        footerText: "",
        footerIcon: "",
        timestamp: false,
        fields: [],
      });
    }
  };

  const handleSend = async () => {
    const targetChannelId = (selectedChannel === "custom" ? customChannelId : selectedChannel).trim();
    if (!targetChannelId) {
      setStatusMessage({ type: "error", text: "Bitte wähle einen Ziel-Kanal aus oder gib eine Kanal-ID ein." });
      return;
    }

    if (!embed.title && !embed.description && embed.fields.length === 0) {
      setStatusMessage({ type: "error", text: "Das Embed benötigt mindestens einen Titel, eine Beschreibung oder ein Feld." });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    const payload = {
      channelId: targetChannelId,
      content: messageContent.trim() || undefined,
      embed: {
        title: embed.title || undefined,
        description: embed.description || undefined,
        url: embed.url || undefined,
        color: embed.color,
        author: embed.authorName
          ? {
              name: embed.authorName,
              iconURL: embed.authorIcon || undefined,
              url: embed.authorUrl || undefined,
            }
          : undefined,
        thumbnail: embed.thumbnail ? { url: embed.thumbnail } : undefined,
        image: embed.image ? { url: embed.image } : undefined,
        footer: embed.footerText
          ? {
              text: embed.footerText,
              iconURL: embed.footerIcon || undefined,
            }
          : undefined,
        timestamp: embed.timestamp,
        fields: embed.fields.map((f) => ({
          name: f.name,
          value: f.value,
          inline: Boolean(f.inline),
        })),
      },
    };

    try {
      const res = await fetch("/api/bot/embeds/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Fehler beim Senden des Embeds." });
      } else {
        setStatusMessage({ type: "success", text: `Embed erfolgreich gesendet! (Nachrichten-ID: ${data.messageId})` });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e?.message || "Verbindungsfehler zum Bot." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Embed-Builder</h1>
              <p className="text-sm text-gray-400">
                Erstelle ansprechende Discord-Embeds mit Live-Vorschau und sende sie direkt in beliebige Kanäle.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadPreset("announcement")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border"
          >
            📢 Ankündigung
          </button>
          <button
            onClick={() => loadPreset("event")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border"
          >
            🎉 Event
          </button>
          <button
            onClick={() => loadPreset("rules")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border"
          >
            📜 Regeln
          </button>
          <button
            onClick={() => loadPreset("empty")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border"
          >
            Leeren
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            statusMessage.type === "success"
              ? "bg-discord-green/10 text-discord-green border-discord-green/20"
              : "bg-discord-red/10 text-discord-red border-discord-red/20"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Left Editor, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Editor Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Kanal & Nachricht */}
          <div className="bg-discord-card border border-discord-border rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-discord-blurple" />
              Zielkanal & Benachrichtigung
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Discord-Kanal</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                  <option value="custom">-- Eigene Kanal-ID --</option>
                </select>
              </div>

              {selectedChannel === "custom" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Manuelle Kanal-ID</label>
                  <input
                    type="text"
                    value={customChannelId}
                    onChange={(e) => setCustomChannelId(e.target.value)}
                    placeholder="123456789012345678"
                    className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Begleittext oberhalb des Embeds (optional)
                </label>
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="z. B. @everyone oder Hey Leute, wichtiges Update!"
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>
            </div>
          </div>

          {/* Embed Gestaltung */}
          <div className="bg-discord-card border border-discord-border rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-fuchsia-400" />
              Farbe & Hauptinhalt
            </h2>

            {/* Farb-Auswahl */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Akzentfarbe</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setEmbed({ ...embed, color: c.hex })}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                      embed.color.toLowerCase() === c.hex.toLowerCase()
                        ? "border-white scale-110 shadow-md"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={embed.color.startsWith("#") ? embed.color : "#5865F2"}
                    onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                    className="w-8 h-8 rounded border border-discord-border bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={embed.color}
                    onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                    className="w-24 bg-discord-dark border border-discord-border rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Autor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-discord-border">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Autor-Name</label>
                <input
                  type="text"
                  value={embed.authorName}
                  onChange={(e) => setEmbed({ ...embed, authorName: e.target.value })}
                  placeholder="z. B. Server-Leitung"
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Autor-Icon URL</label>
                <input
                  type="text"
                  value={embed.authorIcon}
                  onChange={(e) => setEmbed({ ...embed, authorIcon: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Titel & URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Titel</label>
                <input
                  type="text"
                  value={embed.title}
                  onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
                  placeholder="Embed-Titel"
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Titel-Verlinkung (URL)</label>
                <input
                  type="text"
                  value={embed.url}
                  onChange={(e) => setEmbed({ ...embed, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Beschreibung (Markdown möglich)</label>
              <textarea
                rows={4}
                value={embed.description}
                onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
                placeholder="Unterstützt **fett**, *kursiv*, Links [Text](https://...) und Listen."
                className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
              />
            </div>
          </div>

          {/* Felder (Fields) */}
          <div className="bg-discord-card border border-discord-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Felder ({embed.fields.length})
              </h2>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-discord-blurple hover:bg-discord-blurple/80 text-white"
              >
                <Plus className="w-3.5 h-3.5" /> Feld hinzufügen
              </button>
            </div>

            {embed.fields.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Keine Felder vorhanden. Klicke auf „Feld hinzufügen“.</p>
            ) : (
              <div className="space-y-3">
                {embed.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-3 bg-discord-dark border border-discord-border rounded-lg space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-400">Feld #{idx + 1}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.inline}
                            onChange={(e) => updateField(field.id, { inline: e.target.checked })}
                            className="rounded border-discord-border text-discord-blurple"
                          />
                          Inline (nebeneinander)
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="text-gray-400 hover:text-red-400"
                          title="Feld löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(field.id, { name: e.target.value })}
                          placeholder="Feldtitel"
                          className="w-full bg-discord-card border border-discord-border rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                          placeholder="Feldwert"
                          className="w-full bg-discord-card border border-discord-border rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bilder & Medien */}
          <div className="bg-discord-card border border-discord-border rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              Bilder & Grafiken
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Thumbnail-URL (kleines Bild rechts oben)
                </label>
                <input
                  type="text"
                  value={embed.thumbnail}
                  onChange={(e) => setEmbed({ ...embed, thumbnail: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Hauptbild-URL (großes Bild unten)
                </label>
                <input
                  type="text"
                  value={embed.image}
                  onChange={(e) => setEmbed({ ...embed, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Footer & Zeitstempel */}
          <div className="bg-discord-card border border-discord-border rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Fußzeile (Footer) & Zeitstempel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Footer-Text</label>
                <input
                  type="text"
                  value={embed.footerText}
                  onChange={(e) => setEmbed({ ...embed, footerText: e.target.value })}
                  placeholder="z. B. GermanyLanGame Community"
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Footer-Icon URL</label>
                <input
                  type="text"
                  value={embed.footerIcon}
                  onChange={(e) => setEmbed({ ...embed, footerIcon: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={embed.timestamp}
                  onChange={(e) => setEmbed({ ...embed, timestamp: e.target.checked })}
                  className="rounded border-discord-border text-discord-blurple w-4 h-4"
                />
                Aktuellen Zeitstempel im Embed anzeigen
              </label>
            </div>
          </div>

          {/* Senden Button */}
          <div className="pt-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-discord-blurple to-indigo-600 hover:from-discord-blurple/90 hover:to-indigo-500 font-semibold text-white shadow-lg shadow-discord-blurple/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Wird versendet...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Embed jetzt in Discord posten</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Live Discord Preview (5 Cols Sticky) */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              Discord Live-Vorschau
            </span>
            <span className="text-xs text-gray-500">Exakte Darstellung</span>
          </div>

          {/* Discord App Window Mockup */}
          <div className="bg-[#313338] rounded-xl p-4 shadow-2xl border border-gray-800 text-[#dbdee1] font-sans text-sm select-none">
            {/* Discord Message Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white text-base shrink-0 shadow">
                GLG
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm hover:underline cursor-pointer">GLGBot</span>
                  <span className="bg-[#5865F2] text-white text-[10px] font-semibold px-1 py-0.5 rounded uppercase">
                    APP
                  </span>
                  <span className="text-[11px] text-[#949ba4]">Heute um 18:00 Uhr</span>
                </div>

                {/* Optional Message Content */}
                {messageContent && (
                  <div className="mt-1 text-sm text-[#dbdee1] whitespace-pre-wrap">{messageContent}</div>
                )}

                {/* Embed Container */}
                <div
                  className="mt-2 rounded-lg bg-[#2b2d31] border-l-4 p-4 max-w-lg shadow-sm"
                  style={{ borderLeftColor: embed.color || "#5865F2" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Author */}
                      {embed.authorName && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          {embed.authorIcon && (
                            <img
                              src={embed.authorIcon}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className={embed.authorUrl ? "hover:underline cursor-pointer" : ""}>
                            {embed.authorName}
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      {embed.title && (
                        <div className="text-base font-bold text-white">
                          {embed.url ? (
                            <a
                              href={embed.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#00a8fc] hover:underline"
                            >
                              {embed.title}
                            </a>
                          ) : (
                            embed.title
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {embed.description && (
                        <div className="text-sm text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                          {embed.description}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {embed.thumbnail && (
                      <div className="w-20 h-20 shrink-0 rounded overflow-hidden bg-black/20">
                        <img
                          src={embed.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  {embed.fields.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {embed.fields.map((f) => (
                        <div
                          key={f.id}
                          className={f.inline ? "col-span-1" : "col-span-3"}
                        >
                          <div className="text-xs font-bold text-white mb-0.5">{f.name || "Titel"}</div>
                          <div className="text-xs text-[#dbdee1] whitespace-pre-wrap">{f.value || "Inhalt"}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Large Image */}
                  {embed.image && (
                    <div className="mt-3 rounded-lg overflow-hidden bg-black/20 max-h-64">
                      <img
                        src={embed.image}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Footer & Timestamp */}
                  {(embed.footerText || embed.timestamp) && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-[#949ba4]">
                      {embed.footerIcon && (
                        <img
                          src={embed.footerIcon}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      <span>
                        {embed.footerText}
                        {embed.footerText && embed.timestamp && " • "}
                        {embed.timestamp && "Heute um 18:00 Uhr"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            Das Embed wird im Namen von <span className="text-gray-400 font-medium">GLGBot</span> im Zielkanal gepostet.
          </div>
        </div>
      </div>
    </div>
  );
}
