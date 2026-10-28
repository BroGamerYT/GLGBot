import {
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  Guild,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { MUSICBOT_TOKEN, MUSICBOT_CLIENT_ID, MUSIC_GUILD_ID, loadChannelMap, loadStations } from "./config";
import { stationPlayer } from "./player";
import { autoSetup, buildPanelEmbed, handleChannelDelete, panelRows, updatePanel } from "./setup";

/** Karenzzeit-Timer vor dem Verlassen eines leeren Kanals (GuildId -> Timeout) */
const leaveTimers = new Map<string, NodeJS.Timeout>();

function clearLeaveTimer(guildId: string) {
  const timer = leaveTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    leaveTimers.delete(guildId);
  }
}

function scheduleLeave(guild: Guild, delayMs = 45_000) {
  clearLeaveTimer(guild.id);
  leaveTimers.set(
    guild.id,
    setTimeout(async () => {
      leaveTimers.delete(guild.id);
      try {
        const active = stationPlayer.getActiveSession(guild.id);
        if (!active) return;
        const channel = await guild.channels.fetch(active.channelId).catch(() => null);
        if (channel && channel.isVoiceBased()) {
          const humans = channel.members.filter((m) => !m.user.bot).size;
          if (humans > 0) return; // Inzwischen ist wieder jemand beigetreten
        }
        await stationPlayer.stop(guild.id);
        console.log(`[MusicBot] Kanal leer – Wiedergabe in #${active.name} beendet.`);
        if (channel && channel.isVoiceBased() && channel.name.startsWith("📻・")) {
          await channel.delete("Musik-Kanal ungenutzt – automatisches Aufräumen (Temp-Channel)").catch(() => null);
          console.log(`[MusicBot] Ungenutzten Temp-Kanal #${channel.name} gelöscht.`);
        }
        await updatePanel(guild);
      } catch (e) {
        console.error("[MusicBot] Leave-Timer Fehler:", (e as Error).message);
      }
    }, delayMs),
  );
}

const commands = [
  new SlashCommandBuilder()
    .setName("musik")
    .setDescription("Steuert den Musik-Bot.")
    .addSubcommand((s) => s.setName("status").setDescription("Zeigt alle Sender mit aktuellem Status."))
    .addSubcommand((s) => s.setName("stop").setDescription("Stoppt die Wiedergabe und trennt die Verbindung."))
    .addSubcommand((s) => s.setName("pause").setDescription("Pausiert die aktuelle Wiedergabe."))
    .addSubcommand((s) => s.setName("resume").setDescription("Setzt die pausierte Wiedergabe fort."))
    .addSubcommand((s) =>
      s
        .setName("play")
        .setDescription("Startet einen bestimmten Sender in deinem aktuellen Kanal.")
        .addStringOption((o) =>
          o.setName("sender").setDescription("Name oder ID des Senders").setRequired(false),
        ),
    )
    .addSubcommand((s) => s.setName("panel").setDescription("Sendet das Steuerungs-Panel im aktuellen Kanal.")),
].map((c) => c.toJSON());

async function registerCommands() {
  if (!MUSICBOT_TOKEN || !MUSICBOT_CLIENT_ID || !MUSIC_GUILD_ID) return;
  const rest = new REST({ version: "10" }).setToken(MUSICBOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(MUSICBOT_CLIENT_ID, MUSIC_GUILD_ID), { body: commands });
  console.log("[MusicBot] Slash-Commands registriert.");
}

/** Beim Start prüfen, ob sich bereits Hörer in einem der Sender-Kanäle befinden. */
async function checkInitialVoiceState(guild: Guild) {
  const stations = loadStations(guild.id).filter((s) => s.active);
  const map = await autoSetup(guild, stations);

  for (const station of stations) {
    const channelId = map[station.id];
    if (!channelId) continue;
    try {
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isVoiceBased()) {
        const humans = channel.members.filter((m) => !m.user.bot).size;
        if (humans > 0) {
          console.log(`[MusicBot] Hörer in #${channel.name} gefunden – starte ${station.name}`);
          await stationPlayer.start(channel, station.id, station.url, station.name);
          await updatePanel(guild, stations);
          return;
        }
      }
    } catch (e) {
      console.error(`[MusicBot] Initialer Start für ${station.name} fehlgeschlagen:`, (e as Error).message);
    }
  }
}

