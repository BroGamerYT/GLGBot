import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from "discord.js";
import { Command } from "../../types";
import { BRANDING, dashboardLink } from "../../config/branding";

export function createVoicePanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Steuerung temporärer Kanäle")
    .setDescription(
      "Steuere deinen Sprachkanal bequem über die Menüs unten.\n" +
      "• **Dropdowns** für Einstellungen und Berechtigungen nutzen.\n" +
      "• Alternativ kannst du die Befehle mit `/voice` ausführen."
    )
    .setThumbnail("https://cdn.discordapp.com/emojis/849312521948823562.png")
    .setFooter({ text: `${BRANDING.bot} Voice-Manager` })
    .setTimestamp();
}

export function createVoicePanelComponents() {
  // 1. Kanal-Einstellungen Dropdown
  const settingsSelect = new StringSelectMenuBuilder()
    .setCustomId("voice_settings_menu")
    .setPlaceholder("Kanal-Einstellungen ändern...")
    .addOptions([
      {
        label: "Name ändern",
        description: "Passe den Namen deiner Lobby an",
        value: "name",
        emoji: "✏️",
      },
      {
        label: "Nutzerlimit ändern",
        description: "Begrenze die Anzahl der Personen (0-99)",
        value: "limit",
        emoji: "👥",
      },
      {
        label: "Aktuelles Spiel",
        description: "Setzt den Kanalnamen auf dein aktuelles Game",
        value: "game",
        emoji: "🎮",
      },
      {
        label: "Temporärer Textkanal",
        description: "Erstelle einen privaten Textchat nur für deine Lobby",
        value: "text",
        emoji: "💬",
      },
      {
        label: "Passwort festlegen / ändern",
        description: "Schütze deine Lobby mit einem geheimen Passwort",
        value: "pw_set",
        emoji: "🔑",
      },
      {
        label: "Passwort entfernen",
        description: "Löscht den Passwort-Schutz",
        value: "pw_remove",
        emoji: "🔓",
      },
      {
        label: "Kanalbesitz übernehmen",
        description: "Übernimm den Raum, falls der Ersteller gegangen ist",
        value: "claim",
        emoji: "👑",
      },
    ]);

  // 2. Berechtigungen Dropdown
  const permissionsSelect = new StringSelectMenuBuilder()
    .setCustomId("voice_permissions_menu")
    .setPlaceholder("Kanal-Berechtigungen ändern...")
    .addOptions([
      {
        label: "Sperren (Lock)",
        description: "Niemand Neues kann den Raum betreten",
        value: "lock",
        emoji: "🔒",
      },
      {
        label: "Entsperren (Unlock)",
        description: "Gibt den Raum wieder für alle frei",
        value: "unlock",
        emoji: "🔓",
      },
      {
        label: "Verstecken (Hide)",
        description: "Macht den Sprachkanal für andere unsichtbar",
        value: "hide",
        emoji: "🙈",
      },
      {
        label: "Sichtbar machen (Unhide)",
        description: "Macht den Kanal wieder für alle sichtbar",
        value: "unhide",
        emoji: "👁️",
      },
    ]);

  // 3. Action Buttons
  const enterPwButton = new ButtonBuilder()
    .setCustomId("voice_btn_enter_pw")
    .setLabel("Passwort eingeben")
    .setEmoji("🔑")
    .setStyle(ButtonStyle.Success);

  const refreshButton = new ButtonBuilder()
    .setCustomId("voice_btn_refresh")
    .setLabel("Status & Info")
    .setEmoji("🔄")
    .setStyle(ButtonStyle.Primary);

  const dashboardUrl = dashboardLink();

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsSelect);
  const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(permissionsSelect);
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(enterPwButton, refreshButton);
  if (dashboardUrl) {
    row3.addComponents(new ButtonBuilder().setLabel("Web-Dashboard").setEmoji("🌐").setStyle(ButtonStyle.Link).setURL(dashboardUrl));
  }

  return [row1, row2, row3];
}

const voicePanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("voice-panel")
    .setDescription("Sendet das interaktive 'VoiceMaster'-Steuerungs-Panel in diesen Kanal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  execute: async (interaction) => {
    const embed = createVoicePanelEmbed();
    const components = createVoicePanelComponents();

    await interaction.reply({
      content: "✅ Das interaktive Steuerungs-Panel wurde gesendet!",
      ephemeral: true,
    });

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send({
        embeds: [embed],
        components,
      });
    }
  },
};

export default voicePanelCommand;
