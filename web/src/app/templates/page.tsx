"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderTree,
  Hash,
  Volume2,
  Lock,
  ChevronRight,
  Info,
  Type,
  Copy,
  Check,
  Wand2,
  Radio,
} from "lucide-react";

interface TemplateChannel {
  slug: string;
  icon: string;
  type: number;
  topic?: string;
  teamOnly?: boolean;
}

interface TemplateCategory {
  title: string;
  icon: string;
  teamOnly?: boolean;
  channels: TemplateChannel[];
}

interface TemplateRole {
  name: string;
  color: number;
  hoist: boolean;
  isTeam?: boolean;
}

interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  size?: "kompakt" | "standard" | "gross" | "mega";
  sizeLabel?: string;
  icon: string;
  roles: TemplateRole[];
  categories: TemplateCategory[];
}

interface StyleDef {
  id: string;
  name: string;
  description: string;
  sampleText: string;
  sampleVoice: string;
}

interface ChannelInfo {
  id: string;
  name: string;
  type: number;
  parentId?: string | null;
}

const SMALL_CAPS_MAP: Record<string, string> = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
  j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
  ä: "ä", ö: "ö", ü: "ü", ß: "ss",
};

function toSmallCaps(text: string): string {
  return text
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      return SMALL_CAPS_MAP[lower] || char;
    })
    .join("");
}

function toBoldSans(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + code - 97);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + code - 65);
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + code - 48);
      return char;
    })
    .join("");
}

function toGothic(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d586 + code - 97);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d56c + code - 65);
      return char;
    })
    .join("");
}

