"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Radio, Users, Hash, Shield, ArrowRight, Server, CheckCircle2, AlertCircle } from "lucide-react";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [voiceConfig, setVoiceConfig] = useState<any>(null);
  const [liveConfig, setLiveConfig] = useState<any>(null);
  const [rolesConfig, setRolesConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, voiceRes, liveRes, rolesRes] = await Promise.all([
          fetch("/api/discord/guild").then((r) => r.json()),
          fetch("/api/config/voice").then((r) => r.json()),
          fetch("/api/config/live").then((r) => r.json()),
          fetch("/api/config/roles").then((r) => r.json()),
        ]);
        setData(guildRes);
        setVoiceConfig(voiceRes);
        setLiveConfig(liveRes);
        setRolesConfig(rolesRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const guild = data?.guild;
  const isVoiceConfigured = Boolean(voiceConfig?.masterChannelId);
  const isLiveConfigured = Boolean(liveConfig?.liveRoleId);
  const isRolesConfigured = Boolean(rolesConfig?.rulesRoleId || rolesConfig?.streamAlertRoleId);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-discord-card to-discord-dark p-6 md:p-8 rounded-2xl border border-discord-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-5">
          {guild?.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
              alt={guild.name}
              className="w-20 h-20 rounded-2xl border-2 border-discord-border shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-discord-blurple flex items-center justify-center font-bold text-2xl text-white">
              GLG
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{guild?.name || "Germany LanGame"}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-discord-green/20 text-discord-green border border-discord-green/30">
                Aktiv
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Verwalte alle Kanäle, VoiceMaster-Lobbys und Creator-Features zentral über dieses Dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/voice"
            className="px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-medium text-sm transition-all shadow-lg shadow-discord-blurple/25 flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Voice konfigurieren
          </Link>
        </div>
      </div>

      {/* Server Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-discord-card border border-discord-border p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Mitglieder</span>
            <Users className="w-5 h-5 text-discord-blurple" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{guild?.approximate_member_count || data?.roles?.length || "—"}</p>
        </div>

        <div className="bg-discord-card border border-discord-border p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Sprachkanäle</span>
            <Mic className="w-5 h-5 text-discord-green" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{data?.voiceChannels?.length || 0}</p>
        </div>

        <div className="bg-discord-card border border-discord-border p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Textkanäle</span>
            <Hash className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{data?.textChannels?.length || 0}</p>
        </div>

        <div className="bg-discord-card border border-discord-border p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Rollen</span>
            <Shield className="w-5 h-5 text-discord-yellow" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{data?.roles?.length || 0}</p>
        </div>
      </div>

      {/* Module Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
        {/* VoiceMaster Card */}
        <div className="bg-discord-card border border-discord-border p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-discord-green/10 flex items-center justify-center text-discord-green">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">VoiceMaster System</h3>
                  <p className="text-xs text-gray-400">Temporäre Sprachkanäle & Lobbys</p>
                </div>
              </div>
              {isVoiceConfigured ? (
                <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Nicht eingerichtet
                </span>
              )}
            </div>

            <p className="text-sm text-gray-300">
              Automatische Erstellung temporärer Räume beim Betreten des Master-Kanals, interaktives Dashboard und Auto-Cleanup.
            </p>

            <div className="bg-discord-dark p-3.5 rounded-xl border border-discord-border/50 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Master-Kanal:</span>
                <span className="text-white font-medium">
                  {data?.voiceChannels?.find((c: any) => c.id === voiceConfig?.masterChannelId)?.name ? (
                    `🔊 ${data.voiceChannels.find((c: any) => c.id === voiceConfig.masterChannelId).name}`
                  ) : (
                    "Nicht zugewiesen"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ziel-Kategorie:</span>
                <span className="text-white font-medium">
                  {data?.categories?.find((c: any) => c.id === voiceConfig?.categoryId)?.name ? (
                    `📁 ${data.categories.find((c: any) => c.id === voiceConfig.categoryId).name}`
                  ) : (
                    "Automatisch"
                  )}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/voice"
            className="w-full py-2.5 px-4 rounded-xl bg-discord-border/50 hover:bg-discord-border text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            Voice-Einstellungen öffnen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live Streamer Card */}
        <div className="bg-discord-card border border-discord-border p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Live-Streamer System</h3>
                  <p className="text-xs text-gray-400">Dynamische Kanäle bei Stream-Start</p>
                </div>
              </div>
              {isLiveConfigured ? (
                <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Nicht eingerichtet
                </span>
              )}
            </div>

            <p className="text-sm text-gray-300">
              Erstellt sofort einen temporären Kanal mit Link-Status und Twitch-Embed, sobald ein Creator live geht.
            </p>

            <div className="bg-discord-dark p-3.5 rounded-xl border border-discord-border/50 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Streamer-Rolle:</span>
                <span className="text-white font-medium">
                  {data?.roles?.find((r: any) => r.id === liveConfig?.liveRoleId)?.name ? (
                    `@${data.roles.find((r: any) => r.id === liveConfig.liveRoleId).name}`
                  ) : (
                    "Nicht zugewiesen"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Kanal-Art:</span>
                <span className="text-white font-medium">
                  {liveConfig?.channelType === "text" ? "💬 Textkanal" : "🔊 Sprachkanal mit Status"}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/live"
            className="w-full py-2.5 px-4 rounded-xl bg-discord-border/50 hover:bg-discord-border text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            Live-Einstellungen öffnen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Roles & Berechtigungen Card */}
        <div className="bg-discord-card border border-discord-border p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-discord-yellow/10 flex items-center justify-center text-discord-yellow">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Rollen & Rechte</h3>
                  <p className="text-xs text-gray-400">Verifikation & Benachrichtigungen</p>
                </div>
              </div>
              {isRolesConfigured ? (
                <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Nicht eingerichtet
                </span>
              )}
            </div>

            <p className="text-sm text-gray-300">
              Regel-Bestätigung (Gast-Rolle), Live-Stream Alerts (bn.live) und wöchentliche Free-Games Benachrichtigungen (bn.free).
            </p>

            <div className="bg-discord-dark p-3.5 rounded-xl border border-discord-border/50 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Gast-Rolle (Regeln):</span>
                <span className="text-white font-medium">
                  {data?.roles?.find((r: any) => r.id === rolesConfig?.rulesRoleId)?.name ? (
                    `@${data.roles.find((r: any) => r.id === rolesConfig.rulesRoleId).name}`
                  ) : (
                    "Nicht zugewiesen"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Free-Games Pings:</span>
                <span className="text-white font-medium">
                  {data?.roles?.find((r: any) => r.id === rolesConfig?.freeGamesRoleId)?.name ? (
                    `@${data.roles.find((r: any) => r.id === rolesConfig.freeGamesRoleId).name}`
                  ) : (
                    "Nicht zugewiesen"
                  )}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/roles"
            className="w-full py-2.5 px-4 rounded-xl bg-discord-border/50 hover:bg-discord-border text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            Rollen verwalten
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Support & Tickets Card */}
        <div className="bg-discord-card border border-discord-border p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Support- & Tickets</h3>
                  <p className="text-xs text-gray-400">Privater Support & Transkripte</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
              </span>
            </div>

            <p className="text-sm text-gray-300">
              Automatische Ticket-Kanal Erstellung, Live-Chat aus dem Web, 1-Klick Buttons und vollständige Chat-Transkripte.
            </p>

            <div className="bg-discord-dark p-3.5 rounded-xl border border-discord-border/50 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Support-Kanal:</span>
                <span className="text-white font-medium">#📩・support</span>
              </div>
              <div className="flex justify-between">
                <span>Transkript-Archiv:</span>
                <span className="text-emerald-400 font-medium">Aktiv (Web-Download)</span>
              </div>
            </div>
          </div>

          <Link
            href="/tickets"
            className="w-full py-2.5 px-4 rounded-xl bg-discord-border/50 hover:bg-discord-border text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            Ticket-Zentrale öffnen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Level & Voice Stats Card */}
        <div className="bg-discord-card border border-discord-border p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Level & Talk-Stats</h3>
                  <p className="text-xs text-gray-400">XP, Online-Zeit & Top-Duos</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
              </span>
            </div>

            <p className="text-sm text-gray-300">
              Echtzeit-Tracking von Chat-XP, Voice-Anwesenheit und Erfassung von Talk-Partnerschaften („Wer labert mit wem am längsten“).
            </p>

            <div className="bg-discord-dark p-3.5 rounded-xl border border-discord-border/50 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Ranglisten-Befehle:</span>
                <span className="text-white font-medium">/rank, /leaderboard</span>
              </div>
              <div className="flex justify-between">
                <span>Voice-Partner:</span>
                <span className="text-cyan-400 font-medium">/voice-stats, /top-voice</span>
              </div>
            </div>
          </div>

          <Link
            href="/stats"
            className="w-full py-2.5 px-4 rounded-xl bg-discord-border/50 hover:bg-discord-border text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            Ranglisten & Stats öffnen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Server Konzepte & Vorlagen Section */}
      <div className="space-y-6 pt-6 border-t border-discord-border">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-discord-blurple" />
            Server-Konzepte & Vorlagen
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Wähle ein empfohlenes Architektur-Konzept für deine Community oder nutze die vorbereiteten Vorlagen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Concept 1: Gaming & Allrounder */}
          <div className="bg-discord-card border-2 border-discord-blurple/50 rounded-2xl p-6 relative overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-discord-blurple/20 text-discord-blurple text-[11px] font-bold uppercase tracking-wider">
                  Empfohlen für GLG
                </span>
                <span className="text-xs text-discord-green font-semibold">Aktiv genutzt</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">🎮 Gaming & Community-Hub</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Perfekt ausbalanciert für Zocker, Freunde und offene Server-Communitys.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Eingangszone: Regeln, Gast-Rolle & Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>VoiceMaster: „Join to Create“ mit Auto-Cleanup</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Gaming-Feeds: Free-Games & Game-News Tracker</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Belohnung: Level-System & Talkzeit-Rangliste</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-discord-border/50 mt-4 flex items-center justify-between text-xs">
              <span className="text-gray-400">Status: Vollständig aktiv</span>
              <Link href="/voice" className="text-discord-blurple hover:underline font-semibold">
                Anpassen →
              </Link>
            </div>
          </div>

          {/* Concept 2: Streamer & Creator */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 relative overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[11px] font-bold uppercase tracking-wider">
                  Creator-Fokus
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">📺 Streamer & Creator-Lounge</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Ideal für Twitch- & YouTube-Streamer mit Fokus auf Community-Reichweite.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Automatische Live-Stream Kanäle bei Stream-Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Ankündigungskanal mit @bn.live Pings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Streamer-Rolle (@Live-Streamer) mit Farb-Prio</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-discord-border/50 mt-4 flex items-center justify-between text-xs">
              <span className="text-gray-400">Modul aktiv</span>
              <Link href="/live" className="text-red-400 hover:underline font-semibold">
                Streamer anpassen →
              </Link>
            </div>
          </div>

          {/* Concept 3: E-Sports & Security */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 relative overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[11px] font-bold uppercase tracking-wider">
                  Sicherheit & Clan
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">🛡️ Clan, E-Sports & Sicherheit</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Schwerpunkt auf Rollenhierarchie, Anti-Nuke, Backups und Audit-Logs.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Anti-Nuke Schutz (max. 3 Aktionen/min) & Anti-Phishing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Lückenloses Audit-Logging im geschützten Kanal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-discord-green font-bold">✓</span>
                  <span>Tägliche automatische 24h-Backups mit 1-Klick-Restore</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-discord-border/50 mt-4 flex items-center justify-between text-xs">
              <span className="text-gray-400">Anti-Nuke & Backups aktiv</span>
              <Link href="/backups" className="text-yellow-400 hover:underline font-semibold">
                Backups prüfen →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
