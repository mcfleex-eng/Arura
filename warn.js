// ================================================
//   AURORA BOT - Warn System
//   Features: warn, warns list, remove warn
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { Warn } = require('../../utils/models');
const { v4: uuidv4 } = require('crypto');

function generateId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Warn management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Warn a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to warn').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason for warning').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('View all warnings for a user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to check').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a specific warning')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('warn_id').setDescription('Warning ID to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Clear ALL warnings for a user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    // ── ADD WARN ──────────────────────────────
    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      const warnId = generateId();

      let warnData = await Warn.findOne({ guildId, userId: targetUser.id });
      if (!warnData) {
        warnData = new Warn({ guildId, userId: targetUser.id, warns: [] });
      }

      warnData.warns.push({
        reason,
        moderatorId: interaction.user.id,
        warnId,
        date: new Date(),
      });
      await warnData.save();

      const warnCount = warnData.warns.length;

      // Notify the warned user via DM
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('⚠️ You have been warned')
          .setThumbnail(interaction.guild.iconURL())
          .addFields(
            { name: '🏠 Server', value: interaction.guild.name, inline: true },
            { name: '🆔 Warn ID', value: `\`${warnId}\``, inline: true },
            { name: '📋 Reason', value: reason, inline: false },
            { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: '📊 Total Warns', value: `${warnCount}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Aurora Bot • Moderation System' });

        await targetUser.send({ embeds: [dmEmbed] });
      } catch {}

      // Server response embed
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('⚠️ Member Warned')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${targetUser} (${targetUser.tag})`, inline: true },
          { name: '🆔 Warn ID', value: `\`${warnId}\``, inline: true },
          { name: '📋 Reason', value: reason, inline: false },
          { name: '👮 Moderator', value: `${interaction.user}`, inline: true },
          { name: '📊 Total Warns', value: `${warnCount}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Aurora Bot • Warn System' });

      await interaction.reply({ embeds: [embed] });

      // Log to mod channel
      const logChannel = interaction.guild.channels.cache.get(
        process.env.LOG_CHANNEL_ID
      );
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }

    // ── LIST WARNS ────────────────────────────
    else if (sub === 'list') {
      const warnData = await Warn.findOne({ guildId, userId: targetUser.id });

      if (!warnData || warnData.warns.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`✅ **${targetUser.tag}** has no warnings!`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const warnList = warnData.warns
        .map(
          (w, i) =>
            `**${i + 1}.** \`ID: ${w.warnId}\`\n> 📋 ${w.reason}\n> 👮 <@${w.moderatorId}> • <t:${Math.floor(w.date / 1000)}:R>`
        )
        .join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle(`⚠️ Warnings — ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(warnList)
        .setFooter({ text: `Total: ${warnData.warns.length} warnings` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // ── REMOVE WARN ───────────────────────────
    else if (sub === 'remove') {
      const warnId = interaction.options.getString('warn_id').toUpperCase();
      const warnData = await Warn.findOne({ guildId, userId: targetUser.id });

      if (!warnData) {
        return interaction.reply({
          content: '❌ This user has no warnings.',
          ephemeral: true,
        });
      }

      const idx = warnData.warns.findIndex((w) => w.warnId === warnId);
      if (idx === -1) {
        return interaction.reply({
          content: `❌ Warn ID \`${warnId}\` not found.`,
          ephemeral: true,
        });
      }

      warnData.warns.splice(idx, 1);
      await warnData.save();

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Warning Removed')
        .setDescription(
          `Warn \`${warnId}\` removed from **${targetUser.tag}**.\nRemaining warns: **${warnData.warns.length}**`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // ── CLEAR WARNS ───────────────────────────
    else if (sub === 'clear') {
      await Warn.deleteOne({ guildId, userId: targetUser.id });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ All Warnings Cleared')
        .setDescription(`All warnings for **${targetUser.tag}** have been removed.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
