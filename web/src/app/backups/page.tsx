"use client";

import { useEffect, useState, useRef } from "react";
import {
  Archive,
  RefreshCw,
  Plus,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
  FolderTree,
  Hash,
  Sparkles,
  AlertTriangle,
  FileUp,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

interface BackupMeta {
  id: string;
  guildId: string;
  guildName: string;
  createdAt: string;
  creatorTag?: string;
  summary: {
    roleCount: number;
    categoryCount: number;
    channelCount: number;
  };
  fileSize: number;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupMeta | null>(null);

  // Restore Options
  const [restoreOption, setRestoreOption] = useState<"all" | "roles" | "channels">("all");
  const [allowCrossServer, setAllowCrossServer] = useState(true);
  const [stripMemberOverwrites, setStripMemberOverwrites] = useState(true);
  const [preserveOwnerRank, setPreserveOwnerRank] = useState(true);
  const [wipeFirst, setWipeFirst] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/backups");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.error("Fehler beim Laden der Backups:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/bot/backups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator: "Web-Dashboard Admin" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `✅ Backup ${data.backup.id} erfolgreich erstellt (${data.backup.summary.roleCount} Rollen, ${data.backup.summary.channelCount} Kanäle).`,
        });
        fetchBackups();
      } else {
        setStatusMessage({ type: "error", text: `❌ Fehler: ${data.error || "Konnte Backup nicht erstellen"}` });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: `❌ Netzwerkfehler: ${e.message}` });
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    setDownloadingId(backupId);
    try {
      const res = await fetch(`/api/bot/backups/download?id=${encodeURIComponent(backupId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Fehler beim Herunterladen des Backups.");
      }
      const data = await res.json();
      const jsonStr = JSON.stringify(data.backup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${backupId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: "success", text: `📥 Snapshot "${backupId}.json" erfolgreich heruntergeladen.` });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `❌ Download fehlgeschlagen: ${err.message}` });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || !Array.isArray(json.roles) || !Array.isArray(json.channels)) {
        throw new Error("Ungültiges Backup-Format: In der JSON-Datei müssen 'roles' und 'channels' enthalten sein.");
      }
      const res = await fetch("/api/bot/backups/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: json }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      setStatusMessage({
        type: "success",
        text: `✅ Backup "${file.name}" erfolgreich importiert (${data.backup.id})!`,
      });
      fetchBackups();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `❌ Upload-Fehler: ${err.message}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const executeRestore = async () => {
    if (!selectedBackupForRestore) return;
    setRestoringId(selectedBackupForRestore.id);
    setStatusMessage(null);

    const options: Record<string, boolean> = {
      allowCrossServer,
      stripMemberOverwrites,
      preserveOwnerRank,
      wipeFirst,
    };
    if (restoreOption === "roles") options.rolesOnly = true;
    if (restoreOption === "channels") options.channelsOnly = true;

    try {
      const res = await fetch("/api/bot/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupId: selectedBackupForRestore.id,
          options,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `✅ Wiederherstellung abgeschlossen! (${data.result.rolesCreated} Rollen neu, ${data.result.rolesUpdated} Rollen aktualisiert, ${data.result.channelsCreated} Kanäle erstellt).`,
        });
        setSelectedBackupForRestore(null);
      } else {
        setStatusMessage({ type: "error", text: `❌ Wiederherstellung fehlgeschlagen: ${data.error}` });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: `❌ Fehler: ${e.message}` });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm(`Soll der Snapshot "${backupId}" wirklich dauerhaft gelöscht werden?`)) return;
    setDeletingId(backupId);
    try {
      const res = await fetch("/api/bot/backups/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      });
      if (res.ok) {
        setStatusMessage({ type: "success", text: `🗑️ Snapshot "${backupId}" gelöscht.` });
        fetchBackups();
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: `❌ Fehler beim Löschen: ${e.message}` });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Archive className="w-7 h-7 text-emerald-400" />
            Server-Backups & Wiederherstellung
          </h1>
          <p className="text-sm text-gray-400">
            Vollständige JSON-Snapshots aller Rollen, Kanäle, Kategorien und Berechtigungen inklusive Download, Upload & Server-Transfer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleUploadFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            title="Backup-JSON von deinem PC hochladen"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            <span>{uploading ? "Lade hoch..." : "Backup hochladen (JSON)"}</span>
          </button>

          <button
            onClick={fetchBackups}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-discord-card hover:bg-discord-border text-gray-200 rounded-lg text-sm transition-colors border border-discord-border disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-50"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? "Erstelle Snapshot..." : "Neues Backup erstellen"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-discord-card to-discord-card border border-emerald-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Automatischer 24/7 Snapshot-Schutz & Server-Transfer
          </div>
          <p className="text-xs text-gray-400 max-w-2xl">
            Der Bot sichert täglich alle Strukturen rollierend (bis zu 20 Stände). Du kannst Backups als JSON herunterladen,
            auf anderen Discord-Servern hochladen und mit automatischer Bereinigung fremder Mitglieder sowie Inhaber-Schutz wiederherstellen.
          </p>
        </div>

        <div className="bg-discord-dark/60 border border-discord-border rounded-lg px-4 py-2 text-xs text-gray-300 font-mono">
          Aufbewahrung: <span className="text-emerald-400 font-semibold">20 Snapshots</span>
        </div>
      </div>

      {/* Backup List */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          Gespeicherte Snapshots ({backups.length})
        </h2>

        {backups.length === 0 ? (
          <div className="bg-discord-card border border-discord-border rounded-xl p-12 text-center text-gray-400">
            <Archive className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-base font-semibold text-gray-300">Noch keine Backups vorhanden</p>
            <p className="text-xs text-gray-500 mt-1">
              Klicke oben auf „Neues Backup erstellen“ oder „Backup hochladen (JSON)“, um einen Server-Snapshot anzulegen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {backups.map((b) => {
              const date = new Date(b.createdAt);
              const sizeKb = (b.fileSize / 1024).toFixed(1);

              return (
                <div
                  key={b.id}
                  className="bg-discord-card border border-discord-border rounded-xl p-4 hover:border-discord-border/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                        {b.id}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {date.toLocaleDateString("de-DE")} um {date.toLocaleTimeString("de-DE")}
                      </span>
                      {b.guildName && (
                        <span className="text-[11px] text-gray-400 bg-discord-dark px-2 py-0.5 rounded border border-discord-border">
                          {b.guildName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                      <span className="flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-semibold text-white">{b.summary.roleCount}</span> Rollen
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold text-white">{b.summary.categoryCount}</span> Kategorien
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-white">{b.summary.channelCount}</span> Kanäle
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 font-mono">{sizeKb} KB</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">Ersteller: <span className="text-gray-300">{b.creatorTag || "System"}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDownloadBackup(b.id)}
                      disabled={downloadingId === b.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-discord-dark hover:bg-discord-blurple/20 text-gray-300 hover:text-indigo-300 border border-discord-border rounded-lg text-xs font-medium transition-colors"
                      title="Snapshot als JSON auf den PC herunterladen"
                    >
                      <Download className={`w-3.5 h-3.5 ${downloadingId === b.id ? "animate-bounce" : ""}`} />
                      <span>{downloadingId === b.id ? "Lädt..." : "Download"}</span>
                    </button>

                    <button
                      onClick={() => setSelectedBackupForRestore(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-discord-blurple/15 hover:bg-discord-blurple/25 text-indigo-300 border border-discord-blurple/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Wiederherstellen
                    </button>

                    <button
                      onClick={() => handleDeleteBackup(b.id)}
                      disabled={deletingId === b.id}
                      className="p-1.5 bg-discord-dark hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-discord-border rounded-lg text-xs transition-colors disabled:opacity-50"
                      title="Snapshot löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore Modal */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-card border border-discord-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Server-Wiederherstellung konfigurieren</h3>
                <p className="text-xs text-gray-400 font-mono">{selectedBackupForRestore.id}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Möchtest du die Konfiguration dieses Snapshots anwenden?
              Vorhandene Rollen und Kanäle werden aktualisiert, fehlende Elemente werden mit ihren Berechtigungen neu angelegt.
            </p>

            {/* Umfang */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Wiederherstellungs-Umfang:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "all" as const, label: "Alles", hint: "Rollen & Kanäle" },
                  { key: "roles" as const, label: "Nur Rollen", hint: `${selectedBackupForRestore.summary.roleCount} Rollen` },
                  { key: "channels" as const, label: "Nur Kanäle", hint: `${selectedBackupForRestore.summary.channelCount} Kanäle` },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRestoreOption(opt.key)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      restoreOption === opt.key
                        ? "bg-discord-blurple/20 border-discord-blurple text-white"
                        : "bg-discord-dark/50 border-discord-border text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-gray-500">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Spezielle Transfer- & Sicherheits-Einstellungen */}
            <div className="space-y-3 pt-2 border-t border-discord-border">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Einstellungen für Server-Übertragung & Sicherheit:
              </label>

              <div className="space-y-2.5 bg-discord-dark/60 p-3.5 rounded-xl border border-discord-border text-xs">
                {/* 1. Owner oberste Rolle */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveOwnerRank}
                    onChange={(e) => setPreserveOwnerRank(e.target.checked)}
                    className="mt-0.5 rounded bg-discord-dark border-discord-border text-discord-blurple focus:ring-discord-blurple"
                  />
                  <div>
                    <span className="font-bold text-white block">Owner als oberste Rolle sichern</span>
                    <span className="text-gray-400 text-[11px] leading-tight block">
                      Weist dem Server-Inhaber automatisch die oberste Admin- oder Leitungs-Rolle zu, sodass der Owner garantiert auf dem höchsten Rang bleibt.
                    </span>
                  </div>
                </label>

                {/* 2. Mitglieder entfernen / bereinigen */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stripMemberOverwrites}
                    onChange={(e) => setStripMemberOverwrites(e.target.checked)}
                    className="mt-0.5 rounded bg-discord-dark border-discord-border text-discord-blurple focus:ring-discord-blurple"
                  />
                  <div>
                    <span className="font-bold text-white block">Mitglieder-Berechtigungen bereinigen</span>
                    <span className="text-gray-400 text-[11px] leading-tight block">
                      Entfernt spezifische Benutzerrechte des alten Servers aus Kanälen & Kategorien – nur saubere Rollen werden übernommen (empfohlen für andere Server).
                    </span>
                  </div>
                </label>

                {/* 3. Cross-Server Transfer erlauben */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCrossServer}
                    onChange={(e) => setAllowCrossServer(e.target.checked)}
                    className="mt-0.5 rounded bg-discord-dark border-discord-border text-indigo-400 focus:ring-indigo-400"
                  />
                  <div>
                    <span className="font-bold text-white block">Server-Übertragung erlauben (Cross-Server)</span>
                    <span className="text-gray-400 text-[11px] leading-tight block">
                      Ermöglicht das Einspielen dieses Backups auch auf einem anderen Discord-Server als dem ursprünglichen Ursprungsserver.
                    </span>
                  </div>
                </label>

                {/* 4. Wipe */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-discord-border/50">
                  <input
                    type="checkbox"
                    checked={wipeFirst}
                    onChange={(e) => setWipeFirst(e.target.checked)}
                    className="mt-0.5 rounded bg-discord-dark border-discord-border text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-rose-300 block">Bestehende Kanäle vorher leeren (Wipe)</span>
                    <span className="text-gray-400 text-[11px] leading-tight block">
                      Löscht bestehende Kanäle vor dem Setup für einen komplett sauberen Neuanfang.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-discord-border">
              <button
                type="button"
                onClick={() => setSelectedBackupForRestore(null)}
                className="px-4 py-2 bg-discord-dark hover:bg-discord-border text-gray-300 rounded-lg text-xs font-medium transition-colors border border-discord-border"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={restoringId !== null}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {restoringId !== null && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {restoringId !== null ? "Stelle wieder her..." : "Jetzt wiederherstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
