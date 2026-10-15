"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Save, Send, CheckCircle2, AlertCircle, RefreshCw, Gamepad2, Radio, UserCheck, Sparkles, Zap, Plus, Pencil, Trash2, Search, Users, LockKeyhole, X } from "lucide-react";

interface ManagedRole {
  id: string;
  name: string;
  color: string;
  position: number;
  hoist: boolean;
  mentionable: boolean;
  managed: boolean;
  memberCount: number;
  editable: boolean;
  permissions: string[];
}

interface RoleManagerMember {
  id: string;
  username: string;
  displayName: string;
  isOwner: boolean;
  roles: Array<{ id: string; name: string; position: number }>;
}

const ROLE_PERMISSION_GROUPS = [
  {
    title: "Verwaltung",
    permissions: [
      { key: "Administrator", label: "Administrator" },
      { key: "ManageGuild", label: "Server verwalten" },
      { key: "ManageRoles", label: "Rollen verwalten" },
      { key: "ManageChannels", label: "Kanäle verwalten" },
      { key: "ManageWebhooks", label: "Webhooks verwalten" },
    ],
  },
  {
    title: "Mitglieder",
    permissions: [
      { key: "KickMembers", label: "Mitglieder kicken" },
      { key: "BanMembers", label: "Mitglieder bannen" },
      { key: "ModerateMembers", label: "Mitglieder timeouten" },
      { key: "ChangeNickname", label: "Spitznamen ändern" },
      { key: "ManageNicknames", label: "Spitznamen verwalten" },
    ],
  },
  {
    title: "Textkanäle",
    permissions: [
      { key: "ViewChannel", label: "Kanäle ansehen" },
      { key: "SendMessages", label: "Nachrichten senden" },
      { key: "ReadMessageHistory", label: "Nachrichtenverlauf lesen" },
      { key: "ManageMessages", label: "Nachrichten verwalten" },
      { key: "MentionEveryone", label: "@everyone erwähnen" },
      { key: "AttachFiles", label: "Dateien anhängen" },
      { key: "EmbedLinks", label: "Links einbetten" },
    ],
  },
  {
    title: "Sprachkanäle",
    permissions: [
      { key: "Connect", label: "Verbinden" },
      { key: "Speak", label: "Sprechen" },
      { key: "Stream", label: "Video streamen" },
      { key: "MuteMembers", label: "Mitglieder stummschalten" },
      { key: "MoveMembers", label: "Mitglieder verschieben" },
      { key: "PrioritySpeaker", label: "Prioritätssprecher" },
    ],
  },
] as const;

const ALL_ROLE_PERMISSION_KEYS = ROLE_PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.key));

