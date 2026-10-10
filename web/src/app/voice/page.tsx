"use client";

import { useEffect, useState } from "react";
import { Mic, Save, Send, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function VoiceManagerPage() {
  const [data, setData] = useState<any>(null);
  const [masterChannelId, setMasterChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [targetTextChannelId, setTargetTextChannelId] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postingPanel, setPostingPanel] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, voiceRes] = await Promise.all([
          fetch("/api/discord/guild").then((r) => r.json()),
          fetch("/api/config/voice").then((r) => r.json()),
        ]);
        setData(guildRes);
        if (voiceRes?.masterChannelId) setMasterChannelId(voiceRes.masterChannelId);
        if (voiceRes?.categoryId) setCategoryId(voiceRes.categoryId);
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
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/config/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterChannelId,
          categoryId: categoryId || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: "✅ Voice-Einstellungen erfolgreich gespeichert!", type: "success" });
      } else {
        setMessage({ text: "❌ Fehler beim Speichern der Konfiguration.", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePostPanel = async () => {
    if (!targetTextChannelId) {
      setMessage({ text: "❌ Bitte wähle zuerst einen Textkanal aus.", type: "error" });
      return;
    }

    setPostingPanel(true);
    setMessage(null);

    try {
      const res = await fetch("/api/action/post-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: targetTextChannelId }),
      });

      if (res.ok) {
        setMessage({ text: "🎉 Das interaktive VoiceMaster-Panel wurde erfolgreich in deinen Discord-Kanal gesendet!", type: "success" });
      } else {
        const err = await res.json();
        setMessage({ text: `❌ Fehler: ${err.error || "Konnte Panel nicht senden."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setPostingPanel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-discord-border pb-6">
        <div className="w-12 h-12 rounded-2xl bg-discord-green/10 flex items-center justify-center text-discord-green">
          <Mic className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Voice-Manager (Join to Create)</h1>
          <p className="text-sm text-gray-400">
            Hier kannst du den Master-Kanal und die Kategorie für deine temporären Sprachkanäle festlegen.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            message.type === "success"
              ? "bg-discord-green/10 border-discord-green/30 text-discord-green"
              : "bg-discord-red/10 border-discord-red/30 text-discord-red"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-discord-border/50 pb-3">
          1. Master-Kanal Konfiguration
        </h2>

        {/* Master Voice Channel Select */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-200">
            Master-Sprachkanal (Join-to-Create) <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-gray-400">
            Sobald ein Mitglied diesen Kanal betritt, erstellt der Bot sofort einen neuen temporären Sprachraum.
          </p>
          <select
            value={masterChannelId}
            onChange={(e) => setMasterChannelId(e.target.value)}
            required
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">-- Wähle einen Sprachkanal aus --</option>
            {data?.voiceChannels?.map((ch: any) => (
              <option key={ch.id} value={ch.id}>
                🔊 {ch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Select */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-200">
            Ziel-Kategorie (Optional)
          </label>
          <p className="text-xs text-gray-400">
            Unter welcher Kategorie sollen die neuen Lobbys erstellt werden? (Standard: Direkt unter dem "Join to Create" Master-Kanal)
          </p>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">-- Automatisch (Direkt unter dem Master-Kanal) --</option>
            {data?.categories?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                📁 {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-discord-blurple/20 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Einstellungen speichern
          </button>
        </div>
      </form>

      {/* Post Panel Section */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6">
        <div className="border-b border-discord-border/50 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              2. Permanentes Steuerungs-Panel in Discord senden (Optional)
            </h2>
            <span className="text-[11px] font-semibold bg-discord-green/20 text-discord-green px-2 py-0.5 rounded-full border border-discord-green/30">
              Auto-Panel im Sprachchat aktiv
            </span>
          </div>
          <p className="text-xs text-gray-300 mt-1">
            Das Steuerungs-Panel wird bereits <strong>automatisch in jeden neu erstellten Sprachkanal</strong> gesendet!
            Hier kannst du es bei Bedarf zusätzlich als feste Nachricht in einen Info- oder Bot-Kanal (z. B. #bot-channel) posten.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-200">
              Ziel-Textkanal für das Panel
            </label>
            <select
              value={targetTextChannelId}
              onChange={(e) => setTargetTextChannelId(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
            >
              <option value="">-- Wähle einen Textkanal aus (z. B. #bot) --</option>
              {data?.textChannels?.map((ch: any) => (
                <option key={ch.id} value={ch.id}>
                  # {ch.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePostPanel}
            disabled={postingPanel || !targetTextChannelId}
            className="px-6 py-3 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-discord-green/20 disabled:opacity-50"
          >
            {postingPanel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Panel jetzt in Discord senden
          </button>
        </div>
      </div>
    </div>
  );
}
