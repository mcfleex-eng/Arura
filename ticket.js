// ================================================
//   AURORA BOT - Ticket System
//   Panel, open, close, transcript
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const { Ticket, TicketConfig } = require('../../utils/models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Ticket system management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Setup ticket panel')
        .addChannelOption((o) =>
          o.setName('category').setDescription('Category for ticket channels').setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName('support_role').setDescription('Support staff role').setRequired(true)
        )
        .addChannelOption((o) =>
          o.setName('log_channel').setDescription('Ticket log channel').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('panel')
        .setDescription('Send the ticket panel to a channel')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel to send panel to').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('title').setDescription('Panel title').setRequired(false)
        )
        .addStringOption((o) =>
          o.setName('description').setDescription('Panel description').setRequired(false)
        )
        .addStringOption((o) =>
          o.setName('color').setDescription('Panel embed color (hex)').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s.setName('close').setDescription('Close current ticket')
    )
    .addSubcommand((s) =>
      s.setName('add').setDescription('Add a user to this ticket')
        .addUserOption((o) => o.setName('user').setDescription('User to add').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Remove a user from this ticket')
        .addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const category = interaction.options.getChannel('category');
      const role = interaction.options.getRole('support_role');
      const logChannel = interaction.options.getChannel('log_channel');

      let config = await TicketConfig.findOne({ guildId }) || new TicketConfig({ guildId });
      config.categoryId = category.id;
      config.supportRoleId = role.id;
      if (logChannel) config.logChannelId = logChannel.id;
      await config.save();

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Ticket System Setup')
        .addFields(
          { name: '📁 Category', value: `${category}`, inline: true },
          { name: '👥 Support Role', value: `${role}`, inline: true },
          { name: '📋 Log Channel', value: logChannel ? `${logChannel}` : 'Not set', inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    else if (sub === 'panel') {
      const config = await TicketConfig.findOne({ guildId });
      if (!config) {
        return interaction.reply({
          content: '❌ Run `/ticket setup` first!',
          ephemeral: true,
        });
      }

      const targetChannel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || '🎫 Support Tickets';
      const description = interaction.options.getString('description') ||
        'Click the button below to open a support ticket.\nOur staff will assist you as soon as possible.';
      const colorInput = interaction.options.getString('color') || '#5865F2';
      let color;
      try { color = parseInt(colorInput.replace('#', ''), 16); } catch { color = 0x5865f2; }

      const panelEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ text: `${interaction.guild.name} • Support`, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open')
          .setLabel('Open a Ticket')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_info')
          .setLabel('Ticket Info')
          .setEmoji('ℹ️')
          .setStyle(ButtonStyle.Secondary)
      );

      await targetChannel.send({ embeds: [panelEmbed], components: [row] });
      await interaction.reply({ content: `✅ Ticket panel sent to ${targetChannel}!`, ephemeral: true });
    }

    else if (sub === 'close') {
      const ticket = await Ticket.findOne({
        guildId,
        channelId: interaction.channel.id,
        status: 'open',
      });

      if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
      }

      ticket.status = 'closed';
      await ticket.save();

      const closeEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Ticket closed by ${interaction.user}\nChannel will be deleted in 5 seconds.`)
        .setTimestamp();

      await interaction.reply({ embeds: [closeEmbed] });

      // Log
      const config = await TicketConfig.findOne({ guildId });
      if (config?.logChannelId) {
        const logCh = interaction.guild.channels.cache.get(config.logChannelId);
        if (logCh) {
          await logCh.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle('🎫 Ticket Closed')
                .addFields(
                  { name: '🎫 Ticket', value: `#${ticket.ticketNumber}`, inline: true },
                  { name: '👤 Opened by', value: `<@${ticket.userId}>`, inline: true },
                  { name: '👮 Closed by', value: `${interaction.user}`, inline: true }
                )
                .setTimestamp(),
            ],
          });
        }
      }

      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    else if (sub === 'add') {
      const user = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
      });
      await interaction.reply({ content: `✅ Added ${user} to this ticket.` });
    }

    else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: false,
      });
      await interaction.reply({ content: `✅ Removed ${user} from this ticket.` });
    }
  },
};