export default function RolesManagerPage() {
  const [data, setData] = useState<any>(null);
  const [rulesRoleId, setRulesRoleId] = useState("");
  const [streamAlertRoleId, setStreamAlertRoleId] = useState("");
  const [freeGamesRoleId, setFreeGamesRoleId] = useState("");
  const [freeGamesChannelId, setFreeGamesChannelId] = useState("");
  const [targetChannelId, setTargetChannelId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSettingUp, setAutoSettingUp] = useState(false);
  const [postingPanel, setPostingPanel] = useState(false);
  const [view, setView] = useState<"settings" | "roles">("settings");
  const [managedRoles, setManagedRoles] = useState<ManagedRole[]>([]);
  const [canGrantDangerous, setCanGrantDangerous] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [editingRole, setEditingRole] = useState<ManagedRole | null>(null);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState("#5865f2");
  const [roleHoist, setRoleHoist] = useState(false);
  const [roleMentionable, setRoleMentionable] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<RoleManagerMember[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);
  const [assignmentRoleId, setAssignmentRoleId] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, rolesRes] = await Promise.all([
          fetch("/api/discord/guild").then((r) => r.json()),
          fetch("/api/config/roles").then((r) => r.json()),
        ]);
        setData(guildRes);
        if (rolesRes?.rulesRoleId) setRulesRoleId(rolesRes.rulesRoleId);
        if (rolesRes?.streamAlertRoleId) setStreamAlertRoleId(rolesRes.streamAlertRoleId);
        if (rolesRes?.freeGamesRoleId) setFreeGamesRoleId(rolesRes.freeGamesRoleId);
        if (rolesRes?.freeGamesChannelId) setFreeGamesChannelId(rolesRes.freeGamesChannelId);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAutoSetup = async () => {
    setAutoSettingUp(true);
    setMessage(null);
    try {
      const res = await fetch("/api/action/auto-setup-roles", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data) {
        const guildRes = await fetch("/api/discord/guild").then((r) => r.json());
        setData(guildRes);
        if (json.data.guestRole?.id) setRulesRoleId(json.data.guestRole.id);
        if (json.data.streamAlertRole?.id) setStreamAlertRoleId(json.data.streamAlertRole.id);
        if (json.data.freeGamesRole?.id) setFreeGamesRoleId(json.data.freeGamesRole.id);
        if (json.data.freeGamesChannel?.id) setFreeGamesChannelId(json.data.freeGamesChannel.id);
        setMessage({
          text: "⚡ Alle benötigten Rollen (@Gast, bn.live, bn.free) & der #free-games Kanal wurden automatisch erstellt & verknüpft!",
          type: "success",
        });
      } else {
        setMessage({ text: `❌ Fehler: ${json.error || "Auto-Setup fehlgeschlagen"}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setAutoSettingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/config/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rulesRoleId: rulesRoleId || undefined,
          streamAlertRoleId: streamAlertRoleId || undefined,
          freeGamesRoleId: freeGamesRoleId || undefined,
          freeGamesChannelId: freeGamesChannelId || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: "✅ Berechtigungs- und Rollen-Einstellungen erfolgreich gespeichert!", type: "success" });
      } else {
        setMessage({ text: "❌ Fehler beim Speichern der Konfiguration.", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePostPanel = async () => {
    if (!targetChannelId) {
      setMessage({ text: "❌ Bitte wähle zuerst einen Ziel-Kanal aus.", type: "error" });
      return;
    }

    setPostingPanel(true);
    setMessage(null);

    try {
      const res = await fetch("/api/action/post-role-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: targetChannelId }),
      });

      if (res.ok) {
        setMessage({ text: "🎉 Das Berechtigungs- und Benachrichtigungs-Panel wurde erfolgreich in Discord gepostet!", type: "success" });
      } else {
        const err = await res.json();
        setMessage({ text: `❌ Fehler: ${err.error || "Konnte Panel nicht senden."}`, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Fehler: ${e.message}`, type: "error" });
    } finally {
      setPostingPanel(false);
    }
  };

  const loadManagedRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch("/api/bot/roles/manage");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rollen konnten nicht geladen werden.");
      setManagedRoles(json.roles || []);
      setCanGrantDangerous(Boolean(json.canGrantDangerous));
      setAssignmentRoleId((current) => current || json.roles?.find((role: ManagedRole) => role.editable)?.id || "");
    } catch (error: any) {
      setMessage({ text: error.message || "Rollen konnten nicht geladen werden.", type: "error" });
    } finally {
      setRolesLoading(false);
    }
  };

  const openRoleForm = (role?: ManagedRole) => {
    setRoleFormOpen(true);
    setEditingRole(role || null);
    setRoleName(role?.name || "");
    setRoleColor(role?.color || "#5865f2");
    setRoleHoist(role?.hoist || false);
    setRoleMentionable(role?.mentionable || false);
    setRolePermissions(Object.fromEntries(ALL_ROLE_PERMISSION_KEYS.map((key) => [key, role?.permissions.includes(key) || false])));
  };

  const switchView = async (next: "settings" | "roles") => {
    setView(next);
    setMessage(null);
    if (next === "roles" && managedRoles.length === 0) await loadManagedRoles();
  };

  const handleSaveRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingRole(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bot/roles/manage/${editingRole ? "update" : "create"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingRole ? { roleId: editingRole.id } : {}),
          name: roleName,
          color: roleColor,
          hoist: roleHoist,
          mentionable: roleMentionable,
          permissions: rolePermissions,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rolle konnte nicht gespeichert werden.");
      setMessage({ text: editingRole ? "Rolle und Rechte gespeichert." : "Rolle erstellt.", type: "success" });
      setRoleFormOpen(false);
      setEditingRole(null);
      await loadManagedRoles();
    } catch (error: any) {
      setMessage({ text: error.message || "Rolle konnte nicht gespeichert werden.", type: "error" });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: ManagedRole) => {
    if (!window.confirm(`Rolle „${role.name}“ wirklich löschen? Sie wird ${role.memberCount} Mitgliedern entzogen.`)) return;
    setDeletingRoleId(role.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/roles/manage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: role.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rolle konnte nicht gelöscht werden.");
      if (editingRole?.id === role.id) setRoleFormOpen(false);
      setMessage({ text: `Rolle „${role.name}“ gelöscht.`, type: "success" });
      await loadManagedRoles();
    } catch (error: any) {
      setMessage({ text: error.message || "Rolle konnte nicht gelöscht werden.", type: "error" });
    } finally {
      setDeletingRoleId(null);
    }
  };

  const searchRoleMembers = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearchingMembers(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bot/roles/manage/members?q=${encodeURIComponent(memberQuery)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Mitglieder konnten nicht gesucht werden.");
      setMemberResults(json.members || []);
    } catch (error: any) {
      setMessage({ text: error.message || "Mitglieder konnten nicht gesucht werden.", type: "error" });
    } finally {
      setSearchingMembers(false);
    }
  };

  const toggleMemberRole = async (member: RoleManagerMember) => {
    const role = managedRoles.find((item) => item.id === assignmentRoleId);
    if (!role) return;
    const hasRole = member.roles.some((item) => item.id === role.id);
    setAssigningMemberId(member.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bot/moderation/member-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, roleId: role.id, action: hasRole ? "remove" : "add" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rolle konnte nicht geändert werden.");
      setMemberResults((current) => current.map((item) => item.id !== member.id ? item : {
        ...item,
        roles: hasRole ? item.roles.filter((assigned) => assigned.id !== role.id) : [...item.roles, { id: role.id, name: role.name, position: role.position }],
      }));
      setMessage({ text: hasRole ? `Rolle „${role.name}“ entfernt.` : `Rolle „${role.name}“ vergeben.`, type: "success" });
    } catch (error: any) {
      setMessage({ text: error.message || "Rolle konnte nicht geändert werden.", type: "error" });
    } finally {
      setAssigningMemberId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const roles = data?.roles || [];
  const textChannels = data?.textChannels || [];
  const isConfigured = Boolean(rulesRoleId || streamAlertRoleId || freeGamesRoleId);
  const visibleManagedRoles = managedRoles.filter((role) => role.name.toLowerCase().includes(roleSearch.trim().toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-discord-blurple" />
              {view === "settings" ? "Rollen & Rechte" : "Serverrollen verwalten"}
            </h1>
            {isConfigured ? (
              <span className="flex items-center gap-1.5 text-xs text-discord-green bg-discord-green/10 px-2.5 py-1 rounded-full font-medium border border-discord-green/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktiviert
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full font-medium border border-yellow-400/20">
                <AlertCircle className="w-3.5 h-3.5" /> Noch unvollständig
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">Verwalte Discord-Rollen, Rechte und Self-Service-Panels für diesen Server.</p>
        </div>

        {/* 1-Klick Auto Setup Button */}
        {view === "settings" && <button
          type="button"
          onClick={handleAutoSetup}
          disabled={autoSettingUp}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          {autoSettingUp ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Erstelle Rollen...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-black" />
              Rollen automatisch erstellen & zuweisen
            </>
          )}
        </button>}
      </div>

      <div className="flex items-center gap-1 border-b border-discord-border" role="tablist" aria-label="Rollenverwaltung">
        <button type="button" role="tab" aria-selected={view === "roles"} onClick={() => switchView("roles")} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${view === "roles" ? "border-discord-blurple text-white" : "border-transparent text-gray-400 hover:text-white"}`}>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Serverrollen</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "settings"} onClick={() => switchView("settings")} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${view === "settings" ? "border-discord-blurple text-white" : "border-transparent text-gray-400 hover:text-white"}`}>
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Panel & Zuordnung</span>
        </button>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-discord-green/10 border-discord-green/30 text-discord-green"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {view === "settings" ? <>
      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold text-white border-b border-discord-border pb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-discord-green" />
          1. Rollen-Zuweisung konfigurieren
        </h2>

        {/* 1. Verifikations-Rolle (Gast / Regeln) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-discord-green" />
            Regel- & Verifikations-Rolle (@Gast)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Wird vergeben, sobald ein Mitglied auf <strong>✅ Regeln akzeptieren</strong> klickt. Schaltet alle normalen Server-Kanäle frei.
          </p>
          <select
            value={rulesRoleId}
            onChange={(e) => setRulesRoleId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte eine Rolle auswählen (z. B. @Gast) —</option>
            {roles.map((r: any) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Live-Stream Benachrichtigungs-Rolle (bn.live) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            Stream-Benachrichtigungs-Rolle (bn.live)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Wird vergeben/entfernt, wenn Mitglieder auf <strong>🔴 Live-Stream Alerts (bn.live)</strong> klicken. Schaltet Stream-Pings und Live-Kanäle frei.
          </p>
          <select
            value={streamAlertRoleId}
            onChange={(e) => setStreamAlertRoleId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte eine Rolle auswählen (z. B. @Live-Pings) —</option>
            {roles.map((r: any) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Free-Games Benachrichtigungs-Rolle (bn.free) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-blue-400" />
            Free-Games Benachrichtigungs-Rolle (bn.free)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Wird vergeben/entfernt, wenn Mitglieder auf <strong>🎮 Free-Games Alerts (bn.free)</strong> klicken. Schaltet den Free-Games Kanal frei.
          </p>
          <select
            value={freeGamesRoleId}
            onChange={(e) => setFreeGamesRoleId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte eine Rolle auswählen (z. B. @FreeGames) —</option>
            {roles.map((r: any) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Free-Games Ankündigungskanal */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-1">
            Free-Games Ankündigungskanal (#free-games)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            In diesen Textkanal postet der Bot die wöchentlichen Gratis-Spiele von Epic Games und Steam.
          </p>
          <select
            value={freeGamesChannelId}
            onChange={(e) => setFreeGamesChannelId(e.target.value)}
            className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
          >
            <option value="">— Bitte einen Textkanal auswählen (z. B. #free-games) —</option>
            {textChannels.map((c: any) => (
              <option key={c.id} value={c.id}>
                # {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-discord-blurple/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Einstellungen speichern
          </button>
        </div>
      </form>

      {/* Post Panel Section */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="border-b border-discord-border pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-discord-green" />
            2. Berechtigungs-Panel in Discord senden
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Poste das interaktive Verifikations- und Rollen-Panel mit schicken Buttons direkt in einen Textkanal (z. B. #regeln oder #rollen).
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-200">
              Ziel-Kanal für das Panel
            </label>
            <select
              value={targetChannelId}
              onChange={(e) => setTargetChannelId(e.target.value)}
              className="w-full bg-discord-dark border border-discord-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-discord-blurple transition-all"
            >
              <option value="">— Wähle einen Kanal aus (z. B. #regeln oder #willkommen) —</option>
              {textChannels.map((c: any) => (
                <option key={c.id} value={c.id}>
                  # {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePostPanel}
            disabled={postingPanel || !targetChannelId}
            className="px-6 py-3 rounded-xl bg-discord-green hover:bg-discord-green/90 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-discord-green/20 disabled:opacity-50"
          >
            {postingPanel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Panel jetzt in Discord senden
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-discord-blurple" />
          Wie funktioniert das Berechtigungs-System?
        </h3>
        <ul className="text-sm text-gray-300 space-y-2.5 list-disc list-inside">
          <li>
            <strong className="text-white">Regel-Verifikation:</strong> Neue Mitglieder sehen zuerst nur den Regelkanal. Ein Klick auf <code className="text-discord-green font-mono">✅ Regeln akzeptieren</code> vergibt sofort die Gast-Rolle und schaltet alle Server-Inhalte frei.
          </li>
          <li>
            <strong className="text-white">bn.live (Live-Alerts):</strong> Mitglieder können per 1-Klick-Toggle die Stream-Benachrichtigungen aktivieren oder wieder abbestellen.
          </li>
          <li>
            <strong className="text-white">bn.free (Free-Games):</strong> Schaltet den Zugriff auf den <code className="text-blue-400 font-mono">#free-games</code> Kanal frei und pingt Mitglieder bei Gratis-Vollversionen im Epic Games Store oder auf Steam!
          </li>
          <li>
            <strong className="text-white">Discord Chat Steuerung:</strong> Du kannst dieses Panel im Chat jederzeit auch mit <code className="text-discord-blurple font-mono">/setup-roles panel [kanal]</code> posten und mit <code className="text-discord-blurple font-mono">/setup-roles status</code> überprüfen!
          </li>
        </ul>
      </div>
      </> : (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-discord-border bg-discord-card px-4 py-3">
              <span className="block text-xs text-gray-400">Serverrollen</span>
              <strong className="mt-1 block text-2xl text-white">{managedRoles.length}</strong>
            </div>
            <div className="rounded-lg border border-discord-border bg-discord-card px-4 py-3">
              <span className="block text-xs text-gray-400">Bearbeitbar für dich</span>
              <strong className="mt-1 block text-2xl text-white">{managedRoles.filter((role) => role.editable).length}</strong>
            </div>
            <div className="rounded-lg border border-discord-border bg-discord-card px-4 py-3">
              <span className="block text-xs text-gray-400">Mitglieder-Zuweisungen</span>
              <strong className="mt-1 block text-2xl text-white">{managedRoles.reduce((sum, role) => sum + role.memberCount, 0).toLocaleString("de-DE")}</strong>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-discord-border bg-discord-dark px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-gray-500" />
              <input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Rollen durchsuchen" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={loadManagedRoles} disabled={rolesLoading} title="Aktualisieren" className="grid h-10 w-10 place-items-center rounded-lg border border-discord-border bg-discord-card text-gray-300 hover:text-white disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${rolesLoading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={() => openRoleForm()} className="inline-flex items-center gap-2 rounded-lg bg-discord-blurple px-4 py-2 text-sm font-semibold text-white hover:bg-discord-blurple/90">
                <Plus className="h-4 w-4" /> Neue Rolle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
            <div className="overflow-hidden rounded-lg border border-discord-border bg-discord-card">
              <div className="flex items-center justify-between border-b border-discord-border px-4 py-3">
                <h2 className="text-sm font-semibold text-white">Rollen-Hierarchie</h2>
                <span className="text-xs text-gray-500">Höchste zuerst</span>
              </div>
              {rolesLoading ? (
                <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-400"><RefreshCw className="h-4 w-4 animate-spin" /> Lade Rollen</div>
              ) : visibleManagedRoles.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">Keine passenden Rollen gefunden.</div>
              ) : (
                <div className="divide-y divide-discord-border/70">
                  {visibleManagedRoles.map((role) => (
                    <div key={role.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${editingRole?.id === role.id ? "bg-discord-blurple/10" : "hover:bg-discord-dark/50"}`}>
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                      <button type="button" onClick={() => openRoleForm(role)} className="min-w-0 flex-1 text-left" disabled={!role.editable}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">{role.name}</span>
                          {role.permissions.includes("Administrator") && <span className="rounded border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[10px] font-bold text-red-300">ADMIN</span>}
                          {role.managed && <span className="rounded border border-gray-500/30 bg-gray-500/10 px-1.5 py-0.5 text-[10px] text-gray-400">INTEGRATION</span>}
                        </span>
                        <span className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {role.memberCount}</span>
                          <span>Position {role.position}</span>
                          {role.hoist && <span>Separat angezeigt</span>}
                        </span>
                      </button>
                      <button type="button" onClick={() => openRoleForm(role)} disabled={!role.editable} title={role.editable ? "Rolle bearbeiten" : "Oberhalb deiner oder der Bot-Rolle"} className="grid h-8 w-8 place-items-center rounded border border-discord-border text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleDeleteRole(role)} disabled={!role.editable || deletingRoleId === role.id} title="Rolle löschen" className="grid h-8 w-8 place-items-center rounded border border-discord-border text-gray-400 hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {roleFormOpen ? (
              <form onSubmit={handleSaveRole} className="space-y-4 rounded-lg border border-discord-border bg-discord-card p-4">
                <div className="flex items-start justify-between gap-3 border-b border-discord-border pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">{editingRole ? "Rolle bearbeiten" : "Rolle erstellen"}</h2>
                    <p className="mt-1 text-xs text-gray-500">Discord setzt zusätzlich die Ranghierarchie des Bots durch.</p>
                  </div>
                  <button type="button" onClick={() => setRoleFormOpen(false)} aria-label="Editor schließen" className="grid h-8 w-8 place-items-center rounded border border-discord-border text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <label className="space-y-1.5 text-xs font-medium text-gray-300">Rollenname
                    <input required maxLength={100} value={roleName} onChange={(event) => setRoleName(event.target.value)} className="w-full rounded border border-discord-border bg-discord-dark px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple" placeholder="z. B. Moderator" />
                  </label>
                  <label className="space-y-1.5 text-xs font-medium text-gray-300">Farbe
                    <input type="color" value={roleColor} onChange={(event) => setRoleColor(event.target.value)} className="block h-[42px] w-14 cursor-pointer rounded border border-discord-border bg-discord-dark p-1" />
                  </label>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-discord-border py-3">
                  <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={roleHoist} onChange={(event) => setRoleHoist(event.target.checked)} /> Separat in Mitgliederliste</label>
                  <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={roleMentionable} onChange={(event) => setRoleMentionable(event.target.checked)} /> Erwähnbar</label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white"><LockKeyhole className="h-4 w-4 text-discord-blurple" /> Rechte</h3>
                    {!canGrantDangerous && <span className="text-[10px] text-amber-300">Kritische Rechte nur für Admins</span>}
                  </div>
                  {ROLE_PERMISSION_GROUPS.map((group) => (
                    <fieldset key={group.title} className="space-y-2">
                      <legend className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.title}</legend>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const dangerous = ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "ManageWebhooks", "KickMembers", "BanMembers"].includes(permission.key);
                          return (
                            <label key={permission.key} className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${dangerous && rolePermissions[permission.key] ? "bg-red-500/10 text-red-200" : "text-gray-300 hover:bg-discord-dark"}`}>
                              <input type="checkbox" checked={Boolean(rolePermissions[permission.key])} disabled={dangerous && !canGrantDangerous} onChange={(event) => setRolePermissions((current) => ({ ...current, [permission.key]: event.target.checked }))} />
                              <span>{permission.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>

                <button type="submit" disabled={savingRole || !roleName.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-discord-blurple px-4 py-2.5 text-sm font-semibold text-white hover:bg-discord-blurple/90 disabled:opacity-50">
                  {savingRole ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingRole ? "Speichere …" : editingRole ? "Änderungen speichern" : "Rolle erstellen"}
                </button>
              </form>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-discord-border bg-discord-card/50 p-8 text-center">
                <ShieldCheck className="h-9 w-9 text-gray-600" />
                <h2 className="mt-3 text-sm font-semibold text-white">Rolle auswählen</h2>
                <p className="mt-1 max-w-xs text-xs text-gray-500">Wähle eine bearbeitbare Rolle aus der Liste oder erstelle eine neue.</p>
                <button type="button" onClick={() => openRoleForm()} className="mt-4 inline-flex items-center gap-2 rounded border border-discord-border px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-discord-dark"><Plus className="h-3.5 w-3.5" /> Neue Rolle</button>
              </div>
            )}
          </div>

          <section className="overflow-hidden rounded-lg border border-discord-border bg-discord-card">
            <div className="border-b border-discord-border px-4 py-4">
              <h2 className="text-sm font-semibold text-white">Rollen zuweisen</h2>
              <p className="mt-1 text-xs text-gray-500">Suche Mitglieder und füge eine bearbeitbare Rolle hinzu oder entferne sie.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.5fr)]">
              <form onSubmit={searchRoleMembers} className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded border border-discord-border bg-discord-dark px-3">
                  <Search className="h-4 w-4 shrink-0 text-gray-500" />
                  <input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} minLength={2} placeholder="Name oder Discord-Nutzer suchen" className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-gray-500" />
                </label>
                <button type="submit" disabled={searchingMembers || memberQuery.trim().length < 2} className="inline-flex items-center gap-2 rounded bg-discord-dark px-3 text-xs font-semibold text-white hover:bg-discord-border disabled:opacity-40">
                  {searchingMembers ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Suchen"}
                </button>
              </form>
              <label className="space-y-1 text-xs font-medium text-gray-400">Zielrolle
                <select value={assignmentRoleId} onChange={(event) => setAssignmentRoleId(event.target.value)} className="w-full rounded border border-discord-border bg-discord-dark px-3 py-2.5 text-sm text-white">
                  <option value="">Rolle auswählen …</option>
                  {managedRoles.filter((role) => role.editable).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
            </div>
            {memberResults.length > 0 && (
              <div className="divide-y divide-discord-border border-t border-discord-border">
                {memberResults.map((member) => {
                  const role = managedRoles.find((item) => item.id === assignmentRoleId);
                  const hasRole = member.roles.some((item) => item.id === assignmentRoleId);
                  const needsAdmin = !!role?.permissions.some((permission) => ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers", "ManageWebhooks"].includes(permission));
                  return (
                    <div key={member.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">{member.displayName}</span>
                          {member.isOwner && <span className="rounded border border-amber-400/30 px-1.5 py-0.5 text-[10px] text-amber-300">Owner</span>}
                        </div>
                        <span className="text-xs text-gray-500">@{member.username}</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {member.roles.slice(0, 6).map((roleItem) => <span key={roleItem.id} className="rounded bg-discord-dark px-1.5 py-0.5 text-[10px] text-gray-400">{roleItem.name}</span>)}
                          {member.roles.length > 6 && <span className="text-[10px] text-gray-500">+{member.roles.length - 6}</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleMemberRole(member)} disabled={!role || (needsAdmin && !canGrantDangerous) || (member.isOwner && !canGrantDangerous) || assigningMemberId === member.id} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${hasRole ? "border-red-400/30 text-red-300 hover:bg-red-400/10" : "border-discord-green/30 text-discord-green hover:bg-discord-green/10"}`}>
                        {assigningMemberId === member.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : hasRole ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {hasRole ? "Rolle entfernen" : "Rolle vergeben"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {!searchingMembers && memberQuery.length >= 2 && memberResults.length === 0 && <p className="border-t border-discord-border px-4 py-4 text-xs text-gray-500">Keine Suchergebnisse. Suche nach mindestens zwei Zeichen.</p>}
          </section>
        </section>
      )}
    </div>
  );
}
