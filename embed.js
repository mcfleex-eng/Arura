// ================================================
//   AURORA BOT - Embed Builder System
//   Features: Custom color, image, emoji, buttons
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('🎨 Create a beautiful custom embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new embed')
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Embed title').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Embed description').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('color')
            .setDescription('Embed color (hex code, e.g. #FF5733)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('image')
            .setDescription('Image URL for the embed')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('thumbnail')
            .setDescription('Thumbnail URL for the embed')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('footer')
            .setDescription('Footer text')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('footer_icon')
            .setDescription('Footer icon URL')
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('timestamp')
            .setDescription('Add current timestamp?')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button1_label')
            .setDescription('Button 1 label (optional)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button1_url')
            .setDescription('Button 1 URL (for link button)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button1_emoji')
            .setDescription('Button 1 emoji (e.g. 🎉 or custom emoji)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button2_label')
            .setDescription('Button 2 label (optional)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button2_url')
            .setDescription('Button 2 URL')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button2_emoji')
            .setDescription('Button 2 emoji')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button3_label')
            .setDescription('Button 3 label (optional)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button3_url')
            .setDescription('Button 3 URL')
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to send the embed to')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const colorInput = interaction.options.getString('color') || '#5865F2';
      const imageUrl = interaction.options.getString('image');
      const thumbnailUrl = interaction.options.getString('thumbnail');
      const footer = interaction.options.getString('footer');
      const footerIcon = interaction.options.getString('footer_icon');
      const addTimestamp = interaction.options.getBoolean('timestamp') ?? false;
      const targetChannel =
        interaction.options.getChannel('channel') || interaction.channel;

      // Parse color safely
      let color;
      try {
        color = parseInt(colorInput.replace('#', ''), 16);
        if (isNaN(color)) color = 0x5865f2;
      } catch {
        color = 0x5865f2;
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

      if (imageUrl) embed.setImage(imageUrl);
      if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
      if (addTimestamp) embed.setTimestamp();
      if (footer)
        embed.setFooter({ text: footer, iconURL: footerIcon || null });

      // Build buttons (up to 3)
      const buttons = [];
      for (let i = 1; i <= 3; i++) {
        const label = interaction.options.getString(`button${i}_label`);
        const url = interaction.options.getString(`button${i}_url`);
        const emoji = interaction.options.getString(`button${i}_emoji`);

        if (label) {
          const btn = new ButtonBuilder().setLabel(label);

          if (url) {
            btn.setStyle(ButtonStyle.Link).setURL(url);
          } else {
            btn
              .setStyle(ButtonStyle.Primary)
              .setCustomId(`embed_btn_${i}_${Date.now()}`);
          }

          if (emoji) {
            try {
              btn.setEmoji(emoji);
            } catch {}
          }

          buttons.push(btn);
        }
      }

      const components = [];
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(...buttons));
      }

      // Send embed to target channel
      await targetChannel.send({ embeds: [embed], components });

      // Confirmation to command issuer
      const confirmEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Embed Sent!')
        .setDescription(`Your embed was sent to ${targetChannel}`)
        .setTimestamp();

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
  },
};
