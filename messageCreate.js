// ================================================
//   AURORA BOT - AutoMod Message Handler
// ================================================

const { EmbedBuilder } = require('discord.js');
const { AutoMod } = require('../utils/models');

// Spam tracker (userId -> [timestamps])
const spamTracker = new Map();

const LINK_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
const INVITE_REGEX = /(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const config = await AutoMod.findOne({ guildId: message.guild.id });
    if (!config || !config.enabled) return;

    // Exempt roles check
    const memberRoles = message.member?.roles.cache.map((r) => r.id) || [];
    if (config.exemptRoles.some((r) => memberRoles.includes(r))) return;
    if (config.exemptChannels.includes(message.channel.id)) return;

    let violated = false;
    let reason = '';

    // ── Anti-Spam (5 msgs in 5s) ───────────────
    if (config.antiSpam) {
      const now = Date.now();
      const uid = message.author.id;
      const times = spamTracker.get(uid) || [];
      times.push(now);
      const recent = times.filter((t) => now - t < 5000);
      spamTracker.set(uid, recent);

      if (recent.length >= 5) {
        violated = true;
        reason = '🚫 Spam detected';
        spamTracker.set(uid, []);
      }
    }

    // ── Anti-Links ─────────────────────────────
    if (!violated && config.antiLinks && LINK_REGEX.test(message.content)) {
      // Allow server own links (optional: skip if needed)
      violated = true;
      reason = '🔗 External links not allowed';
    }

    // ── Anti-Invites ───────────────────────────
    if (!violated && config.antiInvites && INVITE_REGEX.test(message.content)) {
      violated = true;
      reason = '📨 Discord invites not allowed';
    }

    // ── Anti-Caps (>70% caps in msgs >10 chars) ─
    if (!violated && config.antiCaps && message.content.length > 10) {
      const upper = (message.content.match(/[A-Z]/g) || []).length;
      const alpha = (message.content.match(/[a-zA-Z]/g) || []).length;
      if (alpha > 0 && upper / alpha > 0.7) {
        violated = true;
        reason = '🔠 Excessive caps not allowed';
      }
    }

    // ── Bad Words ──────────────────────────────
    if (!violated && config.badWords.length > 0) {
      const lower = message.content.toLowerCase();
      for (const word of config.badWords) {
        if (lower.includes(word)) {
          violated = true;
          reason = '🚫 Prohibited word used';
          break;
        }
      }
    }

    // ── Take Action ────────────────────────────
    if (violated) {
      try {
        await message.delete();
      } catch {}

      const warnMsg = await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle('⚠️ AutoMod Action')
            .setDescription(`${message.author}, your message was removed.\n**Reason:** ${reason}`)
            .setTimestamp()
            .setFooter({ text: 'Aurora Bot • AutoMod' }),
        ],
      });

      setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

      // Log
      if (config.logChannelId) {
        const logCh = message.guild.channels.cache.get(config.logChannelId);
        if (logCh) {
          await logCh.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xfee75c)
                .setTitle('🤖 AutoMod Log')
                .addFields(
                  { name: '👤 User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                  { name: '📋 Reason', value: reason, inline: true },
                  { name: '💬 Channel', value: `${message.channel}`, inline: true },
                  { name: '📝 Content', value: message.content.slice(0, 300) || '[empty]', inline: false }
                )
                .setTimestamp(),
            ],
          });
        }
      }
    }
  },
};
