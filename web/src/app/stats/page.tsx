"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  Mic,
  MessageSquare,
  Users,
  Award,
  Sparkles,
  RefreshCw,
  Clock,
  Settings,
  CheckCircle2,
  AlertTriangle,
  User,
  Heart,
  ChevronRight,
  X,
  ShieldAlert,
} from "lucide-react";

interface UserStatEntry {
  userId: string;
  tag: string;
  avatar?: string;
  xp: number;
  level: number;
  messagesCount: number;
  voiceMinutes: number;
  joinedAt?: string;
  rank: number;
}

interface DuoEntry {
  user1: string;
  tag1: string;
  user2: string;
  tag2: string;
  minutes: number;
}

interface TalkPartner {
  partnerId: string;
  tag: string;
  minutes: number;
}

interface ModCaseItem {
  id: string;
  action: string;
  reason: string;
  xpLost?: number;
  createdAt: string;
}

interface XpBreakdown {
  messagesCount: number;
  avgMsgXp: number;
  estimatedChatXp: number;
  voiceMinutes: number;
  voiceXpPerMinute: number;
  estimatedVoiceXp: number;
  totalPenaltiesXp: number;
  penaltyCasesCount: number;
}

interface UserProfileData {
  stats: UserStatEntry;
  rank: number;
  dailyStreak?: number;
  progress: {
    level: number;
    currentXp: number;
    requiredXp: number;
    progressPercent: number;
  };
}

interface LevelingConfig {
  maxLevel: number;
  baseXp: number;
  exponent: number;
  messageXpMin: number;
  messageXpMax: number;
  messageCooldownSeconds: number;
  voiceXpPerMinute: number;
  warnPenaltyXp: number;
  timeoutPenaltyXp: number;
  prisonPenaltyXp: number;
  badNamePenaltyXp: number;
  blacklistPenaltyXp: number;
  kickPenaltyXp: number;
  banPenaltyXp: number;
  levelUpChannelId?: string;
  roleRewards?: Record<number, string>;
  levelUpNotifications: boolean;
  levelUpMessage?: string;
}

const DEFAULT_CONFIG: LevelingConfig = {
  maxLevel: 25,
  baseXp: 350,
  exponent: 1.65,
  messageXpMin: 15,
  messageXpMax: 25,
  messageCooldownSeconds: 60,
  voiceXpPerMinute: 5,
  warnPenaltyXp: 250,
  timeoutPenaltyXp: 500,
  prisonPenaltyXp: 1000,
  badNamePenaltyXp: 400,
  blacklistPenaltyXp: 300,
  kickPenaltyXp: 1500,
  banPenaltyXp: 5000,
  levelUpNotifications: true,
};