async function handleMusikCommand(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "Nur auf Servern nutzbar.", ephemeral: true });
    return;
  }
  const sub = interaction.options.getSubcommand();
  const stations = loadStations(guild.id).filter((s) => s.active);

  if (sub === "status") {
    const statuses = stationPlayer.getStatuses(guild.id, stations);
    await interaction.reply({ embeds: [buildPanelEmbed(statuses)], ephemeral: true });
    return;
  }
  if (sub === "stop") {
    clearLeaveTimer(guild.id);
    await stationPlayer.stop(guild.id);
    await updatePanel(guild, stations);
    await interaction.reply({ content: "⏹️ Wiedergabe gestoppt.", ephemeral: true });
    return;
  }
  if (sub === "pause") {
    stationPlayer.pause(guild.id);
    await updatePanel(guild, stations);
    await interaction.reply({ content: "⏸️ Wiedergabe pausiert.", ephemeral: true });
    return;
  }
  if (sub === "resume") {
    clearLeaveTimer(guild.id);
    stationPlayer.resume(guild.id);
    await updatePanel(guild, stations);
    await interaction.reply({ content: "▶️ Wiedergabe fortgesetzt.", ephemeral: true });
    return;
  }
  if (sub === "play") {
    const senderQuery = interaction.options.getString("sender")?.toLowerCase().trim();
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({ content: "Du musst in einem Sprachkanal sein.", ephemeral: true });
      return;
    }

    let targetStation = stations[0];
    if (senderQuery) {
      const found = stations.find(
        (s) => s.id.toLowerCase().includes(senderQuery) || s.name.toLowerCase().includes(senderQuery),
      );
      if (found) targetStation = found;
    }

    if (!targetStation) {
      await interaction.reply({ content: "Kein passender Sender gefunden.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    clearLeaveTimer(guild.id);
    await stationPlayer.start(voiceChannel, targetStation.id, targetStation.url, targetStation.name);
    await updatePanel(guild, stations);
    await interaction.editReply({ content: `▶️ **${targetStation.name}** wird abgespielt.` });
    return;
  }
  if (sub === "panel") {
    const target = interaction.channel;
    if (!target || !("send" in target)) {
      await interaction.reply({ content: "Kein Textkanal.", ephemeral: true });
      return;
    }
    const statuses = stationPlayer.getStatuses(guild.id, stations);
    await (target as import("discord.js").TextChannel).send({
      embeds: [buildPanelEmbed(statuses)],
      components: panelRows(),
    });
    await interaction.reply({ content: "✅ Panel gepostet.", ephemeral: true });
  }
}

async function handleButton(interaction: ButtonInteraction) {
  const guild = interaction.guild;
  if (!guild) return;
  const stations = loadStations(guild.id).filter((s) => s.active);

  if (interaction.customId === "mb_pause") {
    stationPlayer.pause(guild.id);
    await updatePanel(guild, stations);
    await interaction.reply({ content: "⏸️ Pausiert.", ephemeral: true });
  } else if (interaction.customId === "mb_resume") {
    clearLeaveTimer(guild.id);
    stationPlayer.resume(guild.id);
    await updatePanel(guild, stations);
    await interaction.reply({ content: "▶️ Fortgesetzt.", ephemeral: true });
  } else if (interaction.customId === "mb_stop") {
    clearLeaveTimer(guild.id);
    await stationPlayer.stop(guild.id);
    await updatePanel(guild, stations);
    await interaction.reply({ content: "⏹️ Gestoppt.", ephemeral: true });
  } else if (interaction.customId === "mb_status") {
    await updatePanel(guild, stations);
    const statuses = stationPlayer.getStatuses(guild.id, stations);
    try {
      if (interaction.message?.editable) {
        await interaction.update({ embeds: [buildPanelEmbed(statuses)], components: panelRows() });
      } else {
        await interaction.reply({ embeds: [buildPanelEmbed(statuses)], ephemeral: true });
      }
    } catch {
      await interaction.reply({ content: "✅ Status aktualisiert.", ephemeral: true }).catch(() => null);
    }
  }
}

async function main() {
  if (!MUSICBOT_TOKEN) {
    console.error("[MusicBot] Kein Token – Bot startet nicht. MUSICBOT_TOKEN in .env setzen.");
    process.exit(1);
  }
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

  // Panel automatisch aktualisieren, wenn sich Song-Titel ändern
  stationPlayer.onStatusChange = (guildId) => {
    const g = client.guilds.cache.get(guildId);
    if (g) void updatePanel(g);
  };

  client.once(Events.ClientReady, async () => {
    console.log(`[MusicBot] Eingeloggt als ${client.user?.tag}`);
    await registerCommands().catch((e) => console.error("[MusicBot] Command-Registrierung:", (e as Error).message));

    const targetGuildId = MUSIC_GUILD_ID || client.guilds.cache.first()?.id;
    if (targetGuildId) {
      const guild = await client.guilds.fetch(targetGuildId).catch(() => null);
      if (guild) {
        await checkInitialVoiceState(guild);
      }
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "musik") {
        await handleMusikCommand(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith("mb_")) {
        await handleButton(interaction);
      }
    } catch (e) {
      console.error("[MusicBot] Interaction-Fehler:", (e as Error).message);
    }
  });

  // Auto-Join beim Betreten / Auto-Leave beim Verlassen
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      const guild = newState.guild || oldState.guild;
      if (!guild || (MUSIC_GUILD_ID && guild.id !== MUSIC_GUILD_ID)) return;

      // Bot-eigene Events ignorieren
      if (newState.member?.user.bot || oldState.member?.user.bot) return;

      const stations = loadStations(guild.id).filter((s) => s.active);
      const map = loadChannelMap()[guild.id] || {};

      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      // 1. User betritt einen Sprachkanal
      if (newChannel && newChannel.id !== oldChannel?.id) {
        // Prüfen, ob der Kanal einem Sender zugeordnet ist
        const stationId = Object.keys(map).find((id) => map[id] === newChannel.id);
        const targetStation = stations.find((s) => s.id === stationId);

        if (targetStation) {
          clearLeaveTimer(guild.id);
          const activeSess = stationPlayer.getActiveSession(guild.id);
          if (!activeSess || activeSess.channelId !== newChannel.id || activeSess.stationId !== targetStation.id) {
            console.log(`[MusicBot] 🎧 Auto-Join in #${newChannel.name} für ${targetStation.name} (${newState.member?.user.tag})`);
            await stationPlayer.start(newChannel, targetStation.id, targetStation.url, targetStation.name);
            await updatePanel(guild, stations);
          }
        }
      }

      // 2. User verlässt einen Sprachkanal
      if (oldChannel && oldChannel.id !== newChannel?.id) {
        const activeSess = stationPlayer.getActiveSession(guild.id);
        if (activeSess && activeSess.channelId === oldChannel.id) {
          const humans = oldChannel.members.filter((m) => !m.user.bot).size;
          if (humans === 0) {
            console.log(`[MusicBot] Letzter Hörer hat #${oldChannel.name} verlassen – starte 45s Timer.`);
            scheduleLeave(guild, 45_000);
          }
        }
      }
    } catch (e) {
      console.error("[MusicBot] VoiceState-Fehler:", (e as Error).message);
    }
  });

  client.on(Events.ChannelDelete, async (channel) => {
    try {
      if (channel.type !== ChannelType.GuildVoice || !channel.guild) return;
      if (MUSIC_GUILD_ID && channel.guild.id !== MUSIC_GUILD_ID) return;
      const stations = loadStations(channel.guild.id);
      await handleChannelDelete(channel.guild, channel.id, stations);
    } catch (e) {
      console.error("[MusicBot] ChannelDelete-Fehler:", (e as Error).message);
    }
  });

  const shutdown = async () => {
    console.log("[MusicBot] Beende …");
    clearLeaveTimer(MUSIC_GUILD_ID);
    await stationPlayer.stopAll().catch(() => null);
    client.destroy();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  await client.login(MUSICBOT_TOKEN);
}

void main();
