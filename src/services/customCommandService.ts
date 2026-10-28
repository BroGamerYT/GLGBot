import crypto from "crypto";
import { ChatInputCommandInteraction, Client, EmbedBuilder, Message, SlashCommandBuilder } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { moduleService } from "./moduleService";

/**
 * Eigene Befehle pro Server: Antwort als Text und/oder Embed.
 * Jeder eigene Befehl wird als echter Slash-Befehl für diesen Server registriert (/name)
 * und funktioniert optional auch als Text-Befehl mit "!name".
 */
export interface CustomCommand {
  id: string;
  name: string; // klein, a-z0-9-_ , 1-32 Zeichen
  description: string;
  content: string;
  embed?: { title?: string; description?: string; color?: string; imageUrl?: string };
  ephemeral: boolean;
  textTrigger: boolean;
  uses: number;
  createdBy?: string;
  updatedAt: number;
}

const store = new GuildStore<CustomCommand[]>("custom_commands.json", () => []);
export const MAX_CUSTOM_COMMANDS = 25;

function isHttpUrl(v?: string) {
  return !!v && /^https?:\/\/\S+$/i.test(v);
}

class CustomCommandService {
  /** Namen der eingebauten Befehle (dürfen nicht überschrieben werden) */
  private reserved = new Set<string>();

  public setReserved(names: string[]) {
    this.reserved = new Set(names.map((n) => n.toLowerCase()));
  }