export default function StatsPage() {
  const [topLevels, setTopLevels] = useState<UserStatEntry[]>([]);
  const [topVoice, setTopVoice] = useState<UserStatEntry[]>([]);
  const [topDuos, setTopDuos] = useState<DuoEntry[]>([]);
  const [config, setConfig] = useState<LevelingConfig>(DEFAULT_CONFIG);
  const [formConfig, setFormConfig] = useState<LevelingConfig>(DEFAULT_CONFIG);
  const [textChannels, setTextChannels] = useState<{ id: string; name: string }[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"levels" | "voice" | "duos">("levels");

  // User Detail Modal
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [userPartners, setUserPartners] = useState<TalkPartner[]>([]);
  const [userCases, setUserCases] = useState<ModCaseItem[]>([]);
  const [userBreakdown, setUserBreakdown] = useState<XpBreakdown | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"curve" | "rewards" | "roles" | "penalties" | "notifications">("curve");
  const [serverRoles, setServerRoles] = useState<{ id: string; name: string; color: string }[]>([]);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/stats");
      if (res.ok) {
        const data = await res.json();
        setTopLevels(data.topLevels || []);
        setTopVoice(data.topVoice || []);
        setTopDuos(data.topDuos || []);
        if (data.config) {
          const merged = { ...DEFAULT_CONFIG, ...data.config };
          setConfig(merged);
          setFormConfig(merged);
        }
        setTextChannels(data.textChannels || []);
        setMemberCount(data.memberCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openUserDetails = async (userId: string) => {
    setSelectedUser(userId);
    setLoadingUser(true);
    setUserProfile(null);
    setUserPartners([]);
    setUserCases([]);
    setUserBreakdown(null);
    try {
      const res = await fetch(`/api/bot/stats/user?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
        setUserPartners(data.partners || []);
        setUserCases(data.cases || []);
        setUserBreakdown(data.breakdown || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const res = await fetch("/api/bot/stats/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formConfig),
      });
      if (res.ok) {
        const data = await res.json();
        const merged = { ...DEFAULT_CONFIG, ...(data.config || formConfig) };
        setConfig(merged);
        setFormConfig(merged);
        setStatusMessage("Level-System Einstellungen erfolgreich gespeichert!");
        setShowSettings(false);
        setTimeout(() => setStatusMessage(null), 4000);
        fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        setSettingsError(err.error || "Speichern fehlgeschlagen.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    if (!minutes) return "0 Min.";
    if (minutes < 60) return `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours < 24) return `${hours} Std. ${rest} Min.`;
    const days = Math.floor(hours / 24);
    const restH = hours % 24;
    return `${days} T. ${restH} Std.`;
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Level-System & Talk-Rangliste</h1>
              <p className="text-sm text-gray-400">
                Verfolge gesammelte XP, Voice-Aktivität und erfahre, wer mit wem am längsten im Talk gequatscht hat.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border text-xs font-semibold"
          >
            <Settings className="w-4 h-4 text-gray-400" />
            Einstellungen
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border transition-all"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-discord-green/10 text-discord-green border border-discord-green/20 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Highlights / Podiums */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Top Chatter */}
        <div className="bg-discord-card border border-discord-border rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Top Level & XP
            </span>
            <span className="text-xs text-gray-500">Platz 1</span>
          </div>

          {topLevels.length > 0 ? (
            <div className="mt-4 flex items-center gap-4">
              <img
                src={topLevels[0].avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt=""
                className="w-14 h-14 rounded-2xl border-2 border-amber-400 shadow-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-base truncate">{topLevels[0].tag}</h4>
                <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mt-0.5">
                  <span>Level {topLevels[0].level}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-300">{topLevels[0].xp.toLocaleString("de-DE")} XP</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  💬 {topLevels[0].messagesCount} Nachrichten
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-gray-500 italic">Noch keine XP gesammelt.</div>
          )}
        </div>

        {/* Top Voice Talker */}
        <div className="bg-discord-card border border-discord-border rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              Längste Voice-Zeit
            </span>
            <span className="text-xs text-gray-500">Platz 1</span>
          </div>

          {topVoice.length > 0 ? (
            <div className="mt-4 flex items-center gap-4">
              <img
                src={topVoice[0].avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt=""
                className="w-14 h-14 rounded-2xl border-2 border-cyan-400 shadow-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-base truncate">{topVoice[0].tag}</h4>
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold mt-0.5">
                  <span>{formatMinutes(topVoice[0].voiceMinutes)}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-300">Level {topVoice[0].level}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {topVoice[0].voiceMinutes} Minuten im Sprachkanal
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-gray-500 italic">Noch keine Sprachzeit aufgezeichnet.</div>
          )}
        </div>

        {/* Top Talk-Duo */}
        <div className="bg-discord-card border border-discord-border rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              Top Talk-Duo
            </span>
            <span className="text-xs text-gray-500">Am längsten gequatscht</span>
          </div>

          {topDuos.length > 0 ? (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="truncate max-w-[120px]">{topDuos[0].tag1}</span>
                <span className="text-rose-400 px-1">❤️</span>
                <span className="truncate max-w-[120px] text-right">{topDuos[0].tag2}</span>
              </div>
              <div className="text-center pt-1">
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-bold">
                  {formatMinutes(topDuos[0].minutes)} gemeinsam im Talk
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-gray-500 italic">
              Noch keine gemeinsamen Calls erfasst (mind. 2 Personen im Talk).
            </div>
          )}
        </div>
      </div>

      {/* XP Regelwerk Info-Box */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-discord-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>XP-Regelwerk: Was bringt wie viel Erfahrung?</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-discord-dark text-amber-400 border border-discord-border font-bold">
                  Max. Level {config.maxLevel || 25}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Aktivität im Chat und Talk bringt XP – Verstöße führen zu automatischen Stufen- & XP-Abzügen.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSettingsTab("rewards");
              setShowSettings(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-discord-dark hover:bg-discord-card text-xs font-semibold text-gray-300 hover:text-white border border-discord-border self-start md:self-auto transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-gray-400" />
            Werte anpassen
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Chat XP */}
          <div className="p-3.5 bg-discord-dark/70 rounded-xl border border-discord-border/70 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Chat-Nachrichten</div>
              <div className="text-sm font-bold text-indigo-400 font-mono mt-0.5">
                +{config.messageXpMin || 15} bis +{config.messageXpMax || 25} XP
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Cooldown: {config.messageCooldownSeconds || 60}s Anti-Spam
              </div>
            </div>
          </div>

          {/* Voice XP */}
          <div className="p-3.5 bg-discord-dark/70 rounded-xl border border-discord-border/70 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Talk / Sprachzeit</div>
              <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                +{config.voiceXpPerMinute || 5} XP / Minute
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                ≈ {((config.voiceXpPerMinute || 5) * 60).toLocaleString("de-DE")} XP / Std.
              </div>
            </div>
          </div>

          {/* Moderation Warn & Timeout */}
          <div className="p-3.5 bg-discord-dark/70 rounded-xl border border-rose-500/20 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Warn & Timeout</div>
              <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                -{config.warnPenaltyXp || 250} / -{config.timeoutPenaltyXp || 500} XP
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Automatischer Stufenabzug
              </div>
            </div>
          </div>

          {/* Prison & Wortfilter */}
          <div className="p-3.5 bg-discord-dark/70 rounded-xl border border-rose-500/20 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Knast & Wortfilter</div>
              <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                -{config.prisonPenaltyXp || 1000} / -{config.blacklistPenaltyXp || 300} XP
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Bad Name: -{config.badNamePenaltyXp || 400} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-discord-border pb-2">
        <button
          onClick={() => setActiveTab("levels")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "levels"
              ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
              : "text-gray-400 hover:text-white hover:bg-discord-card"
          }`}
        >
          <Trophy className="w-4 h-4" />
          Level & XP Rangliste
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "voice"
              ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
              : "text-gray-400 hover:text-white hover:bg-discord-card"
          }`}
        >
          <Mic className="w-4 h-4" />
          Voice-Rangliste
        </button>
        <button
          onClick={() => setActiveTab("duos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "duos"
              ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
              : "text-gray-400 hover:text-white hover:bg-discord-card"
          }`}
        >
          <Users className="w-4 h-4" />
          Top Talk-Duos (Wer labert mit wem)
        </button>
      </div>

      {/* Tab 1: Level & XP */}
      {activeTab === "levels" && (
        <div className="bg-discord-card border border-discord-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-discord-dark border-b border-discord-border text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-4 w-16">Rang</th>
                  <th className="py-3 px-4">Mitglied</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Gesamt-XP</th>
                  <th className="py-3 px-4">Nachrichten</th>
                  <th className="py-3 px-4">Voice-Zeit</th>
                  <th className="py-3 px-4 text-right">Profil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-border">
                {topLevels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                      Noch keine Daten verfügbar.
                    </td>
                  </tr>
                ) : (
                  topLevels.map((u, i) => (
                    <tr key={u.userId} className="hover:bg-discord-dark/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-center">
                        {i < 3 ? <span className="text-lg">{medals[i]}</span> : `#${i + 1}`}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-white">{u.tag}</div>
                            <div className="text-[11px] text-gray-500 font-mono">UID: {u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          Level {u.level}
                          {u.level >= (config.maxLevel || 25) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold shadow-sm">
                              MAX
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-200 font-mono whitespace-nowrap">
                        {u.xp.toLocaleString("de-DE")} XP
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">{u.messagesCount} Msgs</td>
                      <td className="py-3.5 px-4 text-cyan-300 whitespace-nowrap">{formatMinutes(u.voiceMinutes)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openUserDetails(u.userId)}
                          className="px-3 py-1.5 rounded-lg bg-discord-dark hover:bg-discord-card text-xs font-semibold text-gray-300 hover:text-white border border-discord-border inline-flex items-center gap-1"
                        >
                          Details <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Voice Rangliste */}
      {activeTab === "voice" && (
        <div className="bg-discord-card border border-discord-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-discord-dark border-b border-discord-border text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-4 w-16">Rang</th>
                  <th className="py-3 px-4">Mitglied</th>
                  <th className="py-3 px-4">Sprachzeit</th>
                  <th className="py-3 px-4">Minuten</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4 text-right">Profil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-border">
                {topVoice.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                      Noch keine Sprachzeit aufgezeichnet.
                    </td>
                  </tr>
                ) : (
                  topVoice.map((u, i) => (
                    <tr key={u.userId} className="hover:bg-discord-dark/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-center">
                        {i < 3 ? <span className="text-lg">{medals[i]}</span> : `#${i + 1}`}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-white">{u.tag}</div>
                            <div className="text-[11px] text-gray-500 font-mono">UID: {u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-cyan-400 whitespace-nowrap">
                        {formatMinutes(u.voiceMinutes)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono whitespace-nowrap">{u.voiceMinutes} Min.</td>
                      <td className="py-3.5 px-4 text-amber-400 whitespace-nowrap">Level {u.level}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openUserDetails(u.userId)}
                          className="px-3 py-1.5 rounded-lg bg-discord-dark hover:bg-discord-card text-xs font-semibold text-gray-300 hover:text-white border border-discord-border inline-flex items-center gap-1"
                        >
                          Talk-Partner <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Talk Duos */}
      {activeTab === "duos" && (
        <div className="bg-discord-card border border-discord-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-discord-dark border-b border-discord-border text-xs text-gray-400">
            Zeigt an, welche 2 Personen am meisten gemeinsame Zeit im selben Sprachkanal verbracht haben.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-discord-dark border-b border-discord-border text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-4 w-16">Rang</th>
                  <th className="py-3 px-4">Partner 1</th>
                  <th className="py-3 px-4 text-center">Verbindung</th>
                  <th className="py-3 px-4">Partner 2</th>
                  <th className="py-3 px-4 text-right">Gemeinsame Zeit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-border">
                {topDuos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                      Noch keine gemeinsamen Talk-Sitzungen mit mehreren Personen erfasst.
                    </td>
                  </tr>
                ) : (
                  topDuos.map((d, i) => (
                    <tr key={i} className="hover:bg-discord-dark/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-center">
                        {i < 3 ? <span className="text-lg">{medals[i]}</span> : `#${i + 1}`}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-400" />
                          <span>{d.tag1}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-rose-400 font-bold">💬 & ❤️</td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400" />
                          <span>{d.tag2}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {formatMinutes(d.minutes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 bg-discord-dark border-b border-discord-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Aktivität & XP-Aufschlüsselung</h3>
                  <p className="text-xs text-gray-400">Transparente Übersicht aller gesammelten Erfahrungspunkte</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingUser ? (
                <div className="py-16 flex justify-center">
                  <div className="w-7 h-7 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userProfile ? (
                <>
                  {/* User Header */}
                  <div className="flex items-center gap-4 p-4 bg-discord-dark rounded-xl border border-discord-border">
                    <img
                      src={userProfile.stats.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-discord-blurple shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base truncate">{userProfile.stats.tag}</h4>
                        {userProfile.stats.level >= (config.maxLevel || 25) && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold shadow-sm">
                            MAX LEVEL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <span className="text-amber-400 font-bold">Level {userProfile.progress.level}</span>
                        <span>•</span>
                        <span>Rang #{userProfile.rank}</span>
                        <span>•</span>
                        {(userProfile.dailyStreak || 0) > 0 && (
                          <>
                            <span className="text-orange-400 font-semibold" title="Daily-Serie">🔥 {userProfile.dailyStreak} Tag(e)</span>
                            <span>•</span>
                          </>
                        )}
                        <span className="font-mono text-gray-300 font-semibold">
                          {userProfile.stats.xp.toLocaleString("de-DE")} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 p-3.5 bg-discord-dark/60 rounded-xl border border-discord-border/70">
                    <div className="flex justify-between text-xs font-semibold text-gray-300">
                      <span>
                        {userProfile.progress.level >= (config.maxLevel || 25)
                          ? "Maximales Level erreicht!"
                          : `Fortschritt zu Level ${userProfile.progress.level + 1}`}
                      </span>
                      <span className="font-mono">
                        {userProfile.progress.currentXp.toLocaleString("de-DE")} / {userProfile.progress.requiredXp.toLocaleString("de-DE")} XP ({userProfile.progress.progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-discord-dark rounded-full overflow-hidden border border-discord-border">
                      <div
                        className="h-full bg-gradient-to-r from-discord-blurple to-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, userProfile.progress.progressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* XP-Herkunft / Aufschlüsselung */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Woher stammen die XP? (Berechnung)
                      </h5>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Netto-Stand: <strong className="text-white">{userProfile.stats.xp.toLocaleString("de-DE")} XP</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Chat Ertrag */}
                      <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat-Aktivität</span>
                          </div>
                          <div className="mt-2 text-lg font-bold text-white">
                            {userProfile.stats.messagesCount.toLocaleString("de-DE")}{" "}
                            <span className="text-xs font-normal text-gray-400">Msgs</span>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-discord-border/60 text-[11px] text-indigo-400 font-mono font-bold">
                          ≈ +{userBreakdown?.estimatedChatXp?.toLocaleString("de-DE") || "0"} XP
                          <span className="text-[10px] text-gray-500 font-normal block font-sans">
                            ~{userBreakdown?.avgMsgXp || 20} XP pro Msg
                          </span>
                        </div>
                      </div>

                      {/* Voice Ertrag */}
                      <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs">
                            <Mic className="w-3.5 h-3.5" />
                            <span>Voice-Aktivität</span>
                          </div>
                          <div className="mt-2 text-lg font-bold text-cyan-400">
                            {formatMinutes(userProfile.stats.voiceMinutes)}
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-discord-border/60 text-[11px] text-cyan-400 font-mono font-bold">
                          ≈ +{userBreakdown?.estimatedVoiceXp?.toLocaleString("de-DE") || "0"} XP
                          <span className="text-[10px] text-gray-500 font-normal block font-sans">
                            +{userBreakdown?.voiceXpPerMinute || 5} XP / Minute
                          </span>
                        </div>
                      </div>

                      {/* Strafen / Mod-Abzüge */}
                      <div
                        className={`p-3.5 bg-discord-dark rounded-xl border flex flex-col justify-between ${
                          (userBreakdown?.totalPenaltiesXp || 0) > 0
                            ? "border-rose-500/40 bg-rose-500/5"
                            : "border-discord-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Straf-Abzüge</span>
                          </div>
                          <div
                            className={`mt-2 text-lg font-bold ${
                              (userBreakdown?.totalPenaltiesXp || 0) > 0 ? "text-rose-400 font-mono" : "text-gray-400"
                            }`}
                          >
                            {(userBreakdown?.totalPenaltiesXp || 0) > 0
                              ? `-${userBreakdown?.totalPenaltiesXp.toLocaleString("de-DE")} XP`
                              : "0 XP"}
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-discord-border/60 text-[11px] text-gray-500">
                          {userCases.length > 0
                            ? `${userCases.length} dokumentierte Fälle`
                            : "Saubere Weste 🛡️"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mod-Vorfälle Historie */}
                  {userCases.length > 0 && (
                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Dokumentierte Vorfälle & XP-Abzüge ({userCases.length})
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {userCases.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 bg-discord-dark rounded-xl border border-rose-500/20 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {c.action}
                                </span>
                                <span className="text-white font-medium truncate">{c.reason}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1">
                                {new Date(c.createdAt).toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            <div className="text-rose-400 font-mono font-bold whitespace-nowrap text-sm">
                              {c.xpLost ? `-${c.xpLost.toLocaleString("de-DE")} XP` : "0 XP"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Talk-Partners of this user */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      Top Talk-Partner (Mit wem am längsten im Talk)
                    </h5>

                    {userPartners.length === 0 ? (
                      <p className="text-xs text-gray-500 italic p-3 bg-discord-dark rounded-xl border border-discord-border">
                        Noch keine gemeinsamen Talk-Sitzungen mit anderen Personen aufgezeichnet.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {userPartners.map((p, idx) => (
                          <div
                            key={p.partnerId}
                            className="flex items-center justify-between p-2.5 bg-discord-dark rounded-xl border border-discord-border text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-gray-500 w-4">{idx + 1}.</span>
                              <span className="font-semibold text-white">{p.tag}</span>
                            </div>
                            <span className="font-mono text-emerald-400 font-bold">
                              {formatMinutes(p.minutes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 bg-discord-dark border-t border-discord-border flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border text-xs font-semibold"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 bg-discord-dark border-b border-discord-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Level-System & XP-Konfiguration</h3>
                  <p className="text-xs text-gray-400">Passe Level-Grenzen (bis Level 25), Belohnungen und Straf-Abzüge an</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-discord-border px-5 bg-discord-dark/50 gap-2 overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setSettingsTab("curve")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  settingsTab === "curve"
                    ? "border-discord-blurple text-white font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>📈</span> Stufen & Kurve
              </button>
              <button
                onClick={() => setSettingsTab("rewards")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  settingsTab === "rewards"
                    ? "border-discord-blurple text-white font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>✨</span> XP-Belohnungen
              </button>
              <button
                onClick={() => {
                  setSettingsTab("roles");
                  if (serverRoles.length === 0) {
                    fetch("/api/bot/moderation/roles")
                      .then((r) => (r.ok ? r.json() : { roles: [] }))
                      .then((d) => setServerRoles(d.roles || []))
                      .catch(() => null);
                  }
                }}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  settingsTab === "roles"
                    ? "border-discord-blurple text-white font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>🏅</span> Rollen-Belohnungen
              </button>
              <button
                onClick={() => setSettingsTab("penalties")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  settingsTab === "penalties"
                    ? "border-discord-blurple text-white font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>⚠️</span> Straf-Abzüge (Minus)
              </button>
              <button
                onClick={() => setSettingsTab("notifications")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  settingsTab === "notifications"
                    ? "border-discord-blurple text-white font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>🔔</span> Benachrichtigungen
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-gray-300">
              {/* Tab 1: Kurve */}
              {settingsTab === "curve" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border space-y-1">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>🎯</span> Maximales Level & Steigung
                    </div>
                    <p className="text-gray-400 text-xs">
                      Legt fest, bis zu welchem Level Nutzer aufsteigen können (Standard: Level 25). Jede Stufe erfordert progressiv mehr Erfahrungspunkte.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Maximales Level</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formConfig.maxLevel}
                        onChange={(e) => setFormConfig({ ...formConfig, maxLevel: parseInt(e.target.value) || 25 })}
                        className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 25</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Basis-XP pro Stufe</label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        value={formConfig.baseXp}
                        onChange={(e) => setFormConfig({ ...formConfig, baseXp: parseInt(e.target.value) || 350 })}
                        className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 350 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Kurven-Steigung (Exponent)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="3.0"
                        value={formConfig.exponent}
                        onChange={(e) => setFormConfig({ ...formConfig, exponent: parseFloat(e.target.value) || 1.65 })}
                        className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 1.65 (steigend)</span>
                    </div>
                  </div>

                  {/* Live-Vorschau der Kurve */}
                  <div className="p-4 bg-discord-dark rounded-xl border border-discord-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">📊 Live-Berechnung der XP-Anforderung:</span>
                      <span className="text-[11px] text-discord-blurple font-mono">Formel: {formConfig.baseXp} × Stufe^{formConfig.exponent} + 100</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[1, 5, 10, 15, 20, formConfig.maxLevel].map((lvl) => {
                        const needed = Math.floor(formConfig.baseXp * Math.pow(lvl, formConfig.exponent)) + 100;
                        const isMax = lvl === formConfig.maxLevel;
                        return (
                          <div
                            key={lvl}
                            className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                              isMax
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                : "bg-discord-card border-discord-border text-gray-300"
                            }`}
                          >
                            <span className="font-bold flex items-center justify-between text-xs">
                              Level {lvl} {isMax ? "👑 MAX" : ""}
                            </span>
                            <span className="font-mono text-[11px] text-white mt-1">
                              +{needed.toLocaleString("de-DE")} XP
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Belohnungen */}
              {settingsTab === "rewards" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border space-y-1">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>💬</span> Text-Chat XP-Gewinn
                    </div>
                    <p className="text-gray-400 text-xs">
                      Bestimmt, wie viele XP Nutzer beim Schreiben erhalten und wie oft (Cooldown).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Minimale Chat-XP</label>
                      <input
                        type="number"
                        min="1"
                        value={formConfig.messageXpMin}
                        onChange={(e) => setFormConfig({ ...formConfig, messageXpMin: parseInt(e.target.value) || 15 })}
                        className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 15 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Maximale Chat-XP</label>
                      <input
                        type="number"
                        min="1"
                        value={formConfig.messageXpMax}
                        onChange={(e) => setFormConfig({ ...formConfig, messageXpMax: parseInt(e.target.value) || 25 })}
                        className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 25 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Chat-Cooldown (Sekunden)</label>
                      <input
                        type="number"
                        min="5"
                        value={formConfig.messageCooldownSeconds}
                        onChange={(e) => setFormConfig({ ...formConfig, messageCooldownSeconds: parseInt(e.target.value) || 60 })}
                        className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 60 Sek. (Anti-Spam)</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border space-y-1 mt-3">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>🎙️</span> Voice-Chat XP-Gewinn
                    </div>
                    <p className="text-gray-400 text-xs">
                      XP, die ein Mitglied pro Minute im aktiven Sprachkanal erhält (AFK-Kanäle ausgeschlossen).
                    </p>
                  </div>

                  <div className="max-w-xs">
                    <label className="block text-gray-400 mb-1 font-medium">XP pro Voice-Minute</label>
                    <input
                      type="number"
                      min="1"
                      value={formConfig.voiceXpPerMinute}
                      onChange={(e) => setFormConfig({ ...formConfig, voiceXpPerMinute: parseInt(e.target.value) || 5 })}
                      className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Standard: 5 XP pro Minute</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Strafen */}
              {settingsTab === "penalties" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-rose-500/10 rounded-xl border border-rose-500/20 space-y-1">
                    <div className="font-semibold text-rose-300 text-sm flex items-center gap-2">
                      <span>⚠️</span> Negative XP / Automatischer Minus-Level Abzug
                    </div>
                    <p className="text-gray-400 text-xs">
                      Jedes Mal, wenn ein Nutzer verwarnt, ins Gefängnis gesteckt oder gemutet wird, werden ihm automatisch XP abgezogen.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Verwarnung (Warn)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={formConfig.warnPenaltyXp}
                          onChange={(e) => setFormConfig({ ...formConfig, warnPenaltyXp: parseInt(e.target.value) || 0 })}
                          className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                        />
                        <span className="absolute right-3 top-2.5 text-rose-400 text-[11px] font-bold">XP Abzug</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 250 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Timeout (Mute)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={formConfig.timeoutPenaltyXp}
                          onChange={(e) => setFormConfig({ ...formConfig, timeoutPenaltyXp: parseInt(e.target.value) || 0 })}
                          className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                        />
                        <span className="absolute right-3 top-2.5 text-rose-400 text-[11px] font-bold">XP Abzug</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 500 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Gefängnis (Knast/Prison)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={formConfig.prisonPenaltyXp}
                          onChange={(e) => setFormConfig({ ...formConfig, prisonPenaltyXp: parseInt(e.target.value) || 0 })}
                          className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                        />
                        <span className="absolute right-3 top-2.5 text-rose-400 text-[11px] font-bold">XP Abzug</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 1.000 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Unpassender Name (Bad Name)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={formConfig.badNamePenaltyXp}
                          onChange={(e) => setFormConfig({ ...formConfig, badNamePenaltyXp: parseInt(e.target.value) || 0 })}
                          className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                        />
                        <span className="absolute right-3 top-2.5 text-rose-400 text-[11px] font-bold">XP Abzug</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 400 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Wortfilter (Blacklist-Verstoß)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={formConfig.blacklistPenaltyXp}
                          onChange={(e) => setFormConfig({ ...formConfig, blacklistPenaltyXp: parseInt(e.target.value) || 0 })}
                          className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                        />
                        <span className="absolute right-3 top-2.5 text-rose-400 text-[11px] font-bold">XP Abzug</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 300 XP</span>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Kick vom Server</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={formConfig.kickPenaltyXp}
                          onChange={(e) => setFormConfig({ ...formConfig, kickPenaltyXp: parseInt(e.target.value) || 0 })}
                          className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-discord-blurple"
                        />
                        <span className="absolute right-3 top-2.5 text-rose-400 text-[11px] font-bold">XP Abzug</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Standard: 1.500 XP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Rollen-Belohnungen */}
              {settingsTab === "roles" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border space-y-1">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>🏅</span> Rollen für Level-Meilensteine
                    </div>
                    <p className="text-gray-400 text-xs">
                      Erreicht ein Mitglied das Level, bekommt es die Rolle automatisch. Wer schon höher ist, bekommt sie mit{" "}
                      <code className="text-indigo-300">/level sync-roles</code>. Die Rolle muss unter der Bot-Rolle stehen.
                    </p>
                  </div>

                  {Object.entries(formConfig.roleRewards || {})
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([lvl, roleId]) => (
                      <div key={lvl} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 px-2 py-2 rounded-lg bg-discord-dark border border-discord-border text-center font-mono text-white">
                          Lv. {lvl}
                        </span>
                        <select
                          value={roleId}
                          onChange={(e) =>
                            setFormConfig({ ...formConfig, roleRewards: { ...(formConfig.roleRewards || {}), [lvl]: e.target.value } })
                          }
                          className="flex-1 bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-discord-blurple"
                        >
                          <option value="">— Rolle wählen —</option>
                          {serverRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              @{r.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          title="Entfernen"
                          onClick={() => {
                            const next = { ...(formConfig.roleRewards || {}) };
                            delete next[Number(lvl)];
                            setFormConfig({ ...formConfig, roleRewards: next });
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20, 25]
                      .filter((l) => l <= formConfig.maxLevel && !(formConfig.roleRewards || {})[l])
                      .map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setFormConfig({ ...formConfig, roleRewards: { ...(formConfig.roleRewards || {}), [l]: "" } })}
                          className="px-3 py-1.5 rounded-lg bg-discord-dark border border-discord-border hover:border-discord-blurple text-gray-300 hover:text-white text-xs font-semibold"
                        >
                          + Level {l}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        const raw = prompt(`Für welches Level? (1 bis ${formConfig.maxLevel})`);
                        const l = Math.floor(Number(raw));
                        if (!l || l < 1 || l > formConfig.maxLevel) return;
                        setFormConfig({ ...formConfig, roleRewards: { ...(formConfig.roleRewards || {}), [l]: (formConfig.roleRewards || {})[l] || "" } });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-discord-dark border border-dashed border-discord-border hover:border-discord-blurple text-gray-400 hover:text-white text-xs font-semibold"
                    >
                      + Anderes Level
                    </button>
                  </div>
                  {serverRoles.length === 0 && (
                    <p className="text-[11px] text-gray-500">Rollen werden geladen … (nur mit Login verfügbar)</p>
                  )}
                </div>
              )}

              {/* Tab 4: Benachrichtigungen */}
              {settingsTab === "notifications" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-discord-dark rounded-xl border border-discord-border">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formConfig.levelUpNotifications}
                        onChange={(e) => setFormConfig({ ...formConfig, levelUpNotifications: e.target.checked })}
                        className="rounded border-discord-border text-discord-blurple w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-semibold text-white block">Level-Up Benachrichtigungen aktivieren</span>
                        <span className="text-xs text-gray-400">
                          Sendet ein Glückwunsch-Embed im Chat, sobald ein Mitglied ein neues Level erreicht.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-gray-400 font-medium">Ankündigungs-Kanal (Optional)</label>
                    <select
                      value={formConfig.levelUpChannelId || ""}
                      onChange={(e) => setFormConfig({ ...formConfig, levelUpChannelId: e.target.value || undefined })}
                      className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-discord-blurple"
                    >
                      <option value="">Im aktuellen Chat-Kanal senden (Standard)</option>
                      {textChannels.map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-500 block">
                      Wenn leer, antwortet der Bot direkt in dem Kanal, in dem die letzte Nachricht geschrieben wurde.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {settingsError && (
              <div className="mx-5 mb-3 p-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-xs font-medium">
                ❌ {settingsError}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 bg-discord-dark border-t border-discord-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFormConfig(DEFAULT_CONFIG)}
                className="px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-discord-card text-xs font-semibold"
              >
                Standardwerte wiederherstellen
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-discord-card text-xs font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 font-bold text-xs text-white disabled:opacity-50 shadow-md shadow-discord-blurple/20"
                >
                  {savingSettings ? "Speichern..." : "Einstellungen speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
