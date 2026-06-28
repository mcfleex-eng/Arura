// ================================================
//   AURORA BOT - Music System
//   play, pause, resume, skip, queue, stop, volume
// ================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
} = require('@discordjs/voice');
const play = require('play-dl');

// Queue manager (in-memory per guild)
const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      player: null,
      connection: null,
      volume: 50,
      loop: false,
      playing: false,
    });
  }
  return queues.get(guildId);
}

async function playSong(guild, queue) {
  if (!queue.songs.length) {
    queue.playing = false;
    const conn = getVoiceConnection(guild.id);
    if (conn) setTimeout(() => conn.destroy(), 30000);
    return;
  }

  const song = queue.songs[0];
  queue.playing = true;

  try {
    const stream = await play.stream(song.url, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });
    resource.volume?.setVolume(queue.volume / 100);

    queue.player.play(resource);

    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (!queue.loop) queue.songs.shift();
      playSong(guild, queue);
    });
  } catch (err) {
    console.error('Music Error:', err);
    queue.songs.shift();
    playSong(guild, queue);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player')
    .addSubcommand((s) =>
      s
        .setName('play')
        .setDescription('Play a song or add to queue')
        .addStringOption((o) =>
          o
            .setName('query')
            .setDescription('Song name or YouTube URL')
            .setRequired(true)
        )
    )
    .addSubcommand((s) => s.setName('pause').setDescription('Pause the music'))
    .addSubcommand((s) => s.setName('resume').setDescription('Resume paused music'))
    .addSubcommand((s) => s.setName('skip').setDescription('Skip current song'))
    .addSubcommand((s) => s.setName('stop').setDescription('Stop music and clear queue'))
    .addSubcommand((s) => s.setName('queue').setDescription('View song queue'))
    .addSubcommand((s) => s.setName('nowplaying').setDescription('Show current song'))
    .addSubcommand((s) =>
      s
        .setName('volume')
        .setDescription('Set volume')
        .addIntegerOption((o) =>
          o
            .setName('level')
            .setDescription('Volume level (1-100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s.setName('loop').setDescription('Toggle loop for current song')
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption((o) =>
          o.setName('position').setDescription('Song position in queue').setMinValue(1).setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const member = interaction.member;

    const voiceChannel = member.voice?.channel;

    // Commands that require VC
    const requiresVC = ['play', 'pause', 'resume', 'skip', 'stop', 'volume', 'loop', 'remove'];
    if (requiresVC.includes(sub) && !voiceChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ You need to join a voice channel first!'),
        ],
        ephemeral: true,
      });
    }

    const queue = getQueue(guildId);

    // ── PLAY ──────────────────────────────────
    if (sub === 'play') {
      await interaction.deferReply();
      const query = interaction.options.getString('query');

      try {
        let songInfo;
        let songUrl;

        // Search or use URL
        if (play.yt_validate(query) === 'video') {
          const info = await play.video_info(query);
          songInfo = info.video_details;
          songUrl = query;
        } else {
          const results = await play.search(query, { limit: 1 });
          if (!results.length) {
            return interaction.editReply({ content: '❌ No results found.' });
          }
          songInfo = results[0];
          songUrl = results[0].url;
        }

        const song = {
          title: songInfo.title,
          url: songUrl,
          duration: songInfo.durationRaw || '??',
          thumbnail: songInfo.thumbnails?.[0]?.url,
          requestedBy: interaction.user.tag,
        };

        queue.songs.push(song);

        // Setup connection if needed
        if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
          queue.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });

          queue.player = createAudioPlayer();
          queue.connection.subscribe(queue.player);

          queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
            queue.songs = [];
            queue.playing = false;
            queues.delete(guildId);
          });
        }

        if (!queue.playing) {
          await playSong(interaction.guild, queue);
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(queue.songs.length === 1 ? '🎵 Now Playing' : '➕ Added to Queue')
          .setDescription(`**[${song.title}](${song.url})**`)
          .setThumbnail(song.thumbnail)
          .addFields(
            { name: '⏱️ Duration', value: song.duration, inline: true },
            { name: '🎧 Requested by', value: song.requestedBy, inline: true },
            { name: '📋 Position', value: queue.songs.length === 1 ? 'Now' : `#${queue.songs.length}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Aurora Bot • Music' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('music_queue').setEmoji('📋').setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
      } catch (err) {
        console.error(err);
        await interaction.editReply({ content: '❌ Could not play the song. Check the URL or try another search.' });
      }
    }

    // ── PAUSE ─────────────────────────────────
    else if (sub === 'pause') {
      if (!queue.playing) return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
      queue.player.pause();
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⏸️ Music paused.')],
      });
    }

    // ── RESUME ────────────────────────────────
    else if (sub === 'resume') {
      queue.player?.unpause();
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('▶️ Music resumed.')],
      });
    }

    // ── SKIP ──────────────────────────────────
    else if (sub === 'skip') {
      if (!queue.songs.length) return interaction.reply({ content: '❌ Nothing in queue.', ephemeral: true });
      const skipped = queue.songs[0];
      queue.player?.stop();
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(`⏭️ Skipped: **${skipped.title}**`),
        ],
      });
    }

    // ── STOP ──────────────────────────────────
    else if (sub === 'stop') {
      queue.songs = [];
      queue.playing = false;
      queue.player?.stop();
      queue.connection?.destroy();
      queues.delete(guildId);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('⏹️ Music stopped and queue cleared.')],
      });
    }

    // ── QUEUE ─────────────────────────────────
    else if (sub === 'queue') {
      if (!queue.songs.length) {
        return interaction.reply({ content: '📭 Queue is empty.', ephemeral: true });
      }

      const list = queue.songs
        .slice(0, 10)
        .map(
          (s, i) =>
            `${i === 0 ? '🎵' : `**${i + 1}.**`} [${s.title}](${s.url}) \`${s.duration}\``
        )
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📋 Music Queue')
        .setDescription(list)
        .setFooter({ text: `${queue.songs.length} song(s) • Loop: ${queue.loop ? 'ON' : 'OFF'}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // ── NOW PLAYING ───────────────────────────
    else if (sub === 'nowplaying') {
      if (!queue.songs.length) {
        return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
      }

      const song = queue.songs[0];
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${song.title}](${song.url})**`)
        .setThumbnail(song.thumbnail)
        .addFields(
          { name: '⏱️ Duration', value: song.duration, inline: true },
          { name: '🎧 Requested by', value: song.requestedBy, inline: true },
          { name: '🔁 Loop', value: queue.loop ? 'ON' : 'OFF', inline: true },
          { name: '🔊 Volume', value: `${queue.volume}%`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // ── VOLUME ────────────────────────────────
    else if (sub === 'volume') {
      const level = interaction.options.getInteger('level');
      queue.volume = level;

      if (queue.player?.state?.resource) {
        queue.player.state.resource.volume?.setVolume(level / 100);
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(`🔊 Volume set to **${level}%**`),
        ],
      });
    }

    // ── LOOP ──────────────────────────────────
    else if (sub === 'loop') {
      queue.loop = !queue.loop;
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(`🔁 Loop is now **${queue.loop ? 'ON' : 'OFF'}**`),
        ],
      });
    }

    // ── REMOVE ────────────────────────────────
    else if (sub === 'remove') {
      const pos = interaction.options.getInteger('position');
      if (pos < 1 || pos > queue.songs.length) {
        return interaction.reply({ content: `❌ Invalid position. Queue has ${queue.songs.length} songs.`, ephemeral: true });
      }
      const removed = queue.songs.splice(pos - 1, 1)[0];
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`🗑️ Removed: **${removed.title}** from queue.`),
        ],
      });
    }
  },
};