  public list(guildId: string): CustomCommand[] {
    return [...store.get(guildId)].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getBackupCommands(guildId: string): CustomCommand[] {
    return this.list(guildId).map((command) => ({ ...command, embed: command.embed ? { ...command.embed } : undefined, uses: 0, updatedAt: 0 }));
  }

  public setBackupCommands(guildId: string, commands: CustomCommand[]) {
    store.set(guildId, commands.map((command) => ({ ...command, uses: 0, updatedAt: Date.now() })));
  }

  public find(guildId: string, name: string): CustomCommand | undefined {
    return store.get(guildId).find((c) => c.name === name.toLowerCase());
  }

  public save(guildId: string, input: any, by?: string): { error: string } | { item: CustomCommand } {
    const name = String(input?.name || "").trim().toLowerCase().replace(/^\//, "");
    if (!/^[a-z0-9_-]{1,32}$/.test(name)) return { error: "Name: 1–32 Zeichen, nur Kleinbuchstaben, Zahlen, - und _ (keine Umlaute/Leerzeichen)." };
    if (this.reserved.has(name)) return { error: `/${name} ist ein eingebauter Befehl und kann nicht ersetzt werden.` };

    const list = store.get(guildId);
    const existing = typeof input?.id === "string" ? list.find((c) => c.id === input.id) : undefined;
    if (list.some((c) => c.name === name && c.id !== existing?.id)) return { error: `/${name} gibt es schon.` };
    if (!existing && list.length >= MAX_CUSTOM_COMMANDS) return { error: `Maximal ${MAX_CUSTOM_COMMANDS} eigene Befehle pro Server.` };

    const content = String(input?.content || "").trim().slice(0, 2000);
    const embed =
      input?.embed && typeof input.embed === "object"
        ? {
            title: String(input.embed.title || "").trim().slice(0, 256) || undefined,
            description: String(input.embed.description || "").trim().slice(0, 4000) || undefined,
            color: /^#?[0-9a-f]{6}$/i.test(String(input.embed.color || "")) ? String(input.embed.color).replace(/^#?/, "#") : undefined,
            imageUrl: isHttpUrl(input.embed.imageUrl) ? String(input.embed.imageUrl) : undefined,
          }
        : undefined;
    const hasEmbed = !!(embed && (embed.title || embed.description || embed.imageUrl));
    if (!content && !hasEmbed) return { error: "Bitte eine Antwort (Text oder Embed) angeben." };

    const item: CustomCommand = {
      id: existing?.id || crypto.randomBytes(5).toString("hex"),
      name,
      description: String(input?.description || "").trim().slice(0, 100) || `Eigener Befehl /${name}`,
      content,
      embed: hasEmbed ? embed : undefined,
      ephemeral: !!input?.ephemeral,
      textTrigger: input?.textTrigger !== false,
      uses: existing?.uses || 0,
      createdBy: existing?.createdBy || by,
      updatedAt: Date.now(),
    };
    store.set(guildId, existing ? list.map((c) => (c.id === existing.id ? item : c)) : [...list, item]);
    return { item };
  }

  public remove(guildId: string, id: string): boolean {
    const list = store.get(guildId);
    const next = list.filter((c) => c.id !== id);
    if (next.length === list.length) return false;
    store.set(guildId, next);
    return true;
  }

  /** Slash-Befehls-Daten der eigenen Befehle eines Servers (für die Registrierung). */
  public slashData(guildId: string) {
    if (!moduleService.isEnabled(guildId, "customCommands")) return [];
    return this.list(guildId).map((c) => new SlashCommandBuilder().setName(c.name).setDescription(c.description).toJSON());
  }

  private buildReply(c: CustomCommand, vars: Record<string, string>) {
    const fill = (t?: string) => (t || "").replace(/{(\w+)}/g, (m, k) => (k in vars ? vars[k] : m));
    const embeds = c.embed
      ? [
          (() => {
            const e = new EmbedBuilder().setColor(c.embed!.color ? parseInt(c.embed!.color.slice(1), 16) : 0x5865f2);
            if (c.embed!.title) e.setTitle(fill(c.embed!.title).slice(0, 256));
            if (c.embed!.description) e.setDescription(fill(c.embed!.description).slice(0, 4096));
            if (c.embed!.imageUrl) e.setImage(c.embed!.imageUrl);
            return e;
          })(),
        ]
      : [];
    return { content: fill(c.content).slice(0, 2000) || undefined, embeds, allowedMentions: { parse: [] as never[] } };
  }

  private countUse(guildId: string, id: string) {
    store.update(guildId, (list) => list.map((c) => (c.id === id ? { ...c, uses: c.uses + 1 } : c)));
  }

  /** Slash-Befehl beantworten. true = war ein eigener Befehl. */
  public async handleInteraction(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.guild) return false;
    const c = this.find(interaction.guild.id, interaction.commandName);
    if (!c) return false;
    if (!moduleService.isEnabled(interaction.guild.id, "customCommands")) {
      await interaction.reply({ content: "⚠️ Eigene Befehle sind auf diesem Server ausgeschaltet.", ephemeral: true });
      return true;
    }
    const vars = { user: `<@${interaction.user.id}>`, name: interaction.user.displayName, server: interaction.guild.name };
    await interaction.reply({ ...this.buildReply(c, vars), ephemeral: c.ephemeral });
    this.countUse(interaction.guild.id, c.id);
    return true;
  }

  /** Text-Befehl "!name" beantworten. true = war ein eigener Befehl. */
  public async handleMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;
    const m = message.content.trim().match(/^!([a-z0-9_-]{1,32})$/i);
    if (!m) return false;
    const c = this.find(message.guild.id, m[1]);
    if (!c || !c.textTrigger || !moduleService.isEnabled(message.guild.id, "customCommands")) return false;
    const vars = { user: `<@${message.author.id}>`, name: message.member?.displayName || message.author.username, server: message.guild.name };
    await message.reply(this.buildReply(c, vars)).catch(() => null);
    this.countUse(message.guild.id, c.id);
    return true;
  }

  /** Befehle eines Servers neu registrieren (eingebaute + eigene). */
  public async syncGuild(client: Client, guildId: string) {
    const commands = (client as any).commands as Map<string, any> | undefined;
    if (!commands || !client.application) return;
    const body = [...[...commands.values()].map((c) => c.data.toJSON()), ...this.slashData(guildId)];
    await client.application.commands.set(body, guildId);
  }
}

export const customCommandService = new CustomCommandService();
