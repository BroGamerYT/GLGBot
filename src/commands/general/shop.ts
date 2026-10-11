import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from "discord.js";
import { Command } from "../../types";
import { economyService } from "../../services/economyService";
import { moduleService } from "../../services/moduleService";
import { BRANDING } from "../../config/branding";

const shopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Durchstöbere den Belohnungs-Shop oder kaufe exklusive Rollen & Badges.")
    .addSubcommand((sub) =>
      sub
        .setName("uebersicht")
        .setDescription("Zeigt alle aktuell verfügbaren Artikel im Shop an.")
        .addStringOption((opt) =>
          opt
            .setName("kategorie")
            .setDescription("Nach Artikel-Kategorie filtern")
            .addChoices(
              { name: "Alle Artikel", value: "all" },
              { name: "Discord-Rollen", value: "role" },
              { name: "Profil-Badges", value: "badge" },
              { name: "Voice-Features", value: "custom_voice" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("kaufen")
        .setDescription("Kaufe einen Artikel anhand seiner Artikel-ID.")
        .addStringOption((opt) =>
          opt.setName("artikel").setDescription("ID des Artikels (z. B. aus /shop uebersicht)").setRequired(true)
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    if (!moduleService.isEnabled(interaction.guild.id, "economy")) {
      await interaction.reply({
        content: "⚠️ Das Wirtschafts- und Shop-Modul ist auf diesem Server aktuell deaktiviert.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const cfg = economyService.getConfig(interaction.guild.id);
    const balance = economyService.getBalance(interaction.guild.id, interaction.user.id);

    if (sub === "uebersicht") {
      const category = interaction.options.getString("kategorie") || "all";
      let items = economyService.getShopItems(interaction.guild.id, true);

      if (category !== "all") {
        items = items.filter((i) => i.type === category);
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🛒 Community Belohnungs-Shop")
        .setDescription(
          `Kaufe exklusive Rollen, Badges und Vorteile mit deinen gesammelten **${cfg.currencyName}**!\n\n` +
          `🪙 **Dein Guthaben:** **${balance.toLocaleString("de-DE")} ${cfg.currencySymbol}**\n` +
          `💡 **Kaufen per Befehl:** \`/shop kaufen artikel:<id>\` oder im Dashboard.`
        )
        .setFooter({ text: `${BRANDING.community} Shop • Sammle Coins durch Chat & Voice!` })
        .setTimestamp();

      if (items.length === 0) {
        embed.addFields({
          name: "📦 Aktuell keine Artikel",
          value: "In dieser Kategorie stehen derzeit keine Artikel zum Verkauf.",
        });
      } else {
        for (const item of items) {
          const typeLabel =
            item.type === "role"
              ? "🎭 Rolle"
              : item.type === "badge"
              ? "⭐ Badge"
              : item.type === "custom_voice"
              ? "🔊 Voice-Feature"
              : "🎁 Sonstiges";

          const stockText =
            item.stock === undefined || item.stock === -1
              ? "Unbegrenzt"
              : item.stock > 0
              ? `${item.stock} Stück auf Lager`
              : "❌ Ausverkauft";

          const levelReq = item.requiredLevel && item.requiredLevel > 0 ? ` • Min-Level: **${item.requiredLevel}**` : "";

          embed.addFields({
            name: `${item.name} — ${item.price.toLocaleString("de-DE")} ${cfg.currencySymbol} (${typeLabel})`,
            value:
              `${item.description}\n` +
              `🔑 **ID:** \`${item.id}\` • 📦 Bestand: ${stockText}${levelReq}`,
            inline: false,
          });
        }
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Shop im Web-Dashboard öffnen")
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.DASHBOARD_URL ? `${process.env.DASHBOARD_URL}/economy` : "http://localhost:3000/economy")
          .setEmoji("🌐")
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (sub === "kaufen") {
      const itemId = interaction.options.getString("artikel", true);
      const member = interaction.member as GuildMember;

      await interaction.deferReply();
      const res = await economyService.buyShopItem(interaction.guild, member, itemId);

      if (!res.success) {
        await interaction.editReply({
          content: `❌ **Kauf fehlgeschlagen:** ${res.error}`,
        });
        return;
      }

      const item = res.item!;
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🎉 Kauf erfolgreich!")
        .setDescription(
          `Glückwunsch <@${interaction.user.id}>! Du hast **${item.name}** erfolgreich für **${item.price.toLocaleString("de-DE")} ${cfg.currencySymbol}** erworben.`
        )
        .addFields(
          {
            name: "🛍️ Gekaufter Artikel",
            value: `**${item.name}**\n${item.description}`,
            inline: true,
          },
          {
            name: "🪙 Neuer Kontostand",
            value: `**${(res.newBalance ?? 0).toLocaleString("de-DE")} ${cfg.currencyName}**`,
            inline: true,
          }
        )
        .setFooter({ text: `${BRANDING.community} Shop` })
        .setTimestamp();

      if (item.type === "role" && item.roleId) {
        embed.addFields({
          name: "🎭 Rolle zugewiesen",
          value: `Die Rolle <@&${item.roleId}> wurde deinem Profil hinzugefügt!`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default shopCommand;
