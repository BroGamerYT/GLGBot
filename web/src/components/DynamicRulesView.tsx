"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ScrollText,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface RuleItem {
  emoji: string;
  title: string;
  text: string;
}

interface RulesConfig {
  title: string;
  intro: string;
  rules: RuleItem[];
  consequences: string;
  acceptText: string;
}

interface RulesResponse {
  rules: RulesConfig;
  customized: boolean;
  status: {
    rulesChannelId: string | null;
    permissionsChannelId: string | null;
    guestRoleId: string | null;
    serverLocked: boolean;
    lockProblem: string | null;
  };
}

function renderMarkdown(text: string) {
  if (!text) return "";
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const chip = (t: string) => `<span class="px-1.5 py-0.5 rounded bg-discord-blurple/25 text-indigo-200 font-medium text-xs">${t}</span>`;
  return esc
    .replace(/\{server\}/g, "Community")
    .replace(/\{owner\}/g, chip("@Owner"))
    .replace(/\{@([^}]+)\}/g, (_, n) => chip("@" + n))
    .replace(/\{permissions\}/g, chip("#berechtigungen"))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="text-sky-400 hover:underline inline-flex items-center gap-0.5" href="$2" target="_blank" rel="noreferrer">$1 ↗</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function DynamicRulesView() {
  const [data, setData] = useState<RulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRules() {
    try {
      setError(null);
      const res = await fetch("/api/bot/rules", { cache: "no-store" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json: RulesResponse = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("[DynamicRulesView] Fehler beim Laden der Regeln:", e);
      setError(e.message || "Konnte Regeln nicht abrufen.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, []);

  const filteredRules = useMemo(() => {
    if (!data?.rules?.rules) return [];
    if (!search.trim()) return data.rules.rules;
    const q = search.toLowerCase();
    return data.rules.rules.filter(
      (r, i) =>
        `§${i + 1}`.includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q) ||
        r.emoji.includes(q)
    );
  }, [data, search]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-discord-dark/70 border border-discord-border">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <span>Live-Serverregeln</span>
              {data?.customized && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-discord-blurple/20 text-indigo-300 font-normal">
                  Angepasst
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {lastUpdated
                ? `Stand: ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} Uhr (wird bei Änderungen sofort aktualisiert)`
                : "Synchronisiere mit Bot..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchRules();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-discord-card hover:bg-discord-card/80 border border-discord-border text-xs text-gray-300 hover:text-white transition-all disabled:opacity-50"
            title="Regeln jetzt neu aus dem Bot laden"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-discord-blurple" : ""}`} />
            <span>{refreshing ? "Aktualisiere..." : "Neu laden"}</span>
          </button>

          <Link
            href="/rules"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-discord-blurple/15 hover:bg-discord-blurple/25 border border-discord-blurple/30 text-xs text-indigo-300 hover:text-white transition-all font-medium"
          >
            <span>Regeln bearbeiten</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Suche */}
      {data?.rules?.rules && data.rules.rules.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Regel durchsuchen (z.B. Spam, Respekt, Voice, §2)..."
            className="w-full bg-discord-dark border border-discord-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-3 py-4">
          <div className="h-6 w-1/3 bg-discord-dark rounded animate-pulse" />
          <div className="h-16 w-full bg-discord-dark rounded-xl animate-pulse" />
          <div className="h-20 w-full bg-discord-dark rounded-xl animate-pulse" />
        </div>
      )}

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Fehler beim Laden der Live-Regeln</p>
            <p className="text-xs text-red-300">{error}</p>
            <button
              onClick={fetchRules}
              className="text-xs text-red-200 underline hover:text-white mt-1 inline-block"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {/* Rulebook Content */}
      {data?.rules && (
        <div className="space-y-4">
          {/* Titel & Einleitung */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-discord-card to-discord-dark border border-discord-border/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-wide">
                {data.rules.title || "Serverregeln"}
              </h3>
            </div>
            {data.rules.intro && (
              <div
                className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(data.rules.intro) }}
              />
            )}
          </div>

          {/* Regeln Liste */}
          <div className="grid gap-3">
            {filteredRules.map((rule, idx) => {
              const originalIndex = data.rules.rules.indexOf(rule);
              const num = originalIndex >= 0 ? originalIndex + 1 : idx + 1;
              return (
                <div
                  key={`${rule.title}-${num}`}
                  className="group p-4 rounded-xl bg-discord-dark border border-discord-border hover:border-discord-blurple/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl" role="img" aria-label="Emoji">
                        {rule.emoji || "📌"}
                      </span>
                      <span className="font-bold text-white text-base">
                        §{num} · {rule.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-discord-card text-gray-400 border border-discord-border">
                      §{num}
                    </span>
                  </div>

                  {rule.text && (
                    <div
                      className="text-sm text-gray-300 pl-8 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(rule.text) }}
                    />
                  )}
                </div>
              );
            })}

            {filteredRules.length === 0 && search && (
              <div className="text-center py-8 text-gray-400 text-sm bg-discord-dark/50 rounded-xl border border-discord-border">
                Keine Regel gefunden, die zu „<span className="text-white">{search}</span>“ passt.
              </div>
            )}
          </div>

          {/* Konsequenzen */}
          {data.rules.consequences && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-100 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-xs uppercase tracking-wide text-amber-300">
                  ⚠️ Konsequenzen bei Verstößen
                </p>
                <div
                  className="text-sm text-amber-200/90 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(data.rules.consequences) }}
                />
              </div>
            </div>
          )}

          {/* Freischaltung & Akzeptieren */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-xs uppercase tracking-wide text-emerald-300">
                ✅ Regeln akzeptieren & Freischaltung
              </p>
              <div
                className="text-sm text-emerald-200/90 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(
                    data.rules.acceptText ||
                      "Klicke in Discord im Regelkanal auf den grünen Button „Regeln akzeptieren“, um den Server und alle Kanäle freizuschalten."
                  ),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
