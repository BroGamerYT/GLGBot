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

interface UserProfileData {
  stats: UserStatEntry;
  rank: number;
  progress: {
    level: number;
    currentXp: number;
    requiredXp: number;
    progressPercent: number;
  };
}

export default function StatsPage() {
  const [topLevels, setTopLevels] = useState<UserStatEntry[]>([]);
  const [topVoice, setTopVoice] = useState<UserStatEntry[]>([]);
  const [topDuos, setTopDuos] = useState<DuoEntry[]>([]);
  const [config, setConfig] = useState<any>({ levelUpNotifications: true });
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"levels" | "voice" | "duos">("levels");

  // User Detail Modal
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [userPartners, setUserPartners] = useState<TalkPartner[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [levelUpNotifs, setLevelUpNotifs] = useState(true);
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
        setConfig(data.config || {});
        setLevelUpNotifs(data.config?.levelUpNotifications ?? true);
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
    try {
      const res = await fetch(`/api/bot/stats/user?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
        setUserPartners(data.partners || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/bot/stats/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelUpNotifications: levelUpNotifs }),
      });
      if (res.ok) {
        setStatusMessage("Level-Up Einstellungen erfolgreich gespeichert!");
        setShowSettings(false);
        setTimeout(() => setStatusMessage(null), 4000);
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
                      <td className="py-3.5 px-4 font-bold text-amber-400 whitespace-nowrap">Level {u.level}</td>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-discord-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Nutzerprofil & Talk-Partner</h3>
                  <p className="text-xs text-gray-400">Detaillierte Statistiken</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingUser ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userProfile ? (
              <div className="space-y-5">
                {/* User Header */}
                <div className="flex items-center gap-4 p-4 bg-discord-dark rounded-xl border border-discord-border">
                  <img
                    src={userProfile.stats.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-discord-blurple"
                  />
                  <div>
                    <h4 className="font-bold text-white text-base">{userProfile.stats.tag}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="text-amber-400 font-bold">Level {userProfile.progress.level}</span>
                      <span>•</span>
                      <span>Rang #{userProfile.rank}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>Fortschritt zu Level {userProfile.progress.level + 1}</span>
                    <span>
                      {userProfile.progress.currentXp} / {userProfile.progress.requiredXp} XP (
                      {userProfile.progress.progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-discord-dark rounded-full overflow-hidden border border-discord-border">
                    <div
                      className="h-full bg-gradient-to-r from-discord-blurple to-amber-400 rounded-full"
                      style={{ width: `${userProfile.progress.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-discord-dark rounded-xl border border-discord-border">
                    <span className="text-gray-400 block mb-1">Chat-Nachrichten</span>
                    <span className="font-bold text-white text-sm">
                      {userProfile.stats.messagesCount.toLocaleString("de-DE")}
                    </span>
                  </div>
                  <div className="p-3 bg-discord-dark rounded-xl border border-discord-border">
                    <span className="text-gray-400 block mb-1">Gesamte Voice-Zeit</span>
                    <span className="font-bold text-cyan-400 text-sm">
                      {formatMinutes(userProfile.stats.voiceMinutes)}
                    </span>
                  </div>
                </div>

                {/* Top Talk-Partners of this user */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    Top Talk-Partner (Mit wem am meisten gequatscht)
                  </h5>

                  {userPartners.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-3 bg-discord-dark rounded-xl">
                      Noch keine gemeinsamen Talk-Sitzungen mit anderen Personen aufgezeichnet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userPartners.map((p, idx) => (
                        <div
                          key={p.partnerId}
                          className="flex items-center justify-between p-2.5 bg-discord-dark rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500 w-4">{idx + 1}.</span>
                            <span className="font-semibold text-white">{p.tag}</span>
                          </div>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {formatMinutes(p.minutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-discord-border pb-3">
              <h3 className="font-bold text-white text-base">Level-Einstellungen</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={levelUpNotifs}
                  onChange={(e) => setLevelUpNotifs(e.target.checked)}
                  className="rounded border-discord-border text-discord-blurple w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">Level-Up Benachrichtigungen</span>
                  <span className="text-xs text-gray-400">
                    Sendet ein Glückwunsch-Embed im Chat, wenn ein Nutzer ein neues Level erreicht.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={savingSettings}
                className="w-full py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 font-semibold text-xs text-white disabled:opacity-50"
              >
                {savingSettings ? "Speichern..." : "Einstellungen speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
