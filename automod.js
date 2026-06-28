// ================================================
//   AURORA BOT - AutoMod System
//   anti-spam, anti-links, bad words, anti-caps
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { AutoMod } = require('../../utils/models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('🤖 Configure Auto-Moderation')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Enable/disable AutoMod features')
        .addBooleanOption((o) =>
          o.setName('anti_spam').setDescription('Block spam messages').setRequired(false)
        )
        .addBooleanOption((o) =>
          o.setName('anti_links').setDescription('Block external links').setRequired(false)
        )
        .addBooleanOption((o) =>
          o
            .setName('anti_invites')
            .setDescription('Block Discord invite links')
            .setRequired(false)
        )
        .addBooleanOption((o) =>
          o.setName('anti_caps').setDescription('Block excessive caps').setRequired(false)
        )
        .addChannelOption((o) =>
          o.setName('log_channel').setDescription('Channel for automod logs').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('badwords')
        .setDescription('Manage bad word filter')
        .addStringOption((o) =>
          o
            .setName('action')
            .setDescription('add or remove')
            .setRequired(true)
            .addChoices(
              { name: 'Add word', value: 'add' },
              { name: 'Remove word', value: 'remove' },
              { name: 'List words', value: 'list' },
              { name: 'Clear all', value: 'clear' }
            )
        )
        .addStringOption((o) =>
          o.setName('word').setDescription('Word to add/remove').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('status')
        .setDescription('View current AutoMod configuration')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let config = await AutoMod.findOne({ guildId });
    if (!config) config = new AutoMod({ guildId });

    if (sub === 'setup') {
      const antiSpam = interaction.options.getBoolean('anti_spam');
      const antiLinks = interaction.options.getBoolean('anti_links');
      const antiInvites = interaction.options.getBoolean('anti_invites');
      const antiCaps = interaction.options.getBoolean('anti_caps');
      const logChannel = interaction.options.getChannel('log_channel');

      if (antiSpam !== null) config.antiSpam = antiSpam;
      if (antiLinks !== null) config.antiLinks = antiLinks;
      if (antiInvites !== null) config.antiInvites = antiInvites;
      if (antiCaps !== null) config.antiCaps = antiCaps;
      if (logChannel) config.logChannelId = logChannel.id;
      config.enabled = true;

      await config.save();

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🤖 AutoMod Configuration Updated')
        .addFields(
          { name: '🛡️ Anti-Spam', value: config.antiSpam ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '🔗 Anti-Links', value: config.antiLinks ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '📨 Anti-Invites', value: config.antiInvites ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '🔠 Anti-Caps', value: config.antiCaps ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '📋 Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Aurora Bot • AutoMod' });

      await interaction.reply({ embeds: [embed] });
    }

    else if (sub === 'badwords') {
      const action = interaction.options.getString('action');
      const word = interaction.options.getString('word');

      if (action === 'add') {
        if (!word) return interaction.reply({ content: '❌ Provide a word to add.', ephemeral: true });
        if (!config.badWords.includes(word.toLowerCase())) {
          config.badWords.push(word.toLowerCase());
          await config.save();
        }
        await interaction.reply({ content: `✅ Added **${word}** to the bad word list.`, ephemeral: true });
      }

      else if (action === 'remove') {
        if (!word) return interaction.reply({ content: '❌ Provide a word to remove.', ephemeral: true });
        config.badWords = config.badWords.filter((w) => w !== word.toLowerCase());
        await config.save();
        await interaction.reply({ content: `✅ Removed **${word}** from the list.`, ephemeral: true });
      }

      else if (action === 'list') {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('🚫 Bad Word Filter List')
          .setDescription(
            config.badWords.length
              ? config.badWords.map((w) => `\`${w}\``).join(', ')
              : 'No bad words configured.'
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (action === 'clear') {
        config.badWords = [];
        await config.save();
        await interaction.reply({ content: '✅ Bad word list cleared.', ephemeral: true });
      }
    }

    else if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🤖 AutoMod Status')
        .addFields(
          { name: '🛡️ Status', value: config.enabled ? '✅ Active' : '❌ Inactive', inline: true },
          { name: '🛡️ Anti-Spam', value: config.antiSpam ? '✅' : '❌', inline: true },
          { name: '🔗 Anti-Links', value: config.antiLinks ? '✅' : '❌', inline: true },
          { name: '📨 Anti-Invites', value: config.antiInvites ? '✅' : '❌', inline: true },
          { name: '🔠 Anti-Caps', value: config.antiCaps ? '✅' : '❌', inline: true },
          { name: '🚫 Bad Words', value: `${config.badWords.length} word(s)`, inline: true },
          { name: '📋 Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },
};