function formatPreview(slug: string, styleId: string, icon = "💬"): string {
  const cleanSlug = slug.trim() || "hauptchat";
  switch (styleId) {
    case "smallcaps":
      return `${icon}・${toSmallCaps(cleanSlug)}`;
    case "boldsans":
      return `${icon}・${toBoldSans(cleanSlug)}`;
    case "aesthetic_caps":
      return `〢・${toSmallCaps(cleanSlug)}`;
    case "aesthetic":
      return `〢・${cleanSlug.toLowerCase()}`;
    case "box_caps":
      return `「${icon}」${toSmallCaps(cleanSlug)}`;
    case "box":
      return `「${icon}」${cleanSlug.toLowerCase()}`;
    case "cyber":
      return `◈・${toSmallCaps(cleanSlug)}`;
    case "gothic":
      return `⚔・${toGothic(cleanSlug)}`;
    case "clean":
      return cleanSlug.toLowerCase();
    case "modern":
    default:
      return `${icon}・${cleanSlug.toLowerCase()}`;
  }
}

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);
  const [templates, setTemplates] = useState<ServerTemplate[]>([]);
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  // Filter & Wizard State
  const [sizeFilter, setSizeFilter] = useState<"all" | "kompakt" | "standard" | "gross" | "mega">("all");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("gaming");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("smallcaps");
  const [wipe, setWipe] = useState(false);
  const [applying, setApplying] = useState(false);

  // Designer Tool State
  const [designerText, setDesignerText] = useState("hauptchat");
  const [designerIcon, setDesignerIcon] = useState("💬");
  const [copiedStyle, setCopiedStyle] = useState<string | null>(null);
  const [selectedTargetChannel, setSelectedTargetChannel] = useState<string>("");
  const [selectedTargetStyle, setSelectedTargetStyle] = useState<string>("smallcaps");
  const [renamingChannel, setRenamingChannel] = useState(false);
  const [designerSuccess, setDesignerSuccess] = useState<string | null>(null);
  const [designerError, setDesignerError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bot/templates");
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Fehler beim Laden der Vorlagen");
      }
      const data = await res.json();
      setTemplates(data.templates || []);
      setStyles(data.styles || []);
      setChannels(data.channels || []);
      setIsOwner(Boolean(data.isOwner));
      if (data.channels && data.channels.length > 0) {
        setSelectedTargetChannel(data.channels[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const currentStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];

  const filteredTemplates = templates.filter((t) => {
    if (sizeFilter === "all") return true;
    return t.size === sizeFilter;
  });

  function formatSampleName(slug: string, icon: string) {
    if (!currentStyle) return slug;
    return formatPreview(slug, currentStyle.id, icon);
  }

  async function handleApplyTemplate() {
    if (
      wipe &&
      !confirm(
        "WARNUNG: Alle bestehenden Kanäle des Servers werden gelöscht! Ein Backup wird davor automatisch erstellt. Fortfahren?"
      )
    ) {
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bot/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          styleId: selectedStyleId,
          wipe,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Einrichtung fehlgeschlagen");
      setSuccess(data);
      // Kanäle neu laden
      loadTemplates();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Anwenden");
    } finally {
      setApplying(false);
    }
  }

  function handleCopy(text: string, styleId: string) {
    navigator.clipboard.writeText(text);
    setCopiedStyle(styleId);
    setTimeout(() => setCopiedStyle(null), 2000);
  }

  async function handleRenameChannel() {
    if (!selectedTargetChannel) return;
    setRenamingChannel(true);
    setDesignerError(null);
    setDesignerSuccess(null);
    try {
      const res = await fetch("/api/bot/channels/rename-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedTargetChannel,
          styleId: selectedTargetStyle,
          customName: designerText,
          customIcon: designerIcon,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Umbenennen fehlgeschlagen");
      setDesignerSuccess(`Kanal erfolgreich umbenannt in „${data.newName}“!`);
      // Update local channel list
      setChannels((prev) =>
        prev.map((c) => (c.id === selectedTargetChannel ? { ...c, name: data.newName } : c))
      );
    } catch (err: any) {
      setDesignerError(err?.message || "Fehler beim Umbenennen");
    } finally {
      setRenamingChannel(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-discord-blurple" />
        <p className="text-sm">Lade Server-Templates & Schriftstile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-discord-border">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/20">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                1-Klick Server-Templates & Kanal-Designer
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Richte schlüsselfertige Discord-Server von klein bis groß ein und style Kanäle mit coolen Unicode-Schriftarten.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/backups"
            className="px-4 py-2 rounded-xl bg-discord-card hover:bg-discord-dark border border-discord-border text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Backups verwalten</span>
          </Link>
        </div>
      </div>

      {/* Erfolgs-Meldung nach Ausrollen */}
      {success && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-3 font-bold text-emerald-400 text-base">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>Server-Template erfolgreich ausgerollt!</span>
          </div>
          <p className="text-sm text-gray-300">
            Es wurden <strong>{success.createdCategoriesCount || 0} Kategorien</strong>,{" "}
            <strong>{success.createdChannelsCount || 0} Kanäle</strong> und{" "}
            <strong>{success.createdRolesCount || 0} Rollen</strong> angelegt.
          </p>
          {success.backupId && (
            <div className="text-xs text-emerald-300 flex items-center gap-2 pt-1">
              <span>Sicherheits-Backup erstellt:</span>
              <code className="bg-discord-dark px-2 py-0.5 rounded text-white font-mono">
                {success.backupId}
              </code>
              <Link href="/backups" className="underline text-white font-medium hover:text-emerald-300">
                Zu den Backups &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Fehler-Meldung */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Step-Pills */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-discord-card border border-discord-border">
        <button
          onClick={() => setStep(1)}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            step === 1
              ? "bg-discord-blurple text-white shadow-lg shadow-discord-blurple/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">1</span>
          <span>Vorlage wählen ({templates.length})</span>
        </button>

        <button
          onClick={() => setStep(2)}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            step === 2
              ? "bg-discord-blurple text-white shadow-lg shadow-discord-blurple/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
          <span>Schriftart & Stil ({styles.length})</span>
        </button>

        <button
          onClick={() => setStep(3)}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            step === 3
              ? "bg-discord-blurple text-white shadow-lg shadow-discord-blurple/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">3</span>
          <span>Vorschau & Ausrollen</span>
        </button>
      </div>

      {/* SCHRITT 1: VORLAGE WÄHLEN */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Größen-Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold mr-1">Größe:</span>
            {[
              { id: "all", label: "Alle Vorlagen", count: templates.length },
              { id: "kompakt", label: "🌱 Kompakt (Schlank)", count: templates.filter((t) => t.size === "kompakt").length },
              { id: "standard", label: "🎮 Standard", count: templates.filter((t) => t.size === "standard").length },
              { id: "gross", label: "🌐 Groß", count: templates.filter((t) => t.size === "gross").length },
              { id: "mega", label: "🏰 Mega-Community", count: templates.filter((t) => t.size === "mega").length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSizeFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  sizeFilter === f.id
                    ? "bg-discord-blurple text-white shadow-sm"
                    : "bg-discord-card text-gray-400 hover:text-white border border-discord-border"
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[10px] opacity-70">({f.count})</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplateId === t.id;
              const totalChannels = t.categories.reduce((acc, c) => acc + c.channels.length, 0);

              let sizeBadgeColor = "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
              if (t.size === "kompakt") sizeBadgeColor = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
              if (t.size === "gross") sizeBadgeColor = "bg-purple-500/10 text-purple-300 border-purple-500/20";
              if (t.size === "mega") sizeBadgeColor = "bg-amber-500/10 text-amber-300 border-amber-500/20";

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-discord-blurple/10 border-discord-blurple ring-2 ring-discord-blurple/30 shadow-xl"
                      : "bg-discord-card border-discord-border hover:border-discord-blurple/50 hover:bg-discord-dark/50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-3xl p-2.5 rounded-xl bg-discord-dark border border-discord-border/50">
                        {t.icon}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sizeBadgeColor}`}>
                          {t.sizeLabel || t.badge}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {t.categories.length} Kat. • {totalChannels} Kanäle
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        {t.name}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-discord-border/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.roles.length} Rollen</span>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors ${
                        isSelected
                          ? "bg-discord-blurple text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>{isSelected ? "Ausgewählt" : "Wählen"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-discord-blurple/20 transition-all"
            >
              <span>Weiter zu Schriftart & Stil</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SCHRITT 2: SCHRIFTART & STIL WÄHLEN */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 space-y-2">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Type className="w-4 h-4 text-discord-blurple" />
              Wähle den Design-Stil für die Kanalnamen
            </h3>
            <p className="text-gray-400 text-xs">
              Alle Kanäle und Kategorien der gewählten Vorlage <strong>{currentTemplate.name}</strong> werden automatisch in diesem Stil formatiert.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map((s) => {
              const isSelected = selectedStyleId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStyleId(s.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-discord-blurple/10 border-discord-blurple ring-2 ring-discord-blurple/30 shadow-xl"
                      : "bg-discord-card border-discord-border hover:border-discord-blurple/50 hover:bg-discord-dark/50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{s.name}</h4>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-discord-blurple" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">{s.description}</p>

                    <div className="space-y-1.5 p-3 rounded-xl bg-discord-dark/70 border border-discord-border/50 font-mono text-xs">
                      <div className="flex items-center gap-2 text-indigo-300">
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                        <span>{s.sampleText}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Volume2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{s.sampleVoice}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-discord-blurple" : "text-gray-500"
                      }`}
                    >
                      {isSelected ? "Aktiv ausgewählt ✓" : "Diesen Stil wählen"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white text-sm"
            >
              &larr; Zurück zu Vorlage
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-discord-blurple/20 transition-all"
            >
              <span>Weiter zur Vorschau & Ausrollen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SCHRITT 3: VORSCHAU & SETUP */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live-Kanal-Baum */}
            <div className="lg:col-span-2 bg-discord-card border border-discord-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-discord-border/60">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{currentTemplate.icon}</div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {currentTemplate.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Stil: <strong className="text-indigo-400">{currentStyle.name}</strong> •{" "}
                      {currentTemplate.sizeLabel || currentTemplate.badge}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-discord-blurple hover:underline font-semibold"
                >
                  Stil ändern
                </button>
              </div>

              {/* Kategorien & Kanäle */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {currentTemplate.categories.map((cat, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3.5 rounded-xl bg-discord-dark/50 border border-discord-border/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                      <span className="flex items-center gap-2">
                        <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{formatSampleName(cat.title, cat.icon)}</span>
                      </span>
                      {cat.teamOnly && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          TEAM ONLY
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3">
                      {cat.channels.map((ch, chIdx) => (
                        <div
                          key={chIdx}
                          className="flex items-center justify-between p-2 rounded-lg bg-discord-card/60 text-xs border border-discord-border/30 font-mono"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {ch.type === 2 ? (
                              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                            <span className="truncate text-gray-200">
                              {formatSampleName(ch.slug, ch.icon)}
                            </span>
                          </div>
                          {ch.teamOnly && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 shrink-0">
                              Team
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rollen & Optionen */}
            <div className="space-y-4">
              {/* Rollen-Liste */}
              <div className="bg-discord-card border border-discord-border rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Rollen-Hierarchie ({currentTemplate.roles.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {currentTemplate.roles.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-discord-dark/60">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `#${r.color.toString(16).padStart(6, "0")}` }}
                        />
                        <span className="font-medium text-gray-200">@{r.name}</span>
                      </div>
                      {r.isTeam && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-discord-blurple/20 text-indigo-300 font-semibold">
                          TEAM
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Optionen */}
              <div className="bg-discord-card border border-discord-border rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-white text-sm">Setup-Optionen</h4>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Vor dem Ausrollen wird <strong>automatisch ein vollständiges Server-Backup</strong> erstellt. Du kannst jederzeit mit 1 Klick zurückrollen.
                  </span>
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wipe}
                      disabled={!isOwner}
                      onChange={(e) => setWipe(e.target.checked)}
                      className="mt-1 rounded bg-discord-dark border-discord-border text-rose-500 focus:ring-rose-500 disabled:opacity-50"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        Server-Kanäle vorher leeren (Wipe)
                      </span>
                      <span className="text-gray-400">
                        {isOwner
                          ? "Löscht bestehende Kanäle vor dem Setup für einen sauberen Neuanfang."
                          : "Nur für den Server-Inhaber (Owner) verfügbar."}
                      </span>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleApplyTemplate}
                  disabled={applying}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    wipe
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                      : "bg-discord-blurple hover:bg-indigo-600 text-white shadow-lg shadow-discord-blurple/20"
                  }`}
                >
                  {applying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Richte Server-Struktur ein...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{wipe ? "WIPE & Template jetzt anwenden" : "Template jetzt einrichten"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-start pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
            >
              &larr; Zurück zu Stil wählen
            </button>
          </div>
        </div>
      )}

      {/* NEUER ABSCHNITT: INTERAKTIVER KANAL-SCHRIFTARTEN & DESIGNER GENERATOR */}
      <div className="pt-8 border-t border-discord-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ✨ Live Kanal-Schriftarten & Designer Tool
              </h2>
              <p className="text-gray-400 text-xs">
                Tippe einen Namen ein, teste alle 10 Schriftstile live, kopiere sie per Klick oder style direkt einen echten Discord-Kanal!
              </p>
            </div>
          </div>
        </div>

        {designerSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{designerSuccess}</span>
          </div>
        )}

        {designerError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{designerError}</span>
          </div>
        )}

        {/* Input & Direct Discord Action */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-discord-card border border-discord-border rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Kanalname eingeben:</label>
                <input
                  type="text"
                  value={designerText}
                  onChange={(e) => setDesignerText(e.target.value)}
                  placeholder="z. B. allgemein, talk-1, memes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-discord-dark border border-discord-border text-white text-sm focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Emoji / Icon:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={designerIcon}
                    onChange={(e) => setDesignerIcon(e.target.value)}
                    maxLength={4}
                    className="w-16 text-center px-2 py-2.5 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  />
                  <div className="flex flex-wrap gap-1 items-center">
                    {["💬", "🔊", "📢", "🎮", "🎁", "📜"].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setDesignerIcon(em)}
                        className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors ${
                          designerIcon === em
                            ? "bg-discord-blurple text-white"
                            : "bg-discord-dark hover:bg-black/40 text-gray-300"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              💡 <strong>Tipp:</strong> Klicke auf ein Ergebnis unten, um es direkt in die Zwischenablage zu kopieren. Im Discord kannst du auch <code>/channel-style</code> oder <code>/font</code> nutzen!
            </p>
          </div>

          {/* Direkt auf Discord anwenden (Admin) */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-discord-blurple" />
                <span>Kanal auf dem Server live umbenennen</span>
              </h4>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400">Server-Kanal auswählen:</label>
                <select
                  value={selectedTargetChannel}
                  onChange={(e) => setSelectedTargetChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-xs"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.type === 4 ? `📁 [Kategorie] ${c.name}` : c.type === 2 ? `🔊 ${c.name}` : `💬 ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400">Stil anwenden:</label>
                <select
                  value={selectedTargetStyle}
                  onChange={(e) => setSelectedTargetStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-xs"
                >
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRenameChannel}
              disabled={renamingChannel || !selectedTargetChannel}
              className="w-full py-2.5 rounded-xl bg-discord-blurple hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {renamingChannel ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Wird formatiert...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auf Discord anwenden</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Stile Kacheln */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {styles.map((st) => {
            const previewText = formatPreview(designerText, st.id, designerIcon);
            const isCopied = copiedStyle === st.id;

            return (
              <div
                key={st.id}
                onClick={() => handleCopy(previewText, st.id)}
                className="group p-4 rounded-2xl bg-discord-card border border-discord-border hover:border-discord-blurple/60 hover:bg-discord-dark/50 cursor-pointer transition-all flex flex-col justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white text-[11px] group-hover:text-indigo-300 transition-colors">
                      {st.name}
                    </span>
                    <button
                      type="button"
                      className="text-gray-400 group-hover:text-white"
                      title="Kopieren"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{st.description}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-discord-dark/80 border border-discord-border/50 text-center font-mono text-xs text-indigo-300 font-semibold truncate">
                  {previewText}
                </div>

                <div className="text-center text-[10px] font-bold text-gray-500 group-hover:text-discord-blurple transition-colors">
                  {isCopied ? "Kopiert! ✓" : "Klick zum Kopieren"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
