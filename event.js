// ================================================
//   AURORA BOT - Event System
//   Create, view, RSVP, delete events
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { Event } = require('../../utils/models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('📅 Server event management')
    .addSubcommand((s) =>
      s
        .setName('create')
        .setDescription('Create a new server event')
        .addStringOption((o) =>
          o.setName('name').setDescription('Event name').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('description').setDescription('Event description').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('date')
            .setDescription('Event date & time (e.g. 2025-01-15 20:00)')
            .setRequired(true)
        )
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Event announcement channel').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s.setName('list').setDescription('List all upcoming events')
    )
    .addSubcommand((s) =>
      s
        .setName('info')
        .setDescription('Get info about an event')
        .addStringOption((o) =>
          o.setName('event_id').setDescription('Event ID').setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('cancel')
        .setDescription('Cancel/delete an event')
        .addStringOption((o) =>
          o.setName('event_id').setDescription('Event ID').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');
      const dateStr = interaction.options.getString('date');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return interaction.reply({
          content: '❌ Invalid date format. Use: `YYYY-MM-DD HH:MM`',
          ephemeral: true,
        });
      }

      const event = new Event({
        guildId,
        name,
        description,
        date,
        channelId: targetChannel.id,
        createdBy: interaction.user.id,
        participants: [],
      });
      await event.save();

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📅 ${name}`)
        .setDescription(description)
        .addFields(
          { name: '📆 Date', value: `<t:${Math.floor(date / 1000)}:F>`, inline: true },
          { name: '⏰ Relative', value: `<t:${Math.floor(date / 1000)}:R>`, inline: true },
          { name: '👤 Organizer', value: `${interaction.user}`, inline: true },
          { name: '🆔 Event ID', value: `\`${event._id}\``, inline: false },
          { name: '✅ RSVP', value: '0 participants', inline: true }
        )
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp()
        .setFooter({ text: 'Aurora Bot • Events' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`event_rsvp_${event._id}`)
          .setLabel('RSVP / Join')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`event_unrsvp_${event._id}`)
          .setLabel('Cancel RSVP')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
      );

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Event created in ${targetChannel}!`, ephemeral: true });
    }

    else if (sub === 'list') {
      const events = await Event.find({ guildId, date: { $gte: new Date() } }).sort({ date: 1 });

      if (events.length === 0) {
        return interaction.reply({ content: '📭 No upcoming events.', ephemeral: true });
      }

      const list = events
        .map(
          (e) =>
            `📅 **${e.name}**\n> <t:${Math.floor(e.date / 1000)}:F> | ✅ ${e.participants.length} RSVPs\n> \`ID: ${e._id}\``
        )
        .join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📅 Upcoming Events')
        .setDescription(list)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    else if (sub === 'info') {
      const eventId = interaction.options.getString('event_id');
      let event;
      try {
        event = await Event.findById(eventId);
      } catch {
        return interaction.reply({ content: '❌ Invalid event ID.', ephemeral: true });
      }

      if (!event || event.guildId !== guildId) {
        return interaction.reply({ content: '❌ Event not found.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📅 ${event.name}`)
        .setDescription(event.description)
        .addFields(
          { name: '📆 Date', value: `<t:${Math.floor(event.date / 1000)}:F>`, inline: true },
          { name: '⏰ Relative', value: `<t:${Math.floor(event.date / 1000)}:R>`, inline: true },
          { name: '👤 Organizer', value: `<@${event.createdBy}>`, inline: true },
          { name: '✅ RSVPs', value: `${event.participants.length} participant(s)`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    else if (sub === 'cancel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ content: '❌ Missing permission: Manage Events', ephemeral: true });
      }

      const eventId = interaction.options.getString('event_id');
      try {
        await Event.findByIdAndDelete(eventId);
        await interaction.reply({ content: '✅ Event cancelled and deleted.', ephemeral: true });
      } catch {
        await interaction.reply({ content: '❌ Event not found.', ephemeral: true });
      }
    }
  },
};
