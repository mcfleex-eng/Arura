// ================================================
//   AURORA BOT - Moderation System
//   kick, ban, unban, mute, unmute, purge, timeout
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

function modEmbed(action, color, user, reason, moderator, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(action)
    .setThumbnail(user.displayAvatarURL?.() || user.avatarURL?.() || null)
    .addFields(
      { name: '👤 User', value: `${user.tag || user}`, inline: true },
      { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
      { name: '📋 Reason', value: reason || 'No reason provided', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Aurora Bot • Moderation' });

  Object.entries(extra).forEach(([name, value]) =>
    embed.addFields({ name, value: String(value), inline: true })
  );

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('🛡️ Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    // KICK
    .addSubcommand((s) =>
      s
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption((o) =>
          o.setName('user').setDescription('User to kick').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(false)
        )
    )

    // BAN
    .addSubcommand((s) =>
      s
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption((o) =>
          o.setName('user').setDescription('User to ban').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(false)
        )
        .addIntegerOption((o) =>
          o
            .setName('delete_days')
            .setDescription('Delete message history (0-7 days)')
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)
        )
    )

    // UNBAN
    .addSubcommand((s) =>
      s
        .setName('unban')
        .setDescription('Unban a user by ID')
        .addStringOption((o) =>
          o.setName('user_id').setDescription('User ID to unban').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(false)
        )
    )

    // TIMEOUT (mute)
    .addSubcommand((s) =>
      s
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption((o) =>
          o.setName('user').setDescription('User to timeout').setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName('duration')
            .setDescription('Duration in minutes')
            .setMinValue(1)
            .setMaxValue(40320) // 28 days
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(false)
        )
    )

    // UNTIMEOUT
    .addSubcommand((s) =>
      s
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption((o) =>
          o.setName('user').setDescription('User').setRequired(true)
        )
    )

    // PURGE
    .addSubcommand((s) =>
      s
        .setName('purge')
        .setDescription('Delete multiple messages')
        .addIntegerOption((o) =>
          o
            .setName('amount')
            .setDescription('Number of messages to delete (1-100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addUserOption((o) =>
          o.setName('user').setDescription('Only delete messages from this user').setRequired(false)
        )
    )

    // LOCK
    .addSubcommand((s) =>
      s
        .setName('lock')
        .setDescription('Lock a channel (prevent messages)')
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(false)
        )
    )

    // UNLOCK
    .addSubcommand((s) =>
      s
        .setName('unlock')
        .setDescription('Unlock a channel')
    )

    // SLOWMODE
    .addSubcommand((s) =>
      s
        .setName('slowmode')
        .setDescription('Set slowmode for current channel')
        .addIntegerOption((o) =>
          o
            .setName('seconds')
            .setDescription('Slowmode in seconds (0 to disable)')
            .setMinValue(0)
            .setMaxValue(21600)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const reason =
      interaction.options.getString('reason') || 'No reason provided';

    const logChannel = interaction.guild.channels.cache.get(
      process.env.LOG_CHANNEL_ID
    );

    // ── KICK ──────────────────────────────────
    if (sub === 'kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
        return interaction.reply({ content: '❌ Missing permission: Kick Members', ephemeral: true });

      const member = interaction.options.getMember('user');
      if (!member.kickable)
        return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });

      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle('👢 You were kicked')
              .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}`)
              .setTimestamp(),
          ],
        });
      } catch {}

      await member.kick(reason);
      const embed = modEmbed('👢 Member Kicked', 0xed4245, member.user, reason, interaction.user);
      await interaction.reply({ embeds: [embed] });
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }

    // ── BAN ───────────────────────────────────
    else if (sub === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ content: '❌ Missing permission: Ban Members', ephemeral: true });

      const user = interaction.options.getUser('user');
      const deleteDays = interaction.options.getInteger('delete_days') || 0;
      const member = interaction.guild.members.cache.get(user.id);

      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle('🔨 You were banned')
              .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}`)
              .setTimestamp(),
          ],
        });
      } catch {}

      await interaction.guild.bans.create(user.id, {
        reason,
        deleteMessageDays: deleteDays,
      });

      const embed = modEmbed('🔨 Member Banned', 0xed4245, user, reason, interaction.user, {
        '🗑️ Messages Deleted': `${deleteDays} days`,
      });
      await interaction.reply({ embeds: [embed] });
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }

    // ── UNBAN ─────────────────────────────────
    else if (sub === 'unban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ content: '❌ Missing permission: Ban Members', ephemeral: true });

      const userId = interaction.options.getString('user_id');
      try {
        const ban = await interaction.guild.bans.fetch(userId);
        await interaction.guild.bans.remove(userId, reason);
        const embed = modEmbed('✅ Member Unbanned', 0x57f287, ban.user, reason, interaction.user);
        await interaction.reply({ embeds: [embed] });
        if (logChannel) await logChannel.send({ embeds: [embed] });
      } catch {
        await interaction.reply({ content: '❌ User not found in ban list.', ephemeral: true });
      }
    }

    // ── TIMEOUT ───────────────────────────────
    else if (sub === 'timeout') {
      const member = interaction.options.getMember('user');
      const duration = interaction.options.getInteger('duration');
      const ms = duration * 60 * 1000;

      await member.timeout(ms, reason);

      const embed = modEmbed('⏱️ Member Timed Out', 0xfee75c, member.user, reason, interaction.user, {
        '⏰ Duration': `${duration} minute(s)`,
        '🕐 Ends': `<t:${Math.floor((Date.now() + ms) / 1000)}:R>`,
      });
      await interaction.reply({ embeds: [embed] });
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }

    // ── UNTIMEOUT ─────────────────────────────
    else if (sub === 'untimeout') {
      const member = interaction.options.getMember('user');
      await member.timeout(null);
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Timeout Removed')
        .setDescription(`${member.user.tag}'s timeout has been removed.`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    // ── PURGE ─────────────────────────────────
    else if (sub === 'purge') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
        return interaction.reply({ content: '❌ Missing permission: Manage Messages', ephemeral: true });

      const amount = interaction.options.getInteger('amount');
      const filterUser = interaction.options.getUser('user');

      let messages = await interaction.channel.messages.fetch({ limit: 100 });
      if (filterUser) {
        messages = messages.filter((m) => m.author.id === filterUser.id);
      }
      const toDelete = [...messages.values()].slice(0, amount);

      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🗑️ Messages Purged')
        .setDescription(
          `Deleted **${deleted.size}** message(s)${filterUser ? ` from ${filterUser.tag}` : ''}.`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── LOCK ──────────────────────────────────
    else if (sub === 'lock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ content: '❌ Missing permission: Manage Channels', ephemeral: true });

      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: false }
      );

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🔒 Channel Locked')
        .setDescription(`${interaction.channel} has been locked.\n**Reason:** ${reason}`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    // ── UNLOCK ────────────────────────────────
    else if (sub === 'unlock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ content: '❌ Missing permission: Manage Channels', ephemeral: true });

      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: null }
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`${interaction.channel} has been unlocked.`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    // ── SLOWMODE ──────────────────────────────
    else if (sub === 'slowmode') {
      const seconds = interaction.options.getInteger('seconds');
      await interaction.channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('⏱️ Slowmode Updated')
        .setDescription(
          seconds === 0
            ? `Slowmode disabled in ${interaction.channel}.`
            : `Slowmode set to **${seconds}s** in ${interaction.channel}.`
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },
};
