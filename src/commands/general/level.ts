import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";
import { buildLevelCard } from "../../utils/levelCard";
import { statsService } from "../../services/statsService";

const levelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Dein Level im Level-System.")
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Zeigt dein Level, deine XP und wie viel bis zum nächsten Level fehlt.")
        .addBooleanOption((opt) =>
          opt.setName("oeffentlich").setDescription("Für alle im Kanal sichtbar posten (Standard: nur für dich).").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("sync-roles")
        .setDescription("Weist dir (oder einem Mitglied) nachträglich alle verdienten Level-Belohnungsrollen zu.")
        .addUserOption((opt) => opt.setName("mitglied").setDescription("Mitglied zum Synchronisieren (Standard: du selbst).").setRequired(false))
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Nur auf einem Server nutzbar.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "sync-roles") {
      const targetUser = interaction.options.getUser("mitglied") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "❌ Mitglied konnte auf dem Server nicht gefunden werden.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const res = await statsService.syncUserRoleRewards(interaction.guild, member);

      if (res.added.length > 0) {
        await interaction.editReply({
          content: `✅ **Rollen-Synchronisierung erfolgreich!**\n<@${member.id}> hat **${res.added.length} neue Belohnungs-Rolle(n)** erhalten:\n${res.added.map((r: string) => `• <@&${r}>`).join("\n")}`,
        });
      } else if (res.roles.length > 0) {
        await interaction.editReply({
          content: `ℹ️ <@${member.id}> besitzt bereits alle freigeschalteten Rollen (${res.roles.map((r: string) => `<@&${r}>`).join(", ")}). Keine neuen Rollen nötig.`,
        });
      } else {
        await interaction.editReply({
          content: `ℹ️ Auf diesem Server sind aktuell keine Level-Rollen-Belohnungen konfiguriert (oder das Mitglied hat noch kein passendes Level erreicht).`,
        });
      }
      return;
    }

    const isPublic = interaction.options.getBoolean("oeffentlich") ?? false;
    const embed = buildLevelCard(interaction.guild, interaction.user, {
      title: `Level-Status von ${interaction.user.tag || interaction.user.username}`,
      showNextSteps: true,
    });
    await interaction.reply({ embeds: [embed], ephemeral: !isPublic });
  },
};

export default levelCommand;
