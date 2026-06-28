// ================================================
//   AURORA BOT - Database Models
// ================================================

const mongoose = require('mongoose');

// ── Warn Schema ────────────────────────────────
const warnSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  warns: [
    {
      reason: String,
      moderatorId: String,
      date: { type: Date, default: Date.now },
      warnId: String,
    },
  ],
});
const Warn = mongoose.model('Warn', warnSchema);

// ── AutoMod Schema ─────────────────────────────
const autoModSchema = new mongoose.Schema({
  guildId: { type: String, unique: true },
  enabled: { type: Boolean, default: false },
  antiSpam: { type: Boolean, default: false },
  antiLinks: { type: Boolean, default: false },
  antiInvites: { type: Boolean, default: false },
  antiCaps: { type: Boolean, default: false },
  badWords: { type: [String], default: [] },
  logChannelId: String,
  exemptRoles: [String],
  exemptChannels: [String],
});
const AutoMod = mongoose.model('AutoMod', autoModSchema);

// ── Ticket Schema ──────────────────────────────
const ticketSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  userId: String,
  ticketNumber: Number,
  status: { type: String, default: 'open' }, // open | closed
  createdAt: { type: Date, default: Date.now },
  transcript: [
    {
      author: String,
      content: String,
      timestamp: Date,
    },
  ],
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ── Ticket Config Schema ───────────────────────
const ticketConfigSchema = new mongoose.Schema({
  guildId: { type: String, unique: true },
  categoryId: String,
  logChannelId: String,
  supportRoleId: String,
  ticketCounter: { type: Number, default: 0 },
});
const TicketConfig = mongoose.model('TicketConfig', ticketConfigSchema);

// ── Giveaway Schema ────────────────────────────
const giveawaySchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  messageId: String,
  prize: String,
  winnersCount: Number,
  hostId: String,
  endsAt: Date,
  ended: { type: Boolean, default: false },
  participants: [String],
  winners: [String],
});
const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// ── Event Schema ───────────────────────────────
const eventSchema = new mongoose.Schema({
  guildId: String,
  name: String,
  description: String,
  date: Date,
  channelId: String,
  createdBy: String,
  reminder: { type: Boolean, default: true },
  participants: [String],
});
const Event = mongoose.model('GuildEvent', eventSchema);

module.exports = { Warn, AutoMod, Ticket, TicketConfig, Giveaway, Event };
