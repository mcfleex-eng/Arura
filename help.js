// ================================================
//   AURORA BOT - Help Command
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 View all Aurora Bot commands'),

  async execute(interaction) {
    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🌟 Aurora Bot — Help')
      .setDescription(
        'A powerful all-in-one Discord bot with moderation, music, tickets, giveaways and more!\n\nSelect a category below to see commands.'
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: '🎨 Embed System', value: '`/embed create` — Build custom embeds with colors, images & buttons', inline: false },
        { name: '⚠️ Warn System', value: '`/warn add/list/remove/clear` — Full warning management', inline: false },
        { name: '🛡️ Moderation', value: '`/mod kick/ban/unban/timeout/purge/lock/slowmode`', inline: false },
        { name: '🤖 AutoMod', value: '`/automod setup/badwords/status` — Auto-moderation', inline: false },
        { name: '📨 DM System', value: '`/dm send` — DM a user by username; `/dm user` — by mention', inline: false },
        { name: '📅 Events', value: '`/event create/list/info/cancel` — Server events + RSVP', inline: false },
        { name: '🎫 Tickets', value: '`/ticket setup/panel/close/add/remove` — Support tickets', inline: false },
        { name: '🎉 Giveaways', value: '`/giveaway start/end/reroll/list` — Full giveaway system', inline: false },
        { name: '🎵 Music', value: '`/music play/pause/skip/stop/queue/volume/loop` — Music player', inline: false }
      )
      .setTimestamp()
      .setFooter({
        text: 'Aurora Bot • Made with ❤️',
        iconURL: interaction.client.user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [mainEmbed] });
  },
};
