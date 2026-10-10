"use client";

import { useEffect, useState } from "react";
import { Radio, Save, CheckCircle2, AlertCircle, RefreshCw, Tv, Sparkles, Bell, FolderTree } from "lucide-react";

export default function LiveStreamerPage() {
  const [data, setData] = useState<any>(null);
  const [liveRoleId, setLiveRoleId] = useState("");
  const [announcementChannelId, setAnnouncementChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [channelType, setChannelType] = useState<"voice" | "text">("voice");
  const [autoRole, setAutoRole] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, liveRes] = await Promise.all([
          fetch("/api/discord/guild").then((r) => r.json()),
          fetch("/api/config/live").then((r) => r.json()),
        ]);
        setData(guildRes);
        if (liveRes?.liveRoleId) setLiveRoleId(liveRes.liveRoleId);
        if (liveRes?.announcementChannelId) setAnnouncementChannelId(liveRes.announcementChannelId);
        if (liveRes?.categoryId) setCategoryId(liveRes.categoryId);
        if (liveRes?.channelType) setChannelType(liveRes.channelType);
        if (typeof liveRes?.autoRole === "boolean") setAutoRole(liveRes.autoRole);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
  const isConfigured = Boolean(liveRoleId);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-red-500" />
              Live-Streamer System
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
            Erstellt temporäre Kanäle, postet Stream-Alerts in deinen Wunsch-Kanal und vergibt die Live-Rolle – ganz ohne störenden Automove!
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

      {/* Main Settings Card */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="border-b border-discord-border pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            Automatische Streamer-Erkennung & Alerts
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Lege die Live-Rolle, den Benachrichtigungskanal und die Kategorie für Live-Streamer fest.
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

          {/* Ankündigungskanal */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-discord-blurple" />
              Benachrichtigungs-Kanal für Stream-Alerts (Optional)
            </label>
            <select
              value={announcementChannelId}
              onChange={(e) => setAnnouncementChannelId(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-all font-medium"
            >
              <option value="">— Keine automatische Benachrichtigung senden —</option>
              {textChannels.map((c: any) => (
                <option key={c.id} value={c.id}>
                  # {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              In diesen Textkanal postet der Bot die Benachrichtigung (Stream-Embed & Link), sobald jemand live geht!
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
              <span className="text-sm font-semibold text-white">Automatische Rollen-Erkennung</span>
              <p className="text-xs text-gray-400">
                Vergibt die Live-Rolle automatisch, sobald Discord erkennt, dass das Mitglied streamt (Twitch / YouTube).
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
          <Sparkles className="w-4 h-4 text-discord-blurple" />
          Wie funktioniert das System?
        </h3>
        <ul className="text-sm text-gray-300 space-y-2.5 list-disc list-inside">
          <li>
            <strong className="text-white">Manueller Go-Live Befehl:</strong> Du kannst jederzeit im Discord-Chat <code className="text-discord-blurple font-mono">/twitch-live start [link] [spiel] [titel]</code> eingeben, um sofort als LIVE markiert zu werden!
          </li>
          <li>
            <strong className="text-white">Automatische Erkennung:</strong> Wenn du auf Twitch live bist und Discord dies erkennt, vergibt der Bot die Rolle ebenfalls vollautomatisch.
          </li>
          <li>
            <strong className="text-white">Benachrichtigungskanal:</strong> Ein stylischer Stream-Alert mit Twitch-Lila Embed wird sofort in deinen gewählten Benachrichtigungskanal gepostet.
          </li>
          <li>
            <strong className="text-white">Automatische Kategorie:</strong> Falls keine Kategorie gewählt ist, erstellt der Bot selbstständig die Kategorie <code className="text-red-400 font-mono">🔴 Live Streams</code>.
          </li>
          <li>
            <strong className="text-white">Kein Automove:</strong> Der Bot verschiebt niemanden ungefragt! Jeder kann selbst entscheiden, ob er dem Kanal beitritt.
          </li>
          <li>
            <strong className="text-white">Stream beenden:</strong> Mit <code className="text-discord-blurple font-mono">/twitch-live stop</code> oder wenn der Stream offline geht, wird die Live-Rolle entzogen und der temporäre Kanal rückstandslos gelöscht.
          </li>
        </ul>
      </div>
    </div>
  );
}
