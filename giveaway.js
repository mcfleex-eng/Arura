// ================================================
//   AURORA BOT - Giveaway System
//   start, end, reroll, list
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { Giveaway } = require('../../utils/models');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎉 Giveaway system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Start a giveaway')
        .addStringOption((o) =>
          o.setName('prize').setDescription('What is the prize?').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('duration')
            .setDescription('Duration (e.g. 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName('winners')
            .setDescription('Number of winners')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel to host giveaway').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((o) =>
          o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('reroll')
        .setDescription('Reroll giveaway winners')
        .addStringOption((o) =>
          o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s.setName('list').setDescription('List all active giveaways')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnersCount = interaction.options.getInteger('winners') || 1;
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const duration = ms(durationStr);
      if (!duration) {
        return interaction.reply({
          content: '❌ Invalid duration. Use formats like `1h`, `30m`, `1d`.',
          ephemeral: true,
        });
      }

      const endsAt = new Date(Date.now() + duration);

      const embed = new EmbedBuilder()
        .setColor(0xff73fa)
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(
          `**Prize:** ${prize}\n\n` +
          `🏆 **Winners:** ${winnersCount}\n` +
          `⏰ **Ends:** <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:f>)\n` +
          `👥 **Hosted by:** ${interaction.user}\n\n` +
          `Click 🎉 to enter!`
        )
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp(endsAt)
        .setFooter({ text: `${winnersCount} winner(s) • Ends at` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel('Enter Giveaway')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('giveaway_participants')
          .setLabel('Participants')
          .setEmoji('👥')
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await targetChannel.send({ embeds: [embed], components: [row] });

      const giveaway = new Giveaway({
        guildId,
        channelId: targetChannel.id,
        messageId: msg.id,
        prize,
        winnersCount,
        hostId: interaction.user.id,
        endsAt,
        participants: [],
      });
      await giveaway.save();

      // Schedule end
      setTimeout(async () => {
        await endGiveaway(interaction.guild, giveaway._id);
      }, duration);

      await interaction.reply({ content: `✅ Giveaway started in ${targetChannel}!`, ephemeral: true });
    }

    else if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, guildId });

      if (!giveaway || giveaway.ended) {
        return interaction.reply({ content: '❌ Giveaway not found or already ended.', ephemeral: true });
      }

      await endGiveaway(interaction.guild, giveaway._id);
      await interaction.reply({ content: '✅ Giveaway ended!', ephemeral: true });
    }

    else if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, guildId, ended: true });

      if (!giveaway) {
        return interaction.reply({ content: '❌ Ended giveaway not found.', ephemeral: true });
      }

      if (giveaway.participants.length === 0) {
        return interaction.reply({ content: '❌ No participants to reroll.', ephemeral: true });
      }

      const newWinners = pickWinners(giveaway.participants, giveaway.winnersCount);

      const embed = new EmbedBuilder()
        .setColor(0xff73fa)
        .setTitle('🎉 Giveaway Rerolled!')
        .setDescription(
          `**Prize:** ${giveaway.prize}\n` +
          `**New Winners:** ${newWinners.map((id) => `<@${id}>`).join(', ')}\n` +
          `Congratulations! 🎊`
        )
        .setTimestamp();

      const ch = interaction.guild.channels.cache.get(giveaway.channelId);
      if (ch) await ch.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Giveaway rerolled!', ephemeral: true });
    }

    else if (sub === 'list') {
      const giveaways = await Giveaway.find({ guildId, ended: false });

      if (giveaways.length === 0) {
        return interaction.reply({
          content: '📭 No active giveaways right now.',
          ephemeral: true,
        });
      }

      const list = giveaways
        .map(
          (g) =>
            `🎉 **${g.prize}** — <#${g.channelId}>\n> Ends: <t:${Math.floor(g.endsAt / 1000)}:R> | Winners: ${g.winnersCount} | Entries: ${g.participants.length}`
        )
        .join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0xff73fa)
        .setTitle('🎉 Active Giveaways')
        .setDescription(list)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

function pickWinners(participants, count) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function endGiveaway(guild, giveawayId) {
  const giveaway = await Giveaway.findById(giveawayId);
  if (!giveaway || giveaway.ended) return;

  giveaway.ended = true;

  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  let embed;
  if (giveaway.participants.length === 0) {
    embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🎉 Giveaway Ended')
      .setDescription(`**Prize:** ${giveaway.prize}\n\n❌ No one entered the giveaway.`)
      .setTimestamp();
  } else {
    const winners = pickWinners(giveaway.participants, giveaway.winnersCount);
    giveaway.winners = winners;

    embed = new EmbedBuilder()
      .setColor(0xff73fa)
      .setTitle('🎉 Giveaway Ended!')
      .setDescription(
        `**Prize:** ${giveaway.prize}\n` +
        `**Winner(s):** ${winners.map((id) => `<@${id}>`).join(', ')}\n` +
        `**Hosted by:** <@${giveaway.hostId}>\n\n` +
        `Congratulations! 🎊`
      )
      .setTimestamp()
      .setFooter({ text: 'Aurora Bot • Giveaways' });

    await channel.send({
      content: `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`,
    });
  }

  try {
    const msg = await channel.messages.fetch(giveaway.messageId);
    await msg.edit({ embeds: [embed], components: [] });
  } catch {}

  await giveaway.save();
}
