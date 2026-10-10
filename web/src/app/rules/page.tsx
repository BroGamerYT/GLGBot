"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ScrollText, Save, Send, Lock, Unlock, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, RotateCcw,
  CheckCircle2, AlertTriangle, Eye, Pencil, Hash, Info,
} from "lucide-react";

interface RuleItem { emoji: string; title: string; text: string }
interface RulesConfig { title: string; intro: string; rules: RuleItem[]; consequences: string; acceptText: string }
interface Status {
  rulesChannelId: string | null;
  permissionsChannelId: string | null;
  guestRoleId: string | null;
  serverLocked: boolean;
  lockProblem: string | null;
}

const LIMITS = { rules: 25, title: 100, ruleTitle: 100, text: 1000, intro: 1500, consequences: 500, acceptText: 1000 };

const input = "w-full bg-discord-dark border border-discord-border rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all";

function Counter({ value, max }: { value: string; max: number }) {
  return <span className={`text-[11px] ${value.length > max ? "text-red-400" : "text-gray-500"}`}>{value.length}/{max}</span>;
}

/** Sehr einfache Discord-Markdown-Vorschau (fett, kursiv, Links, Platzhalter). */
function renderMarkdown(text: string, ctx: { server: string; channels: Record<string, string>; permissionsChannel?: string }) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const chip = (t: string) => `<span class="px-1 rounded bg-discord-blurple/30 text-indigo-200">${t}</span>`;
  return esc
    .replace(/\{server\}/g, ctx.server)
    .replace(/\{owner\}/g, chip("@Owner"))
    .replace(/\{@([^}]+)\}/g, (_, n) => chip("@" + n))
    .replace(/\{permissions\}/g, chip("#" + (ctx.permissionsChannel || "berechtigungen")))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="text-sky-400 hover:underline" href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white'>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function RulesPage() {
  const [rules, setRules] = useState<RulesConfig | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [customized, setCustomized] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    try {
      const [rRes, gRes] = await Promise.all([fetch("/api/bot/rules"), fetch("/api/discord/guild")]);
      const r = await rRes.json();
      if (!rRes.ok) throw new Error(r.error);
      setRules(r.rules);
      setSaved(JSON.stringify(r.rules));
      setCustomized(r.customized);
      setStatus(r.status);
      setGuild(await gRes.json());
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message || "Konnte Regeln nicht laden."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dirty = rules ? JSON.stringify(rules) !== saved : false;
  const channelNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of guild?.channels || []) map[c.id] = c.name;
    return map;
  }, [guild]);
  const roleName = (id: string | null) => guild?.roles?.find((r: any) => r.id === id)?.name;

  function update(patch: Partial<RulesConfig>) {
    setRules((r) => (r ? { ...r, ...patch } : r));
  }
  function updateRule(i: number, patch: Partial<RuleItem>) {
    setRules((r) => (r ? { ...r, rules: r.rules.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : r));
  }
  function moveRule(i: number, dir: -1 | 1) {
    setRules((r) => {
      if (!r) return r;
      const list = [...r.rules];
      const j = i + dir;
      if (j < 0 || j >= list.length) return r;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...r, rules: list };
    });
  }

  async function call(action: string, method: "POST" | "PUT", body?: unknown) {
    const res = await fetch(`/api/bot/${action}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unbekannter Fehler");
    return json;
  }

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setMessage(null);
    try {
      setMessage({ text: await fn(), type: "success" });
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, type: "error" });
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      const json = await call("rules", "PUT", { rules });
      setRules(json.rules);
      setSaved(JSON.stringify(json.rules));
      setCustomized(true);
      return "✅ Regeln gespeichert. Klicke auf „In Discord posten“, damit sie im Regelkanal erscheinen.";
    });

  const reset = () => {
    if (!confirm("Alle Änderungen verwerfen und die Standard-Regeln wiederherstellen?")) return;
    run("reset", async () => {
      const json = await call("rules/reset", "POST");
      setRules(json.rules);
      setSaved(JSON.stringify(json.rules));
      setCustomized(false);
      return "↩️ Standard-Regeln wiederhergestellt.";
    });
  };

  const postRules = () =>
    run("post", async () => {
      if (dirty) {
        const json = await call("rules", "PUT", { rules });
        setSaved(JSON.stringify(json.rules));
        setCustomized(true);
      }
      const json = await call("rules/post", "POST");
      await load();
      return `✅ Regeln in #${json.rulesChannel.name} gepostet${json.rulesChannel.created ? " (Kanal neu erstellt)" : ""} · Rollen-Panel in #${json.permissionsChannel.name}${json.permissionsChannel.created ? " (neu erstellt)" : ""}.`;
    });

  const lock = () => {
    if (
      !confirm(
        "Regel-Sperre aktivieren?\n\n• Alle bisherigen Mitglieder bekommen automatisch die Gast-Rolle (niemand wird ausgesperrt).\n• Neue Mitglieder sehen danach nur noch den Regelkanal, bis sie die Regeln akzeptieren.\n\nDas lässt sich jederzeit wieder aufheben."
      )
    )
      return;
    run("lock", async () => {
      const json = await call("rules/lock", "POST");
      await load();
      return `🔒 Regel-Sperre aktiv! ${json.granted} Mitglieder haben die Gast-Rolle bekommen, ${json.adjusted} Kanäle wurden angepasst.`;
    });
  };

  const unlock = () => {
    if (!confirm("Regel-Sperre aufheben? Danach sehen wieder alle Mitglieder alle Kanäle.")) return;
    run("unlock", async () => {
      await call("rules/unlock", "POST");
      await load();
      return "🔓 Regel-Sperre aufgehoben.";
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ctx = {
    server: guild?.guild?.name || "Server",
    channels: channelNames,
    permissionsChannel: status?.permissionsChannelId ? channelNames[status.permissionsChannelId] : undefined,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-discord-yellow" />
            Regeln & Freischaltung
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Regeln bearbeiten, im Regelkanal posten und festlegen, dass nur freigeschaltete Mitglieder den Server sehen.
          </p>
        </div>
        <button
          onClick={postRules}
          disabled={busy !== null || !rules}
          className="px-4 py-2.5 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          {busy === "post" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {dirty ? "Speichern & in Discord posten" : "In Discord posten"}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            message.type === "success" ? "bg-discord-green/10 border-discord-green/30 text-discord-green" : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5">
            <p className="text-xs text-gray-400 mb-1">Regelkanal</p>
            <p className="text-white font-semibold flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-gray-500" />
              {status.rulesChannelId ? channelNames[status.rulesChannelId] || "unbekannt" : <span className="text-gray-500 font-normal">noch nicht gepostet</span>}
            </p>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-2xl p-5">
            <p className="text-xs text-gray-400 mb-1">Berechtigungskanal</p>
            <p className="text-white font-semibold flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-gray-500" />
              {status.permissionsChannelId ? channelNames[status.permissionsChannelId] || "unbekannt" : <span className="text-gray-500 font-normal">noch nicht gepostet</span>}
            </p>
          </div>
          <div className={`rounded-2xl p-5 border ${status.serverLocked ? "bg-discord-green/5 border-discord-green/30" : "bg-discord-card border-discord-border"}`}>
            <p className="text-xs text-gray-400 mb-1">Regel-Sperre</p>
            <div className="flex items-center justify-between gap-2">
              <p className={`font-semibold flex items-center gap-1.5 ${status.serverLocked ? "text-discord-green" : "text-gray-300"}`}>
                {status.serverLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {status.serverLocked ? "Aktiv" : "Aus"}
              </p>
              {status.serverLocked ? (
                <button onClick={unlock} disabled={busy !== null} className="text-xs px-3 py-1.5 rounded-lg border border-discord-border hover:border-red-400 text-gray-300 disabled:opacity-50">
                  {busy === "unlock" ? "…" : "Aufheben"}
                </button>
              ) : (
                <button
                  onClick={lock}
                  disabled={busy !== null || !status.rulesChannelId || Boolean(status.lockProblem)}
                  title={!status.rulesChannelId ? "Zuerst die Regeln posten" : status.lockProblem || ""}
                  className="text-xs px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold disabled:opacity-40"
                >
                  {busy === "lock" ? "…" : "Aktivieren"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {status && !status.serverLocked && (status.lockProblem || !status.rulesChannelId) && (
        <div className="p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/5 text-yellow-200 text-sm flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-400" />
          <div>
            <p className="font-semibold">Bevor du die Sperre aktivieren kannst:</p>
            <ul className="list-disc list-inside mt-1 text-yellow-100/80 space-y-0.5">
              {!status.rulesChannelId && <li>Regeln einmal in Discord posten (Button oben rechts).</li>}
              {status.lockProblem && <li>{status.lockProblem.replace(/\*\*/g, "")}</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Editor / Vorschau */}
      {rules && (
        <div className="bg-discord-card border border-discord-border rounded-2xl shadow-xl">
          <div className="flex items-center justify-between border-b border-discord-border px-4 md:px-6">
            <div className="flex">
              {(["edit", "preview"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-4 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                    tab === t ? "border-discord-blurple text-white" : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {t === "edit" ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {t === "edit" ? "Bearbeiten" : "Vorschau"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {customized && (
                <button onClick={reset} disabled={busy !== null} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-2 py-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Standard
                </button>
              )}
              <button
                onClick={save}
                disabled={busy !== null || !dirty}
                className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                {busy === "save" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {dirty ? "Speichern" : "Gespeichert"}
              </button>
            </div>
          </div>

          {tab === "edit" ? (
            <div className="p-4 md:p-6 space-y-6">
              <div className="p-3 rounded-xl bg-discord-dark border border-discord-border text-xs text-gray-400 flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-discord-blurple" />
                <span>
                  Platzhalter: <code className="text-indigo-300">{"{server}"}</code> Servername ·{" "}
                  <code className="text-indigo-300">{"{@Name}"}</code> erwähnt ein Mitglied (z. B. <code className="text-indigo-300">{"{@MaxMustermann}"}</code>) ·{" "}
                  <code className="text-indigo-300">{"{permissions}"}</code> Link zu #berechtigungen. Formatierung: <code>**fett**</code>, <code>*kursiv*</code>,{" "}
                  <code>[Text](https://link)</code>, Aufzählung mit <code>•</code>.
                </span>
              </div>

              <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-200">Überschrift</span>
                  <input className={`${input} mt-1`} value={rules.title} onChange={(e) => update({ title: e.target.value })} />
                </label>
                <Counter value={rules.title} max={LIMITS.title} />
              </div>

              <label className="block">
                <span className="flex justify-between text-sm font-semibold text-gray-200">
                  Einleitung <Counter value={rules.intro} max={LIMITS.intro} />
                </span>
                <textarea rows={3} className={`${input} mt-1`} value={rules.intro} onChange={(e) => update({ intro: e.target.value })} />
              </label>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-200">
                  Regeln <span className="text-gray-500 font-normal">({rules.rules.length}/{LIMITS.rules})</span>
                </p>
                {rules.rules.map((r, i) => (
                  <div key={i} className="bg-discord-dark border border-discord-border rounded-xl p-3 md:p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 w-8 shrink-0">§{i + 1}</span>
                      <input
                        className="w-14 shrink-0 bg-discord-dark border border-discord-border rounded-xl py-2.5 text-white text-sm text-center focus:outline-none focus:border-discord-blurple transition-all"
                        value={r.emoji}
                        onChange={(e) => updateRule(i, { emoji: e.target.value })}
                        title="Emoji"
                      />
                      <input className={input} value={r.title} placeholder="Titel der Regel" onChange={(e) => updateRule(i, { title: e.target.value })} />
                      <div className="flex shrink-0">
                        <button onClick={() => moveRule(i, -1)} disabled={i === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-20" title="Nach oben">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => moveRule(i, 1)} disabled={i === rules.rules.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-20" title="Nach unten">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirm(`§${i + 1} „${r.title}“ löschen?`) && update({ rules: rules.rules.filter((_, j) => j !== i) })}
                          className="p-2 text-gray-400 hover:text-red-400"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <textarea rows={3} className={input} value={r.text} placeholder="Regeltext" onChange={(e) => updateRule(i, { text: e.target.value })} />
                    <div className="text-right">
                      <Counter value={r.text} max={LIMITS.text} />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => update({ rules: [...rules.rules, { emoji: "📌", title: "", text: "" }] })}
                  disabled={rules.rules.length >= LIMITS.rules}
                  className="w-full py-3 rounded-xl border border-dashed border-discord-border hover:border-discord-blurple text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Regel hinzufügen
                </button>
              </div>

              <label className="block">
                <span className="flex justify-between text-sm font-semibold text-gray-200">
                  Schlusswort <Counter value={rules.consequences} max={LIMITS.consequences} />
                </span>
                <textarea rows={2} className={`${input} mt-1`} value={rules.consequences} onChange={(e) => update({ consequences: e.target.value })} />
              </label>

              <label className="block">
                <span className="flex justify-between text-sm font-semibold text-gray-200">
                  Text über dem „Regeln akzeptieren“-Button <Counter value={rules.acceptText} max={LIMITS.acceptText} />
                </span>
                <textarea rows={3} className={`${input} mt-1`} value={rules.acceptText} onChange={(e) => update({ acceptText: e.target.value })} />
              </label>
            </div>
          ) : (
            /* Discord-ähnliche Vorschau */
            <div className="p-4 md:p-6 bg-[#313338] rounded-b-2xl">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs font-bold shrink-0">GLG</div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold text-white">GLGBot</span>{" "}
                    <span className="text-[10px] bg-discord-blurple text-white px-1 rounded align-middle">APP</span>
                  </p>
                  <div className="border-l-4 border-discord-blurple bg-[#2b2d31] rounded p-4 max-w-2xl">
                    <p className="font-bold text-white mb-1">{rules.title} · {ctx.server}</p>
                    <p className="text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: renderMarkdown(rules.intro, ctx) }} />
                  </div>
                  <div className="border-l-4 border-discord-blurple bg-[#2b2d31] rounded p-4 max-w-2xl space-y-3">
                    {rules.rules.map((r, i) => (
                      <div key={i} className="text-sm text-gray-300">
                        <p className="font-bold text-white">{r.emoji}  §{i + 1} · {r.title}</p>
                        <p dangerouslySetInnerHTML={{ __html: renderMarkdown(r.text, ctx) }} />
                      </div>
                    ))}
                    {rules.consequences && (
                      <p className="text-sm text-gray-300 italic" dangerouslySetInnerHTML={{ __html: "⚠️ " + renderMarkdown(rules.consequences, ctx) }} />
                    )}
                  </div>
                  <div className="border-l-4 border-discord-green bg-[#2b2d31] rounded p-4 max-w-2xl">
                    <p className="font-bold text-white mb-1">✅ Regeln akzeptieren</p>
                    <p className="text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: renderMarkdown(rules.acceptText, ctx) }} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-[#248046] text-white text-sm font-medium px-4 py-1.5 rounded">
                    <CheckCircle2 className="w-4 h-4" /> Regeln akzeptieren
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {status?.guestRoleId && (
        <p className="text-xs text-gray-500">
          Wer die Regeln akzeptiert, bekommt die Rolle <span className="text-gray-300">@{roleName(status.guestRoleId) || "Gast"}</span>. Ändern kannst du sie unter „Rollen & Rechte“.
        </p>
      )}
    </div>
  );
}
