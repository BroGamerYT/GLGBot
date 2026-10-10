"use client";

import { useEffect, useState } from "react";
import {
  Ticket,
  MessageSquare,
  Lock,
  Download,
  Send,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Hash,
  FileText,
  Search,
  Settings,
  ExternalLink,
  Shield,
  Layers,
  X,
} from "lucide-react";

interface TicketRecord {
  channelId: string;
  channelName?: string;
  guildId: string;
  creatorId: string;
  creatorTag: string;
  createdAt: string;
  status: "OPEN" | "CLOSED";
  closedAt?: string;
  closedByTag?: string;
  transcriptFile?: string;
  channelExists?: boolean;
}

interface TicketConfig {
  categoryId?: string;
  supportRoleId?: string;
}

interface LiveMessage {
  author: string;
  content: string;
  time: string;
  isBot: boolean;
}

interface ChannelOption {
  id: string;
  name: string;
}

interface RoleOption {
  id: string;
  name: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [config, setConfig] = useState<TicketConfig>({});
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [categories, setCategories] = useState<ChannelOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [activeChatTicket, setActiveChatTicket] = useState<TicketRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [activeTranscriptTicket, setActiveTranscriptTicket] = useState<TicketRecord | null>(null);
  const [transcriptContent, setTranscriptContent] = useState<string>("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [panelChannelId, setPanelChannelId] = useState("");
  const [postingPanel, setPostingPanel] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSupportRole, setSelectedSupportRole] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setConfig(data.config || {});
        if (data.config?.categoryId) setSelectedCategory(data.config.categoryId);
        if (data.config?.supportRoleId) setSelectedSupportRole(data.config.supportRoleId);
      }
    } catch (e) {
      console.error("Fehler beim Laden der Tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuildStructure = async () => {
    try {
      const res = await fetch("/api/discord/guild");
      if (res.ok) {
        const d = await res.json();
        setChannels(d.textChannels || []);
        setCategories(d.categories || []);
        setRoles(d.roles || []);
        if (d.textChannels?.length > 0 && !panelChannelId) {
          setPanelChannelId(d.textChannels[0].id);
        }
      }
    } catch (e) {
      console.warn("Konnte Guild-Struktur nicht laden:", e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchGuildStructure();
  }, []);

  const openLiveChat = async (ticket: TicketRecord) => {
    setActiveChatTicket(ticket);
    setLoadingMessages(true);
    setChatMessages([]);
    try {
      const res = await fetch(`/api/bot/tickets/messages?channelId=${ticket.channelId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMessage({ type: "error", text: err.error || "Nachrichten konnten nicht geladen werden." });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = async () => {
    if (!activeChatTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch("/api/bot/tickets/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChatTicket.channelId,
          text: replyText.trim(),
        }),
      });
      if (res.ok) {
        setReplyText("");
        // Reload messages
        const msgRes = await fetch(`/api/bot/tickets/messages?channelId=${activeChatTicket.channelId}`);
        if (msgRes.ok) {
          const d = await msgRes.json();
          setChatMessages(d.messages || []);
        }
      } else {
        const err = await res.json();
        setStatusMessage({ type: "error", text: err.error || "Fehler beim Senden der Antwort." });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e?.message || "Netzwerkfehler." });
    } finally {
      setSendingReply(false);
    }
  };

  const closeTicket = async (ticket: TicketRecord) => {
    if (!confirm(`Möchtest du das Ticket von ${ticket.creatorTag} wirklich schließen?`)) return;
    try {
      const res = await fetch("/api/bot/tickets/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: ticket.channelId }),
      });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Ticket wird geschlossen und gelöscht." });
        if (activeChatTicket?.channelId === ticket.channelId) {
          setActiveChatTicket(null);
        }
        setTimeout(fetchData, 2000);
      } else {
        const err = await res.json();
        setStatusMessage({ type: "error", text: err.error || "Fehler beim Schließen des Tickets." });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e?.message || "Fehler beim Schließen." });
    }
  };

  const openTranscript = async (ticket: TicketRecord) => {
    setActiveTranscriptTicket(ticket);
    setLoadingTranscript(true);
    setTranscriptContent("");
    try {
      const res = await fetch(`/api/bot/tickets/transcript?channelId=${ticket.channelId}`);
      if (res.ok) {
        const data = await res.json();
        setTranscriptContent(data.transcript || "Kein Transkript vorhanden.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handlePostPanel = async () => {
    if (!panelChannelId) return;
    setPostingPanel(true);
    try {
      const res = await fetch("/api/bot/tickets/post-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: panelChannelId }),
      });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Ticket-Panel erfolgreich im Discord gepostet!" });
        setShowSetupModal(false);
      } else {
        const err = await res.json();
        setStatusMessage({ type: "error", text: err.error || "Fehler beim Posten des Panels." });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e?.message || "Verbindungsfehler." });
    } finally {
      setPostingPanel(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/bot/tickets/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory || undefined,
          supportRoleId: selectedSupportRole || undefined,
        }),
      });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Ticket-Einstellungen erfolgreich gespeichert!" });
        fetchData();
      } else {
        setStatusMessage({ type: "error", text: "Fehler beim Speichern der Einstellungen." });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e?.message || "Verbindungsfehler." });
    } finally {
      setSavingConfig(false);
    }
  };

  const downloadTranscript = () => {
    if (!activeTranscriptTicket || !transcriptContent) return;
    const blob = new Blob([transcriptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${activeTranscriptTicket.channelName || activeTranscriptTicket.channelId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openTicketsCount = tickets.filter((t) => t.status === "OPEN").length;
  const closedTicketsCount = tickets.filter((t) => t.status === "CLOSED").length;

  const filteredTickets = tickets.filter((t) => {
    if (filter === "OPEN" && t.status !== "OPEN") return false;
    if (filter === "CLOSED" && t.status !== "CLOSED") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTag = t.creatorTag.toLowerCase().includes(q);
      const matchId = t.channelId.includes(q) || t.creatorId.includes(q);
      const matchName = (t.channelName || "").toLowerCase().includes(q);
      return matchTag || matchId || matchName;
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Support- & Ticket-System</h1>
              <p className="text-sm text-gray-400">
                Verwalte Anfragen, antworte direkt im Web-Interface und sichere vollständige Transkripte.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSetupModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-discord-blurple hover:bg-discord-blurple/80 text-sm font-semibold text-white shadow-md shadow-discord-blurple/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Panel posten & Setup
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg bg-discord-card hover:bg-discord-card/80 text-gray-300 hover:text-white border border-discord-border transition-all"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium border ${
            statusMessage.type === "success"
              ? "bg-discord-green/10 text-discord-green border-discord-green/20"
              : "bg-discord-red/10 text-discord-red border-discord-red/20"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-discord-card border border-discord-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Offene Tickets</p>
            <h3 className="text-2xl font-bold text-discord-green mt-1">{openTicketsCount}</h3>
          </div>
          <div className="p-3 bg-discord-green/10 rounded-xl text-discord-green">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-discord-card border border-discord-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Geschlossene Tickets</p>
            <h3 className="text-2xl font-bold text-gray-400 mt-1">{closedTicketsCount}</h3>
          </div>
          <div className="p-3 bg-gray-500/10 rounded-xl text-gray-400">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-discord-card border border-discord-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Gesamt archiviert</p>
            <h3 className="text-2xl font-bold text-indigo-400 mt-1">{tickets.length}</h3>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-discord-card border border-discord-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "ALL" ? "bg-discord-blurple text-white" : "bg-discord-dark text-gray-400 hover:text-white"
            }`}
          >
            Alle ({tickets.length})
          </button>
          <button
            onClick={() => setFilter("OPEN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "OPEN"
                ? "bg-discord-green text-white"
                : "bg-discord-dark text-gray-400 hover:text-white"
            }`}
          >
            🟢 Offen ({openTicketsCount})
          </button>
          <button
            onClick={() => setFilter("CLOSED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "CLOSED" ? "bg-gray-600 text-white" : "bg-discord-dark text-gray-400 hover:text-white"
            }`}
          >
            🔒 Geschlossen ({closedTicketsCount})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ersteller oder Kanal suchen..."
            className="w-full bg-discord-dark border border-discord-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-discord-blurple"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-discord-card border border-discord-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-discord-dark border-b border-discord-border text-xs uppercase text-gray-400">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ticket-Kanal</th>
                <th className="py-3 px-4">Ersteller</th>
                <th className="py-3 px-4">Erstellt am</th>
                <th className="py-3 px-4">Geschlossen</th>
                <th className="py-3 px-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-discord-border">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                    Keine Tickets in dieser Ansicht gefunden.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isOpen = t.status === "OPEN";
                  return (
                    <tr key={t.channelId} className="hover:bg-discord-dark/50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-discord-green/10 text-discord-green border border-discord-green/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-discord-green animate-pulse" />
                            Offen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-600/20 text-gray-400 border border-gray-600/30">
                            <Lock className="w-3 h-3" />
                            Geschlossen
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-white">
                            {t.channelName || `ticket-${t.channelId.slice(0, 4)}`}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">ID: {t.channelId}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-white">{t.creatorTag}</span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">UID: {t.creatorId}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleString("de-DE")}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-400">
                        {t.closedAt ? (
                          <div>
                            <div>{new Date(t.closedAt).toLocaleString("de-DE")}</div>
                            {t.closedByTag && (
                              <div className="text-[11px] text-gray-500">von {t.closedByTag}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-2">
                        {isOpen ? (
                          <>
                            <button
                              onClick={() => openLiveChat(t)}
                              className="px-3 py-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple/80 text-xs font-semibold text-white shadow"
                            >
                              💬 Live Chat
                            </button>
                            <button
                              onClick={() => closeTicket(t)}
                              className="px-3 py-1.5 rounded-lg bg-discord-red/20 hover:bg-discord-red/30 text-discord-red text-xs font-semibold border border-discord-red/30"
                            >
                              Schließen
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openTranscript(t)}
                            className="px-3 py-1.5 rounded-lg bg-discord-dark hover:bg-discord-card text-xs font-semibold text-gray-300 hover:text-white border border-discord-border flex items-center gap-1.5 ml-auto"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Transkript
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Chat Modal */}
      {activeChatTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 bg-discord-dark border-b border-discord-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-discord-green/10 text-discord-green rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    #{activeChatTicket.channelName || activeChatTicket.channelId}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Ticket von {activeChatTicket.creatorTag} • ID: {activeChatTicket.channelId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => closeTicket(activeChatTicket)}
                  className="px-3 py-1.5 bg-discord-red/20 text-discord-red hover:bg-discord-red/30 text-xs font-semibold rounded-lg border border-discord-red/30"
                >
                  Ticket schließen
                </button>
                <button
                  onClick={() => setActiveChatTicket(null)}
                  className="p-1.5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#313338]">
              {loadingMessages ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Nachrichten werden geladen...</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs italic">
                  Noch keine Nachrichten in diesem Ticket.
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs max-w-[85%] ${
                      m.isBot
                        ? "bg-[#2b2d31] border border-white/5 text-gray-200 ml-auto"
                        : "bg-[#383a40] text-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {m.author}
                        {m.isBot && (
                          <span className="text-[10px] bg-discord-blurple px-1 rounded font-normal text-white">
                            BOT / SUPPORT
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400">{m.time}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input */}
            <div className="p-3 bg-discord-dark border-t border-discord-border flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                placeholder="Als Support antworten..."
                className="flex-1 bg-discord-card border border-discord-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-discord-blurple"
              />
              <button
                onClick={sendReply}
                disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Senden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {activeTranscriptTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 bg-discord-dark border-b border-discord-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Ticket-Transkript #{activeTranscriptTicket.channelName || activeTranscriptTicket.channelId}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Erstellt von {activeTranscriptTicket.creatorTag} am{" "}
                    {new Date(activeTranscriptTicket.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTranscript}
                  className="px-3 py-1.5 bg-discord-blurple hover:bg-discord-blurple/80 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Herunterladen
                </button>
                <button
                  onClick={() => setActiveTranscriptTicket(null)}
                  className="p-1.5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-discord-dark font-mono text-xs text-gray-300">
              {loadingTranscript ? (
                <div className="py-12 flex justify-center text-gray-400">
                  <div className="w-6 h-6 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{transcriptContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup / Config Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-discord-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-discord-blurple/10 text-discord-blurple rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Ticket-System konfigurieren</h3>
                  <p className="text-xs text-gray-400">Einstellungen und Panel-Versand</p>
                </div>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Ticket Configuration */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-discord-blurple" />
                Grundeinstellungen
              </h4>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Ticket-Kategorie (wo neue Tickets erstellt werden)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Keine / Standard-Kategorie --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      📂 {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Support-Rolle (erhält Zugriff auf alle Tickets)
                </label>
                <select
                  value={selectedSupportRole}
                  onChange={(e) => setSelectedSupportRole(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Keine bestimmte Rolle --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      🛡️ {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="w-full py-2 bg-discord-card hover:bg-discord-card/80 border border-discord-border rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                {savingConfig ? "Speichern..." : "Einstellungen speichern"}
              </button>
            </div>

            <div className="border-t border-discord-border" />

            {/* Section 2: Post Panel */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Send className="w-4 h-4 text-discord-green" />
                Ticket-Panel in Discord posten
              </h4>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Zielkanal für das Panel</label>
                <select
                  value={panelChannelId}
                  onChange={(e) => setPanelChannelId(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePostPanel}
                disabled={postingPanel || !panelChannelId}
                className="w-full py-2.5 bg-discord-green hover:bg-discord-green/90 rounded-lg text-xs font-bold text-white shadow-md shadow-discord-green/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {postingPanel ? (
                  "Wird gepostet..."
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Panel jetzt in Discord posten</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
