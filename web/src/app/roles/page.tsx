"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Save, Send, CheckCircle2, AlertCircle, RefreshCw, Gamepad2, Radio, UserCheck, Sparkles, Zap } from "lucide-react";

export default function RolesManagerPage() {
  const [data, setData] = useState<any>(null);
  const [rulesRoleId, setRulesRoleId] = useState("");
  const [streamAlertRoleId, setStreamAlertRoleId] = useState("");
  const [freeGamesRoleId, setFreeGamesRoleId] = useState("");
  const [freeGamesChannelId, setFreeGamesChannelId] = useState("");
  const [targetChannelId, setTargetChannelId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSettingUp, setAutoSettingUp] = useState(false);
  const [postingPanel, setPostingPanel] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, rolesRes] = await Promise.all([
          fetch("/api/discord/guild").then((r) => r.json()),
          fetch("/api/config/roles").then((r) => r.json()),
        ]);
        setData(guildRes);
        if (rolesRes?.rulesRoleId) setRulesRoleId(rolesRes.rulesRoleId);
        if (rolesRes?.streamAlertRoleId) setStreamAlertRoleId(rolesRes.streamAlertRoleId);
        if (rolesRes?.freeGamesRoleId) setFreeGamesRoleId(rolesRes.freeGamesRoleId);
        if (rolesRes?.freeGamesChannelId) setFreeGamesChannelId(rolesRes.freeGamesChannelId);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAutoSetup = async () => {
    setAutoSettingUp(true);
    setMessage(null);
    try {
      const res = await fetch("/api/action/auto-setup-roles", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data) {
        const guildRes = await fetch("/api/discord/guild").then((r) => r.json());
        setData(guildRes);
        if (json.data.guestRole?.id) setRulesRoleId(json.data.guestRole.id);
        if (json.data.streamAlertRole?.id) setStreamAlertRoleId(json.data.streamAlertRole.id);
        if (json.data.freeGamesRole?.id) setFreeGamesRoleId(json.data.freeGamesRole.id);
        if (json.data.freeGamesChannel?.id) setFreeGamesChannelId(json.data.freeGamesChannel.id);
        setMessage({
          text: "⚡ Alle benötigten Rollen (@Gast, bn.live, bn.free) & der #free-games Kanal wurden automatisch erstellt & verknüpft!",
          type: "success",
        });
      } else {
        setMessage({ text: `❌ Fehler: ${json.error || "Auto-Setup fehlgeschlagen"}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setAutoSettingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/config/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rulesRoleId: rulesRoleId || undefined,
          streamAlertRoleId: streamAlertRoleId || undefined,
          freeGamesRoleId: freeGamesRoleId || undefined,
          freeGamesChannelId: freeGamesChannelId || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: "✅ Berechtigungs- und Rollen-Einstellungen erfolgreich gespeichert!", type: "success" });
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
    if (!targetChannelId) {
      setMessage({ text: "❌ Bitte wähle zuerst einen Ziel-Kanal aus.", type: "error" });
      return;
    }

    setPostingPanel(true);
    setMessage(null);

    try {
      const res = await fetch("/api/action/post-role-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: targetChannelId }),
      });

      if (res.ok) {
        setMessage({ text: "🎉 Das Berechtigungs- und Benachrichtigungs-Panel wurde erfolgreich in Discord gepostet!", type: "success" });
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

  const roles = data?.roles || [];
  const textChannels = data?.textChannels || [];
  const isConfigured = Boolean(rulesRoleId || streamAlertRoleId || freeGamesRoleId);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-discord-blurple" />
              Berechtigungen & Rollen-Zentrum
            </h1>
            {isConfigured ? (
              <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium border border-discord-green/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full font-medium border border-yellow-400/20">
                <AlertCircle className="w-3.5 h-3.5" /> Noch unvollständig
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Konfiguriere Verifikations-Rollen (Regeln gelesen) und Benachrichtigungs-Rollen (bn.live, bn.free) mit 1-Klick Discord-Buttons.
          </p>
        </div>

        {/* 1-Klick Auto Setup Button */}
        <button
          type="button"
          onClick={handleAutoSetup}
          disabled={autoSettingUp}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          {autoSettingUp ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Erstelle Rollen...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-black" />
              Rollen automatisch erstellen & zuweisen
            </>
          )}
        </button>
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

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold text-white border-b border-discord-border pb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-discord-green" />
          1. Rollen-Zuweisung konfigurieren
        </h2>

        {/* 1. Verifikations-Rolle (Gast / Regeln) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-discord-green" />
            Regel- & Verifikations-Rolle (@Gast)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Wird vergeben, sobald ein Mitglied auf <strong>✅ Regeln akzeptieren</strong> klickt. Schaltet alle normalen Server-Kanäle frei.
          </p>
          <select
            value={rulesRoleId}
            onChange={(e) => setRulesRoleId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte eine Rolle auswählen (z. B. @Gast) —</option>
            {roles.map((r: any) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Live-Stream Benachrichtigungs-Rolle (bn.live) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            Stream-Benachrichtigungs-Rolle (bn.live)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Wird vergeben/entfernt, wenn Mitglieder auf <strong>🔴 Live-Stream Alerts (bn.live)</strong> klicken. Schaltet Stream-Pings und Live-Kanäle frei.
          </p>
          <select
            value={streamAlertRoleId}
            onChange={(e) => setStreamAlertRoleId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte eine Rolle auswählen (z. B. @Live-Pings) —</option>
            {roles.map((r: any) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Free-Games Benachrichtigungs-Rolle (bn.free) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-blue-400" />
            Free-Games Benachrichtigungs-Rolle (bn.free)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Wird vergeben/entfernt, wenn Mitglieder auf <strong>🎮 Free-Games Alerts (bn.free)</strong> klicken. Schaltet den Free-Games Kanal frei.
          </p>
          <select
            value={freeGamesRoleId}
            onChange={(e) => setFreeGamesRoleId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte eine Rolle auswählen (z. B. @FreeGames) —</option>
            {roles.map((r: any) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Free-Games Ankündigungskanal */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1">
            Free-Games Ankündigungskanal (#free-games)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            In diesen Textkanal postet der Bot die wöchentlichen Gratis-Spiele von Epic Games und Steam.
          </p>
          <select
            value={freeGamesChannelId}
            onChange={(e) => setFreeGamesChannelId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte einen Textkanal auswählen (z. B. #free-games) —</option>
            {textChannels.map((c: any) => (
              <option key={c.id} value={c.id}>
                # {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-discord-blurple/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Einstellungen speichern
          </button>
        </div>
      </form>

      {/* Post Panel Section */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="border-b border-discord-border pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-discord-green" />
            2. Berechtigungs-Panel in Discord senden
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Poste das interaktive Verifikations- und Rollen-Panel mit schicken Buttons direkt in einen Textkanal (z. B. #regeln oder #rollen).
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-200">
              Ziel-Kanal für das Panel
            </label>
            <select
              value={targetChannelId}
              onChange={(e) => setTargetChannelId(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
            >
              <option value="">— Wähle einen Kanal aus (z. B. #regeln oder #willkommen) —</option>
              {textChannels.map((c: any) => (
                <option key={c.id} value={c.id}>
                  # {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePostPanel}
            disabled={postingPanel || !targetChannelId}
            className="px-6 py-3 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-discord-green/20 disabled:opacity-50"
          >
            {postingPanel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Panel jetzt in Discord senden
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-discord-blurple" />
          Wie funktioniert das Berechtigungs-System?
        </h3>
        <ul className="text-sm text-gray-300 space-y-2.5 list-disc list-inside">
          <li>
            <strong className="text-white">Regel-Verifikation:</strong> Neue Mitglieder sehen zuerst nur den Regelkanal. Ein Klick auf <code className="text-discord-green font-mono">✅ Regeln akzeptieren</code> vergibt sofort die Gast-Rolle und schaltet alle Server-Inhalte frei.
          </li>
          <li>
            <strong className="text-white">bn.live (Live-Alerts):</strong> Mitglieder können per 1-Klick-Toggle die Stream-Benachrichtigungen aktivieren oder wieder abbestellen.
          </li>
          <li>
            <strong className="text-white">bn.free (Free-Games):</strong> Schaltet den Zugriff auf den <code className="text-blue-400 font-mono">#free-games</code> Kanal frei und pingt Mitglieder bei Gratis-Vollversionen im Epic Games Store oder auf Steam!
          </li>
          <li>
            <strong className="text-white">Discord Chat Steuerung:</strong> Du kannst dieses Panel im Chat jederzeit auch mit <code className="text-discord-blurple font-mono">/setup-roles panel [kanal]</code> posten und mit <code className="text-discord-blurple font-mono">/setup-roles status</code> überprüfen!
          </li>
        </ul>
      </div>
    </div>
  );
}
