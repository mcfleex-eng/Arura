// ================================================
//   AURORA BOT - DM Message System
//   Send DM to a server member by username
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('📨 Send a DM to a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName('send')
        .setDescription('Send a DM to a user by username')
        .addStringOption((o) =>
          o
            .setName('username')
            .setDescription('Username of the member (e.g. johndoe or johndoe#1234)')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('message')
            .setDescription('Message to send')
            .setRequired(true)
        )
        .addBooleanOption((o) =>
          o
            .setName('anonymous')
            .setDescription('Hide your identity from the DM?')
            .setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('user')
        .setDescription('Send a DM to a user (by mention/select)')
        .addUserOption((o) =>
          o.setName('user').setDescription('Select a user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('message').setDescription('Message to send').setRequired(true)
        )
        .addBooleanOption((o) =>
          o.setName('anonymous').setDescription('Hide your identity?').setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const message = interaction.options.getString('message');
    const anonymous = interaction.options.getBoolean('anonymous') ?? false;

    let targetUser = null;

    // ── Find by username ───────────────────────
    if (sub === 'send') {
      const username = interaction.options.getString('username').toLowerCase();

      // Fetch all members (for larger servers, consider fetching by query)
      await interaction.guild.members.fetch();

      const member = interaction.guild.members.cache.find((m) => {
        const tag = m.user.tag.toLowerCase();
        const name = m.user.username.toLowerCase();
        const display = m.displayName.toLowerCase();
        return (
          tag === username ||
          name === username ||
          display === username
        );
      });

      if (!member) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('❌ User Not Found')
          .setDescription(
            `Could not find **${interaction.options.getString('username')}** in this server.\nMake sure the username is correct.`
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      targetUser = member.user;
    }

    // ── Find by user select ────────────────────
    else if (sub === 'user') {
      targetUser = interaction.options.getUser('user');
    }

    if (!targetUser) return;

    // ── Build DM Embed ─────────────────────────
    const dmEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📨 New Message')
      .setDescription(message)
      .setTimestamp()
      .setFooter({
        text: anonymous
          ? `From: ${interaction.guild.name} • Staff`
          : `From: ${interaction.user.tag} via ${interaction.guild.name}`,
        iconURL: anonymous
          ? interaction.guild.iconURL()
          : interaction.user.displayAvatarURL(),
      });

    try {
      await targetUser.send({ embeds: [dmEmbed] });

      const successEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ DM Sent Successfully')
        .addFields(
          { name: '👤 Recipient', value: `${targetUser.tag}`, inline: true },
          { name: '🕵️ Anonymous', value: anonymous ? 'Yes' : 'No', inline: true },
          { name: '📝 Message', value: message, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch {
      const failEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('❌ DM Failed')
        .setDescription(
          `Could not send a DM to **${targetUser.tag}**.\nThey may have DMs disabled.`
        );
      await interaction.reply({ embeds: [failEmbed], ephemeral: true });
    }
  },
};
