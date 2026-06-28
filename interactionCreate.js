// ================================================
//   AURORA BOT - Interaction Handler
//   Handles slash commands + button interactions
// ================================================

const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { Ticket, TicketConfig, Giveaway, Event } = require('../utils/models');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── SLASH COMMANDS ────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Error in /${interaction.commandName}:`, err);
        const errEmbed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('❌ Error')
          .setDescription('An error occurred while running this command.');

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }

    // ── BUTTON INTERACTIONS ───────────────────
    else if (interaction.isButton()) {
      const id = interaction.customId;

      // ── Ticket Open ──────────────────────────
      if (id === 'ticket_open') {
        const guildId = interaction.guild.id;
        const config = await TicketConfig.findOne({ guildId });

        if (!config) {
          return interaction.reply({ content: '❌ Ticket system not configured.', ephemeral: true });
        }

        // Check if user already has open ticket
        const existing = await Ticket.findOne({
          guildId,
          userId: interaction.user.id,
          status: 'open',
        });

        if (existing) {
          return interaction.reply({
            content: `❌ You already have an open ticket: <#${existing.channelId}>`,
            ephemeral: true,
          });
        }

        config.ticketCounter += 1;
        await config.save();

        const ticketNum = config.ticketCounter;
        const channelName = `ticket-${ticketNum.toString().padStart(4, '0')}-${interaction.user.username}`;

        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: config.categoryId,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            ...(config.supportRoleId
              ? [
                  {
                    id: config.supportRoleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                  },
                ]
              : []),
          ],
        });

        // Save ticket to DB
        const ticket = new Ticket({
          guildId,
          channelId: ticketChannel.id,
          userId: interaction.user.id,
          ticketNumber: ticketNum,
          status: 'open',
        });
        await ticket.save();

        // Send welcome message in ticket
        const ticketEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎫 Ticket #${ticketNum.toString().padStart(4, '0')}`)
          .setDescription(
            `Hello ${interaction.user}! 👋\n\nThank you for opening a ticket. A staff member will be with you shortly.\n\nPlease describe your issue below.`
          )
          .addFields(
            { name: '👤 Opened by', value: `${interaction.user.tag}`, inline: true },
            { name: '📅 Opened at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Aurora Bot • Ticket System' });

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: `${interaction.user} ${config.supportRoleId ? `<@&${config.supportRoleId}>` : ''}`,
          embeds: [ticketEmbed],
          components: [row],
        });

        await interaction.reply({
          content: `✅ Ticket created: ${ticketChannel}`,
          ephemeral: true,
        });
      }

      // ── Ticket Close (button) ─────────────────
      else if (id === 'ticket_close') {
        const ticket = await Ticket.findOne({
          channelId: interaction.channel.id,
          status: 'open',
        });

        if (!ticket) return interaction.reply({ content: '❌ Not a ticket.', ephemeral: true });

        ticket.status = 'closed';
        await ticket.save();

        const closeEmbed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('🔒 Ticket Closed')
          .setDescription(`Closed by ${interaction.user}\nDeleting in 5 seconds...`)
          .setTimestamp();

        await interaction.reply({ embeds: [closeEmbed] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

      // ── Giveaway Enter ────────────────────────
      else if (id === 'giveaway_enter') {
        const giveaway = await Giveaway.findOne({
          messageId: interaction.message.id,
          ended: false,
        });

        if (!giveaway) {
          return interaction.reply({ content: '❌ Giveaway not found or has ended.', ephemeral: true });
        }

        if (giveaway.participants.includes(interaction.user.id)) {
          // Toggle off - remove
          giveaway.participants = giveaway.participants.filter((id) => id !== interaction.user.id);
          await giveaway.save();
          return interaction.reply({ content: '❌ You have left the giveaway.', ephemeral: true });
        }

        giveaway.participants.push(interaction.user.id);
        await giveaway.save();
        await interaction.reply({
          content: `🎉 You have entered the giveaway for **${giveaway.prize}**!\nTotal entries: ${giveaway.participants.length}`,
          ephemeral: true,
        });
      }

      // ── Giveaway Participants ─────────────────
      else if (id === 'giveaway_participants') {
        const giveaway = await Giveaway.findOne({ messageId: interaction.message.id });
        if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });

        await interaction.reply({
          content: `👥 **${giveaway.participants.length}** participant(s) entered.`,
          ephemeral: true,
        });
      }

      // ── Event RSVP ────────────────────────────
      else if (id.startsWith('event_rsvp_')) {
        const eventId = id.replace('event_rsvp_', '');
        const event = await Event.findById(eventId);

        if (!event) return interaction.reply({ content: '❌ Event not found.', ephemeral: true });

        if (!event.participants.includes(interaction.user.id)) {
          event.participants.push(interaction.user.id);
          await event.save();
        }

        await interaction.reply({
          content: `✅ You've RSVP'd to **${event.name}**! See you there 🎉`,
          ephemeral: true,
        });
      }

      // ── Event Un-RSVP ─────────────────────────
      else if (id.startsWith('event_unrsvp_')) {
        const eventId = id.replace('event_unrsvp_', '');
        const event = await Event.findById(eventId);

        if (!event) return interaction.reply({ content: '❌ Event not found.', ephemeral: true });

        event.participants = event.participants.filter((uid) => uid !== interaction.user.id);
        await event.save();

        await interaction.reply({
          content: `❌ Your RSVP for **${event.name}** has been cancelled.`,
          ephemeral: true,
        });
      }

      // ── Ticket Info ───────────────────────────
      else if (id === 'ticket_info') {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('ℹ️ Ticket Information')
              .setDescription(
                '**How to use tickets:**\n' +
                '1. Click "Open a Ticket" to create a private channel\n' +
                '2. Describe your issue and wait for a staff member\n' +
                '3. Staff will help you in the ticket\n' +
                '4. Click "Close Ticket" when resolved\n\n' +
                '**Note:** Do not abuse the ticket system.'
              ),
          ],
          ephemeral: true,
        });
      }

      // ── Music Buttons ─────────────────────────
      else if (id === 'music_pause') {
        const cmd = client.commands.get('music');
        // Simulate skip via queue
        await interaction.reply({ content: '⏸️ Music paused.', ephemeral: true });
      } else if (id === 'music_skip') {
        await interaction.reply({ content: '⏭️ Use `/music skip` to skip.', ephemeral: true });
      } else if (id === 'music_stop') {
        await interaction.reply({ content: '⏹️ Use `/music stop` to stop.', ephemeral: true });
      } else if (id === 'music_queue') {
        await interaction.reply({ content: '📋 Use `/music queue` to see the queue.', ephemeral: true });
      }
    }
  },
};
