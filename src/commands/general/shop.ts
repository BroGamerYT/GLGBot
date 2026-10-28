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
import { authCodeService } from "../../services/authCodeService";
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
              { name: "Namensfarben", value: "color" },
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
    )
    .addSubcommand((sub) =>
      sub
        .setName("tauschen")
        .setDescription("Tausche deine Level-XP an der Börse in Coins um.")
        .addIntegerOption((opt) =>
          opt
            .setName("xp")
            .setDescription("Anzahl an Level-XP, die du in Coins investieren möchtest")
            .setRequired(true)
            .setMinValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("code")
        .setDescription("Erhalte einen 30-Minuten Login-Code für das Web-Dashboard und den Shop.")
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
              : item.type === "color"
              ? "🎨 Namensfarbe"
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

      if ((item.type === "role" || item.type === "color") && item.roleId) {
        embed.addFields({
          name: item.type === "color" ? "🎨 Namensfarbe aktiviert" : "🎭 Rolle zugewiesen",
          value: `Die Rolle <@&${item.roleId}> wurde deinem Profil hinzugefügt!`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "tauschen") {
      const xp = interaction.options.getInteger("xp", true);
      const res = economyService.exchangeXpForCoins(interaction.guild, interaction.user, xp);
      if (!res.success) {
        await interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("📈 Börsen-Umtausch erfolgreich!")
        .setDescription(
          `Du hast erfolgreich **${xp.toLocaleString("de-DE")} XP** in **+${res.coinsEarned?.toLocaleString("de-DE")} ${cfg.currencyName}** umgewandelt!\n\n` +
          `🪙 **Neuer Kontostand:** **${res.newBalance?.toLocaleString("de-DE")} ${cfg.currencySymbol}**\n` +
          `📊 **Neuer Level-Stand:** Level **${res.newLevel}** (${res.newXp?.toLocaleString("de-DE")} XP)` +
          (res.oldLevel && res.newLevel && res.oldLevel > res.newLevel ? ` *(Level von ${res.oldLevel} auf ${res.newLevel} angepasst)*` : "") +
          `\n\n*Wechselkurs: 1 ${cfg.currencyName} = ${res.rate} XP*`
        )
        .setFooter({ text: `${BRANDING.community} Community-Börse` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "code") {
      const member = interaction.member as GuildMember;
      const { code, expiresAt, loginUrl } = authCodeService.generateCode(
        interaction.guild,
        interaction.user,
        member
      );
      const expiresSec = Math.floor(expiresAt / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🔐 Dein persönlicher Shop- & Web-Login Code")
        .setDescription(
          `Mit diesem Code kannst du dich sofort im **Shop** und im **Web-Dashboard** anmelden:\n\n` +
            `### Dein Einmal-Code:\n` +
            `# \`\`\`${code}\`\`\`\n` +
            `⏱️ **Gültig für:** <t:${expiresSec}:R> (30 Minuten)\n` +
            `👤 **Konto:** <@${interaction.user.id}> (${interaction.user.tag})\n\n` +
            `👉 Klicke unten auf den Button, um dich direkt im Browser anzumelden, oder gib den Code auf der Webseite ein.`
        )
        .setFooter({ text: `${BRANDING.community} Shop • Einmal-Code` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Im Browser öffnen & einloggen")
          .setEmoji("🚀")
          .setStyle(ButtonStyle.Link)
          .setURL(loginUrl),
        new ButtonBuilder()
          .setLabel("Shop öffnen")
          .setEmoji("🛒")
          .setStyle(ButtonStyle.Link)
          .setURL(`${(process.env.DASHBOARD_URL || "http://localhost:3000").replace(/\/+$/, "")}/economy`)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
      return;
    }
  },
};

export default shopCommand;
