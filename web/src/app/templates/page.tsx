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

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);
  const [templates, setTemplates] = useState<ServerTemplate[]>([]);
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("gaming");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("modern");
  const [wipe, setWipe] = useState(false);
  const [applying, setApplying] = useState(false);

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
      setIsOwner(Boolean(data.isOwner));
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const currentStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];

  function formatSampleName(slug: string, icon: string, isVoice = false) {
    if (!currentStyle) return slug;
    switch (currentStyle.id) {
      case "clean":
        return slug;
      case "aesthetic":
        return `〢・${slug}`;
      case "box":
        return `「${icon}」${slug}`;
      case "modern":
      default:
        return `${icon}・${slug}`;
    }
  }

  async function handleApplyTemplate() {
    if (wipe && !confirm("WARNUNG: Alle bestehenden Kanäle des Servers werden gelöscht! Ein Backup wird davor automatisch erstellt. Fortfahren?")) {
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
    } catch (err: any) {
      setError(err?.message || "Fehler beim Anwenden");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-discord-blurple" />
        <p className="text-sm">Lade Server-Templates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-discord-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                1-Klick Server-Templates
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Auto-Setup Wizard
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                Richtet in unter 15 Sekunden eine komplette, sichere und professionelle Discord-Server-Struktur ein.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl self-start md:self-auto">
          <Shield className="w-4 h-4" />
          <span>Automatische Snapshot-Sicherung vor jedem Setup</span>
        </div>
      </div>

      {/* Benachrichtigungen */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-emerald-300 text-base">
            <CheckCircle2 className="w-6 h-6" />
            <span>Server-Template erfolgreich eingerichtet!</span>
          </div>
          <p className="text-sm text-gray-300">
            Die Server-Struktur wurde erfolgreich erstellt. Dein automatisches Sicherheits-Backup wurde gespeichert und kann jederzeit unter Backups wiederhergestellt werden.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="bg-discord-dark/60 p-3 rounded-xl border border-discord-border">
              <span className="text-gray-400 block">Backup-ID</span>
              <strong className="text-white font-mono">{success.backupId}</strong>
            </div>
            <div className="bg-discord-dark/60 p-3 rounded-xl border border-discord-border">
              <span className="text-gray-400 block">Erstellte Rollen</span>
              <strong className="text-white font-mono">{success.createdRolesCount}</strong>
            </div>
            <div className="bg-discord-dark/60 p-3 rounded-xl border border-discord-border">
              <span className="text-gray-400 block">Kategorien</span>
              <strong className="text-white font-mono">{success.createdCategoriesCount}</strong>
            </div>
            <div className="bg-discord-dark/60 p-3 rounded-xl border border-discord-border">
              <span className="text-gray-400 block">Kanäle</span>
              <strong className="text-white font-mono">{success.createdChannelsCount}</strong>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/backups"
              className="text-xs text-indigo-300 hover:text-white underline underline-offset-4 inline-flex items-center gap-1"
            >
              Zu den Server-Backups wechseln &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-discord-card border border-discord-border rounded-2xl text-xs font-medium">
        <button
          onClick={() => setStep(1)}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            step === 1 ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20" : "text-gray-400 hover:text-white"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">1</span>
          <span>Vorlage wählen</span>
        </button>
        <button
          onClick={() => setStep(2)}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            step === 2 ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20" : "text-gray-400 hover:text-white"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
          <span>Design & Stil wählen</span>
        </button>
        <button
          onClick={() => setStep(3)}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            step === 3 ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20" : "text-gray-400 hover:text-white"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">3</span>
          <span>Vorschau & Anwenden</span>
        </button>
      </div>

      {/* SCHRITT 1: VORLAGE WÄHLEN */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedTemplateId === tpl.id
                    ? "bg-discord-blurple/10 border-discord-blurple shadow-lg shadow-discord-blurple/10"
                    : "bg-discord-card border-discord-border hover:border-discord-border/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{tpl.icon}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-discord-dark text-gray-300 border border-discord-border">
                      {tpl.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base mb-1.5">{tpl.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{tpl.description}</p>
                </div>

                <div className="pt-3 border-t border-discord-border/50 flex items-center justify-between text-xs text-gray-400">
                  <span>{tpl.categories.length} Kategorien</span>
                  <span>{tpl.roles.length} Rollen</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-medium text-sm transition-all shadow-md shadow-discord-blurple/20"
            >
              <span>Weiter zu Schritt 2: Stil wählen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SCHRITT 2: STIL WÄHLEN */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {styles.map((style) => (
              <div
                key={style.id}
                onClick={() => setSelectedStyleId(style.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedStyleId === style.id
                    ? "bg-discord-blurple/10 border-discord-blurple shadow-lg shadow-discord-blurple/10"
                    : "bg-discord-card border-discord-border hover:border-discord-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-base">{style.name}</h3>
                  {selectedStyleId === style.id && <CheckCircle2 className="w-5 h-5 text-discord-blurple" />}
                </div>
                <p className="text-xs text-gray-400 mb-4">{style.description}</p>

                {/* Beispiel-Box */}
                <div className="p-3 rounded-xl bg-discord-dark/70 border border-discord-border space-y-1.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Hash className="w-3.5 h-3.5 text-gray-500" />
                    <span>{style.sampleText}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                    <span>{style.sampleVoice}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
            >
              &larr; Zurück
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-medium text-sm transition-all shadow-md shadow-discord-blurple/20"
            >
              <span>Weiter zu Schritt 3: Vorschau</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SCHRITT 3: VORSCHAU & ANWENDEN */}
      {step === 3 && currentTemplate && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live-Kanal-Vorschau */}
            <div className="lg:col-span-2 bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-discord-border pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-discord-blurple" />
                  Kanalstruktur-Vorschau ({currentTemplate.name})
                </h3>
                <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Stil: {currentStyle.name}
                </span>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {currentTemplate.categories.map((cat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-discord-dark/50 border border-discord-border/50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>{cat.title}</span>
                      {cat.teamOnly && <Lock className="w-3 h-3 text-rose-400" />}
                    </p>
                    <div className="space-y-1.5 pl-2">
                      {cat.channels.map((ch, j) => (
                        <div key={j} className="flex items-center justify-between text-xs text-gray-300 py-0.5">
                          <div className="flex items-center gap-2">
                            {ch.type === 2 ? (
                              <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-gray-500" />
                            )}
                            <span className="font-mono text-gray-200">
                              {formatSampleName(ch.slug, ch.icon, ch.type === 2)}
                            </span>
                          </div>
                          {ch.teamOnly && (
                            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                              Nur Team
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
    </div>
  );
}
