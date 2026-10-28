import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { setupService, SETUP_MODULES, MODULE_INFO, SetupModule } from "../../services/setupService";
import { dashboardLink } from "../../config/branding";

const setupAllCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-all")
    .setDescription("Richtet alle fehlenden Rollen & Kanäle des Bots auf einmal ein.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("bereich")
        .setDescription("Nur einen Bereich einrichten (Standard: alles, was noch fehlt)")
        .addChoices(
          { name: "Alles, was noch fehlt", value: "missing" },
          ...SETUP_MODULES.filter((m) => m !== "lock").map((m) => ({ name: MODULE_INFO[m].label, value: m }))
        )
    )
    .addBooleanOption((opt) =>
      opt.setName("regel_sperre").setDescription("Zusätzlich die Regel-Sperre aktivieren (neue Mitglieder sehen nur #regeln)")
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server möglich.", ephemeral: true });
      return;
    }
    if (interaction.user.id !== guild.ownerId && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ Nur Owner und Administratoren dürfen die Einrichtung starten.", ephemeral: true });
      return;
    }

    const choice = interaction.options.getString("bereich") || "missing";
    const status = setupService.getStatus(guild);
    const modules: SetupModule[] =
      choice === "missing" ? SETUP_MODULES.filter((m) => m !== "lock" && !status[m]) : [choice as SetupModule];
    if (interaction.options.getBoolean("regel_sperre")) modules.push("lock");

    if (modules.length === 0) {
      await interaction.reply({ content: "✅ Es ist bereits alles eingerichtet!", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const results = await setupService.run(guild, modules);
      const embed = new EmbedBuilder()
        .setColor(results.every((r) => r.ok) ? 0x57f287 : 0xfee75c)
        .setTitle("⚙️ Einrichtung abgeschlossen")
        .setDescription("🆕 = neu angelegt · 🔗 = war schon vorhanden und wurde verknüpft")
        .setTimestamp();
      for (const r of results.slice(0, 25)) {
        const lines = r.items.map((it) => `${it.status === "created" ? "🆕" : "🔗"} ${it.name}`);
        if (r.error) lines.push(`❌ ${r.error}`);
        embed.addFields({ name: `${r.ok ? "✅" : "⚠️"} ${r.label}`, value: lines.join("\n").slice(0, 1024) || "-", inline: false });
      }
      const link = dashboardLink("/setup");
      if (link) embed.setFooter({ text: `Übersicht & Einstellungen: ${link}` });
      await interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
      await interaction.editReply({ content: `❌ ${e?.message || "Einrichtung fehlgeschlagen."}` });
    }
  },
};

export default setupAllCommand;
