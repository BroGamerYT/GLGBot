"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Send, Reply, Trash2, X, RefreshCw, Hash, Bot, Lock } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  category: string | null;
  canSend: boolean;
}
interface Msg {
  id: string;
  content: string;
  createdAt: number;
  editedAt: number | null;
  author: { id: string; name: string; avatar: string; bot: boolean };
  isOwnBot: boolean;
  replyTo: string | null;
  embeds: { title: string | null; description: string | null; color: number | null }[];
  attachments: { name: string; url: string; image: boolean }[];
}

const POLL_MS = 4000;

export default function ConsolePage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [canEveryone, setCanEveryone] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);
  const stickBottom = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bot/console/channels");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setChannels(json.channels || []);
        setCanEveryone(!!json.canMentionEveryone);
        let saved = "";
        try {
          saved = localStorage.getItem("glg_console_channel") || "";
        } catch {}
        const first = (json.channels || []).find((c: Channel) => c.id === saved) || json.channels?.[0];
        if (first) setChannelId(first.id);
      } catch (e: any) {
        setError(e.message || "Kanäle konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Kanal wechseln → komplett laden, danach regelmäßig nur neue Nachrichten holen
  useEffect(() => {
    if (!channelId) return;
    try {
      localStorage.setItem("glg_console_channel", channelId);
    } catch {}
    let stop = false;
    setMessages([]);
    setReplyTo(null);
    lastId.current = null;
    stickBottom.current = true;

    async function fetchMessages(full: boolean) {
      const q = new URLSearchParams({ channelId });
      if (!full && lastId.current) q.set("after", lastId.current);
      const res = await fetch(`/api/bot/console/messages?${q}`);
      const json = await res.json();
      if (stop) return;
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setError(null);
      const list: Msg[] = json.messages || [];
      if (full) setMessages(list);
      else if (list.length) setMessages((prev) => [...prev, ...list.filter((m) => !prev.some((p) => p.id === m.id))].slice(-200));
      if (list.length) lastId.current = list[list.length - 1].id;
    }

    fetchMessages(true).catch(() => null);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") fetchMessages(false).catch(() => null);
    }, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [channelId]);

  useEffect(() => {
    if (stickBottom.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const channel = channels.find((c) => c.id === channelId);

  async function send() {
    const content = text.trim();
    if (!content || !channel) return;
    if (!canEveryone && /@(everyone|here)/.test(content) && !confirm("Du hast keine Berechtigung für @everyone/@here - die Erwähnung wird nicht pingen. Trotzdem senden?")) return;
    setSending(true);
    try {
      const res = await fetch("/api/bot/console/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content, replyTo: replyTo?.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setText("");
      setReplyTo(null);
      stickBottom.current = true;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function remove(m: Msg) {
    if (!confirm(`Nachricht von ${m.author.name} löschen?`)) return;
    const res = await fetch("/api/bot/console/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, messageId: m.id }),
    }).catch(() => null);
    if (res?.ok) setMessages((prev) => prev.filter((p) => p.id !== m.id));
    else setError((await res?.json().catch(() => null))?.error || "Löschen fehlgeschlagen.");
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  const grouped = channels.reduce<Record<string, Channel[]>>((acc, c) => {
    const k = c.category || "Ohne Kategorie";
    (acc[k] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Terminal className="w-8 h-8 text-lime-300" />
          Web-Konsole
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Kanäle live mitlesen und als Bot schreiben oder antworten. Sichtbar sind nur Kanäle, in denen du „Nachrichten verwalten“ hast.
          Jede gesendete oder gelöschte Nachricht landet im Audit-Log.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-2">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && channels.length === 0 ? (
        <div className="p-6 rounded-2xl border border-discord-border bg-discord-card text-gray-300 text-sm flex gap-3">
          <Lock className="w-5 h-5 text-gray-400 shrink-0" />
          Du hast in keinem Textkanal „Nachrichten verwalten“ - die Web-Konsole ist für Moderatoren gedacht.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          {/* Kanal-Liste */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-3 lg:max-h-[70vh] overflow-y-auto">
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="lg:hidden w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm">
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            <div className="hidden lg:block space-y-3">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-2 mb-1 truncate">{cat}</p>
                  {list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setChannelId(c.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-1.5 truncate ${
                        c.id === channelId ? "bg-discord-blurple/20 text-white" : "text-gray-400 hover:bg-discord-dark hover:text-gray-200"
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.name}</span>
                      {!c.canSend && <Lock className="w-3 h-3 ml-auto shrink-0 text-gray-600" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-discord-card border border-discord-border rounded-2xl flex flex-col h-[70vh] min-w-0">
            <div className="px-4 py-3 border-b border-discord-border flex items-center gap-2 text-white font-semibold">
              <Hash className="w-4 h-4 text-gray-400" /> {channel?.name || "…"}
              <span className="ml-auto text-[11px] text-gray-500 font-normal flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> live alle {POLL_MS / 1000} s
              </span>
            </div>
            <div
              ref={listRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.length === 0 && <p className="text-sm text-gray-500 text-center mt-10">{loading ? "Lädt …" : "Keine Nachrichten."}</p>}
              {messages.map((m) => {
                const parent = m.replyTo ? byId.get(m.replyTo) : null;
                return (
                  <div key={m.id} className="group flex gap-3 hover:bg-discord-dark/40 rounded-lg p-1.5 -m-1.5">
                    <img src={m.author.avatar} alt="" className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      {m.replyTo && (
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                          <Reply className="w-3 h-3" /> {parent ? `${parent.author.name}: ${parent.content.slice(0, 80) || "[Embed/Anhang]"}` : "Antwort auf ältere Nachricht"}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className={`font-semibold ${m.isOwnBot ? "text-lime-300" : "text-white"}`}>{m.author.name}</span>
                        {m.author.bot && (
                          <span className="ml-1.5 px-1 py-px rounded bg-discord-blurple text-[9px] text-white align-middle inline-flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> BOT
                          </span>
                        )}
                        <span className="ml-2 text-[11px] text-gray-500">
                          {new Date(m.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          {m.editedAt ? " (bearbeitet)" : ""}
                        </span>
                      </p>
                      {m.content && <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{m.content}</p>}
                      {m.embeds.map((e, i) => (
                        <div
                          key={i}
                          className="mt-1 border-l-4 rounded bg-discord-dark/60 px-3 py-2 max-w-xl"
                          style={{ borderColor: e.color ? `#${e.color.toString(16).padStart(6, "0")}` : "#4f545c" }}
                        >
                          {e.title && <p className="text-sm font-semibold text-white">{e.title}</p>}
                          {e.description && <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">{e.description}</p>}
                        </div>
                      ))}
                      {m.attachments.map((a) =>
                        a.image ? (
                          <img key={a.url} src={a.url} alt={a.name} className="mt-1 max-h-48 rounded-lg" />
                        ) : (
                          <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-sky-400 hover:underline mt-1">
                            📎 {a.name}
                          </a>
                        )
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 self-start">
                      {channel?.canSend && (
                        <button onClick={() => setReplyTo(m)} title="Als Bot antworten" className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-discord-dark">
                          <Reply className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => remove(m)} title="Löschen" className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-discord-border p-3 space-y-2">
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-discord-dark/60 rounded-lg px-3 py-1.5">
                  <Reply className="w-3.5 h-3.5" /> Antwort an <span className="text-white font-semibold">{replyTo.author.name}</span>
                  <span className="truncate">{replyTo.content.slice(0, 60)}</span>
                  <button onClick={() => setReplyTo(null)} className="ml-auto p-0.5 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {channel && !channel.canSend ? (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> In diesem Kanal darfst du (oder der Bot) nicht schreiben - nur mitlesen.
                </p>
              ) : (
                <div className="flex gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 2000))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder={`Als Bot in #${channel?.name || "…"} schreiben (Enter = senden, Umschalt+Enter = neue Zeile)`}
                    className="flex-1 resize-none bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-blurple"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !text.trim()}
                    className="px-4 rounded-lg bg-discord-blurple hover:bg-discord-blurple/90 text-white disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
                  >
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-gray-600 text-right">{text.length}/2000</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
